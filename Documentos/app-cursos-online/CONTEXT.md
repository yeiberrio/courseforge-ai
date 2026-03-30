# CONTEXT.md — Plataforma de Venta de Cursos Online con IA

> **Archivo de contexto para Claude Code.**
> Este documento describe la arquitectura completa, stack técnico, reglas de negocio, flujos y convenciones del proyecto. Léelo completo antes de generar cualquier código.

---

## 1. Visión general del proyecto

**Nombre tentativo:** CourseForge AI (ajustar según branding final)

Una plataforma SaaS de venta y consumo de cursos online donde:
- Los **creadores** cargan un documento (PDF, DOCX, MD) y el sistema genera automáticamente el video del curso (con voz clonada y/o avatar IA), miniatura, descripción SEO, y agentes de venta/soporte específicos para ese curso.
- Los **estudiantes** compran, acceden al contenido, interactúan con un tutor IA por curso, y obtienen certificados verificables.
- Los **administradores** moderan, aprueban publicaciones, configuran agentes globales y monitorizan métricas.

**Principios rectores:**
- Automatización máxima de la producción de contenido, con intervención humana obligatoria en la aprobación final.
- Seguridad por defecto en cada capa (auth, datos, contenido, pagos).
- Arquitectura modular y escalable desde el día 1.
- Experiencia de usuario premium tanto para creadores como para estudiantes.

---

## 2. Arquitectura general

### 2.1 Estructura del monorepo

```
courseforge/
├── apps/
│   ├── web/                  # Next.js 15 — storefront público + auth
│   ├── studio/               # Next.js 15 — panel de creadores
│   ├── learn/                # Next.js 15 — panel de estudiantes
│   └── admin/                # Next.js 15 — panel de administración
├── packages/
│   ├── ui/                   # Componentes compartidos (shadcn/ui extendido)
│   ├── db/                   # Esquema Supabase, tipos generados, helpers
│   ├── agents/               # Lógica de agentes IA (RAG, prompts, herramientas)
│   ├── video-pipeline/       # Orquestación de generación de video
│   ├── email/                # Templates React Email + funciones Resend
│   ├── payments/             # Abstracción Stripe + Wompi + MercadoPago
│   └── config/               # ESLint, TypeScript, Tailwind configs compartidos
├── workers/
│   ├── video-generator/      # Worker BullMQ para generación de video
│   ├── publisher/            # Worker para publicación programada
│   └── analytics/            # Worker para métricas y reportes
├── infra/                    # Scripts de Supabase migrations, seeds
└── docs/                     # Documentación técnica adicional
```

### 2.2 Patrón de arquitectura por app

Cada app Next.js sigue:
- **App Router** con Server Components por defecto
- **Server Actions** para mutaciones (no API Routes internas)
- **API Routes** solo para webhooks externos (Stripe, YouTube, HeyGen)
- **Middleware** para auth y redirección por rol

### 2.3 Modelo de datos principal (Supabase/Postgres)

```sql
-- Usuarios y roles
users (id, email, full_name, avatar_url, role: 'admin'|'creator'|'student', created_at)
creator_profiles (user_id, bio, voice_clone_id, avatar_config jsonb, stripe_account_id)
student_profiles (user_id, timezone, preferred_language)

-- Taxonomía de cursos
categories (id, slug, name, description, parent_id, image_url, agent_config_id)
courses (
  id, creator_id, category_id, slug, title, description_short, description_long,
  status: 'draft'|'generating'|'review'|'approved'|'published'|'archived',
  price_cents, currency, thumbnail_url, preview_video_url,
  seo_title, seo_description, seo_keywords,
  generation_config jsonb,  -- configuración usada para generar el video
  published_at, created_at, updated_at
)
course_modules (id, course_id, order, title, duration_seconds, video_url, script, status)
course_tags (course_id, tag)

-- Generación de video
video_jobs (
  id, course_id, module_id, status: 'queued'|'processing'|'done'|'failed'|'review'|'approved',
  config jsonb,             -- snapshot de la config al momento de generar
  assets jsonb,             -- URLs de audio, slides, avatar_video, thumbnail
  assembled_url, error_log, created_at, completed_at
)
generation_configs (
  id, course_id,
  voice_mode: 'clone'|'tts_generic',
  voice_id,                 -- ElevenLabs voice ID
  avatar_enabled boolean,
  avatar_provider: 'heygen'|'did'|null,
  avatar_id,
  slide_style: 'minimal'|'branded'|'dark',
  background_music boolean,
  language,
  target_duration_per_module_min,
  thumbnail_style,
  created_at
)

-- Publicación
publication_schedules (
  id, course_id,
  platforms jsonb,          -- [{platform:'youtube', channel_id, privacy:'public', scheduled_at}]
  status: 'pending'|'partial'|'done'|'failed',
  results jsonb             -- resultado por plataforma
)

-- Compras y acceso
purchases (id, student_id, course_id, amount_cents, currency, stripe_payment_id, wompi_id, purchased_at)
enrollments (id, student_id, course_id, enrolled_at, completed_at, certificate_url)
module_progress (student_id, module_id, watched_seconds, completed boolean, last_watched_at)

-- Agentes IA
agent_configs (
  id, scope: 'global'|'category'|'course',
  scope_id,                 -- category_id o course_id si aplica
  agent_type: 'sales'|'support'|'tutor'|'followup',
  name, personality, tone: 'formal'|'casual'|'friendly',
  languages jsonb,
  rag_documents jsonb,      -- lista de document_ids asignados
  escalation_rules jsonb,
  active boolean
)
rag_documents (id, agent_config_id, course_id, title, content_text, embedding vector(1536), created_at)
chat_sessions (id, agent_config_id, user_id, session_token, started_at)
chat_messages (id, session_id, role: 'user'|'assistant', content, created_at)

-- Marketing y afiliados
affiliate_links (id, user_id, course_id, code, commission_pct, clicks, conversions)
coupons (id, code, discount_type: 'pct'|'fixed', discount_value, max_uses, used_count, expires_at)
email_subscribers (id, email, name, source, tags jsonb, subscribed_at, unsubscribed_at)

-- Certificados
certificates (id, enrollment_id, code, issued_at, template_id)

-- Analytics
course_analytics (course_id, date, views, enrollments, revenue_cents, completion_rate, avg_watch_time_sec)
video_heatmap_events (module_id, student_id, second, event_type: 'play'|'pause'|'seek'|'exit')
```

---

## 3. Stack técnico completo

### 3.1 Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15.x | Framework base, App Router, RSC |
| TypeScript | 5.x | Tipado estricto en todo el proyecto |
| Tailwind CSS | 3.x | Estilos utilitarios |
| shadcn/ui | latest | Componentes base accesibles |
| Framer Motion | 11.x | Animaciones de UI |
| React Hook Form | 7.x | Manejo de formularios |
| Zod | 3.x | Validación de esquemas (compartido front/back) |
| Video.js / Plyr | latest | Player de video con tracking |
| Recharts | 2.x | Gráficas del dashboard de analytics |
| TanStack Query | 5.x | Server state y cache en cliente |
| React Email | latest | Templates de email en componentes React |

### 3.2 Backend / BaaS
| Tecnología | Uso |
|---|---|
| Supabase | Auth (JWT + OAuth), Postgres, Storage, Realtime, Edge Functions |
| pgvector | Embeddings para RAG dentro de Supabase |
| Row Level Security | Todas las tablas tienen RLS habilitado |
| Supabase Storage | Documentos subidos por creadores, assets de video |

### 3.3 Agentes IA
| Tecnología | Uso |
|---|---|
| Anthropic Claude API (`claude-sonnet-4-6`) | Motor de todos los agentes, generación de guiones, SEO |
| LlamaIndex (TS) | Pipeline RAG: ingesta, chunking, embedding, retrieval |
| OpenAI Embeddings (`text-embedding-3-small`) | Vectorización de documentos para RAG |
| Pinecone (alternativa: pgvector) | Vector store para RAG a escala |

### 3.4 Pipeline de video
| Tecnología | Uso |
|---|---|
| ElevenLabs API | TTS y clonación de voz (Voice ID por creador) |
| HeyGen API | Generación de avatar IA (opcional, pay-as-you-go) |
| D-ID API | Alternativa a HeyGen para avatar más económico |
| python-pptx (Python worker) | Generación automática de slides |
| ffmpeg | Ensamblado de audio + slides → MP4 |
| OpenAI DALL-E 3 | Generación de miniaturas 1792×1024 |
| BullMQ + Redis (Upstash) | Cola de jobs para pipeline de video |
| Trigger.dev | Orquestación de workflows con reintentos |
| Mux / Cloudflare Stream | Hosting y streaming de video con DRM |

### 3.5 Publicación externa
| Tecnología | Uso |
|---|---|
| YouTube Data API v3 | Upload automático de videos a YouTube |
| YouTube OAuth2 | Autorización por canal del creador |
| Webhooks genéricos | Adaptadores para Vimeo, Teachable, Thinkific |

### 3.6 Pagos
| Tecnología | Uso |
|---|---|
| Stripe | Pagos globales, suscripciones, coupons, webhooks |
| Wompi | Pagos locales Colombia (PSE, tarjetas, Nequi) |
| MercadoPago | Pagos LATAM ampliados |
| Stripe Connect | Pagos a creadores y afiliados |

### 3.7 Comunicaciones
| Tecnología | Uso |
|---|---|
| Resend | Email transaccional y marketing (API key) |
| WhatsApp Business API (360dialog o Twilio) | Notificaciones y soporte por WhatsApp |
| Twilio | SMS como fallback |

### 3.8 DevOps e infraestructura
| Tecnología | Uso |
|---|---|
| Vercel | Deploy del monorepo Next.js, Edge Functions, Preview URLs |
| GitHub Actions | CI/CD, tests automáticos, linting |
| Sentry | Error tracking en producción |
| Upstash Redis | BullMQ + rate limiting + caché |
| AWS S3 / Cloudflare R2 | Storage de assets procesados |
| Better Uptime | Monitoreo de disponibilidad |
| Vitest | Unit y integration tests |
| Playwright | E2E tests de flujos críticos |

---

## 4. Flujos principales

### 4.1 Flujo de creación de curso (doc → video publicado)

```
1. CARGA DEL DOCUMENTO
   - Creador sube PDF/DOCX/MD/TXT en Studio
   - Supabase Storage guarda el archivo
   - Edge Function dispara extracción de texto
   - Claude analiza estructura y propone: título, módulos, objetivos, público objetivo

2. CONFIGURACIÓN DE GENERACIÓN
   - UI muestra panel de configuración ANTES de generar:
     * ¿Clonar voz? (requiere voice_id previo) o ¿TTS genérica? (elegir voz)
     * ¿Activar avatar? Si sí: elegir proveedor (HeyGen/D-ID) y avatar ID
     * Estilo de slides (minimal / branded / dark)
     * Idioma del curso
     * Duración objetivo por módulo (5, 10, 15, 20 min)
     * ¿Música de fondo? (sí/no, elegir género)
     * Estilo de miniatura (profesional, colorida, minimalista)
   - Config guardada en generation_configs

3. GENERACIÓN PARALELA (BullMQ worker)
   - Por cada módulo en paralelo:
     a. Claude genera guión definitivo del módulo
     b. ElevenLabs convierte guión → audio MP3 (voz clonada o TTS)
     c. python-pptx genera slides del módulo (1920×1080)
     d. Si avatar: HeyGen/D-ID genera video del presentador leyendo el guión
     e. DALL-E 3 genera miniatura del módulo
   - Estado en video_jobs se actualiza en tiempo real (Supabase Realtime → UI)

4. ENSAMBLADO
   - ffmpeg combina: audio + slides (+ avatar overlay si aplica) → MP4 por módulo
   - Preview disponible en Supabase Storage con URL firmada (24h)
   - Claude genera: descripción SEO, meta tags, tags, blog post de resumen

5. REVISIÓN HUMANA (human-in-the-loop)
   - Panel en Studio muestra cada módulo con player de preview
   - Creador puede:
     * ✅ Aprobar módulo
     * ✏️ Editar guión y regenerar solo ese módulo
     * 🔄 Cambiar configuración (voz, avatar) y regenerar
     * ❌ Rechazar y empezar de cero ese módulo
   - Cuando TODOS los módulos están aprobados → estado del curso: 'approved'
   - Notificación al admin si se configuró moderación de plataforma

6. CONFIGURACIÓN DE PUBLICACIÓN
   - Creador elige:
     * Plataformas: [La plataforma] + [YouTube] + [Vimeo] (toggle por plataforma)
     * Por cada plataforma: fecha/hora de publicación, privacidad inicial
     * Precio del curso, moneda, cupones de lanzamiento
   - Se crea publication_schedule en DB

7. PUBLICACIÓN PROGRAMADA (Publisher worker)
   - En la fecha/hora configurada, worker ejecuta:
     * Upload a YouTube Data API v3 con metadata, miniatura, descripción
     * Activación en la plataforma (status → 'published')
     * Notificación al creador por email/WhatsApp
     * Disparo de agentes: email de lanzamiento a lista, posts en redes
   - Si falla alguna plataforma: reintentos con backoff, alerta al creador
   - Resultados guardados en publication_schedules.results
```

### 4.2 Flujo de compra de estudiante

```
1. Visitante llega a la página del curso (web/)
2. Chat del agente de ventas aparece (scope: 'course' o 'category')
3. Primer módulo disponible gratis sin login
4. Al intentar acceder al módulo 2: redirect a registro/login
5. Checkout con Stripe / Wompi según país detectado
6. Webhook de pago exitoso → crear enrollment → enviar email de bienvenida
7. Acceso inmediato en learn/ con player de video
8. Progress tracking automático (video heatmap, module_progress)
9. Al completar 100%: generar certificado con código único → email al estudiante
10. Email de upsell a cursos relacionados (agente de seguimiento)
```

### 4.3 Flujo de clonación de voz

```
1. Creador va a su perfil en Studio → "Configurar mi voz"
2. Instrucciones: grabar 30 min de audio leyendo texto neutro
3. Sube archivo(s) MP3/WAV a Supabase Storage
4. Worker llama ElevenLabs Professional Voice Cloning API
5. ElevenLabs devuelve voice_id → guardado en creator_profiles.voice_clone_id
6. A partir de ese momento, todos los cursos del creador pueden usar su voz clonada
7. El creador puede escuchar un preview antes de usar la voz en cursos
```

---

## 5. Sistema de agentes IA

### 5.1 Tipos de agentes

| Tipo | Scope | Contexto RAG | Canal |
|---|---|---|---|
| `global_sales` | Plataforma | Todos los cursos (resumen) | Chat flotante en web/ |
| `category_sales` | Categoría | Cursos de esa categoría | Landing de categoría |
| `course_sales` | Curso | Contenido del curso + FAQs | Página del curso |
| `global_support` | Plataforma | KB de soporte + políticas | Chat en learn/ y web/ |
| `course_tutor` | Curso | Contenido completo del módulo actual | Dentro del player |
| `followup` | Global | Historial del estudiante | Email + WhatsApp |

### 5.2 Pipeline RAG

```
INGESTA (al publicar curso):
1. Extraer texto del documento original
2. Extraer transcripción de cada módulo de video
3. Chunking con LlamaIndex (chunk_size: 512, overlap: 50)
4. Embedding con text-embedding-3-small de OpenAI
5. Upsert en pgvector / Pinecone con metadata: {course_id, module_id, chunk_index}

RETRIEVAL (en cada mensaje del chat):
1. Embedding de la pregunta del usuario
2. Similarity search en el scope correspondiente (global / category / course)
3. Top-5 chunks con score > 0.75
4. Construcción del prompt con contexto recuperado
5. Llamada a claude-sonnet-4-6 con streaming
6. Guardado de session en chat_messages
```

### 5.3 Configuración de agentes (panel de admin)

Cada agente tiene:
- `name`: nombre visible al usuario (ej: "Sofía, tu asesora de Marketing")
- `personality`: descripción del rol y tono en ~200 palabras
- `tone`: formal | casual | friendly
- `languages`: array de idiomas soportados
- `rag_documents`: IDs de documentos asignados al contexto
- `escalation_rules`: condiciones para escalar a humano
- `opening_message`: mensaje inicial del chat
- `suggested_questions`: preguntas sugeridas al abrir el chat

---

## 6. Seguridad

### 6.1 Autenticación y autorización

- **Auth provider:** Supabase Auth (JWT RS256)
- **Roles:** `admin`, `creator`, `student`, `moderator`
- **RLS:** Habilitado en TODAS las tablas. Ninguna tabla es accesible sin autenticación salvo `courses` (lectura pública de cursos publicados) y `categories`
- **OAuth:** Google y GitHub habilitados. Email magic link como alternativa.
- **2FA:** Opcional para creadores y admins (TOTP via Supabase Auth)
- **Session:** Tokens rotados cada 1h, refresh tokens con expiración de 7 días

### 6.2 Protección de contenido de video

- Videos almacenados en Mux o Cloudflare Stream (nunca URLs directas de S3 en el player)
- Acceso solo con enrollment activo verificado en middleware del player
- URLs firmadas con expiración de 2h para cada sesión de reproducción
- Watermark dinámico con email del estudiante renderizado server-side
- Sin endpoint de descarga directa; todos los videos son HLS/DASH

### 6.3 Seguridad de APIs y endpoints

```typescript
// Middleware global en Next.js
- Verificación de JWT en todas las rutas /studio, /learn, /admin
- Rate limiting con Upstash Redis:
  * API pública: 60 req/min por IP
  * Auth endpoints: 10 req/min por IP
  * Chat con agentes: 30 mensajes/min por usuario
  * Upload de archivos: 5 uploads/hora por creador
- Validación de todos los inputs con Zod antes de cualquier operación DB
- CORS estricto: solo orígenes propios de la plataforma
- Headers de seguridad: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Webhooks (Stripe, YouTube): verificación de firma antes de procesar
```

### 6.4 Pagos

- Stripe es el único procesador que toca datos de tarjeta (nunca el servidor propio)
- Wompi para PSE/Nequi en Colombia (tokenización en cliente)
- Webhooks firmados verificados con `stripe.webhooks.constructEvent`
- Idempotency keys en todas las llamadas de pago
- Reembolsos automáticos disponibles dentro de los primeros 7 días

### 6.5 Cumplimiento normativo

- Política de privacidad compliant con Ley 1581 de Colombia y GDPR
- Consentimiento explícito de cookies con banner
- Derecho de supresión de datos implementado (endpoint de eliminación de cuenta)
- Logs de auditoría para: accesos admin, cambios de rol, pagos, publicaciones
- Datos de estudiantes: nunca vendidos, nunca usados para entrenar modelos sin consentimiento

---

## 7. Estrategia de ventas y crecimiento

### 7.1 Automatizaciones de marketing al publicar un curso

Cuando un curso pasa a `published`, el sistema automáticamente:
1. Genera clips de 60 seg de los mejores fragmentos (3 clips por curso)
2. Agrega subtítulos animados en español e inglés a los clips
3. Schedula posts en TikTok, Instagram Reels, YouTube Shorts (3 días después)
4. Genera blog post SEO del curso y lo publica en el blog de la plataforma
5. Envía email de lanzamiento a la lista de suscriptores segmentada por interés
6. Activa el agente de ventas del curso con el contexto RAG completo
7. Genera 5 variaciones de copy de ad para Facebook/Google (para uso manual)

### 7.2 Funnel de conversión

```
Visitante frío
  → Clip en redes → Landing del curso → Módulo 1 gratis (sin login)
  → Módulo 2 bloqueado → Modal de registro → Email capturado
  → Secuencia de nurturing (5 emails en 7 días)
  → Checkout → Estudiante activo
  → Completar curso → Certificado + upsell → Afiliado potencial
```

### 7.3 Email sequences automáticas

| Trigger | Emails | Objetivo |
|---|---|---|
| Registro sin compra | 5 emails / 7 días | Convertir a pago |
| Compra realizada | 3 emails / 3 días | Onboarding y retención |
| Inactivo 7 días | 2 emails | Reactivación |
| Progreso al 80% | 1 email | Push para completar |
| Curso completado | 2 emails | Upsell + pedir reseña |
| Abandono de carrito | 3 emails / 3 días | Recuperación |

### 7.4 Programa de afiliados

- Link único por usuario con código personalizable
- Comisión configurable por curso (default: 30% de la venta)
- Dashboard de afiliados con clics, conversiones y ganancias en tiempo real
- Pago automático mensual vía Stripe Connect
- Rangos: Afiliado → Pro → Elite (según volumen de ventas)

---

## 8. Convenciones de código

### 8.1 TypeScript

```typescript
// Siempre tipado estricto
"strict": true en tsconfig.json

// Tipos de Supabase generados automáticamente
import type { Database } from '@courseforge/db/types'
type Course = Database['public']['Tables']['courses']['Row']

// Zod para validación de inputs y outputs
const CreateCourseSchema = z.object({
  title: z.string().min(5).max(120),
  category_id: z.string().uuid(),
  price_cents: z.number().int().min(0),
})
```

### 8.2 Estructura de Server Actions

```typescript
// apps/studio/app/actions/courses.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { CreateCourseSchema } from '@courseforge/db/schemas'

export async function createCourse(formData: FormData) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = CreateCourseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { data, error } = await supabase
    .from('courses')
    .insert({ ...parsed.data, creator_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}
```

### 8.3 Naming conventions

- **Archivos:** `kebab-case.tsx` para componentes, `camelCase.ts` para utilities
- **Componentes:** `PascalCase`
- **Variables/funciones:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **Rutas DB:** `snake_case` (igual que Postgres)
- **Variables de entorno:** `NEXT_PUBLIC_` para cliente, sin prefijo para servidor

### 8.4 Estructura de componentes

```
components/
├── ui/           # Componentes base de shadcn (no modificar directamente)
├── layout/       # Header, Footer, Sidebar, Nav
├── course/       # CourseCard, CoursePlayer, CourseProgress, etc.
├── agent/        # ChatWidget, AgentConfig, MessageBubble
├── video/        # VideoConfig, GenerationProgress, ReviewPlayer
├── forms/        # Formularios específicos del dominio
└── analytics/    # Charts, StatCard, Heatmap
```

### 8.5 Variables de entorno requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (agentes IA)
ANTHROPIC_API_KEY=

# ElevenLabs (TTS y clonación de voz)
ELEVENLABS_API_KEY=

# HeyGen (avatar IA)
HEYGEN_API_KEY=

# D-ID (avatar alternativo)
DID_API_KEY=

# OpenAI (embeddings + DALL-E)
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Wompi (Colombia)
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=

# YouTube
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# Resend (email)
RESEND_API_KEY=
EMAIL_FROM=noreply@tudominio.com

# Redis (BullMQ)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Mux (video hosting)
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=

# Pinecone (vector store, alternativa a pgvector)
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=

# Sentry
SENTRY_DSN=

# App
NEXT_PUBLIC_APP_URL=https://tudominio.com
NEXT_PUBLIC_STUDIO_URL=https://studio.tudominio.com
NEXT_PUBLIC_LEARN_URL=https://learn.tudominio.com
```

---

## 9. Pipeline de video — detalle técnico

### 9.1 Worker de generación (BullMQ)

```typescript
// workers/video-generator/src/index.ts

// Queues:
// - 'script-generation'    → Claude genera guión por módulo
// - 'audio-generation'     → ElevenLabs genera audio
// - 'slides-generation'    → python-pptx genera slides (subprocess Python)
// - 'avatar-generation'    → HeyGen/D-ID genera video avatar (opcional)
// - 'thumbnail-generation' → DALL-E genera miniatura
// - 'assembly'             → ffmpeg ensambla MP4 final
// - 'upload-preview'       → Sube preview firmado a Supabase Storage

// Cada job tiene:
// - attempts: 3
// - backoff: { type: 'exponential', delay: 5000 }
// - removeOnComplete: false (para auditoría)
// - removeOnFail: false
```

### 9.2 Generación de guión (Claude)

```
SYSTEM PROMPT del agente generador de guiones:
Eres un experto en diseño instruccional y producción de contenido educativo en video.
Tu tarea es transformar el contenido de un módulo de curso en un guión profesional,
natural y pedagógicamente efectivo para ser narrado en video.

Reglas:
- Duración objetivo: {target_duration} minutos (asume ~150 palabras/minuto)
- Tono: educativo pero conversacional, nunca robótico
- Estructura: apertura con gancho, desarrollo con ejemplos, cierre con resumen y CTA
- Incluye pausas naturales indicadas con [PAUSA]
- Indica cambios de slide con [SLIDE: título del slide]
- El guión debe sonar como si lo dijera una persona real, no un texto leído
- Idioma: {language}
```

### 9.3 Configuración de ffmpeg para ensamblado

```bash
# Comando base para ensamblar slides + audio → video
ffmpeg \
  -framerate 1/{seconds_per_slide} \
  -i slide_%03d.png \
  -i audio.mp3 \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -shortest \
  output.mp4

# Con avatar overlay (HeyGen/D-ID video):
ffmpeg \
  -i background_slides.mp4 \
  -i avatar.mp4 \
  -filter_complex "[1:v]scale=320:180[avatar];[0:v][avatar]overlay=W-w-20:H-h-20" \
  -c:a copy \
  output_with_avatar.mp4
```

---

## 10. Plan de implementación por fases

### Fase 1 — MVP (semanas 1-6)
- [ ] Setup monorepo, Supabase schema, auth básica con roles
- [ ] App `web/`: landing, catálogo de cursos, página de curso, checkout Stripe
- [ ] App `studio/`: carga de documento, configuración básica, generación de guión con Claude
- [ ] Pipeline básico: guión → ElevenLabs audio → ffmpeg → preview
- [ ] Panel de revisión humana (approve/reject por módulo)
- [ ] Publicación manual en la plataforma (sin programación)
- [ ] App `learn/`: player de video, progreso básico
- [ ] Agente de ventas global básico (RAG con todos los cursos)

### Fase 2 — Automatización (semanas 7-10)
- [ ] Clonación de voz (ElevenLabs PVC) en Studio
- [ ] Avatar IA opcional (HeyGen/D-ID)
- [ ] Generación automática de slides (python-pptx)
- [ ] Miniaturas automáticas (DALL-E 3)
- [ ] Publicación programada a YouTube
- [ ] Agentes por curso y por categoría (RAG multinivel)
- [ ] Email sequences con Resend
- [ ] App `admin/`: panel básico de moderación y analytics

### Fase 3 — Crecimiento (semanas 11-14)
- [ ] Programa de afiliados
- [ ] Clips automáticos para redes sociales
- [ ] Blog post SEO automático al publicar
- [ ] Certificados verificables
- [ ] Gamificación (progreso, insignias)
- [ ] WhatsApp Business API
- [ ] Analytics avanzados (heatmap de video, funnel)
- [ ] Wompi + MercadoPago
- [ ] Agente de seguimiento (reactivación)

### Fase 4 — Escala (semanas 15+)
- [ ] Multi-tenant (creadores con subdominio propio)
- [ ] API pública para integraciones LMS externas
- [ ] App móvil (React Native o PWA avanzada)
- [ ] A/B testing en landing pages de cursos
- [ ] Recomendador de cursos con ML (collaborative filtering)
- [ ] Cohortes y lanzamientos con lista de espera

---

## 11. Reglas de negocio importantes

1. **Un curso nunca se publica sin aprobación del creador módulo por módulo.**
2. **Los videos nunca son accesibles por URL directa; siempre a través del player con URL firmada.**
3. **El primer módulo de cada curso es siempre de acceso gratuito** (configurable por creador).
4. **Los agentes IA nunca prometen precios ni garantías**; siempre derivan preguntas de precio al checkout real.
5. **La clonación de voz requiere que el creador suba al menos 15 minutos de audio propio** antes de activarse.
6. **Los reembolsos automáticos aplican en los primeros 7 días** si el estudiante completó menos del 20% del curso.
7. **Toda publicación a YouTube requiere que el creador haya conectado su cuenta de Google** en Studio.
8. **El pipeline de video tiene un timeout de 30 minutos por módulo**; si supera ese tiempo, marca como fallido y notifica.
9. **Los embeddings para RAG se regeneran automáticamente** cuando el creador actualiza el documento base del curso.
10. **Los logs de conversación de agentes se retienen 90 días** y luego se eliminan automáticamente (privacidad).

---

## 12. Comandos de inicio

```bash
# Clonar y configurar
git clone <repo>
cd courseforge
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Llenar todas las variables del .env.local

# Inicializar Supabase local
npx supabase start
npx supabase db push

# Correr todas las apps en desarrollo
pnpm dev

# Correr workers en desarrollo
pnpm workers:dev

# Tests
pnpm test
pnpm test:e2e
```

---

---

## 13. Estado real de implementación (Marzo 2026)

> **Nota:** La arquitectura implementada difiere de la visión original (secciones 1-12).
> Se optó por NestJS + PostgreSQL propio en lugar de Supabase, y una sola app Next.js
> en lugar de múltiples apps. A continuación el estado actual.

### 13.1 Arquitectura implementada

```
courseforge/
├── apps/
│   └── web/                  # Next.js 15 (static export) — toda la UI
├── backend/                  # NestJS 10 + Prisma 5 — API REST completa
├── packages/                 # (vacío, reservado para futuro)
├── docker-compose.yml        # PostgreSQL 16 (dev, port 5441)
├── pnpm-workspace.yaml       # Monorepo config
└── turbo.json                # Turborepo config
```

**Stack real:**
- **Backend:** NestJS 10 + Prisma 5 (binary engine) + PostgreSQL 16
- **Frontend:** Next.js 15 (static export) + Tailwind + shadcn/ui
- **Mobile:** Capacitor 6 (Android + iOS configurados)
- **Deploy:** Backend → Railway (Dockerfile), Frontend → Vercel (static)
- **Auth:** JWT + bcryptjs (access token 15m + refresh token 7d)
- **TTS:** Edge TTS (Microsoft, gratis) — no ElevenLabs
- **Avatar IA:** D-ID API (talking-head videos con lip-sync)
- **Slides:** SVG generados con Node.js (no python-pptx)
- **Video assembly:** FFmpeg (slides + audio → MP4)
- **IA para guiones:** Claude API (Anthropic) con fallback local

### 13.2 Base de datos (Prisma schema — 20 modelos, 14 enums)

Modelos implementados:
- `User` (roles: ADMIN, CREATOR, STUDENT, MODERATOR)
- `Category` (8 categorías seed)
- `Course` (status: DRAFT → GENERATING → REVIEW → APPROVED → PUBLISHED → ARCHIVED)
- `CourseModule` (status: PENDING → GENERATING → DONE → FAILED)
- `Enrollment`, `ModuleProgress`
- `VideoJob` (config jsonb, assets jsonb, error_log)
- `Upload` (documentos subidos)
- Y otros modelos preparados para futuras fases

### 13.3 Backend — Módulos implementados

| Módulo | Endpoints | Estado |
|---|---|---|
| **Auth** | login, register, refresh, logout, me, change-password | ✅ Completo |
| **Users** | CRUD + roles | ✅ Completo |
| **Categories** | CRUD + seed 8 categorías | ✅ Completo |
| **Courses** | CRUD + my-courses + by-slug | ✅ Completo |
| **CourseModules** | CRUD | ✅ Completo |
| **Enrollments** | enroll, progress tracking | ✅ Completo |
| **Uploads** | upload document (PDF, DOCX, TXT, MD) | ✅ Completo |
| **Generation** | analyze-document, create-course (curso/viral), progress, voices, avatars, HeyGen | ✅ Completo |
| **YouTube** | OAuth2, canales, publicaciones, publicar video | ✅ Completo |
| **Viral** | search (multi-país/idioma/live), trending, history, transcribe, process | ✅ Completo |
| **Knowledge Base** | list, stats, detail, ingest, search, download, delete | ✅ Completo |
| **Agents** | sales agent config, chat, documents, sessions, stats, leads CRUD, email | ✅ Completo |
| **Telegram** | Bot polling, /start, /servicios, /reunion, /contacto, /nueva, auto-lead | ✅ Completo |
| **Health** | healthcheck endpoint | ✅ Completo |

### 13.4 Servicios de generación de contenido

| Servicio | Descripción | Estado |
|---|---|---|
| **DocumentParserService** | Extrae texto de DOCX (mammoth) y PDF (pdf-parse) | ✅ Completo |
| **ScriptGeneratorService** | Genera guiones con Claude API o fallback local | ✅ Completo |
| **TtsService** | Genera audio con Edge TTS (6 voces español) | ✅ Completo |
| **SlideService** | Genera slides SVG 1920x1080 (3 estilos) | ✅ Completo |
| **VideoAssemblyService** | Ensambla slides + audio → MP4 con FFmpeg | ✅ Completo |
| **AvatarVideoService** | Genera video con avatar IA vía D-ID API | ✅ Completo |
| **HeyGenVideoService** | Avatar IA avanzado (escenas, emociones, velocidad) | ✅ Completo |
| **StorageService** | Supabase Storage para videos persistentes | ✅ Completo |
| **AgentsService** | Agente de ventas con chat IA + RAG + leads + email | ✅ Completo |
| **TelegramService** | Bot de Telegram con Telegraf (polling mode) | ✅ Completo |

### 13.5 Frontend — Páginas implementadas

| Página | Ruta | Funcionalidad |
|---|---|---|
| Landing | `/` | Página de inicio |
| Login | `/login` | Autenticación |
| Registro | `/registro` | Crear cuenta |
| Dashboard | `/dashboard` | Panel principal (role-aware) |
| Categorías | `/dashboard/categorias` | CRUD categorías (admin) |
| Cursos | `/dashboard/cursos` | Lista de cursos del creador |
| Crear curso | `/dashboard/cursos/nuevo` | Formulario manual |
| Generar curso IA | `/dashboard/cursos/generar` | Workflow 4 pasos con IA |
| Detalle curso | `/dashboard/cursos/detalle?id=X` | Ver/editar curso + módulos |
| Usuarios | `/dashboard/usuarios` | Lista usuarios (admin) |
| Aprendizaje | `/dashboard/aprendizaje` | Cursos del estudiante |
| YouTube | `/dashboard/youtube` | Hub YouTube (canales, publicar, publicaciones) |
| Contenido Viral | `/dashboard/viral` | Búsqueda viral con filtros avanzados |
| Procesar Viral | `/dashboard/viral/procesar` | Transcripción + procesamiento IA |
| Base Conocimiento | `/dashboard/conocimiento` | Lista docs + búsqueda semántica + descarga |
| KB Detalle | `/dashboard/conocimiento/detalle?id=X` | Detalle doc + descarga + desactivar |
| Agente Ventas | `/dashboard/agente-ventas` | Config agente + stats + ingesta docs |
| Chat Agente | `/dashboard/agente-ventas/chat` | Chat web con agente de ventas |
| Sesiones | `/dashboard/agente-ventas/sesiones` | Historial sesiones + mensajes |
| Leads/CRM | `/dashboard/agente-ventas/leads` | Pipeline prospectos + email |
| Perfil | `/dashboard/perfil` | Editar perfil |

### 13.6 Flujo de generación de curso (implementado)

```
1. SUBIR DOCUMENTO
   - Creador sube PDF/DOCX/TXT/MD (máx 20MB)
   - DocumentParserService extrae texto plano
   - ScriptGeneratorService (Claude o local) analiza estructura
   - Devuelve: título, descripción, módulos con objetivos

2. CONFIGURAR
   - Seleccionar categoría
   - Tipo de video: Presentación (slides) o Avatar IA (D-ID)
   - Si avatar: seleccionar avatar (Alice, Alex, Emma, Jack, Lisa)
   - Voz TTS: 6 opciones español (CO, MX, ES, masculino/femenino)
   - Estilo slides: Minimal, Branded, Dark (solo modo slides)
   - Duración por módulo: 2-15 minutos

3. GENERACIÓN EN SEGUNDO PLANO (por módulo)
   a. Genera guión de narración (Claude API o local)
   b. Genera audio TTS (Edge TTS)
   c. Genera slides SVG
   d. Ensambla video:
      - Modo slides: FFmpeg combina slides + audio → MP4
      - Modo avatar: D-ID genera video con persona IA hablando
   e. Guarda video en /uploads/generated/{courseId}/module_{n}/

4. POLLING DE PROGRESO
   - Frontend consulta cada 2s: /generation/progress/{courseId}
   - Muestra barra de progreso por módulo
   - Al completar: estado del curso → REVIEW
```

### 13.7 Deploy en producción

| Servicio | Plataforma | URL |
|---|---|---|
| **Backend API** | Railway (Docker) | `https://courseforge-ai-production-5bb9.up.railway.app` |
| **Frontend** | Vercel (static) | `https://web-virid-one-55.vercel.app` |
| **Base de datos** | Railway PostgreSQL | `postgres.railway.internal:5432` |

**Variables de entorno en Railway:**
- `DATABASE_URL` — PostgreSQL interno de Railway
- `JWT_SECRET` — String aleatorio para firmar tokens
- `JWT_EXPIRATION` — `15m`
- `JWT_REFRESH_EXPIRATION` — `7d`
- `FRONTEND_URL` — URL de Vercel (CORS)
- `OPENAI_API_KEY` — API Key de OpenAI (guiones, embeddings, Whisper, DALL-E)
- `DID_API_KEY` — API Key de D-ID para avatar IA
- `HEYGEN_API_KEY` — API Key de HeyGen para avatar IA avanzado
- `YOUTUBE_API_KEY` — API Key de YouTube Data API v3
- `YOUTUBE_CLIENT_ID` — OAuth2 Client ID de Google Cloud
- `YOUTUBE_CLIENT_SECRET` — OAuth2 Client Secret de Google Cloud
- `TELEGRAM_BOT_TOKEN` — Token del bot de Telegram (@BotFather)
- `SMTP_HOST` — Host SMTP para envío de emails (ej: smtp.gmail.com)
- `SMTP_USER` — Usuario SMTP
- `SMTP_PASS` — Contraseña SMTP
- `SMTP_PORT` — Puerto SMTP (default: 587)
- `NODE_ENV` — `production`
- `PORT` — `3000`

**Variables de entorno en Vercel:**
- `NEXT_PUBLIC_API_URL` — URL del backend Railway + `/api/v1`

### 13.8 Credenciales de prueba (seed)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@courseforge.com` | `Admin2026*` |
| Creator | `creator@courseforge.com` | `Creator2026*` |
| Student | `student@courseforge.com` | `Student2026*` |

### 13.9 Estado de implementación (actualizado 30/03/2026)

**Generación de video con IA (completado):**
- [x] Generación de guiones con OpenAI (GPT) y Claude API
- [x] Generación de video con D-ID (avatar IA)
- [x] Generación de video con HeyGen (avatar IA avanzado)
- [x] Formulario multi-paso de generación en frontend
- [x] Polling de progreso de generación
- [x] Selector de objetivo: Curso completo (multi-módulo) vs Video viral (un solo video YouTube)
- [x] Script viral con hook + desarrollo + CTA optimizado para YouTube
- [x] Supabase Storage para videos persistentes

**Contenido Viral — Filtros avanzados (completado 29/03/2026):**
- [x] Filtro multi-país (15 países, llamadas paralelas por regionCode)
- [x] Filtro multi-idioma (12 idiomas con multi-select chips)
- [x] Filtro de transmisiones en vivo (eventType=live con badge "EN VIVO")
- [x] Filtro de comentarios mínimos
- [x] Ordenamiento: vistas, likes, comentarios, engagement rate
- [x] Engagement rate calculado: (likes + comments) / views * 100
- [x] Protección de cuota: máx 6 llamadas API por búsqueda con warning
- [x] Deduplicación de resultados entre llamadas paralelas
- [x] Migración: expand_viral_categories (20 categorías)
- [x] Migración: add_advanced_viral_filters (countries, languages, min_comments, event_type, sort_by)

**YouTube — Publicación y contenido viral (backend + frontend completados):**
- [x] Backend: módulo YouTube (controller, service, module)
- [x] Backend: módulo Viral (búsqueda, trending, historial, procesamiento con IA)
- [x] Backend: endpoint GET /viral/videos/:youtubeVideoId (busca por YouTube ID o UUID)
- [x] Backend: transcribeVideo y processContent aceptan tanto UUID como YouTube video ID
- [x] Backend: procesamiento de contenido viral con OpenAI GPT-4o (fallback a Anthropic Claude)
- [x] Frontend: página de contenido viral con filtros avanzados y búsqueda
- [x] Frontend: página de procesar video viral (transcripción + procesamiento)
- [x] Sidebar: enlaces a YouTube, Contenido Viral, Base de Conocimiento

**YouTube OAuth2 — Conectar canal:**
- [x] Backend: YOUTUBE_REDIRECT_URI configurado en Railway
- [x] Backend: redirect URI correcto con prefijo /api/v1/youtube/callback
- [ ] Google Cloud Console: agregar email como Test User en OAuth consent screen
- [ ] Opción: publicar app OAuth en Google Cloud para acceso general

**Base de Conocimiento (completado + descarga):**
- [x] Backend: módulo Knowledge Base (controller, service, module)
- [x] Frontend: página de base de conocimiento y detalle
- [x] Descarga de documentos: GET /knowledge-base/:id/download
- [x] Conversión JSON → texto limpio para descarga (secciones, puntos clave, tags)
- [x] Fallback: reconstruye contenido desde RAG chunks o ViralContentProcessing cuando archivo local no existe (Railway filesystem efímero)
- [x] Botón de descarga en lista y detalle de documentos

**Agente de Ventas Inteligente (completado 29-30/03/2026):**
- [x] Backend: AgentsModule (service, controller) con 12 endpoints
- [x] Agente SALES con prompt de persuasión avanzada (7 técnicas: escucha activa, dolor→solución, prueba social, urgencia, ancla de precio, reciprocidad, cierre asumido)
- [x] Portafolio de servicios con precios en USD y COP
- [x] Chat con IA: OpenAI GPT-4o (fallback a Claude) + contexto RAG de KB propia
- [x] Agente estricto: SOLO responde sobre servicios del negocio, rechaza preguntas fuera de tema
- [x] Configuración dinámica desde frontend: nombre, tono, personalidad/prompt, mensaje bienvenida, respuesta fuera de tema
- [x] Botón "Restaurar por defecto" para resetear prompt
- [x] Ingesta de documentos en KB del agente (separada de KB viral)
- [x] Gestión de sesiones y historial de mensajes
- [x] Estadísticas: sesiones, mensajes, documentos, leads

**CRM de Leads/Prospectos (completado 29/03/2026):**
- [x] Modelo Lead en Prisma con 8 estados de pipeline
- [x] Pipeline: NEW → CONTACTED → INTERESTED → MEETING_SCHEDULED → PROPOSAL_SENT → NEGOTIATING → WON/LOST
- [x] CRUD completo de leads
- [x] Filtro por estado
- [x] Envío de email a leads (nodemailer + SMTP)
- [x] Modal de composición de email en frontend
- [x] Migración: add_leads_table
- [x] Frontend: /agente-ventas/leads con crear, editar estado, email, eliminar

**Telegram Bot (completado 29-30/03/2026):**
- [x] Integración Telegraf con polling mode
- [x] Todos los mensajes se rutean al agente de ventas (mismo prompt estricto)
- [x] Auto-creación de leads desde usuarios de Telegram
- [x] Comandos: /start (bienvenida + reset sesión), /servicios, /reunion, /contacto, /nueva
- [x] /start y /nueva limpian sesión para aplicar cambios de config
- [x] Mensaje de bienvenida dinámico configurable desde frontend
- [x] Respuesta fuera de tema dinámica configurable desde frontend
- [x] Limpieza de Markdown para compatibilidad con Telegram
- [x] Requiere: TELEGRAM_BOT_TOKEN en Railway

**Frontend — Nuevas páginas (completado):**
- [x] /dashboard/agente-ventas — Config del agente + stats + ingesta documentos
- [x] /dashboard/agente-ventas/chat — Chat web completo con burbujas + typing indicator
- [x] /dashboard/agente-ventas/sesiones — Historial de sesiones con visor de mensajes
- [x] /dashboard/agente-ventas/leads — CRM de prospectos con pipeline y email
- [x] Sidebar: "Agente de Ventas" con icono Bot

**Base de datos producción (Railway):**
- [x] Migración init
- [x] Migración add_youtube_viral_kb_tables
- [x] Migración expand_viral_categories (20 categorías enum)
- [x] Migración add_advanced_viral_filters (countries, languages, etc.)
- [x] Migración add_leads_table (CRM pipeline)
- [x] prisma migrate deploy automático en CMD del Dockerfile
- [x] Build script: `npx prisma generate && nest build`

**Despliegue:**
- [x] Backend: Railway (Docker, auto-deploy desde main)
  - Build: npm ci → prisma generate → nest build
  - CMD: prisma migrate deploy → node dist/src/main.js
- [x] Frontend: Vercel (static export)
  - vercel.json: `{ "outputDirectory": "out" }`
  - Build desde root con turbo (prisma generate antes de nest build para compatibilidad)
- [x] Nota: git root está en /home/angel, paths en git son Documentos/app-cursos-online/...

**APIs configuradas (local + Railway):**
- [x] OpenAI GPT-4o (guiones, embeddings, agente de ventas, procesamiento viral)
- [x] HeyGen (avatar IA)
- [x] D-ID (avatar IA alternativo)
- [x] YouTube Data API v3 (búsqueda viral, trending)
- [x] YouTube OAuth2 (Client ID + Secret + Redirect URI)
- [x] Telegram Bot API (agente de ventas via Telegraf)
- [x] Edge TTS (Microsoft, gratis, 6+ voces español)
- [x] Supabase Storage (videos persistentes)
- [ ] Anthropic Claude (fallback, no configurada en Railway)

**APIs pendientes por configurar:**
- [ ] SMTP (envío de emails a leads — requiere SMTP_HOST, SMTP_USER, SMTP_PASS)
- [ ] WhatsApp Business API (Meta) — integración pendiente
- [ ] Vapi.ai / Bland.ai (agente de ventas por llamadas con voz IA)
- [ ] ElevenLabs (clonación de voz / TTS premium)
- [ ] Stripe (pagos internacionales)
- [ ] Wompi (pagos Colombia)
- [ ] Sentry (monitoreo de errores)

**Pendiente — Fase 1 restante:**
- [ ] Player de video en detalle del curso (actualmente muestra URL)
- [ ] Progreso real de estudiante al ver videos
- [ ] Aprobar/rechazar módulos en revisión

**Pendiente — Fase 2:**
- [ ] WhatsApp Business API (agente de ventas por WhatsApp)
- [ ] Agente de ventas con llamadas de voz IA (Vapi.ai)
- [ ] Certificados verificables (PDF + QR)
- [ ] Email sequences automáticas
- [ ] Pagos (Stripe / Wompi)
- [ ] Clonación de voz (ElevenLabs)
- [ ] Miniaturas automáticas (DALL-E)

**Pendiente — Fase 3:**
- [ ] Programa de afiliados
- [ ] Clips automáticos para redes
- [ ] Blog SEO automático
- [ ] Analytics avanzados
- [ ] Web scraping de leads potenciales

---

## 14. HeyGen — Generación avanzada de avatar IA

> **Nota:** HeyGen se agrega como segundo proveedor de avatar junto a D-ID, ofreciendo
> funcionalidades más avanzadas de personalización y calidad de video.

### 14.1 ¿Por qué HeyGen además de D-ID?

| Característica | D-ID (actual) | HeyGen (nuevo) |
|---|---|---|
| Calidad lip-sync | Buena | Superior (más natural) |
| Avatares stock | ~5 básicos | 100+ avatares diversos |
| Avatar personalizado | No | Sí (Instant Avatar desde foto/video) |
| Plantillas de escena | No | Sí (fondos, layouts, overlays) |
| Multilenguaje | Limitado | 40+ idiomas con lip-sync nativo |
| Modo presentación | No | Sí (avatar + slides lado a lado) |
| Interactividad | No | Sí (Interactive Avatar para tutores) |
| Streaming en tiempo real | No | Sí (avatar en vivo para demos) |
| API webhooks | Básicos | Completos (status callbacks) |
| Precio free tier | 5 min/mes | ~3 créditos (equivale a ~3 min) |

### 14.2 Funcionalidades HeyGen a integrar

#### 14.2.1 Selección de avatar avanzada
```
Opciones en el paso de configuración del curso:

1. AVATAR STOCK
   - Catálogo de 100+ avatares HeyGen
   - Filtros: género, etnia, edad, vestimenta
   - Preview en tiempo real antes de generar
   - Categorías: profesional, casual, educativo, corporativo

2. INSTANT AVATAR (avatar personalizado del creador)
   - El creador sube 1 foto frontal de alta calidad
   - HeyGen genera avatar personalizado del creador
   - El avatar habla con lip-sync natural
   - Ideal para "marca personal" del creador

3. PHOTO AVATAR
   - Similar a Instant Avatar pero desde múltiples fotos
   - Mayor precisión facial y expresiones
   - Requiere: 5 fotos con diferentes ángulos

4. STUDIO AVATAR (premium)
   - Avatar grabado en estudio virtual
   - El creador graba 2-5 minutos de video
   - HeyGen genera avatar hiperrealista
   - Máxima calidad, usado para cursos premium
```

#### 14.2.2 Plantillas de escena (Scene Templates)
```
Plantillas disponibles para videos de cursos:

1. PRESENTER MODE
   - Avatar de cuerpo medio + slides al fondo
   - Transiciones automáticas entre slides
   - Ideal para: cursos educativos, tutoriales

2. SPLIT SCREEN
   - Avatar a la izquierda (40%) + slides a la derecha (60%)
   - Barra de progreso inferior con título del módulo
   - Ideal para: cursos técnicos con mucho contenido visual

3. PICTURE-IN-PICTURE (PiP)
   - Slides en pantalla completa
   - Avatar pequeño en esquina (configurable: BL, BR, TL, TR)
   - Tamaño avatar configurable: 15%, 20%, 25% del frame
   - Ideal para: presentaciones con gráficos importantes

4. TALKING HEAD
   - Avatar en pantalla completa con fondo personalizado
   - Fondos: oficina, aula, estudio, gradiente, imagen custom
   - Texto animado overlay para puntos clave
   - Ideal para: introducciones, conclusiones, módulos narrativos

5. NEWS ANCHOR
   - Layout estilo noticiero/reportaje
   - Avatar centrado + banner inferior con título
   - Transiciones tipo broadcast
   - Ideal para: cursos de noticias, actualidad

6. WHITEBOARD
   - Avatar al costado + pizarra virtual animada
   - Puntos clave aparecen como escritura en pizarra
   - Ideal para: cursos educativos, explicaciones conceptuales
```

#### 14.2.3 Personalización de voz en HeyGen
```
Opciones de voz (complementan Edge TTS existente):

1. VOCES NATIVAS HEYGEN
   - 300+ voces en 40+ idiomas
   - Selección por idioma, género, estilo (narración, conversacional, energético)
   - Preview antes de generar

2. VOICE CLONE (HeyGen)
   - Clonar voz del creador con ~2 minutos de audio
   - Mayor naturalidad que voces genéricas
   - Vinculado al perfil del creador

3. EMOCIÓN Y ÉNFASIS
   - Configurar tono emocional: neutral, entusiasta, serio, cálido
   - Velocidad de habla: 0.75x a 1.5x
   - Pausas automáticas entre secciones
```

#### 14.2.4 Interactive Avatar (para tutor IA en tiempo real)
```
Funcionalidad futura (Fase 3):
- Avatar interactivo en el player de video
- El estudiante habla o escribe una pregunta
- El avatar del tutor responde en tiempo real con lip-sync
- Conectado al sistema RAG del curso
- Endpoint: POST /api/v1/interactive-avatar/session
- WebSocket para comunicación bidireccional
```

### 14.3 Modelo de datos — extensión para HeyGen

```sql
-- Agregar al modelo generation_configs / GenerationConfig en Prisma:
-- avatar_provider ahora incluye 'heygen' como opción
-- Nuevos campos:

heygen_config jsonb DEFAULT '{}',
-- Estructura del JSON:
-- {
--   "avatar_type": "stock" | "instant" | "photo" | "studio",
--   "avatar_id": "string",           -- ID del avatar en HeyGen
--   "scene_template": "presenter" | "split_screen" | "pip" | "talking_head" | "news_anchor" | "whiteboard",
--   "pip_position": "bottom_right" | "bottom_left" | "top_right" | "top_left",
--   "pip_size": 20,                  -- porcentaje del frame
--   "background": "office" | "classroom" | "studio" | "gradient" | "custom",
--   "background_custom_url": "string",
--   "voice_source": "heygen" | "edge_tts" | "clone",
--   "heygen_voice_id": "string",
--   "emotion": "neutral" | "enthusiastic" | "serious" | "warm",
--   "speed": 1.0,
--   "webhook_url": "string"
-- }
```

### 14.4 Endpoints HeyGen

```
POST   /api/v1/generation/heygen/avatars          → Lista avatares stock disponibles
POST   /api/v1/generation/heygen/instant-avatar    → Crear avatar desde foto del creador
GET    /api/v1/generation/heygen/templates          → Lista plantillas de escena
POST   /api/v1/generation/heygen/preview            → Generar preview de 15 seg con configuración
POST   /api/v1/generation/heygen/voice-clone        → Clonar voz del creador en HeyGen
GET    /api/v1/generation/heygen/voices              → Lista voces disponibles por idioma
POST   /api/v1/generation/heygen/generate            → Generar video completo de módulo
GET    /api/v1/generation/heygen/status/:videoId     → Consultar estado de generación
POST   /api/v1/generation/heygen/webhook             → Callback de HeyGen al completar video
```

### 14.5 Variables de entorno HeyGen

```bash
HEYGEN_API_KEY=           # API Key de la cuenta gratuita/pago
HEYGEN_WEBHOOK_SECRET=    # Secret para verificar webhooks
HEYGEN_CALLBACK_URL=      # URL pública para recibir callbacks
```

---

## 15. YouTube — Publicación automática y descubrimiento de contenido viral

### 15.1 Publicación automática de cursos a YouTube

#### 15.1.1 Flujo de publicación
```
1. CONEXIÓN DE CANAL
   - Creador conecta su cuenta de Google/YouTube via OAuth2
   - Se almacena refresh_token encriptado en DB
   - Se obtiene channel_id del canal principal
   - Puede conectar múltiples canales

2. CONFIGURACIÓN DE PUBLICACIÓN (tras aprobar módulos)
   - Seleccionar canal de YouTube destino
   - Privacidad: public | unlisted | private
   - Playlist: crear nueva o agregar a existente
   - Programar fecha/hora de publicación (o inmediata)
   - SEO automático: Claude genera title, description, tags optimizados
   - Miniatura: usar la generada o subir custom
   - Categoría de YouTube: Education, Science & Technology, News, etc.
   - Subtítulos: generar .srt automático desde el guión
   - End screen: enlace al siguiente módulo del curso
   - Cards: enlace a la plataforma para comprar curso completo

3. UPLOAD AUTOMÁTICO (Publisher Worker)
   - YouTube Data API v3: videos.insert con resumable upload
   - Upload por módulo o como video único (todos los módulos concatenados)
   - Metadata: título, descripción con timestamps, tags, categoría
   - Thumbnail: thumbnails.set con imagen generada
   - Playlist: playlistItems.insert para agregar a playlist
   - Subtítulos: captions.insert con archivo .srt
   - Notificación al creador al completar

4. POST-PUBLICACIÓN
   - Monitoreo de analytics básico (views, likes) via YouTube Analytics API
   - Almacenar video_id de YouTube en publication_schedules.results
   - Enlace directo al video en el dashboard del creador
   - Opción de actualizar metadata después de publicar
```

#### 15.1.2 Modelo de datos — YouTube

```sql
-- Nueva tabla
youtube_channels (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  channel_id TEXT NOT NULL,           -- YouTube channel ID
  channel_title TEXT,
  channel_thumbnail TEXT,
  access_token_encrypted TEXT,        -- Encriptado AES-256
  refresh_token_encrypted TEXT,       -- Encriptado AES-256
  token_expiry TIMESTAMP,
  scopes TEXT[],                      -- ['youtube.upload', 'youtube.readonly', ...]
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT now(),
  last_used_at TIMESTAMP
)

-- Nueva tabla
youtube_publications (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  module_id UUID REFERENCES course_modules(id) NULL,  -- NULL si es curso completo
  channel_id UUID REFERENCES youtube_channels(id),
  youtube_video_id TEXT,              -- ID del video en YouTube
  youtube_url TEXT,                   -- URL directa
  privacy TEXT DEFAULT 'unlisted',    -- public | unlisted | private
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  playlist_id TEXT,
  status TEXT DEFAULT 'pending',      -- pending | uploading | processing | published | failed
  metadata jsonb,                     -- título, descripción, tags usados
  analytics jsonb,                    -- views, likes, comments (actualizado periódicamente)
  error_log TEXT,
  created_at TIMESTAMP DEFAULT now()
)
```

#### 15.1.3 Endpoints YouTube

```
GET    /api/v1/youtube/auth-url                    → Genera URL OAuth2 para conectar canal
GET    /api/v1/youtube/callback                    → Callback OAuth2, guarda tokens
GET    /api/v1/youtube/channels                    → Lista canales conectados del usuario
DELETE /api/v1/youtube/channels/:id                → Desconectar canal
POST   /api/v1/youtube/publish                     → Publicar video(s) en YouTube
GET    /api/v1/youtube/publications/:courseId       → Estado de publicaciones del curso
PUT    /api/v1/youtube/publications/:id/metadata    → Actualizar metadata post-publicación
GET    /api/v1/youtube/analytics/:videoId           → Analytics básicos del video
```

### 15.2 Descubrimiento de contenido viral en YouTube

> **Objetivo:** Buscar videos virales en YouTube sobre temas religiosos, educativos y noticias,
> extraer contenido de forma inteligente, y generar material original para creación de cursos.
> Todo respetando derechos de autor — nunca copia literal.

#### 15.2.1 Flujo de descubrimiento de contenido viral
```
1. BÚSQUEDA DE VIDEOS VIRALES
   - El sistema busca videos en YouTube usando la API Search
   - Filtros aplicados:
     * Categorías: religiosos, educativos, noticias (configurable)
     * Mínimo 100,000 vistas O mínimo 5,000 likes
     * Publicados en los últimos 30 días (configurable: 7d, 30d, 90d, 1 año)
     * Idioma: español (configurable)
     * Duración: 5-60 minutos (configurable)
     * Ordenar por: relevance, viewCount, rating
   - UI muestra cards con: thumbnail, título, canal, vistas, likes, duración
   - El creador puede marcar videos como "interesantes" para procesar

2. TRANSCRIPCIÓN INTELIGENTE
   - Obtener subtítulos/transcripción del video seleccionado:
     * Opción A: YouTube Captions API (si el video tiene subtítulos)
     * Opción B: Descargar audio y transcribir con Whisper API (OpenAI)
     * Opción C: Transcripción por assembly.ai como alternativa
   - La transcripción RAW se almacena temporalmente (no se expone)

3. PROCESAMIENTO INTELIGENTE (Claude API)
   - Claude recibe la transcripción y genera contenido ORIGINAL:
     * Identifica temas principales y subtemas
     * Extrae datos, estadísticas y hechos verificables
     * Reformula COMPLETAMENTE el contenido (no parafrasea, sino crea nuevo)
     * Agrega perspectivas adicionales no cubiertas en el video original
     * Estructura como material de curso educativo
   - IMPORTANTE: El contenido generado es ORIGINAL e INDEPENDIENTE:
     * No usa las mismas frases ni estructura del video fuente
     * Agrega valor con información complementaria de la base de conocimiento
     * Cita fuentes externas verificables, no el video original
     * Cumple con fair use / uso legítimo de información factual

4. OPCIONES DE EXTENSIÓN/REDUCCIÓN
   - El creador elige la extensión del contenido generado:
     * EXTENSO (30-60 min de curso): Análisis profundo, múltiples módulos,
       ejemplos adicionales, ejercicios, contexto histórico
     * MEDIO (15-30 min): Contenido principal bien desarrollado,
       2-3 módulos, ejemplos clave
     * REDUCIDO (5-15 min): Resumen ejecutivo, 1-2 módulos,
       solo los puntos más importantes
     * MICRO (1-5 min): Formato short/reel, 1 punto clave con impacto
   - Claude ajusta la profundidad y estructura según la opción elegida
   - Preview del documento generado antes de pasar a creación de curso

5. GENERACIÓN DEL DOCUMENTO DE CURSO
   - Claude genera un documento estructurado con:
     * Título atractivo y SEO-friendly
     * Descripción del curso
     * Objetivos de aprendizaje
     * Módulos con contenido completo para narración
     * Puntos clave por módulo
     * Preguntas de reflexión o ejercicios
   - El documento se guarda como borrador editable
   - El creador puede modificar antes de proceder

6. CONEXIÓN CON PIPELINE DE GENERACIÓN EXISTENTE
   - El documento generado alimenta el flujo actual (Sección 13.6):
     * Paso 2: Configurar (voz, avatar D-ID/HeyGen, slides, duración)
     * Paso 3: Generación automática de video
     * Paso 4: Revisión y aprobación
   - Tras aprobación: publicación en YouTube + almacenamiento en RAG
```

#### 15.2.2 Categorías de búsqueda viral

```
RELIGIOSOS:
  - Palabras clave: biblia, torah, evangelio, predica, sermón, reflexión espiritual,
    enseñanza bíblica, parábola, salmos, profecía, estudio bíblico, fe,
    cristianismo, judaísmo, espiritualidad, devocional
  - YouTube categories: Education, People & Blogs, Nonprofits & Activism

EDUCATIVOS:
  - Palabras clave: curso, tutorial, clase, aprende, explicación, cómo funciona,
    ciencia, historia, matemáticas, programación, idiomas, filosofía,
    psicología, economía, finanzas personales, productividad
  - YouTube categories: Education, Science & Technology, Howto & Style

NOTICIAS:
  - Palabras clave: noticias hoy, última hora, análisis, opinión, debate,
    actualidad, reportaje, investigación, política, economía mundial,
    tecnología, cambio climático, sociedad
  - YouTube categories: News & Politics, Science & Technology
```

#### 15.2.3 Modelo de datos — Descubrimiento viral

```sql
-- Búsquedas realizadas
viral_searches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  category TEXT NOT NULL,             -- 'religious' | 'educational' | 'news'
  keywords TEXT[],                    -- Palabras clave usadas
  min_views INTEGER DEFAULT 100000,
  min_likes INTEGER DEFAULT 5000,
  date_range TEXT DEFAULT '30d',
  language TEXT DEFAULT 'es',
  results_count INTEGER,
  created_at TIMESTAMP DEFAULT now()
)

-- Videos virales encontrados y seleccionados
viral_videos (
  id UUID PRIMARY KEY,
  search_id UUID REFERENCES viral_searches(id),
  youtube_video_id TEXT NOT NULL,
  title TEXT,
  channel_name TEXT,
  channel_id TEXT,
  thumbnail_url TEXT,
  view_count BIGINT,
  like_count INTEGER,
  comment_count INTEGER,
  duration_seconds INTEGER,
  published_at TIMESTAMP,
  category TEXT,                      -- religious | educational | news
  is_selected BOOLEAN DEFAULT false,  -- Marcado por el creador
  transcription_status TEXT DEFAULT 'none', -- none | processing | done | failed
  created_at TIMESTAMP DEFAULT now()
)

-- Transcripciones y contenido procesado
viral_content_processing (
  id UUID PRIMARY KEY,
  viral_video_id UUID REFERENCES viral_videos(id),
  user_id UUID REFERENCES users(id),
  raw_transcription TEXT,             -- Transcripción original (temporal, se borra en 24h)
  processed_content TEXT,             -- Contenido original generado por Claude
  content_length TEXT,                -- 'extensive' | 'medium' | 'reduced' | 'micro'
  target_duration_minutes INTEGER,
  topics_extracted jsonb,             -- Temas identificados
  key_facts jsonb,                    -- Datos y hechos extraídos
  generated_document jsonb,           -- Documento de curso estructurado
  -- { title, description, objectives, modules: [{title, content, key_points}] }
  status TEXT DEFAULT 'pending',      -- pending | transcribing | processing | ready | used
  course_id UUID REFERENCES courses(id) NULL, -- Curso creado a partir de este contenido
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP
)
```

#### 15.2.4 Endpoints — Descubrimiento viral

```
POST   /api/v1/viral/search                        → Buscar videos virales con filtros
GET    /api/v1/viral/search/:id/results             → Resultados de una búsqueda
POST   /api/v1/viral/videos/:id/select              → Marcar video como interesante
POST   /api/v1/viral/videos/:id/transcribe          → Iniciar transcripción del video
GET    /api/v1/viral/videos/:id/transcription        → Estado/resultado de transcripción
POST   /api/v1/viral/process                        → Procesar transcripción → contenido original
PUT    /api/v1/viral/process/:id/length              → Cambiar extensión (extenso/medio/reducido/micro)
GET    /api/v1/viral/process/:id/preview             → Preview del documento generado
POST   /api/v1/viral/process/:id/create-course       → Crear curso desde contenido procesado
GET    /api/v1/viral/trending                        → Top 10 videos virales del día por categoría
GET    /api/v1/viral/history                         → Historial de búsquedas del usuario
```

#### 15.2.5 Prompt de procesamiento inteligente (Claude)

```
SYSTEM PROMPT para procesamiento de contenido viral:

Eres un experto en diseño instruccional y creación de contenido educativo original.
Se te proporcionará información factual extraída de una fuente de video.
Tu tarea es crear contenido COMPLETAMENTE ORIGINAL para un curso educativo.

REGLAS ESTRICTAS:
1. NUNCA copies frases, párrafos o estructura del contenido fuente
2. Usa la información factual como INSPIRACIÓN, no como base para parafrasear
3. Agrega perspectivas, contexto histórico y análisis que NO estén en la fuente
4. Cita fuentes académicas, libros o artículos reconocidos (no el video fuente)
5. Estructura el contenido como material pedagógico profesional
6. Incluye preguntas de reflexión y ejercicios prácticos
7. El resultado debe ser autosuficiente: alguien que nunca vio el video
   fuente debe entender perfectamente el curso

EXTENSIÓN SOLICITADA: {content_length}
- extensive: 30-60 min narración (~4,500-9,000 palabras), 4-8 módulos
- medium: 15-30 min narración (~2,250-4,500 palabras), 2-4 módulos
- reduced: 5-15 min narración (~750-2,250 palabras), 1-2 módulos
- micro: 1-5 min narración (~150-750 palabras), 1 módulo tipo short

CATEGORÍA: {category} (religious | educational | news)
IDIOMA: {language}

FORMATO DE SALIDA:
{
  "title": "Título atractivo y SEO del curso",
  "description": "Descripción de 2-3 párrafos",
  "target_audience": "Público objetivo",
  "objectives": ["Objetivo 1", "Objetivo 2", ...],
  "modules": [
    {
      "title": "Título del módulo",
      "content": "Contenido completo para narración",
      "key_points": ["Punto 1", "Punto 2"],
      "reflection_questions": ["¿Pregunta 1?"],
      "additional_resources": ["Recurso sugerido"]
    }
  ],
  "seo_tags": ["tag1", "tag2", ...],
  "disclaimer": "Este contenido es una creación original con fines educativos..."
}
```

### 15.3 Variables de entorno — YouTube

```bash
# YouTube Data API v3
YOUTUBE_API_KEY=                    # API Key para búsquedas públicas (viral search)
YOUTUBE_CLIENT_ID=                  # OAuth2 Client ID (para publicación)
YOUTUBE_CLIENT_SECRET=              # OAuth2 Client Secret
YOUTUBE_REDIRECT_URI=               # Callback URL para OAuth2

# Whisper (transcripción, alternativa a captions API)
OPENAI_API_KEY=                     # Ya existente, se reutiliza para Whisper

# AssemblyAI (alternativa de transcripción)
ASSEMBLYAI_API_KEY=
```

---

## 16. Base de conocimiento RAG — Almacenamiento automático de cursos en PDF

> **Objetivo:** Todo curso generado y aprobado se convierte automáticamente en un
> documento PDF y se ingesta en el sistema RAG, creando una base de conocimiento
> creciente que alimenta a los agentes IA.

### 16.1 Flujo de almacenamiento automático

```
1. TRIGGER: Curso pasa a estado APPROVED o PUBLISHED

2. GENERACIÓN DE PDF
   - Se genera un PDF profesional del curso con:
     * Portada con título, autor, fecha, categoría
     * Tabla de contenidos
     * Contenido completo de cada módulo (guión/narración)
     * Puntos clave resaltados
     * Preguntas de reflexión por módulo
     * Fuentes y recursos adicionales
     * Metadatos: curso_id, categoría, tags, fecha
   - Formato: A4, tipografía legible, branding de la plataforma
   - Almacenado en: /uploads/knowledge-base/{category}/{courseId}.pdf

3. INGESTA RAG AUTOMÁTICA
   - El PDF se procesa automáticamente:
     a. Extracción de texto completo
     b. Chunking inteligente (chunk_size: 512 tokens, overlap: 50)
     c. Generación de embeddings (text-embedding-3-small)
     d. Upsert en pgvector con metadata:
        { course_id, module_id, category, tags, chunk_index, created_at }
   - Los embeddings se almacenan en la tabla rag_documents

4. ACTUALIZACIÓN INCREMENTAL
   - Si un curso se actualiza (módulos editados/regenerados):
     * Se regenera el PDF
     * Se eliminan embeddings anteriores del curso
     * Se reingesan los nuevos embeddings
   - Si un curso se archiva: los embeddings se marcan como inactivos (no se borran)

5. USO POR AGENTES IA
   - Agente de ventas: busca en toda la base de conocimiento para recomendar cursos
   - Agente tutor: busca en los PDFs del curso específico + relacionados
   - Agente de soporte: busca en PDFs + documentación de la plataforma
   - Al generar nuevos cursos desde viral: busca en la base para no repetir contenido
```

### 16.2 Modelo de datos — Knowledge Base

```sql
-- Documentos de la base de conocimiento
knowledge_base_documents (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  title TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  file_path TEXT NOT NULL,            -- Ruta al PDF generado
  file_size_bytes INTEGER,
  page_count INTEGER,
  chunk_count INTEGER,                -- Número de chunks generados
  source_type TEXT DEFAULT 'course',  -- 'course' | 'viral_content' | 'manual_upload'
  viral_video_id UUID REFERENCES viral_videos(id) NULL,
  is_active BOOLEAN DEFAULT true,
  ingested_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
)

-- Embeddings (extiende la tabla rag_documents existente)
-- Se agrega referencia a knowledge_base_documents:
rag_documents (
  id UUID PRIMARY KEY,
  knowledge_base_doc_id UUID REFERENCES knowledge_base_documents(id) NULL,
  agent_config_id UUID NULL,
  course_id UUID NULL,
  title TEXT,
  content_text TEXT,                  -- Texto del chunk
  embedding vector(1536),            -- Embedding del chunk
  metadata jsonb,                    -- { module_id, chunk_index, category, source }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
)
```

### 16.3 Endpoints — Knowledge Base

```
GET    /api/v1/knowledge-base                       → Lista documentos de la base de conocimiento
GET    /api/v1/knowledge-base/:id                   → Detalle de un documento
GET    /api/v1/knowledge-base/:id/pdf               → Descargar PDF del documento
POST   /api/v1/knowledge-base/ingest/:courseId       → Forzar re-ingesta de un curso
POST   /api/v1/knowledge-base/search                → Búsqueda semántica en la base
DELETE /api/v1/knowledge-base/:id                   → Desactivar documento (soft delete)
GET    /api/v1/knowledge-base/stats                  → Estadísticas: total docs, chunks, por categoría
POST   /api/v1/knowledge-base/upload                 → Subir documento manual a la base (admin)
```

### 16.4 Búsqueda semántica para generación de cursos

```
Cuando se genera un curso nuevo (especialmente desde contenido viral):

1. Se busca en la base de conocimiento si ya existe contenido similar
2. Si existe: se alerta al creador para evitar duplicados
3. Si no existe: se usa el contexto de la base para enriquecer el nuevo curso
4. Al completar el curso: se agrega automáticamente a la base

Esto crea un ciclo virtuoso:
  Contenido viral → Curso original → PDF → RAG → Mejores cursos futuros
```

---

## 17. Flujo integrado completo — De video viral a curso publicado en YouTube

```
PASO 1: DESCUBRIMIENTO
  └─ Creador abre panel "Contenido Viral" en Studio
  └─ Selecciona categoría(s): religiosos, educativos, noticias
  └─ Sistema busca videos con 100K+ vistas o 5K+ likes
  └─ Muestra resultados con métricas y preview

PASO 2: SELECCIÓN Y TRANSCRIPCIÓN
  └─ Creador selecciona 1 o más videos interesantes
  └─ Sistema transcribe automáticamente (Captions API o Whisper)
  └─ Muestra transcripción con opción de ver puntos clave

PASO 3: PROCESAMIENTO INTELIGENTE
  └─ Claude procesa la transcripción → contenido 100% original
  └─ Creador elige extensión: extenso / medio / reducido / micro
  └─ Preview del documento generado con estructura de curso
  └─ Creador puede editar/ajustar antes de continuar

PASO 4: CONFIGURACIÓN DE GENERACIÓN
  └─ Seleccionar proveedor de avatar: D-ID / HeyGen (nuevo)
  └─ Si HeyGen: elegir avatar, plantilla de escena, voz, emoción
  └─ Si D-ID: flujo existente (5 avatares stock)
  └─ Configurar voz TTS, estilo de slides, duración
  └─ Verificar con base de conocimiento que no hay duplicados

PASO 5: GENERACIÓN AUTOMÁTICA
  └─ Pipeline existente genera el curso:
     ├─ Guión de narración por módulo
     ├─ Audio TTS
     ├─ Slides SVG
     ├─ Video con avatar (D-ID o HeyGen)
     └─ Ensamblado final con FFmpeg
  └─ Progreso en tiempo real en el dashboard

PASO 6: REVISIÓN Y APROBACIÓN
  └─ Creador revisa cada módulo en el player
  └─ Puede aprobar, editar guión y regenerar, o rechazar
  └─ Al aprobar todos los módulos → curso APPROVED

PASO 7: PUBLICACIÓN DUAL
  └─ Publicar en la plataforma CourseForge (existente)
  └─ Publicar en YouTube:
     ├─ Seleccionar canal conectado
     ├─ Configurar privacidad, playlist, programación
     ├─ Claude genera título, descripción, tags SEO para YouTube
     ├─ Upload automático con metadata y miniatura
     └─ Subtítulos .srt generados desde el guión

PASO 8: ALMACENAMIENTO EN BASE DE CONOCIMIENTO
  └─ PDF del curso generado automáticamente
  └─ Ingesta automática en sistema RAG (pgvector)
  └─ Disponible para agentes IA y búsqueda semántica
  └─ Enriquece futuros cursos generados
```

---

## 18. Frontend — Nuevas páginas requeridas

| Página | Ruta | Funcionalidad |
|---|---|---|
| Contenido Viral | `/dashboard/viral` | Panel de búsqueda y descubrimiento viral |
| Resultados Viral | `/dashboard/viral/resultados?searchId=X` | Videos encontrados con métricas |
| Procesar Video | `/dashboard/viral/procesar?videoId=X` | Transcripción + procesamiento + extensión |
| Preview Documento | `/dashboard/viral/preview?processId=X` | Preview/editar documento generado |
| Conectar YouTube | `/dashboard/youtube/conectar` | OAuth2 para conectar canal |
| Mis Canales | `/dashboard/youtube/canales` | Lista de canales conectados |
| Publicar YouTube | `/dashboard/youtube/publicar?courseId=X` | Configurar y publicar en YouTube |
| Publicaciones | `/dashboard/youtube/publicaciones` | Historial de publicaciones + analytics |
| Base Conocimiento | `/dashboard/conocimiento` | Explorar/buscar en la base RAG |
| Detalle Doc RAG | `/dashboard/conocimiento/detalle?id=X` | Ver documento + chunks + uso |

---

## 19. Nuevas variables de entorno (resumen)

```bash
# HeyGen (avatar avanzado)
HEYGEN_API_KEY=
HEYGEN_WEBHOOK_SECRET=
HEYGEN_CALLBACK_URL=

# YouTube (búsqueda + publicación)
YOUTUBE_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=

# AssemblyAI (transcripción alternativa)
ASSEMBLYAI_API_KEY=

# Las siguientes ya existen y se reutilizan:
# OPENAI_API_KEY (Whisper + embeddings)
# ANTHROPIC_API_KEY (Claude para procesamiento)
# DID_API_KEY (avatar alternativo)
```

---

*Última actualización: 27 de Marzo de 2026 — APIs configuradas, módulos YouTube/Viral/KnowledgeBase integrados*
*Aprobado por: propietario del proyecto*
