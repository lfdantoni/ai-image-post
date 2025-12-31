# Fase 1: MVP Core - Documento de Especificaciones Técnicas

## Resumen Ejecutivo

Este documento detalla las especificaciones completas para la Fase 1 del desarrollo de **AIGram** (nombre provisional), una aplicación Next.js para gestión de imágenes generadas con IA orientada a publicación en Instagram.

**Duración estimada:** 4-6 semanas  
**Stack principal:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Auth.js v5, Cloudinary, react-dropzone, react-easy-crop

---

## 1. Arquitectura y Estructura del Proyecto

### 1.1 Estructura de Carpetas

```
aigram/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── gallery/
│   │   │   └── page.tsx
│   │   ├── upload/
│   │   │   └── page.tsx
│   │   ├── image/[id]/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts
│   │   ├── images/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── upload/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── auth/
│   │   ├── LoginButton.tsx
│   │   ├── LogoutButton.tsx
│   │   └── UserAvatar.tsx
│   ├── gallery/
│   │   ├── ImageCard.tsx
│   │   ├── ImageGrid.tsx
│   │   └── ImageFilters.tsx
│   ├── upload/
│   │   ├── Dropzone.tsx
│   │   ├── ImageCropper.tsx
│   │   ├── AspectRatioSelector.tsx
│   │   ├── PromptInput.tsx
│   │   └── UploadPreview.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Slider.tsx
│   │   └── Badge.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   └── shared/
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── auth.ts
│   ├── auth.config.ts
│   ├── cloudinary.ts
│   ├── db.ts
│   └── utils.ts
├── hooks/
│   ├── useImageUpload.ts
│   ├── useCropImage.ts
│   └── useImages.ts
├── types/
│   ├── image.ts
│   ├── user.ts
│   └── index.ts
├── providers/
│   ├── SessionProvider.tsx
│   └── ImageCropProvider.tsx
├── prisma/
│   └── schema.prisma
├── public/
│   └── images/
├── .env.local
├── .env.example
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 1.2 Dependencias Principales

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "5.0.0-beta.25",
    "react-dropzone": "^14.2.3",
    "react-easy-crop": "^5.0.8",
    "cloudinary": "^2.5.0",
    "next-cloudinary": "^6.13.0",
    "@prisma/client": "^5.20.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "zod": "^3.23.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "prisma": "^5.20.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

---

## 2. Diseño de Interfaz de Usuario

### 2.1 Referencias de Diseño

Basado en la investigación de mercado, el diseño debe inspirarse en:

1. **Later/Planoly**: Dashboard limpio con sidebar lateral, calendario visual, preview de grid
2. **Cloudinary Upload Widget**: Zona de drop destacada, progreso visual, thumbnails
3. **Dribbble trends 2024**: Minimalismo, espacios blancos generosos, bordes redondeados suaves

### 2.2 Paleta de Colores

```css
:root {
  /* Colores principales */
  --primary: #6366f1;        /* Indigo - botones primarios */
  --primary-hover: #4f46e5;
  --secondary: #ec4899;      /* Pink - acentos */
  
  /* Fondos */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  /* Textos */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  
  /* Bordes */
  --border: #e2e8f0;
  --border-hover: #cbd5e1;
  
  /* Estados */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  
  /* Gradientes para zona de drop */
  --drop-gradient: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
}
```

### 2.3 Tipografía

```css
/* Font principal: Inter (Google Fonts) */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

/* Tamaños */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### 2.4 Wireframes por Pantalla

#### 2.4.1 Login Page

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      ┌─────────────────┐                    │
│                      │                 │                    │
│                      │    🎨 Logo      │                    │
│                      │    AIGram       │                    │
│                      │                 │                    │
│                      │  Gestiona tu    │                    │
│                      │  arte AI para   │                    │
│                      │  Instagram      │                    │
│                      │                 │                    │
│                      │ ┌─────────────┐ │                    │
│                      │ │ 🔵 Google   │ │                    │
│                      │ │  Continue   │ │                    │
│                      │ └─────────────┘ │                    │
│                      │                 │                    │
│                      │  Términos |     │                    │
│                      │  Privacidad     │                    │
│                      └─────────────────┘                    │
│                                                             │
│  [Imagen decorativa con arte AI de fondo - blur/gradient]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Especificaciones:**
- Split layout: 50% formulario / 50% imagen decorativa (en desktop)
- Mobile: Solo formulario con fondo gradiente
- Botón Google con icono oficial SVG
- Animación sutil de fade-in al cargar

#### 2.4.2 Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                    🔔  👤 Usuario ▼      │
│  │  Logo    │   Dashboard    Gallery    Upload                          │
│  └──────────┘                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Bienvenido, [Nombre] 👋                                          │ │
│  │  Tienes 24 imágenes en tu galería                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ 📊 24           │  │ 🏷️ 12           │  │ 📅 Esta semana  │        │
│  │ Total imágenes  │  │ Con prompts     │  │ 5 subidas       │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  Imágenes Recientes                                      Ver todas →   │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │        │  │        │  │        │  │        │  │        │          │
│  │  Img   │  │  Img   │  │  Img   │  │  Img   │  │  Img   │          │
│  │        │  │        │  │        │  │        │  │        │          │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ➕ Subir nueva imagen                                          │  │
│  │  Arrastra archivos o haz clic para seleccionar                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Especificaciones:**
- Navbar sticky con navegación principal
- Cards de estadísticas con iconos Lucide
- Grid de imágenes recientes (scroll horizontal en mobile)
- CTA prominente para subir imágenes
- Responsive: Cards apilan en columna en mobile

#### 2.4.3 Upload Page (Pantalla Principal de Subida)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Volver                           Subir imagen                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │                    ┌─────────────────────┐                        │ │
│  │                    │                     │                        │ │
│  │                    │   📤               │                        │ │
│  │                    │                     │                        │ │
│  │                    │   Arrastra tu       │                        │ │
│  │                    │   imagen aquí       │                        │ │
│  │                    │                     │                        │ │
│  │                    │   o                 │                        │ │
│  │                    │                     │                        │ │
│  │                    │ [Seleccionar archivo]                       │ │
│  │                    │                     │                        │ │
│  │                    │   PNG, JPG, WebP    │                        │ │
│  │                    │   Máx 8MB           │                        │ │
│  │                    │                     │                        │ │
│  │                    └─────────────────────┘                        │ │
│  │                                                                   │ │
│  │  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - │ │
│  │                                                                   │ │
│  │  Zona activa: borde punteado animado cuando hay drag over        │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Imágenes seleccionadas (0)                                            │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │   [Estado vacío: "Selecciona imágenes para comenzar"]            │  │
│  │                                                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.4.4 Upload Page (Con imagen seleccionada - Modal de Crop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         Editar imagen                    ✕        │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │                                                             │ │ │
│  │  │                    ┌───────────────┐                        │ │ │
│  │  │                    │               │                        │ │ │
│  │  │                    │   CROPPER     │                        │ │ │
│  │  │                    │   AREA        │                        │ │ │
│  │  │                    │               │                        │ │ │
│  │  │                    │   (4:5)       │                        │ │ │
│  │  │                    │               │                        │ │ │
│  │  │                    └───────────────┘                        │ │ │
│  │  │                                                             │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Aspect Ratio                                                     │ │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                 │ │
│  │  │ 4:5    │  │ 1:1    │  │ 9:16   │  │ Libre  │                 │ │
│  │  │ Feed ✓ │  │ Square │  │ Story  │  │        │                 │ │
│  │  └────────┘  └────────┘  └────────┘  └────────┘                 │ │
│  │                                                                   │ │
│  │  Zoom  ────────────●──────────  1.5x                             │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  Prompt usado para generar esta imagen                           │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ A mystical forest with glowing mushrooms, ethereal          │ │ │
│  │  │ lighting, fantasy art style, detailed...                    │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Tags (opcional)                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ + Agregar tag                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Modelo IA                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Midjourney v6 ▼                                             │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                          [Cancelar]    [Guardar imagen]           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.4.5 Gallery Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Dashboard                           Galería                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Buscar por prompt o tag...                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Filtros:  [Todos ▼]  [Modelo IA ▼]  [Fecha ▼]  [Ordenar ▼]           │
│                                                                         │
│  24 imágenes                                              ⊞ ≡          │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │              │  │              │  │              │  │            │ │
│  │              │  │              │  │              │  │            │ │
│  │    Imagen    │  │    Imagen    │  │    Imagen    │  │   Imagen   │ │
│  │              │  │              │  │              │  │            │ │
│  │              │  │              │  │              │  │            │ │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├────────────┤ │
│  │ 🏷️ Midjourney │  │ 🏷️ DALL-E    │  │ 🏷️ SD XL     │  │ 🏷️ MJ v6   │ │
│  │ hace 2 días  │  │ hace 3 días  │  │ hace 1 sem   │  │ hace 1 sem │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │              │  │              │  │              │  │            │ │
│  │    ...       │  │    ...       │  │    ...       │  │    ...     │ │
│  │              │  │              │  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
│                         [Cargar más]                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.4.6 Image Detail Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Galería                                                   🗑️  ✏️    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌────────────────────────────┐  │
│  │                                 │  │                            │  │
│  │                                 │  │  Detalles                  │  │
│  │                                 │  │                            │  │
│  │                                 │  │  Modelo IA                 │  │
│  │                                 │  │  ┌────────────────────┐    │  │
│  │                                 │  │  │ 🎨 Midjourney v6   │    │  │
│  │        IMAGEN PRINCIPAL         │  │  └────────────────────┘    │  │
│  │                                 │  │                            │  │
│  │                                 │  │  Fecha de subida           │  │
│  │                                 │  │  15 de Enero, 2025         │  │
│  │                                 │  │                            │  │
│  │                                 │  │  Dimensiones               │  │
│  │                                 │  │  1080 x 1350 (4:5)         │  │
│  │                                 │  │                            │  │
│  │                                 │  │  Tags                      │  │
│  │                                 │  │  [fantasy] [forest] [art]  │  │
│  └─────────────────────────────────┘  │                            │  │
│                                       └────────────────────────────┘  │
│                                                                         │
│  Prompt                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ A mystical forest with glowing mushrooms, ethereal lighting,    │  │
│  │ fantasy art style, detailed digital painting, vibrant colors,   │  │
│  │ magical atmosphere, 8k resolution --ar 4:5 --v 6                │  │
│  │                                                      [📋 Copiar] │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────┐  ┌─────────────────────────┐             │
│  │  📥 Descargar original  │  │  📱 Crear post (Fase 2) │             │
│  └─────────────────────────┘  └─────────────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.5 Diseño Responsive

#### Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

#### Adaptaciones Mobile

```
Mobile (< 768px):
- Navbar se convierte en bottom navigation
- Sidebar colapsada por defecto (hamburger menu)
- Grid de galería: 2 columnas
- Modal de crop: full screen
- Upload dropzone: altura reducida
- Cards de stats: apilan verticalmente

Tablet (768px - 1024px):
- Sidebar colapsable
- Grid de galería: 3 columnas
- Modal de crop: 90% del viewport

Desktop (> 1024px):
- Sidebar siempre visible
- Grid de galería: 4-5 columnas
- Modal de crop: max-width 800px
```

---

## 3. Autenticación con Google (Auth.js v5)

### 3.1 Configuración Base

#### auth.config.ts
```typescript
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnGallery = nextUrl.pathname.startsWith("/gallery");
      const isOnUpload = nextUrl.pathname.startsWith("/upload");
      const isOnImage = nextUrl.pathname.startsWith("/image");
      
      const protectedRoutes = isOnDashboard || isOnGallery || isOnUpload || isOnImage;
      
      if (protectedRoutes) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [], // Configured in auth.ts
};
```

#### auth.ts
```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});
```

#### middleware.ts
```typescript
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/gallery/:path*",
    "/upload/:path*",
    "/image/:path*",
  ],
};
```

### 3.2 Variables de Entorno

```env
# .env.local

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-generado-con-openssl

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aigram"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
CLOUDINARY_UPLOAD_PRESET=aigram-unsigned
```

### 3.3 Componentes de Autenticación

#### LoginButton.tsx
```typescript
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center justify-center gap-3 w-full px-6 py-3 
                 bg-white border border-gray-300 rounded-lg shadow-sm
                 hover:bg-gray-50 hover:shadow transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <LoadingSpinner className="w-5 h-5" />
      ) : (
        <>
          <GoogleIcon className="w-5 h-5" />
          <span className="text-gray-700 font-medium">
            Continuar con Google
          </span>
        </>
      )}
    </button>
  );
}
```

---

## 4. Sistema de Upload con Drag & Drop

### 4.1 Componente Dropzone

```typescript
// components/upload/Dropzone.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
}

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MAX_SIZE_DEFAULT = 8 * 1024 * 1024; // 8MB (Instagram limit)

export function Dropzone({
  onFilesAccepted,
  maxFiles = 10,
  maxSize = MAX_SIZE_DEFAULT,
  className,
}: DropzoneProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setErrors([]);

      if (rejectedFiles.length > 0) {
        const newErrors = rejectedFiles.map((rejection) => {
          const error = rejection.errors[0];
          if (error.code === "file-too-large") {
            return `${rejection.file.name}: El archivo excede 8MB`;
          }
          if (error.code === "file-invalid-type") {
            return `${rejection.file.name}: Formato no soportado`;
          }
          return `${rejection.file.name}: ${error.message}`;
        });
        setErrors(newErrors);
      }

      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize,
    maxFiles,
    multiple: true,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "w-full min-h-[300px] p-8",
          "border-2 border-dashed rounded-xl",
          "cursor-pointer transition-all duration-200",
          "bg-gray-50 hover:bg-gray-100",
          {
            "border-gray-300 hover:border-primary": !isDragActive,
            "border-primary bg-primary/5 scale-[1.02]": isDragAccept,
            "border-red-500 bg-red-50": isDragReject,
          }
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            "flex flex-col items-center gap-4 text-center",
            "transition-transform duration-200",
            { "scale-110": isDragActive }
          )}
        >
          <div
            className={cn(
              "p-4 rounded-full",
              "bg-primary/10 text-primary",
              { "bg-red-100 text-red-500": isDragReject }
            )}
          >
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive
                ? isDragReject
                  ? "Archivo no válido"
                  : "Suelta aquí tu imagen"
                : "Arrastra tu imagen aquí"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              o{" "}
              <span className="text-primary font-medium hover:underline">
                selecciona un archivo
              </span>
            </p>
          </div>

          <div className="flex gap-2 text-xs text-gray-400">
            <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
            <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
            <span className="px-2 py-1 bg-gray-100 rounded">WebP</span>
            <span className="px-2 py-1 bg-gray-100 rounded">Máx 8MB</span>
          </div>
        </div>

        {/* Animación de borde durante drag */}
        {isDragActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Errores */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() =>
                  setErrors((prev) => prev.filter((_, i) => i !== index))
                }
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.2 Upload Preview con Progreso

```typescript
// components/upload/UploadPreview.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Check, Loader2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface UploadPreviewProps {
  files: UploadFile[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}

export function UploadPreview({ files, onRemove, onEdit }: UploadPreviewProps) {
  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        <p>Selecciona imágenes para comenzar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            "relative group aspect-square rounded-lg overflow-hidden",
            "border-2 transition-all duration-200",
            {
              "border-gray-200": file.status === "pending",
              "border-primary": file.status === "uploading",
              "border-green-500": file.status === "success",
              "border-red-500": file.status === "error",
            }
          )}
        >
          {/* Thumbnail */}
          <Image
            src={file.preview}
            alt={file.file.name}
            fill
            className="object-cover"
          />

          {/* Overlay de estado */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "bg-black/40 transition-opacity",
              {
                "opacity-0 group-hover:opacity-100": file.status === "pending",
                "opacity-100": file.status !== "pending",
              }
            )}
          >
            {file.status === "uploading" && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-white text-sm font-medium">
                  {file.progress}%
                </span>
              </div>
            )}

            {file.status === "success" && (
              <div className="p-2 bg-green-500 rounded-full">
                <Check className="w-6 h-6 text-white" />
              </div>
            )}

            {file.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(file.id)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition"
                >
                  <Edit2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {file.status === "uploading" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}

          {/* Nombre del archivo */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-xs text-white truncate">{file.file.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Sistema de Crop con Aspect Ratios de Instagram

### 5.1 Aspect Ratios de Instagram

```typescript
// lib/instagram-formats.ts

export const INSTAGRAM_ASPECTS = {
  portrait: {
    value: 4 / 5,
    label: "Portrait",
    description: "Feed (4:5)",
    dimensions: { width: 1080, height: 1350 },
    recommended: true,
  },
  square: {
    value: 1 / 1,
    label: "Cuadrado",
    description: "Clásico (1:1)",
    dimensions: { width: 1080, height: 1080 },
    recommended: false,
  },
  landscape: {
    value: 1.91 / 1,
    label: "Horizontal",
    description: "Paisaje (1.91:1)",
    dimensions: { width: 1080, height: 566 },
    recommended: false,
  },
  story: {
    value: 9 / 16,
    label: "Story",
    description: "Stories/Reels (9:16)",
    dimensions: { width: 1080, height: 1920 },
    recommended: false,
  },
} as const;

export type AspectRatioKey = keyof typeof INSTAGRAM_ASPECTS;
```

### 5.2 Componente ImageCropper

```typescript
// components/upload/ImageCropper.tsx
"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/Slider";
import { AspectRatioSelector } from "./AspectRatioSelector";
import { INSTAGRAM_ASPECTS, AspectRatioKey } from "@/lib/instagram-formats";
import { getCroppedImg } from "@/lib/crop-utils";

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob, cropData: CropData) => void;
  onCancel: () => void;
  initialAspect?: AspectRatioKey;
}

interface CropData {
  aspect: AspectRatioKey;
  crop: Point;
  zoom: number;
  croppedAreaPixels: Area;
}

export function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  initialAspect = "portrait",
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<AspectRatioKey>(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteHandler = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );

      if (croppedImage) {
        onCropComplete(croppedImage, {
          aspect,
          crop,
          zoom,
          croppedAreaPixels,
        });
      }
    } catch (error) {
      console.error("Error al recortar imagen:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Área del Cropper */}
      <div className="relative flex-1 min-h-[300px] bg-gray-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={INSTAGRAM_ASPECTS[aspect].value}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
          showGrid={true}
          classes={{
            containerClassName: "rounded-lg",
            mediaClassName: "rounded-lg",
          }}
        />
      </div>

      {/* Controles */}
      <div className="p-4 space-y-4 bg-white border-t">
        {/* Selector de Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato
          </label>
          <AspectRatioSelector
            selected={aspect}
            onSelect={setAspect}
          />
        </div>

        {/* Control de Zoom */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Zoom</label>
            <span className="text-sm text-gray-500">{zoom.toFixed(1)}x</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([value]) => setZoom(value)}
            className="w-full"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg
                     text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg
                     font-medium hover:bg-primary-hover transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Procesando..." : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5.3 Selector de Aspect Ratio

```typescript
// components/upload/AspectRatioSelector.tsx
"use client";

import { INSTAGRAM_ASPECTS, AspectRatioKey } from "@/lib/instagram-formats";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";

interface AspectRatioSelectorProps {
  selected: AspectRatioKey;
  onSelect: (aspect: AspectRatioKey) => void;
}

export function AspectRatioSelector({
  selected,
  onSelect,
}: AspectRatioSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(INSTAGRAM_ASPECTS) as AspectRatioKey[]).map((key) => {
        const aspect = INSTAGRAM_ASPECTS[key];
        const isSelected = selected === key;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "relative flex flex-col items-center gap-1 p-3",
              "border-2 rounded-lg transition-all duration-200",
              {
                "border-primary bg-primary/5": isSelected,
                "border-gray-200 hover:border-gray-300": !isSelected,
              }
            )}
          >
            {/* Icono visual del aspect ratio */}
            <div
              className={cn(
                "w-8 h-8 rounded border-2",
                isSelected ? "border-primary" : "border-gray-400"
              )}
              style={{
                aspectRatio: aspect.value,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />

            <span
              className={cn(
                "text-xs font-medium",
                isSelected ? "text-primary" : "text-gray-600"
              )}
            >
              {aspect.label}
            </span>

            <span className="text-[10px] text-gray-400">
              {aspect.description}
            </span>

            {/* Indicador de selección */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 p-0.5 bg-primary rounded-full">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Badge de recomendado */}
            {aspect.recommended && (
              <div className="absolute -top-1 -left-1 p-0.5 bg-amber-400 rounded-full">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

### 5.4 Utilidad de Recorte

```typescript
// lib/crop-utils.ts

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped image
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    return null;
  }

  // Set the size of the cropped canvas
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  // Draw the cropped image
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Return as blob
  return new Promise((resolve) => {
    croppedCanvas.toBlob(
      (file) => {
        resolve(file);
      },
      "image/jpeg",
      0.95
    );
  });
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}
```

---

## 6. Sistema de Prompts y Tags

### 6.1 Modelo de Datos

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  images        Image[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Image {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Cloudinary data
  publicId        String   @unique
  url             String
  secureUrl       String
  thumbnailUrl    String?
  
  // Image metadata
  width           Int
  height          Int
  format          String
  bytes           Int
  aspectRatio     String   // "portrait", "square", "landscape", "story"
  
  // AI metadata
  prompt          String?  @db.Text
  negativePrompt  String?  @db.Text
  aiModel         String?  // "midjourney", "dalle", "stable-diffusion", etc
  aiModelVersion  String?  // "v6", "3", "xl", etc
  
  // Organization
  tags            Tag[]
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([aiModel])
  @@index([createdAt])
}

model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  images    Image[]
  createdAt DateTime @default(now())

  @@index([name])
}
```

### 6.2 Componente de Input de Prompt

```typescript
// components/upload/PromptInput.tsx
"use client";

import { useState } from "react";
import { Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  negativePrompt?: string;
  onNegativePromptChange?: (value: string) => void;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  negativePrompt = "",
  onNegativePromptChange,
  className,
}: PromptInputProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Prompt principal */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Wand2 className="w-4 h-4" />
          Prompt usado
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe el prompt que usaste para generar esta imagen..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   resize-none focus:outline-none focus:ring-2 
                   focus:ring-primary/20 focus:border-primary
                   placeholder:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-400">
          {value.length} caracteres
        </p>
      </div>

      {/* Toggle para opciones avanzadas */}
      {onNegativePromptChange && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Opciones avanzadas
        </button>
      )}

      {/* Negative prompt */}
      {showAdvanced && onNegativePromptChange && (
        <div className="animate-in slide-in-from-top-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Negative Prompt (opcional)
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => onNegativePromptChange(e.target.value)}
            placeholder="Elementos a evitar en la imagen..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     resize-none focus:outline-none focus:ring-2 
                     focus:ring-primary/20 focus:border-primary
                     placeholder:text-gray-400 text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

### 6.3 Selector de Modelo IA

```typescript
// components/upload/AIModelSelector.tsx
"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AI_MODELS = [
  {
    id: "midjourney",
    name: "Midjourney",
    versions: ["v6", "v5.2", "v5.1", "v5", "v4"],
    icon: "🎨",
  },
  {
    id: "dalle",
    name: "DALL-E",
    versions: ["3", "2"],
    icon: "🤖",
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion",
    versions: ["XL", "2.1", "1.5"],
    icon: "🖼️",
  },
  {
    id: "leonardo",
    name: "Leonardo.ai",
    versions: ["Phoenix", "Kino XL", "Vision XL"],
    icon: "✨",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    versions: ["2.0", "1.0"],
    icon: "💡",
  },
  {
    id: "flux",
    name: "Flux",
    versions: ["Pro", "Dev", "Schnell"],
    icon: "⚡",
  },
  {
    id: "other",
    name: "Otro",
    versions: [],
    icon: "📷",
  },
];

interface AIModelSelectorProps {
  model: string;
  version: string;
  onModelChange: (model: string) => void;
  onVersionChange: (version: string) => void;
  className?: string;
}

export function AIModelSelector({
  model,
  version,
  onModelChange,
  onVersionChange,
  className,
}: AIModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = AI_MODELS.find((m) => m.id === model);

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-sm font-medium text-gray-700">
        Modelo de IA
      </label>

      {/* Dropdown de modelo */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3
                   border border-gray-300 rounded-lg bg-white
                   hover:border-gray-400 focus:outline-none focus:ring-2
                   focus:ring-primary/20 focus:border-primary"
        >
          <span className="flex items-center gap-2">
            {selectedModel ? (
              <>
                <span>{selectedModel.icon}</span>
                <span>{selectedModel.name}</span>
              </>
            ) : (
              <span className="text-gray-400">Selecciona un modelo</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-400 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 
                        rounded-lg shadow-lg max-h-60 overflow-auto">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onModelChange(m.id);
                  if (m.versions.length > 0) {
                    onVersionChange(m.versions[0]);
                  } else {
                    onVersionChange("");
                  }
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3",
                  "hover:bg-gray-50 transition-colors",
                  model === m.id && "bg-primary/5"
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </span>
                {model === m.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector de versión */}
      {selectedModel && selectedModel.versions.length > 0 && (
        <div>
          <label className="block text-sm text-gray-500 mb-2">Versión</label>
          <div className="flex flex-wrap gap-2">
            {selectedModel.versions.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVersionChange(v)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border transition-all",
                  version === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 6.4 Sistema de Tags

```typescript
// components/upload/TagInput.tsx
"use client";

import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (
      normalizedTag &&
      !tags.includes(normalizedTag) &&
      tags.length < maxTags
    ) {
      onTagsChange([...tags, normalizedTag]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s.toLowerCase())
  );

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tags (opcional)
      </label>

      <div
        className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg
                   focus-within:ring-2 focus-within:ring-primary/20 
                   focus-within:border-primary min-h-[48px]"
      >
        {/* Tags existentes */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1
                     bg-primary/10 text-primary rounded-full text-sm"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input para nuevos tags */}
        {tags.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={tags.length === 0 ? "Añadir tags..." : ""}
              className="w-full outline-none text-sm placeholder:text-gray-400"
            />

            {/* Sugerencias */}
            {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white
                            border border-gray-200 rounded-lg shadow-lg z-10">
                {filteredSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTag(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50
                             flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-400">
        {tags.length}/{maxTags} tags · Presiona Enter o coma para añadir
      </p>
    </div>
  );
}
```

---

## 7. Integración con Cloudinary

### 7.1 Configuración

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export const CLOUDINARY_FOLDERS = {
  originals: "aigram/originals",
  thumbnails: "aigram/thumbnails",
  processed: "aigram/processed",
};
```

### 7.2 API Route de Upload

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { z } from "zod";

const uploadSchema = z.object({
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  aiModel: z.string().optional(),
  aiModelVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
  aspectRatio: z.enum(["portrait", "square", "landscape", "story"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = JSON.parse(formData.get("metadata") as string);

    // Validar metadata
    const validatedData = uploadSchema.parse(metadata);

    // Convertir archivo a base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Subir a Cloudinary
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: CLOUDINARY_FOLDERS.originals,
      resource_type: "image",
      transformation: [
        { quality: "auto:best" },
        { fetch_format: "auto" },
      ],
    });

    // Generar thumbnail
    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      width: 400,
      height: 400,
      crop: "fill",
      quality: "auto",
      format: "webp",
    });

    // Crear o conectar tags
    const tagConnections = validatedData.tags?.length
      ? await Promise.all(
          validatedData.tags.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName.toLowerCase() },
              update: {},
              create: { name: tagName.toLowerCase() },
            });
            return { id: tag.id };
          })
        )
      : [];

    // Guardar en base de datos
    const image = await prisma.image.create({
      data: {
        userId: session.user.id,
        publicId: uploadResult.public_id,
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        thumbnailUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        aspectRatio: validatedData.aspectRatio,
        prompt: validatedData.prompt,
        negativePrompt: validatedData.negativePrompt,
        aiModel: validatedData.aiModel,
        aiModelVersion: validatedData.aiModelVersion,
        tags: {
          connect: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        url: image.secureUrl,
        thumbnailUrl: image.thumbnailUrl,
        width: image.width,
        height: image.height,
      },
    });
  } catch (error) {
    console.error("Error en upload:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al subir imagen" },
      { status: 500 }
    );
  }
}
```

### 7.3 Hook de Upload

```typescript
// hooks/useImageUpload.ts
"use client";

import { useState, useCallback } from "react";

interface UploadMetadata {
  prompt?: string;
  negativePrompt?: string;
  aiModel?: string;
  aiModelVersion?: string;
  tags?: string[];
  aspectRatio: "portrait" | "square" | "landscape" | "story";
}

interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: Blob, metadata: UploadMetadata): Promise<UploadResult | null> => {
      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: 100, percentage: 0 });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify(metadata));

        // Simulamos progreso ya que fetch no lo soporta nativamente
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (!prev || prev.percentage >= 90) return prev;
            return {
              ...prev,
              percentage: prev.percentage + 10,
              loaded: (prev.percentage + 10) * 10,
            };
          });
        }, 200);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al subir imagen");
        }

        setProgress({ loaded: 100, total: 100, percentage: 100 });

        const data = await response.json();
        return data.image;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}
```

---

## 8. Galería de Imágenes

### 8.1 API de Listado

```typescript
// app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const aiModel = searchParams.get("aiModel") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      userId: session.user.id,
    };

    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: "insensitive" } },
        { tags: { some: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (aiModel) {
      where.aiModel = aiModel;
    }

    // Obtener imágenes
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        include: {
          tags: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.image.count({ where }),
    ]);

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + images.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Error al obtener imágenes" },
      { status: 500 }
    );
  }
}
```

### 8.2 Componente de Galería

```typescript
// components/gallery/ImageGrid.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ImageData {
  id: string;
  thumbnailUrl: string;
  secureUrl: string;
  aiModel: string | null;
  aiModelVersion: string | null;
  createdAt: string;
  tags: { id: string; name: string }[];
}

interface ImageGridProps {
  images: ImageData[];
  isLoading?: boolean;
}

export function ImageGrid({ images, isLoading }: ImageGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">🖼️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No hay imágenes</h3>
        <p className="mt-1 text-sm text-gray-500">
          Sube tu primera imagen para comenzar
        </p>
        <Link
          href="/upload"
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg
                   hover:bg-primary-hover transition"
        >
          Subir imagen
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {images.map((image) => (
        <Link
          key={image.id}
          href={`/image/${image.id}`}
          className="group relative aspect-square rounded-lg overflow-hidden
                   bg-gray-100 hover:shadow-lg transition-all duration-200"
        >
          <Image
            src={image.thumbnailUrl || image.secureUrl}
            alt=""
            fill
            className={cn(
              "object-cover transition-all duration-300",
              "group-hover:scale-105",
              loadedImages.has(image.id) ? "opacity-100" : "opacity-0"
            )}
            onLoad={() =>
              setLoadedImages((prev) => new Set([...prev, image.id]))
            }
          />

          {/* Skeleton mientras carga */}
          {!loadedImages.has(image.id) && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* Overlay con info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {image.aiModel && (
                <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm
                               rounded text-xs text-white font-medium">
                  {image.aiModel}
                  {image.aiModelVersion && ` ${image.aiModelVersion}`}
                </span>
              )}
              <p className="mt-1 text-xs text-white/80">
                {formatDistanceToNow(new Date(image.createdAt), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

---

## 9. Testing y QA

### 9.1 Casos de Prueba Críticos

```markdown
## Autenticación
- [ ] Login con Google redirige correctamente
- [ ] Logout limpia la sesión
- [ ] Rutas protegidas redirigen a login
- [ ] Sesión persiste al recargar página
- [ ] Usuario nuevo se crea en base de datos

## Upload
- [ ] Drag and drop funciona en Chrome, Firefox, Safari
- [ ] Validación de tipo de archivo (solo PNG, JPG, WebP)
- [ ] Validación de tamaño (máx 8MB)
- [ ] Preview se genera correctamente
- [ ] Progress bar se actualiza
- [ ] Error handling muestra mensajes claros
- [ ] Upload múltiple funciona (hasta 10 archivos)

## Cropper
- [ ] Todos los aspect ratios funcionan
- [ ] Zoom funciona con slider y scroll
- [ ] Crop se aplica correctamente
- [ ] Preview post-crop es preciso
- [ ] Mobile touch gestures funcionan

## Galería
- [ ] Infinite scroll o paginación funciona
- [ ] Filtros se aplican correctamente
- [ ] Búsqueda por prompt funciona
- [ ] Ordenamiento funciona
- [ ] Links a detalle funcionan

## Responsive
- [ ] Mobile (< 768px) layout correcto
- [ ] Tablet (768-1024px) layout correcto
- [ ] Desktop (> 1024px) layout correcto
- [ ] Touch targets suficientemente grandes
```

---

## 10. Comandos de Desarrollo

```bash
# Instalación
npx create-next-app@latest aigram --typescript --tailwind --eslint --app
cd aigram

# Dependencias core
npm install next-auth@beta @prisma/client @auth/prisma-adapter
npm install react-dropzone react-easy-crop
npm install cloudinary next-cloudinary
npm install lucide-react clsx tailwind-merge zod date-fns

# Dev dependencies
npm install -D prisma @types/node typescript

# Configurar Prisma
npx prisma init
npx prisma db push
npx prisma generate

# Generar secret de Auth.js
openssl rand -base64 32

# Desarrollo
npm run dev

# Build
npm run build
npm run start
```

---

## 11. Checklist de Entrega Fase 1

```markdown
## Infraestructura
- [ ] Proyecto Next.js 14+ configurado con App Router
- [ ] TypeScript configurado
- [ ] Tailwind CSS configurado
- [ ] Prisma + PostgreSQL configurado
- [ ] Cloudinary cuenta creada y configurada
- [ ] Variables de entorno documentadas

## Autenticación
- [ ] Auth.js v5 configurado
- [ ] Google OAuth funcionando
- [ ] Middleware de protección de rutas
- [ ] Componentes de login/logout

## Upload
- [ ] Dropzone con drag & drop
- [ ] Validación de archivos
- [ ] Preview de imágenes
- [ ] Progress indicator
- [ ] Integración con Cloudinary

## Cropper
- [ ] react-easy-crop integrado
- [ ] 4 aspect ratios de Instagram
- [ ] Zoom funcional
- [ ] Guardado de imagen recortada

## Sistema de Prompts
- [ ] Input de prompt
- [ ] Selector de modelo IA
- [ ] Sistema de tags
- [ ] Persistencia en base de datos

## Galería
- [ ] Grid responsive
- [ ] Filtros básicos
- [ ] Búsqueda
- [ ] Vista de detalle

## UI/UX
- [ ] Diseño responsive completo
- [ ] Estados de loading
- [ ] Estados de error
- [ ] Empty states
- [ ] Animaciones sutiles
```

---

## Notas Finales

Este documento está diseñado para ser usado como prompt en un editor AI (Cursor, Copilot, etc.). Cada sección contiene código funcional y especificaciones detalladas que pueden ser implementadas directamente.

**Próximos pasos después de completar Fase 1:**
- Fase 2: Preview de Instagram y generación de captions con IA
- Fase 3: Integración con Google Drive
- Fase 4: Features avanzados (generación de imágenes, analytics)