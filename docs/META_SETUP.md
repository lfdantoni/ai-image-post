# Configuración de Meta Developer Console para Instagram API

Esta guía detalla los pasos para configurar tu aplicación en Meta Developer Console y habilitar la publicación a Instagram desde AIGram.

## Requisitos Previos

Antes de comenzar, asegúrate de tener:

1. **Cuenta de Instagram Business o Creator**
   - Las cuentas personales NO son compatibles con la API de publicación
   - [Cómo convertir a cuenta Business](https://help.instagram.com/502981923235522)
   - [Cómo convertir a cuenta Creator](https://help.instagram.com/1158274571010880)

2. **Facebook Page vinculada** (para cuentas Business)
   - Tu cuenta de Instagram Business debe estar conectada a una Facebook Page
   - [Cómo conectar Instagram a Facebook Page](https://help.instagram.com/176235449218188)

3. **Cuenta de desarrollador de Facebook**
   - Regístrate en [developers.facebook.com](https://developers.facebook.com/)

---

## Paso 1: Crear una App en Meta Developer Console

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Inicia sesión con tu cuenta de Facebook
3. Click en **"My Apps"** → **"Create App"**
4. Selecciona el tipo de app:
   - Tipo: **Business**
   - Caso de uso: **Other** → **Consumer**
5. Ingresa los detalles:
   - **App name**: AIGram (o el nombre que prefieras)
   - **App contact email**: tu email
6. Click en **"Create App"**

---

## Paso 2: Agregar Productos a la App

### 2.1 Facebook Login

1. En el dashboard de tu app, ve a **"Add Product"**
2. Busca **"Facebook Login"** y click en **"Set Up"**
3. Selecciona **"Web"** como plataforma
4. En la configuración de Facebook Login:
   - **Valid OAuth Redirect URIs**:
     - Desarrollo: `http://localhost:3000/api/instagram/auth/callback`
     - Producción: `https://tu-dominio.com/api/instagram/auth/callback`
   - **Deauthorize Callback URL** (opcional): `https://tu-dominio.com/api/instagram/auth/deauthorize`
5. Guarda los cambios

### 2.2 Instagram Graph API

1. En **"Add Product"**, busca **"Instagram Graph API"**
2. Click en **"Set Up"**
3. En **"Instagram Testers"**, agrega tu cuenta de Instagram para testing

---

## Paso 3: Obtener Credenciales

1. Ve a **Settings** → **Basic** en el sidebar
2. Copia los siguientes valores:
   - **App ID** → `FACEBOOK_APP_ID`
   - **App Secret** → `FACEBOOK_APP_SECRET` (click en "Show")

3. Agrega estos valores a tu archivo `.env.local`:

```env
FACEBOOK_APP_ID=tu-app-id
FACEBOOK_APP_SECRET=tu-app-secret
INSTAGRAM_GRAPH_API_VERSION=v21.0
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/auth/callback
```

---

## Paso 4: Configurar Permisos (Scopes)

Los siguientes permisos son necesarios para la funcionalidad de AIGram:

### Permisos Esenciales (Requieren App Review)

| Permiso | Descripción | Uso en AIGram |
|---------|-------------|---------------|
| `instagram_basic` | Leer perfil e información básica | Mostrar username y avatar |
| `instagram_content_publish` | Publicar fotos, videos y carruseles | Publicar posts |
| `pages_show_list` | Listar Facebook Pages del usuario | Obtener cuenta de IG Business |
| `pages_read_engagement` | Leer engagement de la página | Métricas básicas |

### Permisos Opcionales (Recomendados)

| Permiso | Descripción | Uso en AIGram |
|---------|-------------|---------------|
| `instagram_manage_insights` | Acceder a métricas de posts | Likes, comments, reach |
| `business_management` | Gestión de cuentas de negocio | Info adicional de cuenta |

---

## Paso 5: Agregar Testers (Desarrollo)

Mientras tu app está en modo desarrollo, solo los testers pueden usarla:

1. Ve a **Roles** → **Test Users** o **Roles** → **People**
2. Agrega tu cuenta de Facebook como **Tester**
3. En **Instagram Graph API** → **Instagram Testers**, agrega tu cuenta de Instagram
4. Acepta la invitación desde la app de Instagram o Facebook

---

## Paso 6: Solicitar App Review (Producción)

Para que usuarios externos puedan usar tu app, debes pasar por el App Review:

### 6.1 Preparar la Solicitud

1. Ve a **App Review** → **Permissions and Features**
2. Solicita los siguientes permisos:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

### 6.2 Documentación Requerida

Para cada permiso, debes proporcionar:

1. **Video screencast** mostrando cómo se usa el permiso
2. **Descripción detallada** del caso de uso
3. **Instrucciones paso a paso** para los revisores

### 6.3 Business Verification

1. Ve a **Settings** → **Business Verification**
2. Completa la verificación de tu negocio con:
   - Documentos legales de la empresa
   - Dominio web verificado
   - Información de contacto

> **Nota**: El proceso de App Review puede tomar de 1 a 4 semanas.

---

## Paso 7: Pasar a Modo Live

Una vez aprobado el App Review:

1. Ve a la parte superior del dashboard
2. Cambia el toggle de **"Development"** a **"Live"**
3. Confirma el cambio

---

## Limitaciones de la API

### Rate Limits

| Límite | Valor |
|--------|-------|
| Posts por día por cuenta | 25 |
| Imágenes por carrusel | 10 (API), 20 (app nativa) |
| Llamadas API por hora | 200 por usuario |

### Requisitos de Imagen

| Requisito | Valor |
|-----------|-------|
| Formato | Solo JPEG |
| Ancho mínimo | 320px |
| Ancho máximo | 1440px |
| Aspect ratio | Entre 4:5 y 1.91:1 |
| Tamaño máximo | 8MB |

### Requisitos de Caption

| Requisito | Valor |
|-----------|-------|
| Longitud máxima | 2,200 caracteres |
| Hashtags máximos | 30 |
| Menciones máximas | 20 |

### No Soportado vía API

- Stories
- Reels (soporte limitado)
- Filtros de Instagram
- Shopping tags
- Branded content tags

---

## Troubleshooting

### Error: "Invalid OAuth redirect URI"

- Verifica que la URI en `.env.local` coincida exactamente con la configurada en Facebook Login
- Asegúrate de incluir el protocolo (`http://` o `https://`)
- En producción, debe ser HTTPS

### Error: "App not authorized"

- Verifica que tu cuenta esté agregada como tester
- Acepta la invitación de tester en Instagram/Facebook
- Asegúrate de que la app esté en modo "Development" para testing

### Error: "Instagram account not connected to Facebook Page"

- Tu cuenta de Instagram Business debe estar conectada a una Facebook Page
- Ve a la configuración de Instagram → Cuenta → Cuentas vinculadas → Facebook

### Error: "Permission denied"

- Verifica que hayas solicitado y obtenido los permisos necesarios
- En desarrollo, los permisos están disponibles para testers
- En producción, necesitas App Review aprobado

---

## Recursos Adicionales

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing Guide](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Instagram Platform Rate Limits](https://developers.facebook.com/docs/instagram-api/overview#rate-limiting)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)

---

## Flujo de Autenticación (Referencia Técnica)

```
Usuario clickea "Conectar Instagram"
         │
         ▼
Redirect a Facebook OAuth Dialog
         │
         ▼
Usuario autoriza la app
         │
         ▼
Callback recibe authorization code
         │
         ▼
Intercambiar por short-lived token
         │
         ▼
Intercambiar por long-lived token (60 días)
         │
         ▼
Obtener Facebook Pages (GET /me/accounts)
         │
         ▼
Obtener Instagram Business Account de cada Page
(GET /{page-id}?fields=instagram_business_account)
         │
         ▼
Guardar tokens y account ID en base de datos
         │
         ▼
Usuario puede publicar desde AIGram
```

### Refresh de Tokens

Los long-lived tokens duran 60 días y pueden refrescarse:

```
GET /oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={existing-token}
```

AIGram implementa un cron job diario que refresca tokens con menos de 7 días de validez.
