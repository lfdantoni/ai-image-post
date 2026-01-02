# Fase 4: Integración con Instagram API para Publicación

## Resumen Ejecutivo

Este documento detalla las especificaciones para la Fase 4 de **AIGram**, enfocada en la publicación directa de posts a Instagram utilizando la Instagram Graph API. La funcionalidad de publicación está integrada directamente en la pantalla de **Create Post** existente, manteniendo consistencia con el diseño actual de la aplicación.

**Duración estimada:** 4-5 semanas  
**Dependencias:** Fase 1, 2 y 3 completadas  
**Integraciones:** Instagram Graph API (via Meta/Facebook)

---

## 1. Funcionalidades de esta Fase

### 1.1 Conexión con Instagram Business/Creator
- Autenticación OAuth via Facebook/Meta
- Conexión de cuenta de Instagram Business o Creator
- Verificación de permisos necesarios
- Gestión de tokens (refresh automático)

### 1.2 Publicación de Posts (Integrada en Create Post)
- Botón de publicar directamente en el editor de post
- Publicar imagen individual con caption y hashtags
- Publicar carrusel (hasta 10 imágenes via API)
- Preview final antes de publicar (usa el preview existente)
- Validación de requisitos de Instagram

### 1.3 Sección de Posts Publicados (en Create Post)
- Nueva sección "Published on Instagram" junto a "Your Drafts"
- Listado de posts publicados desde AIGram
- URL directa al post en Instagram
- Metadata del post (fecha, likes, comments)
- Sincronización de métricas básicas

---

## 2. Requisitos de Instagram Graph API

### 2.1 Tipos de Cuenta Soportados

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REQUISITOS DE CUENTA                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ Instagram Business Account                                          │
│     - Debe estar conectada a una Facebook Page                         │
│     - Soporta publicación via API                                      │
│     - Acceso completo a insights                                       │
│                                                                         │
│  ✅ Instagram Creator Account (desde julio 2024)                        │
│     - Soportado via Instagram Platform API                             │
│     - No requiere Facebook Page obligatoriamente                       │
│     - Usa autenticación directa con Instagram                          │
│                                                                         │
│  ❌ Instagram Personal Account                                          │
│     - NO soporta publicación via API                                   │
│     - Usuario debe convertir a Business/Creator                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Permisos Requeridos (Scopes)

```
# Permisos esenciales para publicación
instagram_basic                 # Leer perfil e información básica
instagram_content_publish       # Publicar fotos, videos y carruseles
pages_show_list                 # Listar Facebook Pages del usuario
pages_read_engagement          # Leer engagement de la página

# Permisos opcionales pero recomendados
instagram_manage_insights      # Acceder a métricas de posts
business_management            # Gestión de cuentas de negocio

# Para autenticación via Facebook
pages_manage_metadata          # Gestionar metadata de páginas
```

### 2.3 Limitaciones de la API

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LIMITACIONES DE INSTAGRAM API                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📊 Rate Limits                                                         │
│  - 25 posts publicados por cuenta cada 24 horas                        │
│  - Los carruseles cuentan como 1 post                                  │
│  - 200 llamadas API por hora por usuario                               │
│                                                                         │
│  🖼️ Formato de Imagen                                                   │
│  - Solo JPEG soportado (no PNG, WebP, etc.)                            │
│  - La imagen debe estar en URL pública accesible                       │
│  - Aspect ratios: entre 4:5 y 1.91:1                                   │
│  - Tamaño mínimo: 320px, máximo: 1440px (ancho)                        │
│                                                                         │
│  📝 Caption                                                             │
│  - Máximo 2,200 caracteres                                             │
│  - Máximo 30 hashtags                                                  │
│  - Hashtags deben codificarse como %23 o #                          │
│                                                                         │
│  🎠 Carruseles                                                          │
│  - Máximo 10 imágenes/videos via API                                   │
│  - Instagram app permite 20, pero API limita a 10                      │
│  - Todos los items deben tener mismo aspect ratio                      │
│                                                                         │
│  ❌ No Soportado via API                                                │
│  - Stories                                                              │
│  - Reels (limitado)                                                    │
│  - Filtros de Instagram                                                │
│  - Shopping tags                                                        │
│  - Branded content tags                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Configuración en Meta Developer Console

### 3.1 Pasos de Configuración

**Instrucciones para el desarrollador:**
```
1. Ir a https://developers.facebook.com/
2. Crear nueva App (o usar existente)
   - Tipo: Business
   - Caso de uso: "Other" > "Consumer"

3. Agregar productos a la App:
   - Facebook Login
   - Instagram Graph API

4. Configurar Facebook Login:
   - Valid OAuth Redirect URIs: https://tudominio.com/api/auth/callback/instagram
   - Activar "Web" como plataforma

5. Configurar Instagram Graph API:
   - Agregar Instagram testers (para desarrollo)

6. Solicitar permisos via App Review:
   - instagram_basic
   - instagram_content_publish
   - pages_show_list
   - pages_read_engagement

7. Completar Business Verification (requerido para producción)

8. Pasar a modo "Live" después de aprobación
```

### 3.2 Variables de Entorno

```env
# Agregar a .env.local

# Meta/Facebook App
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abcdef123456...
INSTAGRAM_GRAPH_API_VERSION=v21.0

# URLs
INSTAGRAM_REDIRECT_URI=https://tudominio.com/api/auth/callback/instagram
```

---

## 4. Flujo de Autenticación

### 4.1 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE CONEXIÓN INSTAGRAM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Usuario clickea "Conectar Instagram" (en Settings)                 │
│     │                                                                   │
│     ▼                                                                   │
│  2. Redirect a Facebook OAuth Dialog                                   │
│     - Solicita permisos: instagram_basic, instagram_content_publish,   │
│       pages_show_list, pages_read_engagement                           │
│     │                                                                   │
│     ▼                                                                   │
│  3. Usuario autoriza la app                                            │
│     │                                                                   │
│     ▼                                                                   │
│  4. Callback recibe authorization code                                 │
│     │                                                                   │
│     ▼                                                                   │
│  5. Intercambiar code por short-lived access token                     │
│     │                                                                   │
│     ▼                                                                   │
│  6. Intercambiar por long-lived access token (60 días)                 │
│     │                                                                   │
│     ▼                                                                   │
│  7. Obtener Facebook Pages del usuario                                 │
│     GET /me/accounts                                                   │
│     │                                                                   │
│     ▼                                                                   │
│  8. Por cada Page, obtener Instagram Business Account conectada        │
│     GET /{page-id}?fields=instagram_business_account                   │
│     │                                                                   │
│     ▼                                                                   │
│  9. Guardar instagram_business_account_id + tokens en BD               │
│     │                                                                   │
│     ▼                                                                   │
│  10. Usuario puede ahora publicar desde AIGram                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Refresh de Tokens

```
Long-lived tokens duran 60 días.
Se pueden refrescar después de 24 horas de emitidos.

Proceso de refresh:
GET /oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={existing-token}

Implementar:
- Cron job diario para verificar tokens próximos a expirar
- Refrescar tokens con menos de 7 días de validez
- Notificar al usuario si el token no puede refrescarse
```

---

## 5. Flujo de Publicación

### 5.1 Flujo de Usuario Integrado en Create Post

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE PUBLICACIÓN EN CREATE POST                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Usuario va a /create-post                                          │
│     └─> Ve pantalla inicial con:                                       │
│         • Área para seleccionar imágenes                               │
│         • Sección "Your Drafts" (borradores)                           │
│         • Sección "Published Posts" (publicados en IG)                 │
│                                                                         │
│  2. Usuario selecciona imagen o edita draft existente                  │
│     └─> URL: /create-post?postId=xxx                                   │
│     └─> Ve el editor con preview de Instagram                          │
│                                                                         │
│  3. Usuario edita caption, hashtags, etc.                              │
│     └─> Preview se actualiza en tiempo real                            │
│                                                                         │
│  4. Usuario tiene opciones:                                            │
│     ├─> [Update Draft] - Guarda como borrador                          │
│     ├─> [Copy to Clipboard] - Copia caption + hashtags                 │
│     └─> [Publish to Instagram] - Publica directamente                  │
│                                                                         │
│  5. Al publicar exitosamente:                                          │
│     └─> Post se mueve de "Your Drafts" a "Published Posts"             │
│     └─> Se muestra confirmación con link a Instagram                   │
│                                                                         │
│  6. Usuario puede ver/editar posts publicados                          │
│     └─> Mismo editor pero con info adicional de la publicación         │
│     └─> Link directo al post en Instagram                              │
│     └─> Métricas básicas (likes, comments)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Proceso Técnico de Publicación (Imagen Individual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO TÉCNICO DE PUBLICACIÓN                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASO 1: Crear Media Container                                         │
│  ─────────────────────────────────                                      │
│  POST /{ig-user-id}/media                                              │
│    ?image_url={public-url-to-jpeg}                                     │
│    &caption={caption-with-hashtags}                                    │
│    &access_token={token}                                               │
│                                                                         │
│  Response: { "id": "container-id-123" }                                │
│                                                                         │
│  PASO 2: Verificar Estado del Container                                │
│  ───────────────────────────────────────                                │
│  GET /{container-id}?fields=status_code                                │
│                                                                         │
│  Estados posibles:                                                      │
│  - EXPIRED: Container expiró (intentar de nuevo)                       │
│  - ERROR: Error en procesamiento                                       │
│  - FINISHED: Listo para publicar ✓                                     │
│  - IN_PROGRESS: Aún procesando (esperar)                               │
│  - PUBLISHED: Ya fue publicado                                         │
│                                                                         │
│  Esperar hasta que status_code === "FINISHED"                          │
│  (polling cada 5 segundos, máximo 2 minutos)                           │
│                                                                         │
│  PASO 3: Publicar el Container                                         │
│  ─────────────────────────────────                                      │
│  POST /{ig-user-id}/media_publish                                      │
│    ?creation_id={container-id}                                         │
│    &access_token={token}                                               │
│                                                                         │
│  Response: { "id": "media-id-456" }                                    │
│                                                                         │
│  PASO 4: Obtener Permalink del Post                                    │
│  ────────────────────────────────────                                   │
│  GET /{media-id}?fields=permalink,timestamp,media_url                  │
│                                                                         │
│  Response: {                                                            │
│    "id": "media-id-456",                                               │
│    "permalink": "https://www.instagram.com/p/ABC123/",                 │
│    "timestamp": "2025-01-15T14:30:00+0000",                            │
│    "media_url": "https://..."                                          │
│  }                                                                      │
│                                                                         │
│  PASO 5: Actualizar Post en BD como publicado                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Proceso Técnico de Publicación (Carrusel)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE PUBLICACIÓN - CARRUSEL                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASO 1: Crear Container para CADA imagen del carrusel                 │
│  ──────────────────────────────────────────────────────                 │
│  Para cada imagen (máximo 10):                                         │
│                                                                         │
│  POST /{ig-user-id}/media                                              │
│    ?image_url={public-url-image-1}                                     │
│    &is_carousel_item=true                                              │
│    &access_token={token}                                               │
│                                                                         │
│  Response: { "id": "item-container-1" }                                │
│                                                                         │
│  Repetir para cada imagen, guardando los container IDs                 │
│  items = ["item-container-1", "item-container-2", ...]                 │
│                                                                         │
│  PASO 2: Crear Container del Carrusel                                  │
│  ─────────────────────────────────────                                  │
│  POST /{ig-user-id}/media                                              │
│    ?caption={caption-with-hashtags}                                    │
│    &media_type=CAROUSEL                                                │
│    &children={item-container-1},{item-container-2},...                 │
│    &access_token={token}                                               │
│                                                                         │
│  Response: { "id": "carousel-container-id" }                           │
│                                                                         │
│  PASO 3: Verificar Estado (igual que imagen individual)                │
│  PASO 4: Publicar el Container del Carrusel                            │
│  PASO 5: Obtener Permalink y actualizar BD                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Diseño de Interfaz de Usuario

### 6.1 Pantalla de Configuración de Instagram (Settings)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Settings                    Instagram                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Estado de conexión                                               │ │
│  │                                                                   │ │
│  │  ┌────────┐                                                       │ │
│  │  │  👤    │  ✅ Conectado                                         │ │
│  │  │        │  @usuario_instagram                                   │ │
│  │  └────────┘  Business Account                                     │ │
│  │                                                                   │ │
│  │  Facebook Page: Mi Página de Arte                                 │ │
│  │  Conectado desde: 15 de enero, 2025                              │ │
│  │  Token expira: 14 de marzo, 2025                                 │ │
│  │                                                                   │ │
│  │  [Ver perfil ↗]     [Desconectar]                                │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Estadísticas de publicación                                      │ │
│  │                                                                   │ │
│  │  Posts publicados hoy:      3 / 25                               │ │
│  │  Posts publicados (total):  47                                   │ │
│  │                                                                   │ │
│  │  ████████████░░░░░░░░░░░░░  12% del límite diario               │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Permisos activos                                                 │ │
│  │                                                                   │ │
│  │  ✅ instagram_basic                                               │ │
│  │  ✅ instagram_content_publish                                     │ │
│  │  ✅ pages_show_list                                               │ │
│  │  ✅ pages_read_engagement                                         │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Pantalla de Conexión (Si no está conectado)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Settings                    Instagram                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │                         📷                                        │ │
│  │                                                                   │ │
│  │              Conecta tu cuenta de Instagram                       │ │
│  │                                                                   │ │
│  │     Publica tus imágenes generadas con IA directamente           │ │
│  │     a tu feed de Instagram desde AIGram.                         │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │                                                             │ │ │
│  │  │  ℹ️ Requisitos:                                              │ │ │
│  │  │                                                             │ │ │
│  │  │  • Cuenta de Instagram Business o Creator                  │ │ │
│  │  │  • Conectada a una Facebook Page                           │ │ │
│  │  │  • Permisos de publicación habilitados                     │ │ │
│  │  │                                                             │ │ │
│  │  │  ¿No tienes cuenta Business?                               │ │ │
│  │  │  [Cómo convertir tu cuenta →]                              │ │ │
│  │  │                                                             │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │         [  🔗 Conectar con Instagram  ]                          │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Pantalla Inicial de Create Post (Con Posts Publicados)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI  AIGram    Dashboard   Galería   Subir   [Crear Post]    👤  →     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Create Post                                                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                           🖼️                                     │   │
│  │                                                                   │   │
│  │                   No images selected                             │   │
│  │                                                                   │   │
│  │     Select images from your gallery to create an Instagram post  │   │
│  │                                                                   │   │
│  │                   [Select from Gallery]                          │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📄 Your Drafts                                                   │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐        │   │
│  │  │ ┌────┐ Single Post      │  │ ┌────┐ Single Post      │        │   │
│  │  │ │img │ Wrapped in velvet│  │ │img │ In the heart of  │        │   │
│  │  │ └────┘ whispers and...  │  │ └────┘ winter's embrace │        │   │
│  │  │        hace 18 horas    │  │        hace 19 horas    │        │   │
│  │  │  [✏️ Editar]      🗑️    │  │  [✏️ Editar]      🗑️    │        │   │
│  │  └─────────────────────────┘  └─────────────────────────┘        │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📷 Published on Instagram                              [🔄 Sync]│   │
│  │                                                                   │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐        │   │
│  │  │ ┌────┐ ✅ Published      │  │ ┌────┐ ✅ Published      │        │   │
│  │  │ │img │ ✨ Magical winter │  │ │img │ 🎨 Digital dreams │        │   │
│  │  │ └────┘ wonderland...    │  │ └────┘ come alive...    │        │   │
│  │  │        15 ene 2025      │  │        14 ene 2025      │        │   │
│  │  │  ❤️ 234  💬 12          │  │  ❤️ 567  💬 34          │        │   │
│  │  │  [👁️ Ver detalles] [↗️] │  │  [👁️ Ver detalles] [↗️] │        │   │
│  │  └─────────────────────────┘  └─────────────────────────┘        │   │
│  │                                                                   │   │
│  │  No hay más publicaciones         [Ver todas →]                  │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Editor de Post con Botón de Publicar

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI  AIGram    Dashboard   Galería   Subir   [Crear Post]    👤  →     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ← Back    Create Post                                                  │
│                                                                         │
│            ┌──────────────────────────────────────────────────────────┐│
│            │                                                          ││
│            │  [📄 Update Draft]  [📋 Copy to Clipboard]               ││
│            │                                                          ││
│            │  [📷 Publish to Instagram]                               ││
│            │                                                          ││
│            └──────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │                            │  │                                  │  │
│  │  [Feed]  [Grid]  [Change]  │  │  Caption          [✨ Generate]  │  │
│  │                            │  │  ┌────────────────────────────┐  │  │
│  │  ┌──────────────────────┐  │  │  │ Wrapped in velvet whispers │  │  │
│  │  │ Y  your_username ••• │  │  │  │ and the soft kiss of       │  │  │
│  │  ├──────────────────────┤  │  │  │ falling snow. ❄️ Beneath   │  │  │
│  │  │                      │  │  │  │ this crimson crown...      │  │  │
│  │  │                      │  │  │  └────────────────────────────┘  │  │
│  │  │                      │  │  │  278 characters    Max: 2,200   │  │  │
│  │  │      PREVIEW         │  │  │                                  │  │
│  │  │      IMAGEN          │  │  │  Hashtags (10/30)    [Clear all] │  │
│  │  │                      │  │  │  ┌────────────────────────────┐  │  │
│  │  │                      │  │  │  │ Add custom hashtag...   +  │  │  │
│  │  │                      │  │  │  └────────────────────────────┘  │  │
│  │  │                      │  │  │                                  │  │
│  │  ├──────────────────────┤  │  │  #ai × #animeart × #animecommunity│
│  │  │ ♡  💬  ➤       🔖   │  │  │  #animeportrait × #holidayvibes × │
│  │  └──────────────────────┘  │  │  #midjourney × #photorealisticart │
│  │                            │  │  #winterfashion × #winterwonderland│
│  │                            │  │                                  │  │
│  │                            │  │  Generate with AI    [# Generate]│  │
│  │                            │  │  ☑️ Trending  ☑️ Niche  ☐ Branded│  │
│  │                            │  │                                  │  │
│  └────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Variantes del Botón de Publicar

**Opción A: Botones en línea**
```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  [📄 Update Draft]  [📋 Copy to Clipboard]  [📷 Publish to Instagram] │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Opción B: Botón principal destacado (Recomendada)**
```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  [📄 Update Draft]  [📋 Copy to Clipboard]                            │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │   📷  Publish to Instagram                                     │   │
│  │                                                                │   │
│  │   Tu post será publicado directamente en tu cuenta de IG      │   │
│  │   conectada (@your_username)                                   │   │
│  │                                                                │   │
│  │   [  Publicar ahora  ]                                        │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Opción C: Dropdown en botón existente**
```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  [📄 Update Draft]  [📋 Copy to Clipboard]  [Publicar ▼]              │
│                                                    │                   │
│                                                    ├─ Copiar caption   │
│                                                    ├─ Exportar imagen  │
│                                                    └─ Publicar en IG   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.6 Modal de Confirmación Pre-Publicación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                 Publicar en Instagram                        ✕    │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  Cuenta conectada                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  👤 @your_username                                          │ │ │
│  │  │  Business Account • 1.2K seguidores                         │ │ │
│  │  │  Posts hoy: 2/25                                            │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Verificación                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  ✅ Imagen en formato válido (JPEG, 1080x1350)              │ │ │
│  │  │  ✅ Caption: 278 caracteres                                  │ │ │
│  │  │  ✅ Hashtags: 10 (máximo 30)                                 │ │ │
│  │  │  ✅ Dentro del límite diario (2/25)                          │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  ⚠️ Confirmación requerida                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  ☐ Esta imagen fue generada con IA. Confirmo que marcaré   │ │ │
│  │  │    el contenido apropiadamente según las políticas de       │ │ │
│  │  │    Instagram sobre contenido generado por IA.               │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │              [Cancelar]         [📷 Publicar ahora]               │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.7 Modal de Progreso de Publicación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                 Publicando en Instagram...                        │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │                         ⏳                                        │ │
│  │                                                                   │ │
│  │  ✅ Preparando imagen...                                          │ │
│  │  ✅ Subiendo a Instagram...                                       │ │
│  │  ⏳ Procesando... (puede tomar hasta 2 minutos)                   │ │
│  │  ○ Publicando post...                                            │ │
│  │  ○ Obteniendo enlace...                                          │ │
│  │                                                                   │ │
│  │  ████████████████░░░░░░░░░░░░  60%                               │ │
│  │                                                                   │ │
│  │                 No cierres esta ventana                          │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.8 Modal de Publicación Exitosa

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                 ¡Publicado con éxito! 🎉                          │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │                         ✅                                        │ │
│  │                                                                   │ │
│  │          Tu post está ahora visible en Instagram                 │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │                                                             │ │ │
│  │  │   🔗 instagram.com/p/ABC123def/                             │ │ │
│  │  │                                                             │ │ │
│  │  │   [📋 Copiar URL]    [↗️ Ver en Instagram]                  │ │ │
│  │  │                                                             │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │       [Crear nuevo post]              [Cerrar]                   │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.9 Vista de Post Publicado (Reutilizando Editor)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI  AIGram    Dashboard   Galería   Subir   [Crear Post]    👤  →     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ← Back    Post Details                                                │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  ✅ Publicado en Instagram                                         ││
│  │                                                                    ││
│  │  🔗 instagram.com/p/ABC123def/     [📋 Copiar]  [↗️ Abrir en IG]  ││
│  │                                                                    ││
│  │  📅 Publicado: 15 de enero, 2025 a las 14:30                      ││
│  │  ❤️ 234 likes  💬 12 comentarios  👁️ 1.2K alcance                 ││
│  │                                                                    ││
│  │  Última sincronización: hace 2 horas    [🔄 Actualizar métricas]  ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │                            │  │                                  │  │
│  │  [Feed]  [Grid]            │  │  Caption (publicado)             │  │
│  │                            │  │  ┌────────────────────────────┐  │  │
│  │  ┌──────────────────────┐  │  │  │ Wrapped in velvet whispers │  │  │
│  │  │ Y  your_username ••• │  │  │  │ and the soft kiss of       │  │  │
│  │  ├──────────────────────┤  │  │  │ falling snow. ❄️ Beneath   │  │  │
│  │  │                      │  │  │  │ this crimson crown...      │  │  │
│  │  │                      │  │  │  └────────────────────────────┘  │  │
│  │  │      PREVIEW         │  │  │                                  │  │
│  │  │      IMAGEN          │  │  │  Hashtags publicados             │  │
│  │  │                      │  │  │                                  │  │
│  │  │                      │  │  │  #ai #animeart #animecommunity   │  │
│  │  │                      │  │  │  #animeportrait #holidayvibes    │  │
│  │  │                      │  │  │  #midjourney #photorealisticart  │  │
│  │  ├──────────────────────┤  │  │                                  │  │
│  │  │ ♡  💬  ➤       🔖   │  │  │  ─────────────────────────────   │  │
│  │  │ 234 likes            │  │  │                                  │  │
│  │  └──────────────────────┘  │  │  Acciones                        │  │
│  │                            │  │  [📥 Descargar imagen]           │  │
│  │                            │  │  [📋 Copiar caption]             │  │
│  │                            │  │                                  │  │
│  └────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Instrucciones de Implementación

### 7.1 Servicio de Instagram API

**Ubicación:** `lib/instagram-api.ts`

**Instrucciones para la AI:**
```
Crear servicio para interactuar con Instagram Graph API.

Clase InstagramAPIService con los siguientes métodos:

constructor(accessToken: string, instagramAccountId: string)
  - Inicializar con token y account ID
  - Base URL: https://graph.facebook.com/{version}

async createMediaContainer(params: CreateMediaParams): Promise<string>
  params: {
    imageUrl: string,     // URL pública de la imagen JPEG
    caption: string,      // Caption con hashtags
    isCarouselItem?: boolean
  }
  - POST /{ig-user-id}/media
  - Retornar container ID

async checkContainerStatus(containerId: string): Promise<ContainerStatus>
  - GET /{container-id}?fields=status_code
  - Retornar: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED"

async waitForContainerReady(containerId: string, maxWaitMs: number = 120000): Promise<boolean>
  - Polling cada 5 segundos hasta que status === "FINISHED"
  - Timeout después de maxWaitMs
  - Retornar true si ready, false si timeout/error

async publishMedia(containerId: string): Promise<string>
  - POST /{ig-user-id}/media_publish
  - Retornar media ID del post publicado

async getMediaDetails(mediaId: string): Promise<MediaDetails>
  - GET /{media-id}?fields=id,permalink,timestamp,media_url,caption
  - Retornar detalles del post

async createCarouselContainer(params: CarouselParams): Promise<string>
  params: {
    childContainerIds: string[],  // IDs de containers de items
    caption: string
  }
  - POST /{ig-user-id}/media con media_type=CAROUSEL
  - Retornar carousel container ID

async getMediaInsights(mediaId: string): Promise<MediaInsights>
  - GET /{media-id}/insights?metric=impressions,reach,likes,comments,saved
  - Retornar métricas del post

async getUserProfile(): Promise<InstagramProfile>
  - GET /{ig-user-id}?fields=id,username,profile_picture_url,followers_count
  - Retornar info del perfil

async getRateLimitStatus(): Promise<RateLimitInfo>
  - Verificar cuántos posts se han hecho en las últimas 24 horas
  - Calcular posts restantes

Manejo de errores:
- Token expirado: Lanzar error específico para trigger de refresh
- Rate limit: Lanzar error con tiempo de espera
- Permisos insuficientes: Lanzar error con detalle de permisos faltantes
- Validación de imagen: Lanzar error con requisitos no cumplidos
```

### 7.2 API Route: Autenticación Instagram

**Ubicación:** `app/api/instagram/auth/route.ts`

**Instrucciones para la AI:**
```
Crear endpoints para el flujo de autenticación con Instagram.

GET /api/instagram/auth
  - Generar URL de autorización de Facebook OAuth
  - Scopes: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement
  - Redirect a la URL

GET /api/instagram/auth/callback
  - Recibir authorization code de Facebook
  - Intercambiar por short-lived token
  - Intercambiar por long-lived token
  - Obtener Facebook Pages del usuario
  - Obtener Instagram Business Account de cada Page
  - Guardar en BD: access_token, refresh_token (si aplica), 
    instagram_account_id, username, token_expires_at
  - Redirect a settings con mensaje de éxito/error

POST /api/instagram/auth/refresh
  - Refrescar long-lived token antes de que expire
  - Actualizar en BD
  - Retornar nuevo token_expires_at

DELETE /api/instagram/auth
  - Eliminar tokens y cuenta de Instagram de la BD
  - No revocar token en Facebook (usuario puede hacerlo manualmente)
```

### 7.3 API Route: Publicación

**Ubicación:** `app/api/instagram/publish/route.ts`

**Instrucciones para la AI:**
```
Crear endpoint para publicar contenido a Instagram.

POST /api/instagram/publish

Request body (imagen individual):
{
  postId: string,          // ID del Post en AIGram
  imageUrl: string,        // URL pública de imagen JPEG
  caption: string,
  hashtags: string[]
}

Request body (carrusel):
{
  postId: string,
  images: Array<{ url: string, order: number }>,  // máximo 10
  caption: string,
  hashtags: string[]
}

Response (éxito):
{
  success: true,
  instagramMediaId: string,
  permalink: string,
  timestamp: string
}

Response (error):
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}

Proceso:
1. Validar autenticación del usuario
2. Verificar que tiene Instagram conectado y token válido
3. Verificar rate limit (< 25 posts en 24h)
4. Validar imagen(es): formato JPEG, dimensiones, URL accesible
5. Formatear caption + hashtags (encode # como %23 si es necesario)
6. Para carrusel: crear containers individuales primero
7. Crear media container
8. Esperar a que esté listo (polling)
9. Publicar
10. Obtener permalink
11. Actualizar Post en BD con status PUBLISHED
12. Crear PublishedPost en BD
13. Retornar resultado

Códigos de error a manejar:
- RATE_LIMIT_EXCEEDED: Límite de 25 posts alcanzado
- TOKEN_EXPIRED: Token expiró, necesita reconectar
- INVALID_IMAGE: Imagen no cumple requisitos
- PERMISSION_DENIED: Falta permiso instagram_content_publish
- CONTAINER_ERROR: Error al procesar imagen en Instagram
- PUBLISH_ERROR: Error al publicar
```

### 7.4 API Route: Posts (Actualizado para filtrar por status)

**Ubicación:** `app/api/posts/route.ts`

**Instrucciones para la AI:**
```
Actualizar el endpoint de posts para incluir filtro por status:

GET /api/posts?status=draft      → Solo borradores
GET /api/posts?status=published  → Solo publicados
GET /api/posts                   → Todos

Response debe incluir publishedPost si existe:
{
  posts: [
    {
      id: "...",
      // ... otros campos ...
      status: "PUBLISHED",
      publishedPost: {
        id: "...",
        permalink: "https://instagram.com/p/xxx",
        publishedAt: "2025-01-15T14:30:00Z",
        likesCount: 234,
        commentsCount: 12
      }
    }
  ]
}
```

### 7.5 API Route: Sincronización de Métricas

**Ubicación:** `app/api/instagram/posts/route.ts`

**Instrucciones para la AI:**
```
Crear endpoints para gestionar posts publicados.

GET /api/instagram/posts
  Query params: page, limit, sortBy
  - Listar posts publicados del usuario
  - Incluir: thumbnail, caption, permalink, publishedAt, metrics
  - Paginación

GET /api/instagram/posts/{id}
  - Detalle de un post publicado
  - Incluir métricas actualizadas (opcional, puede ser cache)

POST /api/instagram/posts/{id}/sync
  - Sincronizar métricas de un post específico desde Instagram
  - Llamar a getMediaInsights
  - Actualizar en BD
  - Retornar métricas actualizadas

POST /api/instagram/posts/sync-all
  - Sincronizar métricas de todos los posts recientes
  - Rate limiting para no exceder límites de API
```

---

## 8. Componentes de UI

### 8.1 Actualizar: CreatePostPage

**Ubicación:** `app/(dashboard)/create-post/page.tsx`

**Instrucciones para la AI:**
```
Actualizar la página de Create Post para incluir la sección de posts publicados.

Cambios:
1. Agregar sección "Published on Instagram" debajo de "Your Drafts"
2. Usar el mismo estilo de cards que los drafts
3. Mostrar badge verde "✅ Published" en las cards
4. Incluir métricas básicas (likes, comments) en cada card
5. Botón de sincronizar métricas en el header de la sección
6. Link directo a Instagram (icono ↗️) en cada card
7. Botón "Ver detalles" que lleva a la vista de detalle

La sección debe:
- Mostrar los 4-6 posts más recientes
- Tener link "Ver todas →" si hay más
- Mostrar mensaje "No has publicado ningún post aún" si está vacío
- Loading skeleton mientras carga
```

### 8.2 Actualizar: PostEditor

**Ubicación:** `components/post/PostEditor.tsx` (o similar)

**Instrucciones para la AI:**
```
Actualizar el editor de post para incluir el botón de publicar a Instagram.

Cambios en la barra de acciones:
1. Mantener botones existentes: "Update Draft", "Copy to Clipboard"
2. Agregar botón "Publish to Instagram":
   - Icono de Instagram o cámara
   - Color distintivo (gradiente de Instagram o azul primario)
   - Disabled si no hay cuenta de IG conectada
   - Tooltip explicativo si está deshabilitado

Lógica del botón:
- Si no hay cuenta conectada: Mostrar tooltip "Conecta tu cuenta de Instagram en Settings"
- Si hay cuenta conectada: Abrir modal de confirmación de publicación
- Si el post ya fue publicado: Cambiar texto a "Publicado ✅" y mostrar link

Props adicionales:
- instagramConnected: boolean
- isPublished: boolean
- publishedPostData?: { permalink, publishedAt, metrics }
- onPublishClick: () => void
```

### 8.3 Nuevo: PublishToInstagramButton

**Ubicación:** `components/instagram/PublishToInstagramButton.tsx`

**Instrucciones para la AI:**
```
Crear componente de botón para publicar a Instagram.

Props:
- postId: string
- disabled?: boolean
- isPublished?: boolean
- publishedData?: { permalink: string, publishedAt: Date }
- onPublishClick: () => void

Estados visuales:
1. Normal: Botón con icono de Instagram, texto "Publish to Instagram"
2. Disabled (sin conexión): Gris, tooltip "Conecta tu cuenta de Instagram"
3. Loading: Spinner, texto "Publishing..."
4. Published: Verde, icono check, texto "Published", link al post

Estilo:
- Usar gradiente de Instagram para el estado normal
- Botón más prominente que los otros (puede ser más ancho o con más padding)
```

### 8.4 Nuevo: PublishConfirmationModal

**Ubicación:** `components/instagram/PublishConfirmationModal.tsx`

**Instrucciones para la AI:**
```
Crear modal de confirmación antes de publicar.

Props:
- isOpen: boolean
- onClose: () => void
- onConfirm: () => void
- post: Post
- instagramAccount: InstagramAccount
- validation: ValidationResult

Contenido:
1. Info de cuenta conectada (username, tipo, posts hoy/25)
2. Checklist de validación (imagen, caption, hashtags, rate limit)
3. Checkbox de confirmación de contenido IA (requerido)
4. Botones Cancelar y Publicar

El botón Publicar debe estar disabled hasta que:
- Todas las validaciones pasen
- El checkbox de IA esté marcado
```

### 8.5 Nuevo: PublishProgressModal

**Ubicación:** `components/instagram/PublishProgressModal.tsx`

**Instrucciones para la AI:**
```
Crear modal de progreso durante la publicación.

Props:
- isOpen: boolean
- currentStep: PublishStep
- error?: string
- onRetry?: () => void
- onClose?: () => void  // Solo disponible en error o éxito

Estados/Steps:
1. "preparing" - Preparando imagen
2. "uploading" - Subiendo a Instagram
3. "processing" - Instagram procesando (puede tomar tiempo)
4. "publishing" - Publicando post
5. "fetching" - Obteniendo enlace
6. "success" - Éxito con link
7. "error" - Error con mensaje y opción de reintentar

UI:
- Progress bar
- Lista de pasos con iconos (✅, ⏳, ○)
- Mensaje de "No cerrar ventana" durante proceso
- En éxito: Mostrar link y botones de acción
- En error: Mostrar mensaje y botón de reintentar
```

### 8.6 Nuevo: PublishedPostCard

**Ubicación:** `components/instagram/PublishedPostCard.tsx`

**Instrucciones para la AI:**
```
Crear card para mostrar post publicado en la lista.

Props:
- post: PublishedPost
- onViewDetails: () => void
- onOpenInstagram: () => void

Contenido:
- Thumbnail de la imagen
- Badge "✅ Published"
- Caption truncado (primeras 2 líneas)
- Fecha de publicación
- Métricas: ❤️ likes, 💬 comments
- Botones: "Ver detalles", icono de link externo (↗️)

Estilo:
- Similar a las cards de drafts existentes
- Badge verde para indicar publicado
- Hover effect sutil
```

### 8.7 Nuevo: PublishedPostsSection

**Ubicación:** `components/instagram/PublishedPostsSection.tsx`

**Instrucciones para la AI:**
```
Crear sección para mostrar posts publicados en la página de Create Post.

Props:
- posts: PublishedPost[]
- isLoading: boolean
- onViewDetails: (postId: string) => void
- onSync: () => void

Contenido:
- Header: "📷 Published on Instagram" con botón [🔄 Sync]
- Grid de PublishedPostCard (2-3 columnas según viewport)
- Empty state si no hay posts
- Link "Ver todas →" si hay más de 6 posts
- Loading skeleton durante fetch

La sección debe tener el mismo estilo que "Your Drafts".
```

### 8.8 Actualizar: PostDetailView

**Ubicación:** `components/post/PostDetailView.tsx`

**Instrucciones para la AI:**
```
Actualizar/crear vista de detalle de post para manejar posts publicados.

Props:
- post: Post
- publishedData?: PublishedPost  // Si existe, el post fue publicado

Cuando publishedData existe, mostrar:
1. Banner superior con info de publicación:
   - "✅ Publicado en Instagram"
   - Link al post con botones copiar/abrir
   - Fecha de publicación
   - Métricas con botón de actualizar
2. Preview de Instagram (igual que en editor)
3. Caption y hashtags (solo lectura)
4. Acciones: Descargar imagen, Copiar caption

Cuando publishedData NO existe:
- Comportamiento normal de draft (editable)
- Botón de publicar disponible
```

### 8.9 Nuevo: InstagramSettingsPanel

**Ubicación:** `components/settings/InstagramSettingsPanel.tsx`

**Instrucciones para la AI:**
```
Crear panel de configuración de Instagram para la página de Settings.

Mostrar este panel en una nueva seccion Settings del usuario que se ubique como opcion de menu en el avatar del usuario ubicado en el menu principal de la aplicacion.

Props:
- account: InstagramAccount | null
- onConnect: () => void
- onDisconnect: () => void

Contenido cuando NO conectado:
- Icono de Instagram
- Texto explicativo
- Requisitos (cuenta Business/Creator, Facebook Page)
- Botón "Conectar con Instagram"

Contenido cuando conectado:
- Avatar y username de Instagram
- Tipo de cuenta (Business/Creator)
- Facebook Page vinculada
- Fecha de conexión y expiración de token
- Estadísticas (posts hoy, total)
- Permisos activos
- Botones: Ver perfil, Desconectar
```

---

## 9. Hooks

### 9.1 Hook: useInstagramConnection

**Ubicación:** `hooks/useInstagramConnection.ts`

**Instrucciones para la AI:**
```
Crear hook para gestionar conexión con Instagram.

Retorno:
{
  // Estado de conexión
  isConnected: boolean,
  isLoading: boolean,
  error: string | null,
  
  // Info de cuenta
  account: {
    username: string,
    profilePicture: string,
    accountType: "business" | "creator",
    facebookPage: string,
    tokenExpiresAt: Date
  } | null,
  
  // Rate limit
  rateLimit: {
    used: number,
    remaining: number,
    resetsAt: Date
  } | null,
  
  // Permisos
  permissions: string[],
  hasPublishPermission: boolean,
  
  // Acciones
  connect: () => void,          // Inicia flujo OAuth
  disconnect: () => Promise<void>,
  refreshStatus: () => Promise<void>
}
```

### 9.2 Hook: usePublishToInstagram

**Ubicación:** `hooks/usePublishToInstagram.ts`

**Instrucciones para la AI:**
```
Crear hook específico para el flujo de publicación desde Create Post.

Retorno:
{
  // Estado
  isPublishing: boolean,
  currentStep: PublishStep | null,
  error: string | null,
  
  // Resultado
  publishedPost: PublishedPost | null,
  
  // Modales
  showConfirmModal: boolean,
  showProgressModal: boolean,
  
  // Acciones
  initiatePublish: (postId: string) => void,  // Abre modal de confirmación
  confirmPublish: () => Promise<void>,         // Confirma y ejecuta
  cancelPublish: () => void,                   // Cancela y cierra modales
  retryPublish: () => Promise<void>,           // Reintenta si hubo error
  
  // Validación
  validation: ValidationResult | null,
  validatePost: (postId: string) => Promise<ValidationResult>
}

type PublishStep = 
  | "preparing"
  | "uploading"
  | "processing"
  | "publishing"
  | "fetching"
  | "success"
  | "error"

El hook debe:
- Manejar todo el flujo de modales
- Actualizar el step durante el proceso
- Guardar el resultado en caché local
- Invalidar queries de drafts/published después de éxito
```

### 9.3 Hook: usePublishedPosts

**Ubicación:** `hooks/usePublishedPosts.ts`

**Instrucciones para la AI:**
```
Crear hook para gestionar lista de posts publicados.

Retorno:
{
  posts: PublishedPost[],
  isLoading: boolean,
  error: string | null,
  
  // Paginación
  hasMore: boolean,
  loadMore: () => void,
  
  // Acciones
  syncMetrics: () => Promise<void>,
  syncSinglePost: (postId: string) => Promise<void>,
  
  // Filtros
  filter: PublishedPostsFilter,
  setFilter: (filter: PublishedPostsFilter) => void
}

interface PublishedPostsFilter {
  limit?: number,
  sortBy?: "publishedAt" | "likes" | "comments",
  sortOrder?: "asc" | "desc"
}
```

---

## 10. Modelo de Datos

### 10.1 Schema Prisma

**Instrucciones para la AI:**
```
Agregar modelos para Instagram al schema.prisma:

model InstagramAccount {
  id                      String    @id @default(cuid())
  userId                  String    @unique
  user                    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Identificadores
  instagramUserId         String    @unique
  instagramUsername       String
  facebookPageId          String?
  facebookPageName        String?
  
  // Tokens
  accessToken             String    @db.Text
  tokenExpiresAt          DateTime
  
  // Metadata
  profilePictureUrl       String?
  accountType             String    // "business" | "creator"
  followersCount          Int?
  
  // Rate limiting
  postsPublishedToday     Int       @default(0)
  rateLimitResetAt        DateTime?
  
  // Timestamps
  connectedAt             DateTime  @default(now())
  lastSyncAt              DateTime?
  
  // Relaciones
  publishedPosts          PublishedPost[]
  
  @@index([userId])
}

model PublishedPost {
  id                      String    @id @default(cuid())
  
  // Relaciones
  userId                  String
  user                    User      @relation(fields: [userId], references: [id])
  instagramAccountId      String
  instagramAccount        InstagramAccount @relation(fields: [instagramAccountId], references: [id])
  postId                  String?   @unique  // Post de AIGram
  post                    Post?     @relation(fields: [postId], references: [id], onDelete: SetNull)
  
  // Instagram data
  instagramMediaId        String    @unique
  permalink               String
  mediaType               String    // "IMAGE" | "CAROUSEL"
  
  // Contenido publicado
  caption                 String?   @db.Text
  hashtags                String[]
  thumbnailUrl            String?
  
  // Métricas
  likesCount              Int       @default(0)
  commentsCount           Int       @default(0)
  reachCount              Int?
  impressionsCount        Int?
  savedCount              Int?
  
  // Timestamps
  publishedAt             DateTime
  metricsUpdatedAt        DateTime?
  createdAt               DateTime  @default(now())
  
  @@index([userId])
  @@index([instagramAccountId])
  @@index([publishedAt])
}

// Actualizar modelo Post existente
model Post {
  // ... campos existentes ...
  
  // Estado de publicación
  status              PostStatus  @default(DRAFT)
  
  // Relación con publicación
  publishedPost       PublishedPost?
}

enum PostStatus {
  DRAFT
  PUBLISHED
  FAILED
}
```

---

## 11. Validaciones Pre-Publicación

### 11.1 Requisitos de Imagen

```typescript
const INSTAGRAM_IMAGE_REQUIREMENTS = {
  format: "JPEG",  // Único formato soportado
  aspectRatio: {
    min: 0.8,      // 4:5 (portrait)
    max: 1.91      // Landscape
  },
  dimensions: {
    minWidth: 320,
    maxWidth: 1440,
    minHeight: 320,
    maxHeight: 1800
  },
  maxFileSize: 8 * 1024 * 1024,  // 8MB
  
  // Dimensiones recomendadas
  recommended: {
    portrait: { width: 1080, height: 1350 },
    square: { width: 1080, height: 1080 },
    landscape: { width: 1080, height: 566 }
  }
};
```

### 11.2 Requisitos de Caption

```typescript
const INSTAGRAM_CAPTION_REQUIREMENTS = {
  maxLength: 2200,
  maxHashtags: 30,
  maxMentions: 20,
  
  // Caracteres que necesitan encoding
  specialChars: {
    hashtag: "#" // Puede necesitar encoding como %23 en URL
  }
};
```

### 11.3 Función de Validación

**Ubicación:** `lib/instagram-validation.ts`

**Instrucciones para la AI:**
```
Crear función validateForInstagram:

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  field: "image" | "caption" | "hashtags" | "account";
}

async function validateForInstagram(params: {
  imageUrl: string;
  caption: string;
  hashtags: string[];
  account: InstagramAccount;
}): Promise<ValidationResult>

Validar:
1. Cuenta conectada y token válido
2. Rate limit no excedido
3. Imagen:
   - Formato JPEG (verificar Content-Type de la URL)
   - Dimensiones dentro de rango
   - Aspect ratio válido
   - Tamaño de archivo < 8MB
4. Caption:
   - Longitud <= 2200
5. Hashtags:
   - Cantidad <= 30
   - Sin caracteres inválidos
6. Caption + hashtags combinados <= 2200 caracteres

Warnings (no bloquean publicación):
- Imagen no es 1080px de ancho (calidad subóptima)
- Menos de 5 hashtags (menor alcance)
- Caption muy corto (< 50 chars)
```

---

## 12. Manejo de Errores

### 12.1 Códigos de Error de Instagram API

```typescript
const INSTAGRAM_ERROR_CODES = {
  // Autenticación
  190: "Token expirado o inválido",
  10: "Permiso no concedido",
  
  // Rate limiting
  4: "Límite de llamadas API alcanzado",
  17: "Límite de publicación alcanzado (25/día)",
  
  // Contenido
  36003: "El container de media expiró",
  36000: "Error al procesar imagen",
  2207001: "La imagen no cumple requisitos",
  
  // Permisos
  200: "Permisos insuficientes para esta acción",
  
  // Otros
  1: "Error desconocido de API",
  2: "Servicio temporalmente no disponible"
};
```

### 12.2 Mapeo de Errores a Mensajes de Usuario

**Instrucciones para la AI:**
```
Crear mapeo de errores técnicos a mensajes amigables:

function getErrorMessage(error: InstagramAPIError): UserFriendlyError

Ejemplos:
- 190 → "Tu conexión con Instagram ha expirado. Por favor, reconecta tu cuenta."
- 17 → "Has alcanzado el límite de 25 publicaciones diarias. Podrás publicar nuevamente mañana."
- 36000 → "Instagram no pudo procesar tu imagen. Asegúrate de que sea JPEG y tenga dimensiones válidas."
- 10 → "Necesitas otorgar permiso de publicación. Reconecta tu cuenta de Instagram."
```

---

## 13. Cron Jobs

### 13.1 Refresh de Tokens

**Instrucciones para la AI:**
```
Crear cron job para refrescar tokens de Instagram.

Frecuencia: Diaria a las 3:00 AM

Proceso:
1. Buscar todas las cuentas de Instagram con token_expires_at < now + 7 días
2. Para cada cuenta, intentar refrescar el token
3. Si el refresh falla, marcar cuenta como "needs_reconnect"
4. Notificar al usuario si su cuenta necesita reconexión
5. Actualizar token_expires_at si el refresh fue exitoso
```

### 13.2 Reset de Rate Limit

**Instrucciones para la AI:**
```
Crear cron job para resetear contadores de rate limit.

Frecuencia: Cada hora

Proceso:
1. Buscar cuentas donde rateLimitResetAt < now
2. Resetear postsPublishedToday a 0
3. Actualizar rateLimitResetAt a now + 24 horas
```

### 13.3 Sincronización de Métricas

**Instrucciones para la AI:**
```
Crear cron job para sincronizar métricas de posts.

Frecuencia: Cada 6 horas

Proceso:
1. Obtener posts publicados en los últimos 7 días
2. Para cada post, obtener métricas actualizadas
3. Actualizar en BD
4. Rate limiting: máximo 50 posts por ejecución
```

---

## 14. Dependencias Adicionales

```json
{
  "dependencies": {
    // No se requieren dependencias adicionales para Instagram API
    // Se usa fetch nativo para llamadas HTTP
  }
}
```

---

## 15. Testing y QA

### 15.1 Casos de Prueba

```markdown
## Conexión de Instagram (Settings)
- [ ] Usuario puede iniciar flujo de conexión
- [ ] Callback procesa correctamente el authorization code
- [ ] Se obtiene Instagram Business Account ID correctamente
- [ ] Token se guarda en BD encriptado
- [ ] Se muestra cuenta conectada en settings
- [ ] Usuario puede desconectar cuenta
- [ ] Reconexión funciona correctamente

## Publicación (desde Create Post)
- [ ] Botón "Publish to Instagram" aparece en editor
- [ ] Botón disabled si no hay cuenta conectada
- [ ] Modal de confirmación muestra validaciones
- [ ] Checkbox de IA es requerido
- [ ] Modal de progreso muestra todos los steps
- [ ] Publicación exitosa actualiza status del Post
- [ ] Post aparece en sección "Published on Instagram"
- [ ] Link a Instagram funciona correctamente

## Validaciones
- [ ] Imagen no JPEG muestra error
- [ ] Caption > 2200 chars muestra error
- [ ] Hashtags > 30 muestra error
- [ ] Rate limit excedido muestra error

## Posts Publicados (en Create Post)
- [ ] Sección muestra posts publicados
- [ ] Cards muestran métricas
- [ ] Botón sync actualiza métricas
- [ ] Ver detalles muestra info completa
- [ ] Link a Instagram abre en nueva pestaña

## Token Refresh
- [ ] Cron job refresca tokens próximos a expirar
- [ ] Usuario es notificado si necesita reconectar
- [ ] App maneja gracefully token expirado
```

---

## 16. Checklist de Entrega Fase 4

```markdown
## Configuración Meta
- [ ] App configurada en Meta Developer Console
- [ ] Facebook Login agregado como producto
- [ ] Instagram Graph API agregado como producto
- [ ] Permisos solicitados en App Review
- [ ] Business Verification completada (para producción)

## Backend
- [ ] InstagramAPIService implementado
- [ ] API routes de autenticación
- [ ] API routes de publicación
- [ ] API routes de posts publicados
- [ ] Actualizar API de posts con filtro por status
- [ ] Validaciones pre-publicación
- [ ] Manejo de errores completo
- [ ] Cron jobs configurados

## Frontend - Settings
- [ ] InstagramSettingsPanel component
- [ ] Flujo de conexión/desconexión

## Frontend - Create Post
- [ ] Actualizar PostEditor con botón de publicar
- [ ] PublishToInstagramButton component
- [ ] PublishConfirmationModal component
- [ ] PublishProgressModal component
- [ ] PublishedPostCard component
- [ ] PublishedPostsSection component
- [ ] Actualizar PostDetailView para posts publicados

## Hooks
- [ ] useInstagramConnection
- [ ] usePublishToInstagram
- [ ] usePublishedPosts

## Base de Datos
- [ ] Modelo InstagramAccount
- [ ] Modelo PublishedPost
- [ ] Actualizar modelo Post con status
- [ ] Relaciones configuradas
- [ ] Migraciones ejecutadas

## Testing
- [ ] Tests de conexión
- [ ] Tests de publicación
- [ ] Tests de error handling
- [ ] Tests de UI
```

---

## Notas Importantes

1. **App Review**: La aprobación de `instagram_content_publish` puede tomar 1-4 semanas. Planificar con tiempo.

2. **Business Verification**: Requerida para que usuarios externos usen la app. Necesita documentación de la empresa.

3. **HTTPS**: Todas las URLs de callback e imagen deben ser HTTPS.

4. **Imágenes Públicas**: Las imágenes a publicar DEBEN estar en URLs públicamente accesibles. Actualmente las imagenes se estan guardando como privadas en Cloudinary, asi que se debe generar una url temporal firmada para publicarlas a IG.

5. **Rate Limits**: Respetar el límite de 25 posts/día. Implementar contador visible para el usuario.

6. **Disclosure IA**: Meta requiere que el contenido generado por IA se marque apropiadamente. Incluir checkbox de confirmación.

7. **Tokens**: Los long-lived tokens duran 60 días. Implementar refresh proactivo.

8. **Carruseles**: Aunque Instagram app permite 20 imágenes, la API solo permite 10. Documentar esta limitación al usuario.

9. **Transición de Drafts**: Cuando un post se publica exitosamente, debe moverse visualmente de "Your Drafts" a "Published on Instagram" sin necesidad de recargar la página.

10. **Reutilización de Componentes**: La vista de post publicado debe reutilizar el máximo de componentes del editor existente (preview de Instagram, display de hashtags, etc.) pero en modo "solo lectura".