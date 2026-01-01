# Fase 3: Integración con Google Drive y Export

## Resumen Ejecutivo

Este documento detalla las especificaciones para la Fase 3 de **AIGram**, enfocada en la integración con Google Drive para backup de imágenes y la exportación optimizada de contenido listo para Instagram.

**Duración estimada:** 3-4 semanas  
**Dependencias:** Fase 1 y 2 completadas  
**Integraciones:** Google Drive API v3

---

## 1. Funcionalidades de esta Fase

### 1.1 Integración con Google Drive
- Conexión OAuth con permisos de Drive
- Creación automática de estructura de carpetas
- Sincronización de imágenes a Drive del usuario
- Backup de metadata (prompts, tags, configuración)
- Gestión de carpetas por proyecto/fecha

### 1.2 Exportación de Imágenes Optimizadas
- Export en dimensiones exactas de Instagram
- Optimización de calidad (JPEG 85-95%, sRGB)
- Sharpening automático pre-export
- Compresión inteligente (máx 1.6MB para evitar recompresión de IG)
- Batch export de múltiples imágenes

### 1.3 Export de Contenido Completo
- Imagen + Caption + Hashtags en un paquete
- Archivo JSON con metadata completa
- Checklist de disclosure para contenido IA
- Opción de descarga directa o envío a Drive

### 1.4 Gestión de Proyectos/Colecciones
- Organización de imágenes en proyectos
- Export por proyecto completo
- Sincronización selectiva a Drive

---

## 2. Configuración de Google Drive API

### 2.1 Requisitos Previos en Google Cloud Console

**Instrucciones para configuración manual:**
```
1. Ir a Google Cloud Console (console.cloud.google.com)
2. Seleccionar el proyecto existente (usado para Auth)
3. APIs & Services > Library
4. Buscar "Google Drive API" y habilitarla
5. APIs & Services > Credentials
6. Editar el OAuth 2.0 Client ID existente
7. Agregar scopes adicionales de Drive
```

### 2.2 Scopes Requeridos

```
# Scopes mínimos necesarios
https://www.googleapis.com/auth/drive.file
  → Permite crear/editar archivos creados por la app
  → NO da acceso a todo el Drive del usuario
  → Scope más restrictivo y recomendado

# Scope alternativo (más permisivo, no recomendado)
https://www.googleapis.com/auth/drive
  → Acceso completo al Drive
  → Requiere verificación de Google más estricta
```

### 2.3 Variables de Entorno Adicionales

```env
# Agregar a .env.local

# Google Drive (usa las mismas credenciales de OAuth)
GOOGLE_DRIVE_FOLDER_NAME=AIImagePost
GOOGLE_DRIVE_ENABLED=true
```

---

## 3. Arquitectura de Integración

### 3.1 Flujo de Autenticación Extendido

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuario hace login con Google (Auth.js)                    │
│     └─> Scopes: userinfo.email, userinfo.profile, drive.file   │
│                                                                 │
│  2. Auth.js obtiene access_token + refresh_token               │
│     └─> Se almacenan en BD (tabla Account)                     │
│                                                                 │
│  3. Cuando se necesita acceder a Drive:                        │
│     └─> Verificar si access_token está vigente                 │
│     └─> Si expiró, usar refresh_token para obtener nuevo       │
│     └─> Usar access_token para llamadas a Drive API            │
│                                                                 │
│  4. Primera vez que accede a Drive:                            │
│     └─> Crear carpeta raíz "AIImagePost" en Drive del usuario       │
│     └─> Guardar folder_id en perfil del usuario                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Estructura de Carpetas en Drive

```
Mi Drive/
└── AIImagePost/                     # Carpeta raíz (creada automáticamente)
    ├── Exports/                     # Imágenes exportadas listas para IG
    │   ├── 2025-01/                 # Organizadas por mes
    │   │   ├── image_001.jpg
    │   │   ├── image_001_metadata.json
    │   │   ├── image_002.jpg
    │   │   └── image_002_metadata.json
    │   └── 2025-02/
    │
    ├── Backups/                     # Backups completos
    │   ├── originals/               # Imágenes originales sin procesar
    │   └── data/                    # JSON con toda la metadata
    │       └── backup_2025-01-15.json
    │
    └── Projects/                    # Organización por proyectos
        ├── Proyecto_Fantasy_Art/
        │   ├── images/
        │   └── metadata.json
        └── Proyecto_Landscapes/
```

---

## 4. Diseño de Interfaz de Usuario

### 4.1 Pantalla de Configuración de Drive

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Settings                    Google Drive                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Estado de conexión                                               │ │
│  │                                                                   │ │
│  │  ✅ Conectado como usuario@gmail.com                              │ │
│  │                                                                   │ │
│  │  Carpeta AIImagePost: /Mi Drive/AIImagePost                                │ │
│  │  Espacio usado: 245 MB de 15 GB                                  │ │
│  │                                                                   │ │
│  │  [Abrir en Drive ↗]     [Desconectar]                            │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Configuración de sincronización                                  │ │
│  │                                                                   │ │
│  │  ☑️ Sincronizar automáticamente al exportar                       │ │
│  │  ☐ Hacer backup de imágenes originales                           │ │
│  │  ☑️ Incluir metadata JSON con cada imagen                         │ │
│  │                                                                   │ │
│  │  Organización de carpetas:                                        │ │
│  │  ○ Por fecha (2025-01, 2025-02, ...)                             │ │
│  │  ● Por proyecto                                                   │ │
│  │  ○ Carpeta única (todos los archivos juntos)                     │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Acciones                                                         │ │
│  │                                                                   │ │
│  │  [📤 Exportar todo a Drive]                                       │ │
│  │  [📥 Hacer backup completo]                                       │ │
│  │  [🗑️ Limpiar carpeta de exports]                                  │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Modal de Export de Imagen

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      Exportar imagen                         ✕    │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  ┌─────────────────┐  Configuración de export                    │ │
│  │  │                 │                                             │ │
│  │  │    PREVIEW      │  Formato de salida                          │ │
│  │  │    IMAGEN       │  ┌─────────────────────────────────────┐    │ │
│  │  │                 │  │ JPEG optimizado para Instagram  ▼  │    │ │
│  │  │   1080x1350     │  └─────────────────────────────────────┘    │ │
│  │  │                 │                                             │ │
│  │  └─────────────────┘  Calidad                                    │ │
│  │                       ────────────●────  90%                     │ │
│  │                                                                   │ │
│  │  Optimizaciones                                                   │ │
│  │  ☑️ Aplicar sharpening para Instagram                            │ │
│  │  ☑️ Convertir a sRGB                                             │ │
│  │  ☑️ Limitar tamaño a 1.6MB (evita recompresión de IG)           │ │
│  │                                                                   │ │
│  │  Tamaño estimado: 1.2 MB ✓                                       │ │
│  │                                                                   │ │
│  │  ─────────────────────────────────────────────────────────────   │ │
│  │                                                                   │ │
│  │  Incluir en export:                                               │ │
│  │  ☑️ Caption                                                       │ │
│  │  ☑️ Hashtags                                                      │ │
│  │  ☑️ Archivo metadata.json                                        │ │
│  │  ☐ Prompt original (visible en metadata)                         │ │
│  │                                                                   │ │
│  │  ─────────────────────────────────────────────────────────────   │ │
│  │                                                                   │ │
│  │  Destino                                                          │ │
│  │  ○ Descargar a mi dispositivo                                    │ │
│  │  ● Guardar en Google Drive                                        │ │
│  │     └─ Carpeta: /AIImagePost/Exports/2025-01/                         │ │
│  │                                                                   │ │
│  │  ─────────────────────────────────────────────────────────────   │ │
│  │                                                                   │ │
│  │  ⚠️ Checklist de disclosure IA                                    │ │
│  │  ☑️ Esta imagen fue generada con IA                              │ │
│  │  ☐ Marcaré como "Made with AI" al publicar en Instagram          │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │           [Cancelar]              [Exportar]                      │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Panel de Export Rápido (en página de imagen)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Acciones rápidas                                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  📥 Descargar                                                     │   │
│  │  ├─ [Original (PNG/JPG)]                                         │   │
│  │  ├─ [Optimizado para IG (1080x1350)]                             │   │
│  │  └─ [Con metadata (ZIP)]                                         │   │
│  │                                                                   │   │
│  │  ☁️ Google Drive                                                  │   │
│  │  ├─ [Exportar a Drive]                                           │   │
│  │  └─ [Backup original]                                            │   │
│  │                                                                   │   │
│  │  📋 Copiar                                                        │   │
│  │  ├─ [Caption] ✓ Copiado                                          │   │
│  │  ├─ [Hashtags]                                                   │   │
│  │  └─ [Caption + Hashtags]                                         │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Batch Export (Múltiples imágenes)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Galería                    Exportar selección (5 imágenes)           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Imágenes seleccionadas                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                         │
│  │  ✓   │ │  ✓   │ │  ✓   │ │  ✓   │ │  ✓   │                         │
│  │ img1 │ │ img2 │ │ img3 │ │ img4 │ │ img5 │                         │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                         │
│                                                                         │
│  Configuración de batch export                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Formato: [JPEG optimizado ▼]    Calidad: [90% ▼]                │  │
│  │                                                                   │  │
│  │  ☑️ Aplicar misma configuración a todas                          │  │
│  │  ☑️ Incluir metadata JSON individual                             │  │
│  │  ☑️ Generar archivo index.json con lista completa                │  │
│  │                                                                   │  │
│  │  Nombre de archivos:                                              │  │
│  │  ○ Original (mantener nombre)                                    │  │
│  │  ● Secuencial (export_001.jpg, export_002.jpg, ...)              │  │
│  │  ○ Fecha + ID (2025-01-15_abc123.jpg)                            │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Destino                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ○ Descargar como ZIP                                            │  │
│  │  ● Subir a Google Drive                                           │  │
│  │     Carpeta: [/AIImagePost/Exports/Batch_2025-01-15/ ▼]               │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Progreso                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  3/5 completadas        │  │
│  │                                                                   │  │
│  │  ✓ export_001.jpg - Completado                                   │  │
│  │  ✓ export_002.jpg - Completado                                   │  │
│  │  ✓ export_003.jpg - Completado                                   │  │
│  │  ⏳ export_004.jpg - Procesando...                                │  │
│  │  ○ export_005.jpg - Pendiente                                    │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                              [Cancelar]    [Exportar todo]              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Instrucciones de Implementación

### 5.1 Actualización de Auth.js para Drive Scopes

**Ubicación:** `lib/auth.ts`

**Instrucciones para la AI:**
```
Actualizar la configuración de Auth.js para incluir el scope de Google Drive.

Cambios necesarios:
1. Agregar scope "https://www.googleapis.com/auth/drive.file" al GoogleProvider
2. Configurar authorization params para obtener refresh_token:
   - prompt: "consent"
   - access_type: "offline"
   - response_type: "code"
3. Guardar access_token y refresh_token en la sesión/JWT
4. Implementar callback jwt para persistir tokens
5. Implementar callback session para exponer tokens al cliente (solo si es necesario)

IMPORTANTE: Los tokens deben almacenarse de forma segura en la BD,
no exponerlos directamente al cliente.

El refresh_token solo se obtiene la primera vez que el usuario autoriza.
Para obtenerlo nuevamente, el usuario debe revocar acceso en:
https://myaccount.google.com/permissions
```

### 5.2 Servicio de Google Drive

**Ubicación:** `lib/google-drive.ts`

**Instrucciones para la AI:**
```
Crear un servicio para interactuar con Google Drive API v3.

Clase GoogleDriveService con los siguientes métodos:

constructor(accessToken: string, refreshToken: string)
  - Inicializar cliente OAuth2 de googleapis
  - Configurar tokens
  - Crear instancia de drive v3

async ensureRootFolder(): Promise<string>
  - Buscar carpeta "AIImagePost" en root del Drive
  - Si no existe, crearla
  - Retornar el folderId

async createFolder(name: string, parentId?: string): Promise<string>
  - Crear carpeta con nombre dado
  - Si parentId, crear dentro de esa carpeta
  - Retornar folderId

async uploadFile(params: UploadParams): Promise<DriveFile>
  - params: { name, mimeType, content (Buffer), parentFolderId, description? }
  - Subir archivo a Drive
  - Retornar metadata del archivo creado (id, webViewLink, etc)

async listFiles(folderId: string): Promise<DriveFile[]>
  - Listar archivos en una carpeta
  - Incluir: id, name, mimeType, size, createdTime, webViewLink

async deleteFile(fileId: string): Promise<void>
  - Eliminar archivo por ID

async getStorageQuota(): Promise<{ used: number, total: number }>
  - Obtener uso de almacenamiento del usuario

private async refreshAccessToken(): Promise<string>
  - Usar refresh_token para obtener nuevo access_token
  - Actualizar en BD
  - Retornar nuevo access_token

Manejo de errores:
- Token expirado: Refrescar automáticamente y reintentar
- Quota excedida: Lanzar error específico
- Archivo no encontrado: Lanzar error específico
- Permisos insuficientes: Lanzar error y sugerir reconectar
```

### 5.3 Servicio de Optimización de Imágenes

**Ubicación:** `lib/image-optimizer.ts`

**Instrucciones para la AI:**
```
Crear servicio de optimización de imágenes para Instagram usando Sharp.

Clase ImageOptimizer con los siguientes métodos:

static async optimizeForInstagram(params: OptimizeParams): Promise<Buffer>
  params: {
    input: Buffer,              // Imagen original
    aspectRatio: "portrait" | "square" | "landscape" | "story",
    quality: number,            // 1-100, default 90
    applySharpening: boolean,   // default true
    maxFileSize?: number,       // default 1.6MB (1600000 bytes)
    convertToSRGB: boolean      // default true
  }
  
  Proceso:
  1. Detectar formato de entrada
  2. Redimensionar a dimensiones exactas de Instagram:
     - portrait: 1080x1350
     - square: 1080x1080
     - landscape: 1080x566
     - story: 1080x1920
  3. Convertir perfil de color a sRGB
  4. Aplicar sharpening sutil si está habilitado:
     - sharp.sharpen({ sigma: 0.5, m1: 0.5, m2: 0.5 })
  5. Exportar como JPEG con calidad especificada
  6. Si excede maxFileSize, reducir calidad progresivamente hasta cumplir
  7. Retornar Buffer optimizado

static async createThumbnail(input: Buffer, size: number = 200): Promise<Buffer>
  - Crear thumbnail cuadrado de tamaño especificado
  - Formato WebP para eficiencia

static async getImageMetadata(input: Buffer): Promise<ImageMetadata>
  - Extraer metadata: width, height, format, colorSpace, size

static calculateOptimalQuality(
  input: Buffer, 
  targetSize: number
): Promise<number>
  - Algoritmo para encontrar la calidad óptima
  - Que resulte en un archivo cercano pero menor a targetSize
  - Usar búsqueda binaria entre 60-95

Configuración de Sharp para Instagram:
- JPEG: { quality, chromaSubsampling: '4:4:4', mozjpeg: true }
- Resize: { fit: 'cover', position: 'center' }
- Sharpening: Sutil para compensar la compresión de IG
```

### 5.4 API Route: Export de Imagen

**Ubicación:** `app/api/export/image/route.ts`

**Instrucciones para la AI:**
```
Crear endpoint para exportar una imagen optimizada.

POST /api/export/image

Request body:
{
  imageId: string,
  options: {
    quality: number,           // 60-100
    applySharpening: boolean,
    maxFileSize: number,       // en bytes
    includeMetadata: boolean,
    destination: "download" | "drive",
    driveFolderId?: string     // si destination es "drive"
  }
}

Response (si destination es "download"):
{
  success: true,
  file: {
    name: string,
    mimeType: "image/jpeg",
    data: string,              // Base64
    size: number
  },
  metadata?: {                 // si includeMetadata
    prompt: string,
    caption: string,
    hashtags: string[],
    aiModel: string,
    exportedAt: string
  }
}

Response (si destination es "drive"):
{
  success: true,
  driveFile: {
    id: string,
    name: string,
    webViewLink: string,
    size: number
  }
}

Proceso:
1. Autenticar usuario
2. Obtener imagen de Cloudinary (URL original)
3. Descargar imagen a buffer
4. Optimizar con ImageOptimizer
5. Si destination es "download", retornar base64
6. Si destination es "drive":
   a. Obtener tokens de Drive del usuario
   b. Subir imagen optimizada
   c. Si includeMetadata, crear y subir archivo JSON
   d. Retornar info del archivo en Drive
```

### 5.5 API Route: Batch Export

**Ubicación:** `app/api/export/batch/route.ts`

**Instrucciones para la AI:**
```
Crear endpoint para exportar múltiples imágenes.

POST /api/export/batch

Request body:
{
  imageIds: string[],          // máximo 20
  options: {
    quality: number,
    applySharpening: boolean,
    namingPattern: "original" | "sequential" | "date-id",
    includeMetadata: boolean,
    includeIndex: boolean,     // archivo index.json con lista
    destination: "zip" | "drive",
    driveFolderId?: string
  }
}

Response (si destination es "zip"):
{
  success: true,
  zipFile: {
    name: string,
    data: string,              // Base64
    size: number,
    fileCount: number
  }
}

Response (si destination es "drive"):
{
  success: true,
  folder: {
    id: string,
    name: string,
    webViewLink: string
  },
  files: Array<{
    id: string,
    name: string,
    webViewLink: string
  }>
}

Para batch export:
- Procesar imágenes en paralelo (máx 5 concurrentes)
- Usar streaming para ZIP si es grande
- Reportar progreso via Server-Sent Events si es posible
- Timeout generoso (5 minutos para batch grandes)
```

### 5.6 API Route: Conexión de Drive

**Ubicación:** `app/api/drive/connect/route.ts`

**Instrucciones para la AI:**
```
Crear endpoint para verificar/inicializar conexión con Drive.

GET /api/drive/status
Response:
{
  connected: boolean,
  email?: string,
  rootFolderId?: string,
  rootFolderLink?: string,
  quota?: {
    used: number,
    total: number,
    usedFormatted: string,    // "245 MB"
    totalFormatted: string    // "15 GB"
  }
}

POST /api/drive/initialize
- Crear carpeta raíz si no existe
- Guardar folderId en perfil de usuario
Response:
{
  success: true,
  folderId: string,
  folderLink: string
}

POST /api/drive/disconnect
- Revocar tokens (opcional, o solo eliminar de BD)
- Limpiar folderId del perfil
Response:
{
  success: true
}
```

### 5.7 Hook: useGoogleDrive

**Ubicación:** `hooks/useGoogleDrive.ts`

**Instrucciones para la AI:**
```
Crear hook para gestionar la conexión con Google Drive.

Retorno:
{
  // Estado
  isConnected: boolean,
  isLoading: boolean,
  error: string | null,
  
  // Info de conexión
  email: string | null,
  quota: { used: number, total: number } | null,
  rootFolderId: string | null,
  
  // Acciones
  connect: () => Promise<void>,       // Redirige a OAuth si es necesario
  disconnect: () => Promise<void>,
  refreshStatus: () => Promise<void>,
  
  // Operaciones
  uploadFile: (file: File, folderId?: string) => Promise<DriveFile>,
  createFolder: (name: string, parentId?: string) => Promise<string>,
  listFiles: (folderId: string) => Promise<DriveFile[]>
}

El hook debe:
- Verificar estado de conexión al montar
- Cachear información de quota (refrescar cada 5 min)
- Manejar errores de tokens expirados
- Mostrar estados de loading apropiados
```

### 5.8 Hook: useImageExport

**Ubicación:** `hooks/useImageExport.ts`

**Instrucciones para la AI:**
```
Crear hook para gestionar exportación de imágenes.

Retorno:
{
  // Estado
  isExporting: boolean,
  progress: {
    current: number,
    total: number,
    currentFile: string
  } | null,
  error: string | null,
  
  // Acciones
  exportSingle: (imageId: string, options: ExportOptions) => Promise<ExportResult>,
  exportBatch: (imageIds: string[], options: BatchExportOptions) => Promise<BatchExportResult>,
  downloadFile: (data: string, filename: string, mimeType: string) => void,
  
  // Utilidades
  estimateFileSize: (imageId: string, quality: number) => Promise<number>,
  cancel: () => void
}

interface ExportOptions {
  quality: number;
  applySharpening: boolean;
  maxFileSize: number;
  includeMetadata: boolean;
  destination: "download" | "drive";
  driveFolderId?: string;
}

El hook debe:
- Manejar descarga de archivos al dispositivo
- Actualizar progreso para batch exports
- Permitir cancelación de operaciones en curso
- Manejar errores gracefully
```

### 5.9 Componente: ExportModal

**Ubicación:** `components/export/ExportModal.tsx`

**Instrucciones para la AI:**
```
Crear modal de exportación de imagen individual.

Props:
- imageId: string
- imageUrl: string
- aspectRatio: string
- currentCaption?: string
- currentHashtags?: string[]
- onClose: () => void
- onExportComplete: (result: ExportResult) => void

Estados internos:
- quality: number (60-100, default 90)
- applySharpening: boolean (default true)
- convertToSRGB: boolean (default true)
- maxFileSize: number (default 1600000)
- includeCaption: boolean
- includeHashtags: boolean
- includeMetadata: boolean
- includePrompt: boolean
- destination: "download" | "drive"
- selectedDriveFolder: string | null
- aiDisclosureChecked: boolean
- estimatedSize: number | null
- isExporting: boolean

Características UI:
- Preview de la imagen a exportar
- Slider de calidad con feedback visual
- Checkboxes para optimizaciones
- Indicador de tamaño estimado (actualizar en tiempo real al cambiar quality)
- Selector de destino (download/drive)
- Si drive: mostrar selector de carpeta
- Checklist de disclosure IA (requerido para exportar)
- Botones Cancelar/Exportar
- Progress indicator durante export

Al cambiar quality, llamar a estimateFileSize con debounce de 300ms
para mostrar tamaño aproximado.
```

### 5.10 Componente: BatchExportPanel

**Ubicación:** `components/export/BatchExportPanel.tsx`

**Instrucciones para la AI:**
```
Crear panel para exportación de múltiples imágenes.

Props:
- selectedImages: Array<{ id: string, thumbnailUrl: string }>
- onClose: () => void
- onComplete: (result: BatchExportResult) => void

Estados internos:
- options: BatchExportOptions
- progress: { current: number, total: number, currentFile: string } | null
- completedFiles: Array<{ name: string, status: "success" | "error" }>
- isExporting: boolean

Características UI:
- Grid de thumbnails de imágenes seleccionadas
- Configuración común para todas las imágenes
- Patrón de nombres (original, secuencial, fecha-id)
- Opciones de metadata
- Selector de destino (ZIP / Drive)
- Progress bar con lista de archivos procesados
- Iconos de estado por archivo (✓, ✗, ⏳)
- Botón cancelar que detiene el proceso
- Al completar: resumen y link a carpeta de Drive (si aplica)
```

### 5.11 Componente: DriveSettings

**Ubicación:** `components/settings/DriveSettings.tsx`

**Instrucciones para la AI:**
```
Crear panel de configuración de Google Drive para la página de settings.

Props:
- onConnectionChange: (connected: boolean) => void

Usa el hook useGoogleDrive para:
- Mostrar estado de conexión
- Email conectado
- Uso de almacenamiento con barra visual
- Link a carpeta de AIImagePost en Drive

Configuraciones persistidas en localStorage o BD:
- autoSyncOnExport: boolean
- backupOriginals: boolean
- includeMetadataJson: boolean
- folderOrganization: "date" | "project" | "flat"

Acciones:
- Conectar (si no conectado): Iniciar flujo OAuth
- Desconectar: Confirmar y desconectar
- Abrir en Drive: Link externo a la carpeta
- Exportar todo: Batch export de toda la galería
- Hacer backup: Subir originales + metadata
- Limpiar exports: Eliminar contenido de carpeta Exports
```

---

## 6. Modelo de Datos Adicional

### 6.1 Actualización del Schema Prisma

**Instrucciones para la AI:**
```
Agregar campos para Google Drive al schema existente:

model User {
  // ... campos existentes ...
  
  // Google Drive
  driveRootFolderId     String?
  driveConnectedAt      DateTime?
  driveSettings         Json?      // { autoSync, backupOriginals, etc }
  
  // ... resto de campos ...
}

model Image {
  // ... campos existentes ...
  
  // Google Drive sync
  driveFileId           String?    // ID del archivo en Drive
  driveExportedAt       DateTime?  // Última vez que se exportó a Drive
  driveBackupId         String?    // ID del backup original en Drive
  
  // ... resto de campos ...
}

model ExportLog {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  imageId         String?  // null si es batch
  imageIds        String[] // para batch export
  
  destination     String   // "download" | "drive"
  driveFileId     String?
  driveFolderId   String?
  
  options         Json     // opciones usadas
  fileSize        Int      // tamaño final en bytes
  
  createdAt       DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}
```

---

## 7. Formato de Metadata JSON

### 7.1 Metadata Individual

```json
{
  "version": "1.0",
  "exportedAt": "2025-01-15T14:30:00Z",
  "exportedBy": "AIImagePost",
  
  "image": {
    "originalName": "mystical_forest.png",
    "exportedName": "export_001.jpg",
    "dimensions": {
      "width": 1080,
      "height": 1350
    },
    "aspectRatio": "4:5",
    "format": "JPEG",
    "quality": 90,
    "fileSize": 1245678
  },
  
  "content": {
    "caption": "✨ Cuando la naturaleza sueña...",
    "hashtags": ["#aiart", "#digitalart", "#fantasyart"],
    "hashtagsFormatted": "#aiart #digitalart #fantasyart"
  },
  
  "aiGeneration": {
    "prompt": "A mystical forest with glowing mushrooms...",
    "negativePrompt": "blurry, low quality...",
    "model": "midjourney",
    "modelVersion": "v6",
    "isAIGenerated": true
  },
  
  "instagram": {
    "recommendedPostTime": null,
    "disclosureRequired": true,
    "suggestedAltText": "Ilustración digital de un bosque mágico..."
  }
}
```

### 7.2 Index para Batch Export

```json
{
  "version": "1.0",
  "exportedAt": "2025-01-15T14:30:00Z",
  "exportedBy": "AIImagePost",
  
  "batch": {
    "totalImages": 5,
    "totalSize": 6234567,
    "destination": "drive",
    "driveFolderId": "1abc...",
    "driveFolderLink": "https://drive.google.com/..."
  },
  
  "files": [
    {
      "index": 1,
      "filename": "export_001.jpg",
      "metadataFile": "export_001_metadata.json",
      "driveFileId": "1xyz...",
      "size": 1245678
    },
    // ... más archivos
  ],
  
  "summary": {
    "models": {
      "midjourney": 3,
      "dalle": 2
    },
    "aspectRatios": {
      "portrait": 4,
      "square": 1
    }
  }
}
```

---

## 8. Especificaciones de Optimización para Instagram

### 8.1 Configuración Recomendada

```
Dimensiones por aspect ratio:
- Portrait (4:5):   1080 x 1350 px  ← RECOMENDADO para feed
- Square (1:1):     1080 x 1080 px
- Landscape (1.91:1): 1080 x 566 px
- Story/Reels (9:16): 1080 x 1920 px

Formato: JPEG
- Calidad: 85-95% (90% es buen balance)
- Subsampling: 4:4:4 (mejor calidad de color)
- Usar mozjpeg para mejor compresión

Perfil de color: sRGB
- Instagram convierte todo a sRGB
- Convertir antes de subir evita cambios de color inesperados

Tamaño máximo recomendado: 1.6 MB
- Instagram comprime agresivamente archivos > 1.6MB
- Mantener bajo este límite preserva más calidad

Sharpening:
- Aplicar sharpening sutil antes de exportar
- Compensa la pérdida por compresión de IG
- Sigma: 0.5-1.0 (sutil)
- No sobre-sharpenear

Resolución: 72 PPI
- Es el estándar para pantallas
- No afecta calidad real, solo metadata
```

### 8.2 Pipeline de Optimización

```
1. Cargar imagen original desde Cloudinary
   └─ Usar URL de transformación si ya tiene crop aplicado

2. Verificar dimensiones
   └─ Si no coinciden con target, redimensionar

3. Convertir perfil de color a sRGB
   └─ sharp.toColorspace('srgb')

4. Aplicar sharpening (si habilitado)
   └─ sharp.sharpen({ sigma: 0.5 })

5. Exportar como JPEG
   └─ sharp.jpeg({ quality: X, chromaSubsampling: '4:4:4', mozjpeg: true })

6. Verificar tamaño resultante
   └─ Si > maxFileSize, reducir quality y repetir paso 5
   └─ Usar búsqueda binaria para encontrar quality óptimo

7. Retornar buffer optimizado
```

---

## 9. Testing y QA

### 9.1 Casos de Prueba

```markdown
## Conexión con Google Drive
- [ ] Usuario puede conectar cuenta de Google con permisos de Drive
- [ ] Se crea carpeta AIImagePost automáticamente en primer uso
- [ ] Se muestra email correcto y uso de almacenamiento
- [ ] Usuario puede desconectar su cuenta
- [ ] Reconexión después de desconectar funciona
- [ ] Refresh token funciona (sesión larga sin re-auth)
- [ ] Error handling cuando permisos son revocados externamente

## Export Individual
- [ ] Export a download genera archivo correcto
- [ ] Export a Drive sube archivo a carpeta correcta
- [ ] Calidad afecta tamaño de archivo como se espera
- [ ] Sharpening se aplica visiblemente pero sin exceso
- [ ] Tamaño no excede 1.6MB con configuración default
- [ ] Metadata JSON se genera correctamente
- [ ] Caption y hashtags se incluyen si están seleccionados

## Batch Export
- [ ] Múltiples imágenes se procesan correctamente
- [ ] Progress bar se actualiza en tiempo real
- [ ] ZIP se genera correctamente con estructura esperada
- [ ] Upload a Drive crea carpeta y sube todos los archivos
- [ ] Index.json se genera con lista completa
- [ ] Cancelación detiene el proceso sin archivos corruptos
- [ ] Límite de 20 imágenes se respeta

## Optimización de Imagen
- [ ] Dimensiones de salida son exactas para cada aspect ratio
- [ ] Perfil de color es sRGB
- [ ] Calidad visual es aceptable en diferentes niveles (60-95)
- [ ] Imágenes grandes se comprimen sin perder demasiada calidad

## UI/UX
- [ ] Modal de export es responsive
- [ ] Estimación de tamaño se actualiza en tiempo real
- [ ] Checklist de disclosure IA funciona
- [ ] Mensajes de error son claros y accionables
- [ ] Estados de loading son visibles
```

---

## 10. Dependencias Adicionales

```json
{
  "dependencies": {
    "googleapis": "^144.0.0",
    "archiver": "^7.0.1",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.0"
  }
}
```

---

## 11. Checklist de Entrega Fase 3

```markdown
## Configuración
- [ ] Google Drive API habilitada en Cloud Console
- [ ] Scope drive.file agregado a OAuth
- [ ] Variables de entorno configuradas

## Backend
- [ ] Auth.js actualizado con tokens de Drive
- [ ] GoogleDriveService implementado
- [ ] ImageOptimizer implementado
- [ ] API routes de export (single y batch)
- [ ] API routes de Drive (status, initialize, disconnect)

## Frontend
- [ ] Hook useGoogleDrive
- [ ] Hook useImageExport
- [ ] ExportModal component
- [ ] BatchExportPanel component
- [ ] DriveSettings component
- [ ] Integración en página de imagen
- [ ] Integración en galería (selección múltiple)

## Base de Datos
- [ ] Campos de Drive agregados a User
- [ ] Campos de sync agregados a Image
- [ ] Modelo ExportLog creado
- [ ] Migraciones ejecutadas

## Testing
- [ ] Tests de conexión Drive
- [ ] Tests de export
- [ ] Tests de optimización de imagen
- [ ] Tests de UI
```

---

## Notas de Implementación

1. **Rate Limits de Drive**: 20,000 queries por 100 segundos por usuario. Para batch grandes, implementar throttling.

2. **Tokens Expirados**: Access token de Google expira en 1 hora. Siempre verificar y refrescar antes de operaciones.

3. **Tamaño de Upload**: Google Drive acepta hasta 5TB por archivo, pero para imágenes optimizadas será <2MB.

4. **Privacidad**: Los archivos en Drive son privados por defecto. La app solo tiene acceso a archivos que ella creó (scope drive.file).

5. **Offline Access**: El refresh_token permite acceso sin que el usuario esté presente, útil para backups programados futuros.

---

## Próximos Pasos (Fase 4)

Después de completar la Fase 3:
- Integración con APIs de generación de imágenes (DALL-E, Stable Diffusion)
- Analytics de rendimiento de posts
- Calendario de publicación
- Integración directa con Instagram API (si disponible)