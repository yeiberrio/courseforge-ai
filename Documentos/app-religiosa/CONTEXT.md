# 📿 ANIMA MUNDI — Aplicación de Disciplina Espiritual y Filosófica
### Documento de Especificación Técnica y Funcional v1.0

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Plataformas Objetivo](#2-plataformas-objetivo)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Módulos de la Aplicación](#4-módulos-de-la-aplicación)
   - 4.1 [Módulo Católico — Devocionario](#41-módulo-católico--devocionario)
   - 4.2 [Módulo del Santo Rosario](#42-módulo-del-santo-rosario)
   - 4.3 [Módulo Bíblico](#43-módulo-bíblico)
   - 4.4 [Módulo Filosófico — Estoicismo](#44-módulo-filosófico--estoicismo)
   - 4.5 [Módulo del Torá](#45-módulo-del-torá)
5. [Sistema de Notificaciones](#5-sistema-de-notificaciones)
6. [Pantallas y Flujos de Navegación](#6-pantallas-y-flujos-de-navegación)
7. [Configuración y Personalización](#7-configuración-y-personalización)
8. [Base de Datos y Contenido](#8-base-de-datos-y-contenido)
9. [Diseño UI/UX](#9-diseño-uiux)
10. [Roadmap de Desarrollo](#10-roadmap-de-desarrollo)
11. [Estructura del Proyecto](#11-estructura-del-proyecto)

---

## 1. VISIÓN GENERAL DEL PROYECTO

**Anima Mundi** es una aplicación de disciplina espiritual y filosófica diseñada para acompañar al usuario en su vida de fe, reflexión y crecimiento interior. Integra la devoción católica con la sabiduría filosófica estoica y el estudio de las escrituras hebreas, ofreciendo una experiencia unificada de contemplación diaria.

### Propósito
Ser un compañero digital de vida espiritual que:
- Guíe la oración diaria (rosario, novenas, devocionarios).
- Entregue textos significativos de la Biblia, el Torá y el estoicismo.
- Permita el estudio profundo de textos sagrados y filosóficos.
- Configure recordatorios y notificaciones personalizadas de práctica espiritual.

### Audiencia Objetivo
- Católicos practicantes que desean estructurar su vida de oración.
- Personas interesadas en la filosofía estoica como complemento espiritual.
- Estudiantes de las escrituras judeo-cristianas.
- Cualquier persona en búsqueda de crecimiento interior y contemplación.

---

## 2. PLATAFORMAS OBJETIVO

| Plataforma | Prioridad | Estado |
|------------|-----------|--------|
| **Android** | 🔴 Primaria (MVP) | Desarrollo inicial |
| **iOS (iPhone)** | 🟡 Segunda fase | Planificado |
| **Web (PWA)** | 🟢 Tercera fase | Planificado |

### Estrategia Multiplataforma
Se utilizará **React Native** con **Expo** para maximizar la reutilización de código entre Android e iOS, y **React Native Web** para la versión web (PWA). Esto permite:
- ~90% de código compartido entre plataformas.
- Una sola base de código para mantener.
- Acceso a APIs nativas (notificaciones push, almacenamiento local).

---

## 3. STACK TECNOLÓGICO

### Frontend (Multiplataforma)
```
Framework:        React Native + Expo SDK 51+
Navegación:       React Navigation v6 (Stack + Bottom Tabs + Drawer)
Estado Global:    Zustand o Redux Toolkit
Estilos:          NativeWind (Tailwind para React Native)
Animaciones:      React Native Reanimated 3
Iconos:           Expo Vector Icons / custom SVGs
Tipografías:      Playfair Display (títulos), Inter (cuerpo)
```

### Backend y Datos
```
Base de Datos Local:    SQLite (via expo-sqlite) + AsyncStorage
Sincronización:         Firebase Firestore (opcional, para backup en la nube)
Autenticación:          Firebase Auth (Google Sign-In, Apple Sign-In)
Almacenamiento:         AsyncStorage para preferencias, SQLite para contenido
```

### Notificaciones
```
Push Notifications:  Expo Notifications (expo-notifications)
Scheduling:          Expo TaskManager + BackgroundFetch
Local Notifications: Programadas localmente sin servidor
```

### Contenido
```
Textos Bíblicos:     API de la Biblia (api.biblia.com) + cache local
Torá:               Sefaria API (sefaria.org/api) + textos locales
Contenido Católico:  Base de datos local curada en JSON/SQLite
Textos Estoicos:    Base de datos local (dominio público)
```

### Herramientas de Desarrollo
```
Lenguaje:        TypeScript
Linting:         ESLint + Prettier
Testing:         Jest + React Native Testing Library
CI/CD:           GitHub Actions + EAS Build (Expo Application Services)
Distribución:    Google Play Store (Android) → App Store (iOS)
```

---

## 4. MÓDULOS DE LA APLICACIÓN

---

### 4.1 Módulo Católico — Devocionario

#### 4.1.1 Devocionario General

Colección estructurada de oraciones y devociones católicas organizadas por categorías:

**Oraciones Fundamentales**
- Padre Nuestro
- Ave María
- Gloria
- Credo Apostólico / Niceno
- Ángelus (con opción de recordatorio a las 6am, 12pm y 6pm)
- Regina Coeli (para el tiempo pascual)
- Salve Regina
- Sub Tuum Praesidium

**Oraciones de la Misa**
- Acto de Contrición
- Acto de Fe / Esperanza / Caridad
- Oración antes de la Comunión
- Oración de Acción de Gracias post Comunión
- Oración por los difuntos

**Devociones al Sagrado Corazón**
- Letanías del Sagrado Corazón
- Consagración al Sagrado Corazón
- Oración de los Primeros Viernes

**Devoción a la Divina Misericordia**
- Coronilla de la Divina Misericordia (paso a paso guiado)
- Hora de la Misericordia (3pm)
- Chaplet completo con audio guía (opcional)

---

#### 4.1.2 Novenas a Santos

Cada novena incluye:
- Introducción al santo/santa
- 9 días de oraciones numeradas
- Oración final de petición
- Contador de progreso (día actual / 9)
- Opción de recordatorio diario automático durante los 9 días
- Historia breve del santo

**Catálogo de Novenas incluidas:**

| Santo/Virgen | Festividad | Intención Principal |
|---|---|---|
| San José | 19 de marzo | Familia, trabajo, moribundos |
| Santa Teresa de Ávila | 15 de octubre | Vida interior, oración |
| San Francisco de Asís | 4 de octubre | Paz, naturaleza, pobreza |
| San Judas Tadeo | 28 de octubre | Causas difíciles/desesperadas |
| Santa Rita de Cascia | 22 de mayo | Causas imposibles |
| San Antonio de Padua | 13 de junio | Objetos perdidos, matrimonio |
| San Miguel Arcángel | 29 de septiembre | Protección espiritual |
| Santa Teresita del Niño Jesús | 1 de octubre | Misiones, enfermos |
| San Juan de la Cruz | 14 de diciembre | Noche oscura del alma |
| San Ignacio de Loyola | 31 de julio | Discernimiento, vocación |
| San Pedro y San Pablo | 29 de junio | Iglesia, liderazgo |
| San Agustín de Hipona | 28 de agosto | Conversión, inteligencia |

**Novenas a la Virgen María:**

| Advocación | Festividad | Característica |
|---|---|---|
| Nuestra Señora de Guadalupe | 12 de diciembre | Patrona de América |
| Nuestra Señora del Carmen | 16 de julio | Escapulario, muerte santa |
| Nuestra Señora de Fátima | 13 de mayo | Los tres secretos |
| Inmaculada Concepción | 8 de diciembre | Pureza, dogma mariano |
| Nuestra Señora de Lourdes | 11 de febrero | Enfermos, sanación |
| Nuestra Señora de la Medalla Milagrosa | 27 de noviembre | Conversión, protección |
| Nuestra Señora del Rosario | 7 de octubre | Oración del rosario |
| Asunción de la Virgen | 15 de agosto | Muerte, vida eterna |

---

### 4.2 Módulo del Santo Rosario

#### 4.2.1 Guía Paso a Paso para Rezar el Rosario

La guía es completamente interactiva, con pantalla dividida que muestra:
- Ilustración del misterio actual (arte sacro clásico)
- Texto de la oración en pantalla
- Indicador de qué cuenta de la cadena del rosario se está rezando
- Botón "Siguiente" para avanzar manualmente O temporizador automático

**Estructura del Rosario (paso a paso):**

```
INICIO DEL ROSARIO
├── [Paso 1]  Señal de la Cruz
├── [Paso 2]  Credo Apostólico (en el crucifijo)
├── [Paso 3]  Padre Nuestro (primera cuenta grande)
├── [Paso 4]  3x Ave María por Fe, Esperanza y Caridad
├── [Paso 5]  Gloria
│
PRIMER MISTERIO
├── [Paso 6]  Anuncio del Misterio + Meditación breve (30 seg)
├── [Paso 7]  Padre Nuestro
├── [Paso 8]  10x Ave María (con contador visual 1→10)
├── [Paso 9]  Gloria
├── [Paso 10] Oración de Fátima (Oh Jesús mío...)
│
[Se repite para los 5 Misterios]
│
FIN DEL ROSARIO
├── [Último] Salve Regina
└── [Final]  Letanías Lauretanas (opcional)
```

#### 4.2.2 Los Cuatro Series de Misterios

**🌅 Misterios Gozosos** (Lunes y Sábado)
1. La Anunciación del Ángel a María
2. La Visitación de María a Santa Isabel
3. El Nacimiento de Jesús en Belén
4. La Presentación del Niño Jesús en el Templo
5. El Niño Jesús Perdido y Hallado en el Templo

**✨ Misterios Luminosos** (Jueves) — *Añadidos por San Juan Pablo II*
1. El Bautismo de Jesús en el Jordán
2. Las Bodas de Caná
3. El Anuncio del Reino de Dios
4. La Transfiguración en el Monte Tabor
5. La Institución de la Eucaristía

**🩸 Misterios Dolorosos** (Martes y Viernes)
1. La Agonía de Jesús en el Huerto de Getsemaní
2. La Flagelación de Jesús en la Columna
3. La Coronación de Espinas
4. Jesús con la Cruz a Cuestas Camino al Calvario
5. La Crucifixión y Muerte de Nuestro Señor

**👑 Misterios Gloriosos** (Miércoles y Domingo)
1. La Resurrección de Jesús
2. La Ascensión de Jesús al Cielo
3. La Venida del Espíritu Santo en Pentecostés
4. La Asunción de María al Cielo
5. La Coronación de María como Reina del Cielo y la Tierra

**Asignación por día de la semana (según tradición):**

| Día | Misterios |
|-----|-----------|
| Lunes | Gozosos |
| Martes | Dolorosos |
| Miércoles | Gloriosos |
| Jueves | Luminosos |
| Viernes | Dolorosos |
| Sábado | Gozosos |
| Domingo | Gloriosos |

> 💡 El usuario puede cambiar manualmente qué misterio rezar independientemente del día.

#### 4.2.3 Características Interactivas del Rosario
- **Modo Audio:** Lectura en voz alta de cada oración (Text-to-Speech o grabaciones).
- **Modo Meditación:** Pausa de 30-60 segundos entre cada misterio con música instrumental.
- **Contador de Rosarios:** Registro histórico de rosarios completados.
- **Rosario Virtual:** Animación de las cuentas del rosario avanzando.
- **Calendario Mariano:** Sugiere intenciones de oración según el día litúrgico.

---

### 4.3 Módulo Bíblico

#### 4.3.1 Mensajes Push y Textos Significativos

**Categorías de textos bíblicos para notificaciones:**

- 📖 **Salmos** — Oraciones, alabanza, lamento, confianza en Dios
- 💡 **Proverbios** — Sabiduría práctica para la vida diaria
- 🕊️ **Evangelios** — Palabras y parábolas de Jesús
- ✉️ **Cartas Paulinas** — Fe, amor, gracia (Romanos, Corintios, Filipenses...)
- 🌿 **Antiguo Testamento** — Historias de fe, profetas, creación
- 🙏 **Bienaventuranzas** — Sermón del Monte (Mt 5-7)
- 💪 **Textos de Fortaleza** — Versículos para momentos difíciles
- ❤️ **Textos de Amor** — "Dios es amor", Juan 3:16, etc.

#### 4.3.2 Plan de Lectura Bíblica
- Lectura del día según el **Leccionario Romano** (ciclos A, B, C).
- Planes personalizados: Biblia en 1 año, 6 meses, Nuevo Testamento en 90 días.
- Marcadores y notas personales sobre versículos.
- Historial de lecturas completadas.

#### 4.3.3 Versículo del Día
- Un versículo significativo presentado cada mañana con diseño visual atractivo.
- Opción de compartir el versículo en redes sociales.
- Guardado en favoritos.

---

### 4.4 Módulo Filosófico — Estoicismo

#### 4.4.1 Marco Aurelio y las Meditaciones

**Biblioteca completa de *Meditaciones* (Τὰ εἰς ἑαυτόν)**

Organización por libros (I–XII) con:
- Texto completo en español (traducción de dominio público mejorada).
- Texto original en griego (opcional, para estudio avanzado).
- Notas de contexto histórico.
- Citas destacadas marcables como favoritas.

**Reflexiones diarias de Marco Aurelio:**
Selección curada de las mejores citas organizadas por tema:

| Tema | Ejemplo de Cita |
|------|----------------|
| El presente | *"Confínate al presente."* — IV.3 |
| La muerte | *"La pérdida no es otra cosa que cambio."* — IX.28 |
| El deber | *"Actúa sin esperar recompensa."* — IX.42 |
| La razón | *"Todo tiene su raíz en la razón."* — IV.3 |
| Los demás | *"Comienza la mañana diciéndote: encontraré intromisión..."* — II.1 |

#### 4.4.2 Los Grandes Estoicos

**Biblioteca de autores estoicos:**

**Epicteto** (50–135 d.C.)
- *Enquiridión* (Manual) — completo, capítulo por capítulo.
- *Discursos* (selección de los 4 libros).
- Conceptos clave: la dicotomía del control (*eph' hēmin / ouk eph' hēmin*).

**Séneca** (4 a.C.–65 d.C.)
- *Cartas a Lucilio* (selección de las 124 epístolas).
- *Sobre la brevedad de la vida* — completo.
- *Sobre la tranquilidad del alma* — completo.
- *Sobre la firmeza del sabio* — completo.

**Zenón de Citio** (334–262 a.C.)
- Fundador del estoicismo. Fragmentos conservados.
- Contexto histórico y filosófico.

**Crisipo de Solos** (279–206 a.C.)
- Sistematizador del estoicismo. Fragmentos.

**Musonio Rufo** (30–100 d.C.)
- *Discursos* — selección comentada.

#### 4.4.3 Conceptos Estoicos — Glosario y Estudio

**Diccionario de términos clave:**

| Término Griego | Pronunciación | Significado |
|---|---|---|
| *Logos* | LO-gos | Razón universal que gobierna el cosmos |
| *Eudaimonia* | eu-dai-mo-NI-a | Florecimiento / felicidad verdadera |
| *Arete* | a-RE-te | Virtud / excelencia moral |
| *Apatheia* | a-PA-thei-a | Ausencia de pasiones irracionales |
| *Ataraxia* | a-ta-RAX-ia | Tranquilidad del alma, serenidad |
| *Prohairesis* | pro-HAI-re-sis | Facultad de elección moral |
| *Hegemonikon* | he-ge-MO-ni-kon | La parte directriz del alma (razón) |
| *Kathêkon* | ka-THE-kon | Acción apropiada / deber |
| *Phantasia* | phan-TA-si-a | Impresión / representación mental |
| *Synkatathesis* | syn-ka-TA-the-sis | Asentimiento a una impresión |
| *Oikeiôsis* | oi-kei-O-sis | Apropiación / afinidad natural |
| *Memento Mori* | latín | Recuerda que morirás |
| *Amor Fati* | latín | Amor al destino |
| *Summum Bonum* | latín | El bien supremo (la virtud) |

**Las Cuatro Virtudes Cardinales Estoicas:**
1. **Sabiduría (Sophia/Prudentia)** — discernir el bien del mal.
2. **Justicia (Dikaiosyne/Iustitia)** — dar a cada uno lo que le corresponde.
3. **Fortaleza (Andreia/Fortitudo)** — resistir el dolor y el temor.
4. **Templanza (Sophrosyne/Temperantia)** — moderar los deseos.

#### 4.4.4 Ejercicios Espirituales Estoicos (Askesis)

Prácticas diarias guiadas:
- **Meditación matutina (Praemeditatio Malorum):** Anticipa los desafíos del día.
- **Revisión nocturna:** 3 preguntas de Marco Aurelio antes de dormir.
- **Journaling estoico:** Plantilla de diario filosófico.
- **Visualización negativa:** Ejercicio guiado semanal.
- **Dicotomía del control:** Separar lo que depende de ti de lo que no.

#### 4.4.5 Citas Estoicas Push
Envío de citas filosóficas programadas a lo largo del día, seleccionables por autor y tema.

---

### 4.5 Módulo del Torá

#### 4.5.1 Estructura del Torá

El Torá (תּוֹרָה) contiene los cinco libros de Moisés:

| Libro hebreo | Nombre español | Contenido principal |
|---|---|---|
| **Bereshit** (בְּרֵאשִׁית) | Génesis | Creación, patriarcas, José en Egipto |
| **Shemot** (שְׁמוֹת) | Éxodo | Moisés, plagas, Sinaí, los 10 mandamientos |
| **Vayikra** (וַיִּקְרָא) | Levítico | Leyes de pureza, sacrificios, santidad |
| **Bamidbar** (בְּמִדְבַּר) | Números | El desierto, los censos, las tribus |
| **Devarim** (דְּבָרִים) | Deuteronomio | Discursos finales de Moisés, repaso de la Ley |

#### 4.5.2 Parashat HaShavua — Porción Semanal de la Torá

El ciclo anual de lectura de la Torá divide el texto en **54 porciones semanales (parashiyot)**:

- Notificación cada **Shabat (viernes al atardecer)** con la porción de la semana.
- Texto completo de la porción en español + hebreo (transliterado).
- Comentario introductorio breve sobre el tema de la parashá.
- Pregunta de reflexión semanal.
- Calendario completo de las 54 parashiyot con fechas del año hebreo.

#### 4.5.3 Contenido de Estudio del Torá

**Textos y comentarios incluidos:**
- Torá completa en español (traducción académica).
- Texto en hebreo con transliteración (para pronunciación).
- Selección de comentarios de **Rashi** (principales notas).
- Introducción a los **613 mandamientos (Mitzvot)** — los 10 primeros detallados.
- Glosario de términos hebreos fundamentales.

**Glosario básico de términos:**

| Término | Pronunciación | Significado |
|---|---|---|
| *Torah* | to-RÁ | La Ley / los cinco libros de Moisés |
| *Mitzvah* | mitz-VÁ | Mandamiento / buena acción |
| *Shabbat* | sha-BÁT | El sábado / día de descanso |
| *Teshuvah* | te-shu-VÁ | Arrepentimiento / retorno |
| *Chesed* | JÉ-sed | Amor misericordioso / bondad |
| *Emet* | É-met | Verdad |
| *Shalom* | sha-LÓM | Paz / plenitud / totalidad |
| *Kadosh* | ka-DÓSH | Santo / separado para Dios |
| *Adonai* | a-do-NÁI | Señor (nombre de Dios) |
| *Elohim* | e-lo-HÍM | Dios (nombre de poder) |

#### 4.5.4 Mensajes Push del Torá
- Versículos diarios del Torá con contexto.
- Enseñanzas de los grandes maestros (Maimonides, Hillel, etc.).
- Proverbios y máximas del libro de Proverbios / Eclesiastés.

---

## 5. SISTEMA DE NOTIFICACIONES

### 5.1 Arquitectura de Notificaciones

El sistema de notificaciones es completamente **local** (no requiere conexión a internet una vez instalada la app). Utiliza `expo-notifications` con programación persistente.

```
Tipos de Notificación
├── 🔔 Recordatorio de Oración     → Oración del Ángelus, Rosario, etc.
├── 📖 Texto Bíblico               → Versículo del día, pasaje aleatorio
├── 🧘 Cita Estoica                → Marco Aurelio, Epicteto, Séneca
├── ✡️  Texto del Torá              → Versículo / enseñanza del Torá
├── 🕯️  Aviso de Novena             → Recordatorio del día X de novena
└── 📅  Liturgia del Día            → Lectura del día litúrgico
```

### 5.2 Configuración por Módulo

Cada módulo tiene su propia sección de configuración de notificaciones:

#### Panel de Control de Notificaciones

**Para cada tipo de notificación, el usuario puede configurar:**

| Parámetro | Opciones |
|-----------|---------|
| **Activado/Desactivado** | Toggle on/off |
| **Frecuencia** | 1x / 2x / 3x / 4x / personalizado por día |
| **Horarios específicos** | Selección de hora exacta por slot |
| **Días de la semana** | Selección individual (L M X J V S D) |
| **Tipo de contenido** | Categorías específicas (ej: solo Salmos, solo Marco Aurelio) |
| **Estilo de notificación** | Solo texto / con imagen de fondo |

#### Presets de Rutinas Espirituales

**Rutina "Disciplina Matutina" (recomendada)**
```
06:00 — Versículo bíblico del día
06:30 — Cita estoica matutina (Praemeditatio)
07:00 — Recordatorio del Ángelus
```

**Rutina "Pausa de Mediodía"**
```
12:00 — Ángelus del mediodía
12:15 — Reflexión del Torá
13:00 — Proverbio o Salmo
```

**Rutina "Noche de Paz"**
```
18:00 — Ángelus vespertino
20:00 — Cita de Séneca sobre la tranquilidad
21:30 — Recordatorio de revisión nocturna estoica
22:00 — Oración de cierre del día
```

**Rutina "Inmersión Filosófica"**
```
07:00 — Marco Aurelio (Meditaciones)
12:00 — Epicteto (Enquiridión)
19:00 — Séneca (Cartas a Lucilio)
```

### 5.3 Especificaciones Técnicas de Notificaciones

```typescript
// Estructura de una notificación programada
interface SpiritualNotification {
  id: string;
  type: 'bible' | 'stoic' | 'prayer' | 'torah' | 'novena' | 'liturgy';
  title: string;
  body: string;
  source?: string;           // Ej: "Filipenses 4:7" | "Marco Aurelio, Med. IV.3"
  scheduledTime: Date;
  repeat: 'daily' | 'weekly' | 'once' | 'custom';
  daysOfWeek?: number[];     // 0=Dom, 1=Lun...6=Sab
  isEnabled: boolean;
  category?: string;         // Subcategoría del contenido
  imageUri?: string;         // Imagen de fondo opcional
}
```

---

## 6. PANTALLAS Y FLUJOS DE NAVEGACIÓN

### 6.1 Estructura de Navegación

```
App
├── OnboardingStack (primer uso)
│   ├── WelcomeScreen
│   ├── ReligiousPreferencesScreen
│   └── NotificationSetupScreen
│
└── MainApp (Bottom Tab Navigator)
    ├── 🏠 Inicio (HomeStack)
    │   ├── DashboardScreen
    │   ├── DailyVerseScreen
    │   └── TodayLiturgyScreen
    │
    ├── 📿 Oración (PrayerStack)
    │   ├── PrayerMenuScreen
    │   ├── RosaryGuideScreen
    │   │   ├── MysterySelectionScreen
    │   │   └── RosaryStepScreen
    │   ├── NovenaListScreen
    │   │   └── NovenaDetailScreen (con día actual)
    │   ├── DevotionaryScreen
    │   └── DivineMessyScreen
    │
    ├── 📖 Escrituras (ScriptureStack)
    │   ├── BibleMenuScreen
    │   ├── BibleReadingScreen
    │   ├── TorahMenuScreen
    │   │   ├── ParashatScreen
    │   │   └── TorahBookScreen
    │   └── FavoritesScreen
    │
    ├── 🏛️ Filosofía (PhilosophyStack)
    │   ├── StoicMenuScreen
    │   ├── MarcusAureliusScreen
    │   ├── EpictetusScreen
    │   ├── SenecaScreen
    │   ├── StoicGlossaryScreen
    │   └── DailyStoicExerciseScreen
    │
    └── ⚙️ Ajustes (SettingsStack)
        ├── SettingsMenuScreen
        ├── NotificationsConfigScreen
        │   ├── BibleNotificationsScreen
        │   ├── StoicNotificationsScreen
        │   ├── PrayerNotificationsScreen
        │   └── TorahNotificationsScreen
        ├── AppearanceScreen
        ├── LanguageScreen
        └── AboutScreen
```

### 6.2 Pantallas Principales — Descripción

#### 🏠 Dashboard (Pantalla de Inicio)
- **Saludo personalizado** según hora del día ("Buenos días", "Buenas tardes", "Buenas noches").
- **Sección "Para hoy"** con el versículo del día, cita estoica y misterio del rosario asignado.
- **Tarjeta de Novena activa** con el día actual si hay una en curso.
- **Botón de acceso rápido** al Rosario.
- **Calendario litúrgico** del día (color litúrgico, celebración del día).
- **Streak / racha de días** de práctica espiritual.

#### 📿 Guía del Rosario (pantalla central)
- Indicador visual de cuenta actual (bolitas del rosario animadas).
- Texto de la oración en tamaño grande y legible.
- Imagen del misterio actual (arte sacro).
- Botones: Anterior / Siguiente / Pausar / Modo Audio.
- Indicador de progreso: Misterio X de 5.

#### ⚙️ Configuración de Notificaciones
- Pantalla principal con toggles por categoría.
- Al tocar cada categoría → pantalla detallada con:
  - Selector de frecuencia (slider o radio buttons).
  - Selector de horarios (time pickers).
  - Selector de días de la semana.
  - Filtro de subcategorías de contenido.

---

## 7. CONFIGURACIÓN Y PERSONALIZACIÓN

### 7.1 Preferencias del Usuario

```typescript
interface UserPreferences {
  // Perfil espiritual
  tradition: 'catholic' | 'universal';     // Tipo de tradición
  rosaryMystery: 'auto' | 'manual';        // Asignación de misterios
  bibleVersion: 'NVI' | 'RVR1960' | 'DHH' | 'NBLH'; // Versión bíblica
  liturgicalCalendar: 'roman' | 'off';     // Calendario romano

  // Apariencia
  theme: 'light' | 'dark' | 'sepia' | 'night';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'sans-serif';

  // Idioma
  language: 'es' | 'en' | 'la';           // Español / Inglés / Latín
  torahLanguage: 'es' | 'he_transliterated' | 'he'; // Para el Torá

  // Contenido
  enabledModules: {
    catholic: boolean;
    rosary: boolean;
    bible: boolean;
    stoic: boolean;
    torah: boolean;
  };

  // Notificaciones (ver sección 5)
  notifications: NotificationPreferences;
}
```

### 7.2 Temas Visuales

| Tema | Descripción | Uso ideal |
|------|-------------|-----------|
| **Luz del Alba** | Blancos y dorados, tipografía clara | Mañana, luminoso |
| **Pergamino** | Tonos sepia, estilo manuscrito medieval | Lectura, estudio |
| **Noche Profunda** | Fondo negro, textos en oro | Noche, modo oscuro |
| **Piedra Antigua** | Grises y tierra, austero | Estoicismo, estudio |
| **Verde Esperanza** | Verdes suaves, natural | Meditación, calma |

---

## 8. BASE DE DATOS Y CONTENIDO

### 8.1 Estructura SQLite Local

```sql
-- Tabla de contenido bíblico
CREATE TABLE bible_verses (
  id INTEGER PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  version TEXT DEFAULT 'NVI',
  tags TEXT,  -- JSON array: ["fortaleza", "amor", "esperanza"]
  is_featured INTEGER DEFAULT 0
);

-- Tabla de citas estoicas
CREATE TABLE stoic_quotes (
  id INTEGER PRIMARY KEY,
  author TEXT NOT NULL,  -- 'marco_aurelio' | 'epicteto' | 'seneca'
  work TEXT NOT NULL,    -- 'meditaciones' | 'enchiridion' | 'cartas'
  book_chapter TEXT,     -- Referencia (ej: "IV.3", "Carta VII")
  text TEXT NOT NULL,
  theme TEXT,            -- 'control' | 'muerte' | 'virtud' | 'tiempo' etc.
  original_greek TEXT,   -- Texto en griego (opcional)
  is_featured INTEGER DEFAULT 0
);

-- Tabla de oraciones
CREATE TABLE prayers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'fundamental' | 'novena' | 'rosario' | 'misericordia'
  saint TEXT,
  text TEXT NOT NULL,
  day_number INTEGER,  -- Para novenas (1-9)
  novena_id INTEGER,   -- Referencia a la novena padre
  sort_order INTEGER DEFAULT 0
);

-- Tabla del Torá
CREATE TABLE torah_verses (
  id INTEGER PRIMARY KEY,
  book TEXT NOT NULL,    -- 'bereshit' | 'shemot' | etc.
  parasha TEXT,          -- Nombre de la porción semanal
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text_es TEXT NOT NULL,  -- Español
  text_he TEXT,           -- Hebreo
  text_transliterated TEXT, -- Transliteración
  parasha_week INTEGER    -- Número de semana del ciclo anual (1-54)
);

-- Progreso del usuario
CREATE TABLE user_progress (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,  -- 'rosary' | 'novena' | 'bible_reading' | 'torah_study'
  reference_id TEXT,
  completed_at DATETIME,
  streak_date DATE,
  notes TEXT
);

-- Favoritos
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_note TEXT
);
```

### 8.2 Fuentes de Contenido

| Contenido | Fuente | Licencia |
|-----------|--------|----------|
| Biblia NVI | API externa (api.biblia.com) | Licenciada |
| Biblia RVR 1960 | Dominio público | Libre |
| Torá en español | Sefaria.org API | CC BY-NC |
| Meditaciones (Marco Aurelio) | Traducción propia/dominio público | Libre |
| Enquiridión (Epicteto) | Traducción adaptada dominio público | Libre |
| Cartas de Séneca | Traducción dominio público | Libre |
| Oraciones católicas | Base curada propia | Propio |
| Arte sacro (imágenes) | Wikimedia Commons | CC/Dominio público |

---

## 9. DISEÑO UI/UX

### 9.1 Principios de Diseño

1. **Serenidad visual** — Sin distracciones; espacios en blanco generosos; tipografía legible.
2. **Reverencia estética** — Arte sacro, iconografía clásica, ornamentos discretos.
3. **Accesibilidad** — Tamaños de fuente ajustables, contraste alto, modo oscuro.
4. **Flujo meditativo** — Transiciones suaves, sin animaciones bruscas.
5. **Una cosa a la vez** — Cada pantalla tiene un único propósito claro.

### 9.2 Paleta de Colores

```
Primario:      #4A2F6E   (Púrpura profundo — sabiduría, espiritualidad)
Secundario:    #C9963A   (Dorado — lo sagrado, lo divino)
Fondo Claro:   #FAF6F0   (Crema suave — papel antiguo)
Fondo Oscuro:  #1A1420   (Noche profunda)
Acento Verde:  #2D6A4F   (Verde esperanza — vida)
Acento Rojo:   #8B2635   (Rojo carmesí — pasión, mártires)
Texto:         #2C2C2C   (Casi negro — legibilidad)
Texto Suave:   #6B6B6B   (Gris — texto secundario)
```

### 9.3 Tipografía

```
Títulos:       Playfair Display Bold — elegancia clásica
Subtítulos:    Playfair Display Italic
Cuerpo:        EB Garamond 12pt — textos de lectura larga
UI Elements:   Inter Regular — legibilidad en interfaz
Citas:         EB Garamond Italic — diferenciación visual
Hebreo:        Frank Ruhl Libre — tipografía hebrea elegante
```

### 9.4 Iconografía

- Icono de la app: Cruz estilizada entrelazada con estelas filosóficas (minimalista).
- Iconos de módulos: Línea fina estilo sagrado/medieval.
- Fondo del Rosario: Ilustración de la cadena del rosario SVG animada.

---

## 10. ROADMAP DE DESARROLLO

### Fase 1 — MVP Android (3-4 meses)

**Sprint 1 (Semanas 1-2): Configuración** ✅ COMPLETADO
- [x] Setup del proyecto Expo SDK 55 + TypeScript
- [x] Configuración de navegación (Expo Router — file-based routing, 5 tabs)
- [x] Base de datos SQLite (expo-sqlite) + seed de contenido completo
- [x] Sistema de theming con NativeWind (Tailwind CSS)
- [x] Estado global con Zustand (preferencias + progreso)
- [x] Estructura de carpetas (app/, src/components, src/data, src/database, src/services, src/store, src/hooks, src/theme, src/utils)

**Sprint 2 (Semanas 3-4): Módulo del Rosario** ✅ COMPLETADO
- [x] Pantalla del guía del rosario paso a paso (73 pasos interactivos)
- [x] Los 4 series de misterios con contenido completo (Gozosos, Luminosos, Dolorosos, Gloriosos)
- [x] Selector de misterios manual + asignación automática por día
- [x] Contador visual de cuentas del rosario (RosaryCounter)
- [x] Barra de progreso general + indicador de misterio/ave maría
- [x] Contador de rosarios completados (persistido en AsyncStorage)

**Sprint 3 (Semanas 5-6): Devocionario y Novenas** ✅ COMPLETADO
- [x] Biblioteca de 10 oraciones fundamentales (Padre Nuestro, Ave María, Gloria, Credo, Salve, Contrición, Ángelus, Sub Tuum, Regina Coeli, Señal de la Cruz)
- [x] Letanías del Sagrado Corazón + Consagración
- [x] Coronilla de la Divina Misericordia + Oración de la Hora
- [x] Oraciones de la Misa (Actos de Fe/Esperanza/Caridad, Comunión, Difuntos)
- [x] Oración a San Miguel Arcángel
- [x] Magnificat
- [x] Oraciones de protección nocturna + Bendición de la mesa
- [x] 12 novenas completas (9 días c/u con oraciones individuales):
  - Santos: San José, San Judas Tadeo, Santa Teresa de Ávila, San Francisco de Asís, San Antonio de Padua, San Miguel Arcángel, Santa Rita de Cascia, San Ignacio de Loyola, San Agustín
  - Virgen María: Guadalupe, Carmen, Fátima, Inmaculada Concepción
- [x] Sistema de seguimiento de novenas con progreso por día
- [x] NovenaProgressBar visual (9 segmentos)

**Sprint 4 (Semanas 7-8): Módulo Bíblico** ✅ COMPLETADO
- [x] Base de datos local con 120 versículos curados (RVR 1960)
- [x] Versículo del día (rotación automática basada en día del año)
- [x] Categorías: Salmos (12), Proverbios (11), Eclesiastés (3), Isaías (5), Jeremías (3), AT varios (6), Evangelios (19), Cartas Paulinas (20), Cartas Generales (7), Apocalipsis (2)
- [x] Tags por tema: confianza, fortaleza, amor, paz, esperanza, fe, sabiduría, etc.
- [x] Sistema de favoritos (SQLite)
- [x] VerseCard componente reutilizable con estilos bible/stoic/torah

**Sprint 5 (Semanas 9-10): Módulo Estoico** ✅ COMPLETADO
- [x] 75 citas curadas de 6 autores:
  - Marco Aurelio (24 citas, Meditaciones Libros II-XII)
  - Epicteto (19 citas, Enquiridión + Discursos)
  - Séneca (22 citas, Cartas a Lucilio + De Brevitate Vitae + De Tranquillitate + De Constantia + De Ira + De Providentia)
  - Musonio Rufo (3 citas, Discursos)
  - Crisipo (1 cita, Fragmentos)
  - Zenón de Citio (2 citas, Fragmentos)
- [x] 3 ejercicios espirituales estoicos guiados (Praemeditatio Malorum, Revisión Nocturna, Dicotomía del Control)
- [x] Glosario filosófico (9 términos con definiciones)
- [x] QuoteDisplay componente reutilizable
- [x] Cita estoica del día (rotación automática)

**Sprint 6 (Semanas 11-12): Módulo Torá** ✅ COMPLETADO
- [x] Los 5 libros de Moisés con nombres hebreo/español
- [x] Glosario hebreo (10 términos fundamentales)
- [x] Integración API dual: Sefaria (hebreo) + bolls.life (español RV1960)
- [x] Navegación funcional: Libro → Lista de capítulos → Lectura versículo a versículo
- [x] Texto bilingüe: hebreo con nikkud (derecha a izquierda) + español RV1960
- [x] Parashat HaShavua (porción semanal) desde API de Sefaria + texto español
- [x] Indicadores de carga y manejo de errores de red

**Sprint 7 (Semanas 13-14): Notificaciones** ✅ COMPLETADO
- [x] Dependencias instaladas (expo-notifications, expo-task-manager)
- [x] NotificationService completo (413 líneas): programación, contenido aleatorio, canales Android
- [x] useNotifications hook (192 líneas): API completa para UI
- [x] Panel de configuración de notificaciones (toggles por categoría, selectores hora/día)
- [x] 4 presets de rutinas espirituales (Matutina, Mediodía, Noche, Filosófica)
- [x] Notificaciones de prueba por categoría
- [x] Persistencia de preferencias en AsyncStorage + Zustand

**Sprint 7.5: Corrección de bugs y UX en dispositivo** ✅ COMPLETADO
- [x] Fix: JS bundle no incluido en APK debug (Unable to load script)
- [x] Fix: Node.js 18 incompatible con Expo 55 → migración a Node 22
- [x] Fix: Safe area inferior — tab bar y botones no se solapan con navegación del sistema
- [x] Fix: Botones del Rosario y Novenas respetan safe area inferior
- [x] Fix: Pantalla de carga con spinner mientras se inicializa la DB (en vez de splash infinito)
- [x] Fix: Seed de base de datos con manejo de errores y logs de depuración
- [x] Fix: Categorías de Biblia funcionales (Salmos, Proverbios, Evangelios, etc. cargan versículos reales)
- [x] Fix: Categorías de oración muestran lista completa (no solo la primera oración)
- [x] Módulo Filosofía: añadidos 3 autores (Musonio Rufo, Crisipo, Zenón) + sección Virtudes Cardinales

**Sprint 8 (Semanas 15-16): Pulido y Lanzamiento** ⏳ PENDIENTE
- [ ] Testing completo en Android
- [ ] Optimización de rendimiento
- [ ] Subida a Google Play Store (Beta cerrada)

---

### Fase 1.5 — Mejoras pendientes antes de lanzamiento

**Novenas — Guía paso a paso detallada** ⏳ PENDIENTE (prioridad alta)
- [ ] Rediseñar las novenas como experiencia guiada similar al Rosario:
  - Paso a paso interactivo con botón "Siguiente" / "Anterior"
  - Oración de apertura → Oración del día → Petición → Oración final
  - Indicador visual de progreso (día actual, paso actual dentro del día)
- [ ] Contenido detallado de cada novena:
  - Oración de apertura común (Señal de la Cruz, Acto de Contrición)
  - Meditación/reflexión específica del día
  - Oración propia de cada día (las 9 oraciones individuales)
  - Petición personal (campo editable)
  - Oración final (Padre Nuestro, Ave María, Gloria)
  - Letanías del santo/virgen (cuando aplique)
- [ ] Recordatorio por notificaciones:
  - Al iniciar una novena, programar automáticamente 9 recordatorios diarios
  - Hora configurable por el usuario
  - Notificación: "Día X de 9 — Novena a [Santo]. Toca para continuar."
  - Cancelar recordatorios al completar o abandonar la novena
- [ ] Añadir más novenas con contenido completo:
  - Nuestra Señora de Lourdes, Nuestra Señora de la Medalla Milagrosa
  - Nuestra Señora del Rosario, Asunción de la Virgen
  - Santa Teresita del Niño Jesús, San Juan de la Cruz, San Pedro y San Pablo

**Notificaciones — Validación en dispositivo** ⏳ PENDIENTE
- [ ] Verificar que las notificaciones locales se disparan correctamente en Android
- [ ] Probar persistencia de notificaciones tras reinicio del dispositivo
- [ ] Integrar recordatorios de novena con el sistema de notificaciones

**Contenido adicional** ⏳ PENDIENTE
- [ ] Más versículos bíblicos (ampliar de 120 a 300+)
- [ ] Más citas estoicas (ampliar de 75 a 150+)
- [ ] Textos completos de obras estoicas (Enquiridión, Cartas selectas de Séneca)
- [ ] Cache local para textos del Torá descargados (modo offline)

---

### Fase 2 — iOS (1-2 meses adicionales)
- [ ] Adaptación específica para iOS (UIKit integrations)
- [ ] Apple Push Notifications (APNs)
- [ ] Subida a App Store

### Fase 3 — Web/PWA (1-2 meses adicionales)
- [ ] Configuración React Native Web
- [ ] Service Workers para notificaciones web
- [ ] Hosting (Vercel / Firebase Hosting)
- [ ] Modo offline completo

---

## 11. ESTRUCTURA DEL PROYECTO

```
anima-mundi/
├── 📁 app/                          # Expo Router (o src/)
│   ├── 📁 (tabs)/                   # Bottom tab navigation
│   │   ├── index.tsx                # Dashboard / Inicio
│   │   ├── prayer.tsx               # Módulo de Oración
│   │   ├── scripture.tsx            # Biblia + Torá
│   │   ├── philosophy.tsx           # Estoicismo
│   │   └── settings.tsx             # Configuración
│   └── 📁 screens/                  # Pantallas específicas
│
├── 📁 src/
│   ├── 📁 components/               # Componentes reutilizables
│   │   ├── RosaryCounter.tsx
│   │   ├── VerseCard.tsx
│   │   ├── NovenaProgressBar.tsx
│   │   ├── QuoteDisplay.tsx
│   │   └── NotificationToggle.tsx
│   │
│   ├── 📁 screens/                  # Pantallas por módulo
│   │   ├── 📁 rosary/
│   │   ├── 📁 novenas/
│   │   ├── 📁 bible/
│   │   ├── 📁 stoic/
│   │   ├── 📁 torah/
│   │   └── 📁 settings/
│   │
│   ├── 📁 data/                     # Datos estáticos y seeds
│   │   ├── prayers.json
│   │   ├── novenas.json
│   │   ├── mysteries.json
│   │   ├── stoic_quotes.json
│   │   ├── torah_glossary.json
│   │   └── liturgical_calendar.json
│   │
│   ├── 📁 database/                 # SQLite
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── 📁 services/                 # Lógica de negocio
│   │   ├── NotificationService.ts
│   │   ├── BibleApiService.ts
│   │   ├── SefariaApiService.ts
│   │   └── ContentService.ts
│   │
│   ├── 📁 store/                    # Estado global (Zustand)
│   │   ├── userPreferencesStore.ts
│   │   ├── progressStore.ts
│   │   └── notificationsStore.ts
│   │
│   ├── 📁 hooks/                    # Custom hooks
│   │   ├── useRosary.ts
│   │   ├── useNovena.ts
│   │   └── useNotifications.ts
│   │
│   ├── 📁 theme/                    # Estilos globales
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── themes.ts
│   │
│   └── 📁 utils/                    # Utilidades
│       ├── liturgicalCalendar.ts
│       ├── dateHelpers.ts
│       └── contentSelector.ts
│
├── 📁 assets/
│   ├── 📁 images/                   # Arte sacro, iconos
│   ├── 📁 fonts/                    # Playfair Display, EB Garamond
│   └── 📁 sounds/                   # Música meditativa (opcional)
│
├── app.json                         # Configuración Expo
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📌 NOTAS FINALES

### Consideraciones Importantes

1. **Derechos de autor del contenido bíblico:** La versión NVI requiere licencia. Para MVP, usar RVR 1960 (dominio público) o Reina-Valera Contemporánea (RVC).

2. **Torá y Sefaria:** La API de Sefaria es gratuita para uso no comercial. Si la app tiene monetización, revisar términos de licencia CC BY-NC.

3. **Privacidad:** Todos los datos del usuario (progreso espiritual, notas, favoritos) deben almacenarse **localmente** por defecto. La sincronización en la nube es opcional y opt-in.

4. **Monetización sugerida:**
   - **Gratuito:** Contenido básico de todos los módulos.
   - **Premium (suscripción):** Contenido extendido, audio guiado del rosario, planes de lectura avanzados, sin límites de notificaciones.

5. **Accesibilidad:** Implementar soporte para lectores de pantalla (TalkBack en Android, VoiceOver en iOS) desde el inicio.

6. **Modo sin conexión:** Todo el contenido principal debe estar disponible offline. Solo la sincronización de progreso en la nube requiere conexión.

---

*Documento elaborado para: Anima Mundi v1.0*
*Fecha: Marzo 2026*
*Plataforma inicial: Android (APK + Google Play)*
*Tecnología: React Native + Expo*
