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

*Última actualización: Marzo 2026*
*Aprobado por: propietario del proyecto*
*Próximo paso: iniciar Fase 1 con setup del monorepo y schema de Supabase*
