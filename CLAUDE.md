# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIGram is a Next.js 14+ application for managing AI-generated images, optimized for Instagram publishing. It allows users to upload images, crop them to Instagram aspect ratios, add prompts/metadata, and organize with tags.

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint

# Database (PostgreSQL via Prisma)
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio GUI
```

## Architecture

### Route Groups (App Router)
- `app/(auth)/` - Public auth pages (login)
- `app/(dashboard)/` - Protected pages requiring authentication (dashboard, gallery, upload, image detail, create-post)
- `app/api/` - API routes for auth, images CRUD, upload, AI generation, and hashtag groups

### Authentication Flow
- Auth.js v5 (NextAuth) with Google OAuth provider
- JWT session strategy with Prisma adapter
- `middleware.ts` protects dashboard routes via `auth.config.ts`
- Session includes `user.id` added via JWT callback

### Data Flow
1. **Upload**: Files → Dropzone → ImageCropper (react-easy-crop) → Cloudinary (authenticated) → Prisma
2. **Gallery**: Prisma query → Generate signed URLs → ImageGrid with filters/search → Image detail page
3. **Images**: Stored in Cloudinary as `authenticated` (private), metadata in PostgreSQL (publicId, dimensions, AI metadata, tags)

### Image Security (Private Images)
- Images are uploaded to Cloudinary with `type: "authenticated"` (private)
- All image URLs are signed with expiration (1 hour by default)
- `lib/cloudinary.ts` provides `generateSignedUrl()` and `generateSignedUrls()` functions
- APIs always generate fresh signed URLs when returning images
- Only the image owner (verified via `userId` in Prisma queries) can access their images

### Key Libraries
- `react-dropzone` - Drag & drop file upload
- `react-easy-crop` - Image cropping with Instagram aspect ratios (4:5, 1:1, 1.91:1, 9:16)
- `cloudinary` - Image storage and transformations
- `zod` - API request validation
- `openai` - AI-powered caption and hashtag generation
- `@dnd-kit/core`, `@dnd-kit/sortable` - Drag & drop for grid/carousel reordering
- `react-swipeable` - Touch swipe support for carousel
- `copy-to-clipboard` - Clipboard functionality

### Instagram Aspect Ratios
Defined in `lib/instagram-formats.ts`:
- portrait (4:5) - recommended for feed
- square (1:1)
- landscape (1.91:1)
- story (9:16)

### Database Models
- `User` - Auth.js user with Google OAuth
- `Image` - Cloudinary data, dimensions, AI metadata (prompt, model, version)
- `Tag` - Many-to-many with images for organization
- `Post` - Instagram post draft with caption, hashtags, and status (DRAFT, READY, SCHEDULED, PUBLISHED)
- `PostImage` - Many-to-many between Post and Image with ordering for carousels
- `HashtagGroup` - Saved hashtag collections for quick reuse

### Instagram Preview (Phase 2)
Components in `components/preview/`:
- `InstagramPostPreview` - Simulates Instagram feed post with header, image, actions, caption, hashtags
- `InstagramGridPreview` - Profile grid view with drag & drop reordering (3x4 aspect ratio per cell)
- `CarouselPreview` - Multi-slide carousel with swipe navigation and slide management

### AI Generation (Phase 2)
Components in `components/ai/`:
- `CaptionGenerator` - Modal for AI caption generation with tone, length, language options
- `HashtagGenerator` - Hashtag generation with category filtering (trending, niche, branded)

Hooks in `hooks/`:
- `useGenerateCaption` - Caption generation state management with regenerate support
- `useGenerateHashtags` - Hashtag generation with selection/deselection

API Routes:
- `POST /api/ai/caption` - Generate captions using OpenAI GPT-4o-mini
- `POST /api/ai/hashtags` - Generate categorized hashtags
- `GET/POST/DELETE /api/hashtag-groups` - Manage saved hashtag collections

OpenAI configuration in `lib/openai.ts`:
- Uses GPT-4o-mini for cost efficiency
- Supports multiple caption tones: artistic, casual, professional, inspirational
- Includes banned hashtag detection for Instagram compliance

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` - Auth.js config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary
- `OPENAI_API_KEY` - OpenAI API key for caption/hashtag generation
- `OPENAI_ORG_ID` (optional) - OpenAI organization ID
- `CAPTION_RATE_LIMIT_PER_MINUTE` (optional, default: 10) - Rate limit for caption generation
- `HASHTAG_RATE_LIMIT_PER_MINUTE` (optional, default: 20) - Rate limit for hashtag generation
