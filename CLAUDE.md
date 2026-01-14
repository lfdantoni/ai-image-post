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
- `openai` - OpenAI GPT-4 for AI generation
- `@google/generative-ai` - Google Gemini for AI generation
- `googleapis` - Google Drive API v3 integration
- `sharp` - Image optimization for Instagram export
- `archiver` - ZIP file creation for batch exports
- `@dnd-kit/core`, `@dnd-kit/sortable` - Drag & drop for grid/carousel reordering
- `react-swipeable` - Touch swipe support for carousel
- `copy-to-clipboard` - Clipboard functionality
- `node-cron` - Cron job scheduling for background tasks

### Instagram Aspect Ratios
Defined in `lib/instagram-formats.ts`:
- portrait (4:5) - recommended for feed
- square (1:1)
- landscape (1.91:1)
- story (9:16)

### Database Models
- `User` - Auth.js user with Google OAuth, Drive connection settings
- `Image` - Cloudinary data, dimensions, AI metadata, Drive export info
- `Tag` - Many-to-many with images for organization
- `Post` - Instagram post draft with caption, hashtags, and status (DRAFT, READY, SCHEDULED, PUBLISHED, FAILED)
- `PostImage` - Many-to-many between Post and Image with ordering for carousels
- `HashtagGroup` - Saved hashtag collections for quick reuse
- `ExportLog` - Log of image exports (destination, options, file size)
- `InstagramAccount` - Connected Instagram Business/Creator accounts with tokens and rate limits
- `PublishedPost` - Published Instagram posts with metrics (likes, comments, reach, impressions, saved)

### Instagram Preview (Phase 2)
Components in `components/preview/`:
- `InstagramPostPreview` - Simulates Instagram feed post with header, image, actions, caption, hashtags
- `InstagramGridPreview` - Profile grid view with drag & drop reordering (3x4 aspect ratio per cell)
- `CarouselPreview` - Multi-slide carousel with swipe navigation and slide management

### AI Generation (Phase 2)

**Multi-Provider Architecture** (`lib/ai/`):
- `base-provider.ts` - Abstract base class with shared prompt-building logic
- `openai-provider.ts` - OpenAI GPT-4o-mini implementation
- `gemini-provider.ts` - Google Gemini 1.5 Flash implementation
- `provider-factory.ts` - Singleton factory with provider availability checking
- `ai-service.ts` - High-level service with automatic fallback (if primary fails, tries other)

Components in `components/ai/`:
- `CaptionGenerator` - Modal for AI caption generation with tone, length, language, provider options
- `HashtagGenerator` - Hashtag generation with category filtering (trending, niche, branded)
- `AIProviderSelector` - Visual provider selector with availability indicators

Hooks in `hooks/`:
- `useGenerateCaption` - Caption generation with provider selection and metadata tracking
- `useGenerateHashtags` - Hashtag generation with provider selection and metadata
- `useAIProviders` - Fetches available providers and their configuration

API Routes:
- `POST /api/ai/caption` - Generate captions (supports `provider` param: "openai" | "gemini")
- `POST /api/ai/hashtags` - Generate categorized hashtags (supports `provider` param)
- `GET /api/ai/providers` - Returns available providers and default configuration
- `GET/POST/DELETE /api/hashtag-groups` - Manage saved hashtag collections

Provider Comparison:
| Provider | Model | Speed | Cost | Default |
|----------|-------|-------|------|---------|
| Gemini | gemini-1.5-flash | ~0.5-1s | Lower | Yes |
| OpenAI | gpt-4o-mini | ~1-2s | Higher | No |

Features:
- Automatic fallback if primary provider fails
- Provider selection in UI via "Advanced options" accordion
- Metadata display showing provider used, model, and latency
- Rate limiting per provider

### Google Drive Integration (Phase 3)

**Services** (`lib/`):
- `google-drive.ts` - GoogleDriveService class for Drive API v3 operations
- `image-optimizer.ts` - ImageOptimizer class using Sharp for Instagram optimization

**Authentication Flow**:
- OAuth scope `drive.file` included in Google login (access only to app-created files)
- Tokens stored in Account table via Prisma adapter
- `getGoogleTokens()` and `updateGoogleTokens()` in `lib/auth.ts`
- Automatic token refresh via googleapis client

**Drive Folder Structure**:
```
Mi Drive/
└── AIImagePost/           # Root folder (created on first use)
    ├── Exports/           # Optimized images for Instagram
    │   └── 2025-01/       # Organized by month
    └── Backups/           # Original images (optional)
        └── originals/
```

**API Routes**:
- `GET /api/drive/status` - Check connection status and quota
- `POST /api/drive/initialize` - Create root folder and connect
- `POST /api/drive/disconnect` - Clear connection (files remain in Drive)
- `GET/PUT /api/drive/settings` - Manage sync settings

**Components**:
- `components/settings/DriveSettings.tsx` - Drive connection and settings panel
- `components/export/ExportModal.tsx` - Single image export with options

**Hooks**:
- `hooks/useGoogleDrive.ts` - Drive connection state, quota, settings
- `hooks/useImageExport.ts` - Export operations with progress tracking

### Image Export (Phase 3)

**Optimization Pipeline** (using Sharp):
1. Fetch original from Cloudinary
2. Resize to exact Instagram dimensions (1080px width)
3. Convert to sRGB color space
4. Apply subtle sharpening (sigma 0.5)
5. Export as JPEG with mozjpeg
6. Ensure file size ≤1.6MB (prevents IG recompression)

**Instagram Dimensions**:
| Aspect Ratio | Dimensions | Use Case |
|--------------|------------|----------|
| portrait (4:5) | 1080x1350 | Feed (recommended) |
| square (1:1) | 1080x1080 | Feed |
| landscape (1.91:1) | 1080x566 | Feed |
| story (9:16) | 1080x1920 | Stories/Reels |

**API Routes**:
- `POST /api/export/image` - Single image export (download or Drive)
- `POST /api/export/batch` - Multiple images (ZIP or Drive folder)
- `POST /api/export/estimate` - Estimate file size for quality

**Export Options**:
- Quality: 60-100% (default 90%)
- Sharpening: on/off (default on)
- Max file size: customizable (default 1.6MB)
- Include metadata JSON: caption, hashtags, AI info
- Destination: download or Google Drive

### Instagram Publishing (Phase 4)

**Services** (`lib/`):
- `instagram-api.ts` - InstagramAPIService class for Graph API operations (publish, metrics, tokens)
- `instagram-validation.ts` - Content validation for Instagram requirements
- `instagram-errors.ts` - Comprehensive error mapping and handling

**Authentication Flow**:
- Facebook OAuth with Instagram Business/Creator scopes
- Required scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`
- Long-lived tokens (60 days) with automatic refresh via cron job
- Multiple Instagram accounts supported per user

**Publishing Flow**:
1. Create media container(s) via Graph API
2. Poll container status until FINISHED
3. Publish container to Instagram
4. Get permalink and save to PublishedPost
5. Update rate limit counters

**API Routes**:
- `GET /api/instagram/auth` - Initiate Facebook OAuth flow
- `GET /api/instagram/auth/callback` - Handle OAuth callback, exchange tokens
- `DELETE /api/instagram/auth` - Disconnect Instagram account(s)
- `POST /api/instagram/auth/refresh` - Manually refresh access token
- `GET /api/instagram/status` - Get connection status and rate limits
- `POST /api/instagram/publish` - Publish post to Instagram
- `GET /api/instagram/posts` - List published posts with metrics
- `GET /api/instagram/posts/[id]` - Get single published post details
- `POST /api/instagram/posts/[id]/sync` - Sync metrics for a post
- `POST /api/instagram/posts/sync-all` - Sync metrics for all recent posts
- `PUT /api/instagram/accounts/[id]/default` - Set default account

**Components** (`components/instagram/`):
- `AccountSelector` - Select Instagram account for publishing
- `PublishToInstagramButton` - Trigger publish flow
- `PublishConfirmationModal` - Confirm before publishing
- `PublishProgressModal` - Show publishing progress
- `PublishSuccessModal` - Show success with permalink
- `PublishedPostCard` - Display published post with metrics
- `PublishedPostsSection` - List of published posts
- `PublishedPostDetail` - Detailed view with insights

**Hooks**:
- `hooks/useInstagramConnection.ts` - Connection status, accounts, connect/disconnect
- `hooks/usePublishToInstagram.ts` - Publish flow with progress tracking

**Error Handling**:
- Comprehensive error mapping for 50+ Instagram API error codes
- Error categories: AUTH, RATE_LIMIT, PERMISSION, MEDIA, VALIDATION, SERVER, NETWORK
- Automatic retry with exponential backoff for transient errors
- User-friendly error messages with recovery actions

**Rate Limits**:
- 25 posts per day per account (tracked in database)
- Automatic reset via cron job
- Pre-publish validation prevents exceeding limits

### Cron Jobs

**Scheduler** (`lib/cron/`):
- `scheduler.ts` - Node-cron based job scheduler
- `index.ts` - Exports for scheduler control

**Jobs**:
| Job | Schedule | Description |
|-----|----------|-------------|
| `refresh-tokens` | Daily 3:00 AM | Refresh Instagram tokens expiring within 7 days |
| `reset-rate-limits` | Every hour | Reset daily post counters when 24h passed |
| `sync-metrics` | Every 6 hours | Update likes, comments, reach for recent posts |

**API Routes**:
- `GET /api/cron` - Get scheduler status
- `POST /api/cron` - Manage scheduler (actions: `run`, `start`, `stop`)

**Configuration**:
- `CRON_TIMEZONE` - Timezone for job scheduling (default: America/New_York)
- `CRON_AUTO_START` - Auto-start scheduler on server boot (default: false)

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` - Auth.js config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary

**AI Providers** (at least one required):
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini
- `OPENAI_ORG_ID` (optional) - OpenAI organization ID
- `OPENAI_MODEL` (optional, default: gpt-4o-mini) - OpenAI model to use
- `GOOGLE_GEMINI_API_KEY` - Google Gemini API key
- `GEMINI_MODEL` (optional, default: gemini-1.5-flash) - Gemini model to use
- `DEFAULT_AI_PROVIDER` (optional, default: gemini) - Default provider ("openai" | "gemini")

**Rate Limits**:
- `CAPTION_RATE_LIMIT_PER_MINUTE` (optional, default: 10) - Rate limit for caption generation
- `HASHTAG_RATE_LIMIT_PER_MINUTE` (optional, default: 20) - Rate limit for hashtag generation

**Google Drive** (Phase 3):
- `GOOGLE_DRIVE_FOLDER_NAME` (optional, default: AIImagePost) - Root folder name in Drive
- `GOOGLE_DRIVE_ENABLED` (optional, default: true) - Enable/disable Drive features

**Instagram Publishing** (Phase 4):
- `FACEBOOK_APP_ID` - Facebook App ID for Instagram Graph API
- `FACEBOOK_APP_SECRET` - Facebook App Secret
- `INSTAGRAM_REDIRECT_URI` - OAuth callback URL (e.g., `http://localhost:3000/api/instagram/auth/callback`)
- `INSTAGRAM_GRAPH_API_VERSION` (optional, default: v21.0) - Graph API version

**Cron Jobs**:
- `CRON_TIMEZONE` (optional, default: America/New_York) - Timezone for job scheduling
- `CRON_AUTO_START` (optional, default: false) - Auto-start scheduler on server boot
