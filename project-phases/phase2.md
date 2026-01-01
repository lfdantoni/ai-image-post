# Fase 2: Preview Instagram y Generación de Captions con IA

## Resumen Ejecutivo

Este documento detalla las especificaciones para la Fase 2 de **AIGram**, enfocada en la simulación visual de posts de Instagram y la generación de captions/hashtags mediante IA.

**Duración estimada:** 3-4 semanas  
**Dependencias:** Fase 1 completada  
**Nuevas integraciones:** OpenAI API (GPT-4), RiteTag API (opcional)

---

## 1. Funcionalidades de esta Fase

### 1.1 Preview de Post Individual
- Simulación visual del post como se vería en Instagram
- Vista de feed (cómo aparece al hacer scroll)
- Vista de perfil (cómo se ve en el grid 3x4)
- Soporte para todos los aspect ratios de Instagram

### 1.2 Preview de Grid de Perfil
- Visualización del grid completo del usuario
- Drag & drop para reordenar posts planificados
- Indicador de cómo el nuevo post afectará el grid
- Placeholders para posts futuros

### 1.3 Preview de Carrusel
- Simulación de carrusel con swipe (hasta 20 slides)
- Indicadores de navegación (dots)
- Preview de cada slide individual
- Vista combinada del carrusel

### 1.4 Generación de Captions con IA
- Generación basada en el prompt de la imagen
- Múltiples tonos: profesional, casual, inspiracional, humorístico
- Control de longitud del caption
- Inclusión de emojis opcional
- Call-to-action automático

### 1.5 Generación de Hashtags con IA
- Hashtags relevantes basados en prompt e imagen
- Categorización: trending, nicho, branded
- Límite configurable (recomendado 5-15)
- Detección de hashtags baneados
- Grupos de hashtags guardables

---

## 2. Diseño de Interfaz de Usuario

### 2.1 Referencias de Diseño

**Aplicaciones de referencia a investigar:**
- **Preview App**: Grid ilimitado, filtros, simulación de feed
- **Planoly**: Vista de grid con drag & drop, calendario visual
- **Later**: Media library, visual planner, preview de grid
- **Inpreview**: Simulación de feed con filtros ajustables
- **Hopper HQ Grid Planner**: Herramienta gratuita de preview

**Elementos clave a replicar:**
- Frame de iPhone/Android simulando la app de Instagram
- Header con avatar, nombre de usuario, menú
- Área de imagen con aspect ratio correcto
- Sección de likes, caption, hashtags
- Iconos oficiales de Instagram (corazón, comentario, compartir, guardar)

### 2.2 Wireframes

#### 2.2.1 Pantalla de Creación de Post

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Galería                        Crear Post                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                             │  │                                 │  │
│  │   PREVIEW DE INSTAGRAM      │  │   CONFIGURACIÓN DEL POST       │  │
│  │   ┌───────────────────┐     │  │                                 │  │
│  │   │  📷 usuario_demo  │     │  │   Caption                      │  │
│  │   ├───────────────────┤     │  │   ┌─────────────────────────┐  │  │
│  │   │                   │     │  │   │                         │  │  │
│  │   │                   │     │  │   │  Escribe tu caption...  │  │  │
│  │   │     IMAGEN        │     │  │   │                         │  │  │
│  │   │                   │     │  │   └─────────────────────────┘  │  │
│  │   │                   │     │  │                                 │  │
│  │   ├───────────────────┤     │  │   [✨ Generar con IA]          │  │
│  │   │ ♡  💬  ➤    🔖   │     │  │                                 │  │
│  │   │ 1,234 likes       │     │  │   Hashtags                     │  │
│  │   │ usuario_demo ...  │     │  │   ┌─────────────────────────┐  │  │
│  │   │ Ver 50 comentarios│     │  │   │ #aiart #digitalart ...  │  │  │
│  │   └───────────────────┘     │  │   └─────────────────────────┘  │  │
│  │                             │  │                                 │  │
│  │   [Feed] [Grid] [Story]     │  │   [🏷️ Generar hashtags]        │  │
│  │                             │  │                                 │  │
│  └─────────────────────────────┘  │   Opciones                      │  │
│                                   │   ☑️ Incluir emojis             │  │
│                                   │   ☐ Primera línea como hook    │  │
│                                   │   ☐ Agregar CTA al final       │  │
│                                   │                                 │  │
│                                   └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              [Guardar borrador]    [Copiar al portapapeles]     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.2.2 Modal de Generación de Caption con IA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Generar Caption con IA                    ✕    │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  Basado en tu prompt:                                            │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ "A mystical forest with glowing mushrooms, ethereal         │ │ │
│  │  │  lighting, fantasy art style..."                            │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Tono del caption                                                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │ 🎨       │ │ 😊       │ │ 💼       │ │ ✨       │            │ │
│  │  │Artístico │ │ Casual   │ │Profesional│ │Inspirador│            │ │
│  │  │    ✓     │ │          │ │          │ │          │            │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │ │
│  │                                                                   │ │
│  │  Longitud                                                        │ │
│  │  ○ Corto (1-2 líneas)                                           │ │
│  │  ● Medio (3-5 líneas)                                           │ │
│  │  ○ Largo (párrafo completo)                                     │ │
│  │                                                                   │ │
│  │  Opciones adicionales                                            │ │
│  │  ☑️ Incluir emojis relevantes                                    │ │
│  │  ☑️ Agregar pregunta para engagement                             │ │
│  │  ☐ Incluir call-to-action                                       │ │
│  │                                                                   │ │
│  │  Idioma: [Español ▼]                                             │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  Caption generado:                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ ✨ Cuando la naturaleza sueña, nacen bosques como este...   │ │ │
│  │  │                                                             │ │ │
│  │  │ Cada hongo luminoso es un pequeño faro en la oscuridad,    │ │ │
│  │  │ recordándonos que la magia existe en los rincones más      │ │ │
│  │  │ inesperados 🍄💫                                            │ │ │
│  │  │                                                             │ │ │
│  │  │ ¿Qué lugar mágico te gustaría visitar?                     │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  [🔄 Regenerar]  [📋 Copiar]                                     │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                          [Cancelar]    [Usar este caption]        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.2.3 Preview de Grid de Perfil

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Volver                        Vista de Grid                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │   ┌─────┐   usuario_demo                                         │ │
│  │   │ 👤  │   24 publicaciones · 1.2K seguidores                   │ │
│  │   └─────┘                                                         │ │
│  │                                                                   │ │
│  │   [Publicaciones]  [Reels]  [Etiquetados]                        │ │
│  │   ─────────────────                                               │ │
│  │                                                                   │ │
│  │   ┌────────┬────────┬────────┐                                   │ │
│  │   │ ✨NUEVO │        │        │  ← Post planificado              │ │
│  │   │        │   02   │   03   │    (borde punteado)               │ │
│  │   │   01   │        │        │                                   │ │
│  │   ├────────┼────────┼────────┤                                   │ │
│  │   │        │        │        │                                   │ │
│  │   │   04   │   05   │   06   │                                   │ │
│  │   │        │        │        │                                   │ │
│  │   ├────────┼────────┼────────┤                                   │ │
│  │   │        │        │        │                                   │ │
│  │   │   07   │   08   │   09   │                                   │ │
│  │   │        │        │        │                                   │ │
│  │   └────────┴────────┴────────┘                                   │ │
│  │                                                                   │ │
│  │   Arrastra para reordenar los posts planificados                 │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│   Posts planificados: 3                                                │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                 │
│   │  +   │ │ img1 │ │ img2 │ │ img3 │                                 │
│   │ Add  │ │      │ │      │ │      │                                 │
│   └──────┘ └──────┘ └──────┘ └──────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.2.4 Preview de Carrusel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Volver                      Preview Carrusel                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │     ┌───────────────────────────────────────────────┐           │   │
│  │     │  📷 usuario_demo                    •••       │           │   │
│  │     ├───────────────────────────────────────────────┤           │   │
│  │     │                                               │           │   │
│  │     │                                               │           │   │
│  │     │              ◀  SLIDE 1/5  ▶                 │           │   │
│  │     │                                               │           │   │
│  │     │                                               │           │   │
│  │     │                   • ○ ○ ○ ○                   │           │   │
│  │     ├───────────────────────────────────────────────┤           │   │
│  │     │ ♡  💬  ➤                              🔖     │           │   │
│  │     └───────────────────────────────────────────────┘           │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Slides del carrusel:                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │  1   │ │  2   │ │  3   │ │  4   │ │  5   │ │  +   │               │
│  │  ✓   │ │      │ │      │ │      │ │      │ │ Add  │               │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                                         │
│  [Reordenar slides]  [Eliminar seleccionado]  [Agregar más]           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Especificaciones de Instagram a Replicar

#### Dimensiones del Preview (2025)

```
Feed Post Preview:
- Ancho del contenedor: 375px (simula iPhone)
- Header: 60px altura (avatar 32px, nombre, menú)
- Imagen: Ancho 375px, altura según aspect ratio
- Action bar: 40px (iconos de interacción)
- Likes: 20px
- Caption area: Variable (max 2 líneas collapsed)

Grid Preview:
- Nuevo formato 2025: 3:4 aspect ratio en grid
- Tamaño de celda: ~124px x 165px (en preview)
- Gap entre celdas: 2px
- 3 columnas

Story Preview:
- Dimensiones: 9:16 (1080x1920)
- En preview: ~200px x 355px
```

#### Colores de Instagram UI

```css
/* Instagram UI Colors */
--ig-primary-background: #ffffff;
--ig-secondary-background: #fafafa;
--ig-border: #dbdbdb;
--ig-text-primary: #262626;
--ig-text-secondary: #8e8e8e;
--ig-link: #00376b;
--ig-blue: #0095f6;
--ig-red-like: #ed4956;
--ig-gradient-start: #f09433;
--ig-gradient-end: #bc1888;
```

---

## 3. Instrucciones de Implementación

### 3.1 Componente: InstagramPostPreview

**Ubicación:** `components/preview/InstagramPostPreview.tsx`

**Instrucciones para la AI:**
```
Crear un componente React que simule visualmente un post de Instagram.

Props requeridas:
- imageUrl: string (URL de la imagen)
- username: string (nombre de usuario a mostrar)
- avatarUrl?: string (opcional, avatar del usuario)
- caption?: string (texto del caption)
- hashtags?: string[] (array de hashtags)
- likesCount?: number (número de likes simulado)
- aspectRatio: "portrait" | "square" | "landscape" (4:5, 1:1, 1.91:1)

Características:
- Header con avatar circular, username, y menú de 3 puntos
- Imagen con el aspect ratio correcto
- Barra de acciones con iconos: corazón, comentario, compartir, guardar
- Contador de likes
- Caption con username en bold, expandible si es largo
- Hashtags en color azul (#00376b)
- "Ver todos los comentarios" link
- Timestamp "hace X tiempo"

Usar iconos de Lucide React para: Heart, MessageCircle, Send, Bookmark, MoreHorizontal

Estilo: Simular exactamente la UI de Instagram con bordes redondeados sutiles,
sombras suaves, y la tipografía característica (usar font-family: -apple-system, 
BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)
```

### 3.2 Componente: InstagramGridPreview

**Ubicación:** `components/preview/InstagramGridPreview.tsx`

**Instrucciones para la AI:**
```
Crear un componente que muestre una simulación del grid de perfil de Instagram.

Props requeridas:
- images: Array<{id: string, thumbnailUrl: string, isPlanned?: boolean}>
- plannedImages: Array<{id: string, thumbnailUrl: string, position: number}>
- username: string
- onReorder: (newOrder: string[]) => void

Características:
- Header simulando perfil de Instagram (avatar, stats, bio placeholder)
- Grid de 3 columnas con aspect ratio 3:4 (nuevo formato 2025)
- Posts planificados con borde punteado y badge "Nuevo"
- Drag and drop para reordenar posts planificados (usar @dnd-kit/core)
- Hover effect mostrando icono de múltiples fotos si es carrusel
- Gap de 2px entre celdas
- Scroll infinito o paginación

El componente debe mostrar cómo se vería el perfil con los nuevos posts
intercalados en las posiciones planificadas.
```

### 3.3 Componente: CarouselPreview

**Ubicación:** `components/preview/CarouselPreview.tsx`

**Instrucciones para la AI:**
```
Crear un componente que simule un carrusel de Instagram.

Props requeridas:
- slides: Array<{id: string, imageUrl: string, aspectRatio: string}>
- username: string
- onSlideChange?: (index: number) => void
- onAddSlide?: () => void
- onRemoveSlide?: (id: string) => void
- onReorderSlides?: (newOrder: string[]) => void
- maxSlides?: number (default 20)

Características:
- Navegación con swipe (usar touch events o librería como react-swipeable)
- Indicadores de puntos en la parte inferior
- Flechas de navegación izquierda/derecha en hover
- Contador "1/5" en la esquina superior derecha
- Todos los slides deben tener el mismo aspect ratio (heredado del primero)
- Thumbnails de slides debajo del preview principal
- Drag and drop para reordenar slides
- Botón para agregar más slides (hasta el máximo)

Animación de transición suave entre slides (300ms ease-in-out)
```

### 3.4 Componente: CaptionGenerator

**Ubicación:** `components/ai/CaptionGenerator.tsx`

**Instrucciones para la AI:**
```
Crear un componente modal para generar captions con IA.

Props requeridas:
- prompt: string (el prompt original de la imagen)
- imageUrl?: string (para análisis visual opcional)
- onCaptionGenerated: (caption: string) => void
- onClose: () => void

Estados internos:
- tone: "artistic" | "casual" | "professional" | "inspirational"
- length: "short" | "medium" | "long"
- includeEmojis: boolean
- includeQuestion: boolean
- includeCTA: boolean
- language: "es" | "en" | "pt" (etc)
- isGenerating: boolean
- generatedCaption: string
- error: string | null

Características:
- Mostrar el prompt original como contexto
- Selector visual de tono (4 opciones con iconos)
- Radio buttons para longitud
- Checkboxes para opciones adicionales
- Selector de idioma
- Botón "Generar" que llama a la API
- Área de resultado con el caption generado
- Botones: "Regenerar", "Copiar", "Usar este caption"
- Loading state con skeleton o spinner

El componente NO debe hacer la llamada a la API directamente,
debe usar un hook personalizado useGenerateCaption().
```

### 3.5 Componente: HashtagGenerator

**Ubicación:** `components/ai/HashtagGenerator.tsx`

**Instrucciones para la AI:**
```
Crear un componente para generar y gestionar hashtags con IA.

Props requeridas:
- prompt: string
- currentHashtags: string[]
- onHashtagsChange: (hashtags: string[]) => void
- maxHashtags?: number (default 30, recomendado 15)

Estados internos:
- suggestedHashtags: Array<{tag: string, category: "trending" | "niche" | "branded", selected: boolean}>
- isGenerating: boolean
- customHashtag: string (para agregar manualmente)

Características:
- Input para agregar hashtags manualmente
- Botón "Generar con IA" que sugiere hashtags
- Hashtags mostrados como badges/chips con categoría por color:
  - Trending: verde
  - Nicho: azul
  - Branded: morado
- Click para seleccionar/deseleccionar
- Contador de hashtags seleccionados (X/30)
- Advertencia si se detectan hashtags baneados (mostrar en rojo)
- Opción de guardar como "Grupo de hashtags" para reusar

Grupos de hashtags guardados deben mostrarse en un dropdown
para selección rápida.
```

### 3.6 API Route: Caption Generation

**Ubicación:** `app/api/ai/caption/route.ts`

**Instrucciones para la AI:**
```
Crear una API route de Next.js que genere captions usando OpenAI.

Request body esperado:
{
  prompt: string,           // Prompt original de la imagen
  imageAnalysis?: string,   // Descripción de la imagen (opcional)
  tone: "artistic" | "casual" | "professional" | "inspirational",
  length: "short" | "medium" | "long",
  includeEmojis: boolean,
  includeQuestion: boolean,
  includeCTA: boolean,
  language: string          // Código ISO del idioma
}

Respuesta:
{
  caption: string,
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  }
}

Implementación:
1. Validar request con Zod
2. Verificar autenticación del usuario
3. Construir el system prompt para OpenAI con instrucciones específicas según:
   - Tono seleccionado
   - Longitud deseada (short: 50-100 chars, medium: 100-300, long: 300-500)
   - Si incluir emojis (máximo 3-5 relevantes)
   - Si incluir pregunta de engagement al final
   - Si incluir CTA (ej: "Link en bio", "Guarda este post", etc)
4. Llamar a OpenAI API con modelo gpt-4o-mini (más económico)
5. Retornar caption generado

Rate limiting: Máximo 10 requests por minuto por usuario.
Usar streaming si el caption es largo.
```

**System Prompt sugerido para OpenAI:**
```
Eres un experto en marketing de redes sociales especializado en Instagram.
Tu tarea es crear captions atractivos basados en el prompt usado para generar
una imagen con IA.

Reglas:
- El caption debe ser en {language}
- Tono: {tone}
- Longitud: {length_description}
- {emoji_instruction}
- {question_instruction}
- {cta_instruction}

El caption debe:
1. Capturar la esencia y emoción de la imagen descrita
2. Ser auténtico y no sonar como generado por IA
3. Incentivar el engagement (likes, comentarios, guardados)
4. No usar hashtags (se agregan por separado)

Prompt de la imagen: {prompt}

Genera solo el caption, sin explicaciones adicionales.
```

### 3.7 API Route: Hashtag Generation

**Ubicación:** `app/api/ai/hashtags/route.ts`

**Instrucciones para la AI:**
```
Crear una API route que genere hashtags relevantes usando OpenAI.

Request body esperado:
{
  prompt: string,
  caption?: string,
  count: number,           // Número de hashtags deseados (5-30)
  categories: {
    trending: boolean,     // Hashtags populares/virales
    niche: boolean,        // Hashtags específicos del nicho
    branded: boolean       // Hashtags de marca personal
  }
}

Respuesta:
{
  hashtags: Array<{
    tag: string,           // Sin el símbolo #
    category: "trending" | "niche" | "branded",
    isBanned: boolean      // Si es un hashtag problemático
  }>
}

Implementación:
1. Validar request
2. Construir prompt para OpenAI pidiendo hashtags JSON
3. Parsear respuesta JSON
4. (Opcional) Validar contra lista de hashtags baneados conocidos
5. Retornar hashtags categorizados

Lista de hashtags baneados comunes a filtrar:
- #adulting, #alone, #always, #armparty, #asiangirl, #assday, #beautyblogger (etc)
Mantener una lista en constantes o base de datos.
```

### 3.8 Hook: useGenerateCaption

**Ubicación:** `hooks/useGenerateCaption.ts`

**Instrucciones para la AI:**
```
Crear un hook personalizado para manejar la generación de captions.

Retorno del hook:
{
  generateCaption: (params: CaptionParams) => Promise<string>,
  isGenerating: boolean,
  error: string | null,
  lastCaption: string | null,
  regenerate: () => Promise<string>,
  reset: () => void
}

Características:
- Manejo de estado de loading
- Cache del último caption generado
- Función regenerate que usa los mismos parámetros
- Manejo de errores con mensajes amigables
- Abort controller para cancelar requests pendientes
```

### 3.9 Hook: useGenerateHashtags

**Ubicación:** `hooks/useGenerateHashtags.ts`

**Instrucciones para la AI:**
```
Crear un hook similar para hashtags.

Retorno:
{
  generateHashtags: (params: HashtagParams) => Promise<Hashtag[]>,
  isGenerating: boolean,
  error: string | null,
  suggestedHashtags: Hashtag[],
  selectHashtag: (tag: string) => void,
  deselectHashtag: (tag: string) => void,
  selectedHashtags: string[],
  reset: () => void
}

Debe manejar la selección/deselección de hashtags sugeridos
y mantener sincronizado el estado.
```

---

## 4. Modelo de Datos Adicional

### 4.1 Actualización del Schema Prisma

**Instrucciones para la AI:**
```
Agregar los siguientes modelos al schema.prisma existente:

model Post {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Puede ser single image o carousel
  type            PostType @default(SINGLE)
  
  // Imágenes del post
  images          PostImage[]
  
  // Contenido
  caption         String?  @db.Text
  hashtags        String[] // Array de hashtags sin #
  
  // Metadata de generación
  captionTone     String?
  captionLanguage String?
  
  // Estado
  status          PostStatus @default(DRAFT)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  scheduledAt     DateTime? // Para fase futura de scheduling
  
  @@index([userId])
  @@index([status])
}

model PostImage {
  id          String  @id @default(cuid())
  postId      String
  post        Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  imageId     String
  image       Image   @relation(fields: [imageId], references: [id])
  order       Int     // Orden en el carrusel
  
  @@unique([postId, order])
}

model HashtagGroup {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  hashtags  String[]
  createdAt DateTime @default(now())
  
  @@unique([userId, name])
}

enum PostType {
  SINGLE
  CAROUSEL
}

enum PostStatus {
  DRAFT
  READY
  SCHEDULED  // Para fase futura
  PUBLISHED  // Para fase futura
}
```

---

## 5. Configuración de OpenAI

### 5.1 Variables de Entorno

```env
# Agregar a .env.local

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...  # Opcional

# Rate limiting
CAPTION_RATE_LIMIT_PER_MINUTE=10
HASHTAG_RATE_LIMIT_PER_MINUTE=20
```

### 5.2 Configuración del Cliente OpenAI

**Ubicación:** `lib/openai.ts`

**Instrucciones para la AI:**
```
Crear configuración del cliente OpenAI con:
- Inicialización del cliente con API key desde env
- Funciones helper para:
  - generateCaption(params): Genera caption con streaming opcional
  - generateHashtags(params): Genera hashtags en formato JSON
  - analyzeImage(imageUrl): Analiza imagen con GPT-4 Vision (para futuro)
- Manejo de errores específicos de OpenAI
- Retry logic con exponential backoff
- Logging de uso de tokens para monitoreo de costos
```

---

## 6. Dependencias Adicionales

```json
{
  "dependencies": {
    "openai": "^4.70.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react-swipeable": "^7.0.1",
    "copy-to-clipboard": "^3.3.3"
  }
}
```

---

## 7. Testing y QA

### 7.1 Casos de Prueba

```markdown
## Preview de Post
- [ ] Imagen se muestra con aspect ratio correcto (4:5, 1:1, 1.91:1)
- [ ] Caption se trunca correctamente si es largo
- [ ] Hashtags se muestran en color azul
- [ ] Iconos de interacción son clickeables (visual feedback)
- [ ] Username y avatar se muestran correctamente
- [ ] Vista responsive en mobile

## Preview de Grid
- [ ] Grid muestra 3 columnas con gap correcto
- [ ] Posts planificados se distinguen visualmente
- [ ] Drag and drop funciona para reordenar
- [ ] El orden se persiste después de reordenar
- [ ] Nuevo post se inserta en la posición correcta

## Preview de Carrusel
- [ ] Swipe funciona en mobile y desktop
- [ ] Indicadores de dots se actualizan
- [ ] Navegación con flechas funciona
- [ ] Se pueden agregar hasta 20 slides
- [ ] Reordenar slides funciona
- [ ] Todos los slides mantienen el mismo aspect ratio

## Generación de Caption
- [ ] Tono afecta el estilo del caption generado
- [ ] Longitud es respetada (corto/medio/largo)
- [ ] Emojis se incluyen solo si está habilitado
- [ ] Pregunta de engagement aparece al final si está habilitada
- [ ] CTA aparece si está habilitado
- [ ] Idioma es respetado
- [ ] Regenerar produce caption diferente
- [ ] Copy to clipboard funciona

## Generación de Hashtags
- [ ] Se generan el número correcto de hashtags
- [ ] Hashtags están categorizados correctamente
- [ ] Hashtags baneados se marcan en rojo
- [ ] Se pueden seleccionar/deseleccionar individualmente
- [ ] Contador muestra X/30 correctamente
- [ ] Grupos de hashtags se pueden guardar
- [ ] Grupos guardados se pueden seleccionar
```

---

## 8. Checklist de Entrega Fase 2

```markdown
## Componentes de Preview
- [ ] InstagramPostPreview - Simulación visual de post
- [ ] InstagramGridPreview - Vista de grid de perfil
- [ ] CarouselPreview - Simulación de carrusel con swipe
- [ ] ViewToggle - Cambiar entre vistas (Feed/Grid/Story)

## Componentes de IA
- [ ] CaptionGenerator - Modal de generación de captions
- [ ] HashtagGenerator - Generador y gestor de hashtags
- [ ] ToneSelector - Selector visual de tono
- [ ] HashtagChip - Badge individual de hashtag

## API Routes
- [ ] POST /api/ai/caption - Generación de captions
- [ ] POST /api/ai/hashtags - Generación de hashtags
- [ ] GET /api/hashtag-groups - Listar grupos guardados
- [ ] POST /api/hashtag-groups - Guardar nuevo grupo

## Hooks
- [ ] useGenerateCaption - Lógica de generación de captions
- [ ] useGenerateHashtags - Lógica de generación de hashtags
- [ ] useCarouselNavigation - Estado de navegación de carrusel
- [ ] useGridReorder - Lógica de reordenamiento de grid

## Base de Datos
- [ ] Modelo Post creado
- [ ] Modelo PostImage creado
- [ ] Modelo HashtagGroup creado
- [ ] Migraciones ejecutadas

## Integraciones
- [ ] OpenAI configurado y funcionando
- [ ] Rate limiting implementado
- [ ] Logging de uso de tokens

## UI/UX
- [ ] Preview responsive
- [ ] Loading states
- [ ] Error handling visual
- [ ] Copy to clipboard con feedback
- [ ] Animaciones de transición
```

---

## Notas para la Implementación

1. **Costo de OpenAI**: gpt-4o-mini es ~20x más económico que gpt-4. Para captions y hashtags es suficiente.

2. **Cache**: Considerar cachear respuestas de hashtags para prompts similares.

3. **Fallback**: Si OpenAI falla, mostrar mensaje amigable y permitir escritura manual.

4. **Accesibilidad**: Asegurar que los componentes de preview sean accesibles (alt texts, ARIA labels).

5. **Performance**: El grid preview con muchas imágenes debe usar virtualización si hay más de 50 posts.

---

## Próximos Pasos (Fase 3)

Después de completar la Fase 2:
- Integración con Google Drive para backup
- Export de imágenes optimizadas
- Preparación de contenido para publicación manual