# QOLLAI - Multi-Tenant SaaS Food Delivery Platform

## Overview

A multi-tenant SaaS platform for Turkish restaurant food delivery systems. Each tenant (restaurant) gets an isolated phone order entry system with customer lookup, order history, menu management, delivery type selection, WhatsApp notifications, print receipts, admin panel with role-based access, channel profit analysis, and full CRM pipeline for managing 100-200 restaurant customers through Lead, Pitched, Trial, Customer, Churned stages.

### Multi-Tenant Architecture
- **Isolation**: Row-level tenant isolation via `tenant_id` column on all business tables
- **Tenants table**: Doubles as CRM leads with pipeline stages, pitch checklist, contact info
- **Superadmin**: Platform-level management at `/superadmin` (credentials: superadmin/qollai2024)
- **Tenant Admin**: Per-tenant admin at `/admin` (default credentials: admin/admin123 per tenant)
- **Database Tables**: `tenants`, `superadmin_users` for platform management
- **Session**: `tenantId` stored in session and admin tokens for request-scoped isolation
- **CRM Pipeline**: 5 stages (lead, pitched, trial, customer, churned) with color-coded UI
- **Pitch Checklist**: 10 default items tracking sales process completion per tenant
- **Routes**: `/api/superadmin/*` for platform management, `/api/*` for tenant-scoped operations
- **Tenant URLs**: Two options supported:
  - Clean path: `qollai.com/kebapci` (via `/:slug` catch-all route)
  - Custom domain: `siparis.kebapci.com` (via `customDomain` field + hostname resolution)
- **Domain Resolution**: `GET /api/resolve-domain?hostname=` resolves custom domains to tenant slugs
- **Public API**: `/api/t/:slug/*` endpoints serve tenant data without admin auth (settings, categories, menu-items, reviews)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for local state (cart, theme)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration

### Data Storage
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Entities**: Categories, MenuItems, Orders, OrderItems, Customers, Reviews, UpsellOptions, SiteSettings, ProfitChannels, DailyChannelRevenues
- **Migrations**: Managed via Drizzle Kit (`drizzle-kit push`)

### Key Design Patterns
- **Monorepo Structure**: Client code in `client/`, server in `src/`, shared types in `shared/`
- **Path Aliases**: `@/` maps to client source, `@shared/` maps to shared code
- **Storage Layer**: Abstract `IStorage` interface in `src/storage.ts` for database operations
- **Component Organization**: Feature components at `client/src/components/`, UI primitives in `client/src/components/ui/`

### WhatsApp Integration
- Orders are formatted as structured messages and opened in WhatsApp via `wa.me` links
- Business phone number: Set `VITE_WHATSAPP_PHONE` environment variable (defaults to 905551234567)
- Cart contents, customer info, and delivery details included in message
- Customer confirmation link generation for follow-up messaging

### Configuration
- All server environment variables are centralized in `src/config.ts`
- `.env.example` provides a full template for Railway/production deployment

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (required in production)
- `SESSION_NAME`: Session cookie name (default: `qollai.sid`)
- `APP_ORIGIN`: Full origin URL for CORS/cookie scoping (e.g., `https://qollai.com`)
- `TRUST_PROXY`: Set to `1` to enable trust proxy for reverse proxy setups (default: off)
- `COOKIE_DOMAIN`: Cookie domain for cross-subdomain sharing (optional)
- `VITE_WHATSAPP_PHONE`: WhatsApp business number for order integration (optional, has default)
- `S3_PROVIDER`: S3 provider hint — `aws`, `r2`, or `minio` (default: `aws`; `minio` auto-enables path style)
- `S3_ENDPOINT`: S3-compatible endpoint URL (e.g., https://s3.amazonaws.com, https://<account>.r2.cloudflarestorage.com)
- `S3_REGION`: S3 region (default: "auto")
- `S3_BUCKET`: S3 bucket name
- `S3_ACCESS_KEY_ID`: S3 access key
- `S3_SECRET_ACCESS_KEY`: S3 secret key
- `S3_PUBLIC_BASE_URL`: Public base URL for serving uploaded files (optional; backward-compatible with `S3_PUBLIC_URL`)
- `S3_FORCE_PATH_STYLE`: Set to "true" for MinIO or path-style S3 endpoints (optional)
- `UPLOAD_MAX_MB`: Maximum upload file size in megabytes (default: 10)
- `LOG_LEVEL`: Logging level — `debug`, `info`, `warn`, `error` (default: `info`)

### Production Middleware
- **Helmet**: HTTP security headers (CSP disabled for SPA compatibility)
- **Compression**: gzip/brotli response compression
- **Health endpoints**: `GET /health` (liveness), `GET /ready` (DB readiness check)
- **Static caching**: 7-day max-age for production static assets
- **Process handlers**: Crash-safe `unhandledRejection` and `uncaughtException` logging

### Portability & Stateless Architecture
- **Database**: PostgreSQL with Drizzle ORM - fully portable, no vendor lock-in
- **Sessions**: Stored in PostgreSQL via connect-pg-simple - stateless server
- **File Uploads**: Dual-mode storage via `src/s3-storage.ts`:
  - When S3 env vars are set: uploads go to S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
  - When S3 not configured: falls back to local disk storage (`public/uploads/`)
  - Upload endpoint `/api/uploads/local` handles both modes transparently
- **Trust Proxy**: Enabled for reverse proxy setups (Railway, Render, etc.)
- **Secure Cookies**: Automatically enabled in production mode

### Build & Deployment
- Development: `npm run dev` runs Vite dev server with Express backend via `tsx`
- Production: `npm run build` compiles client with Vite and server with `tsc`, `npm start` serves from `dist/`
- Server compiled to CJS via `tsconfig.server.json` (extends base tsconfig)
- Server entry: `src/server.ts` → compiled to `dist/src/server.js`
- Portable to Railway, Render, Fly.io, or any Node.js hosting with PostgreSQL

## External Dependencies

### Database
- PostgreSQL database required
- Connection string via `DATABASE_URL` environment variable
- Drizzle ORM handles all database operations

### Third-Party UI Libraries
- Radix UI for accessible component primitives
- Embla Carousel for image carousels
- react-day-picker for calendar components
- cmdk for command palette functionality
- vaul for drawer components

### External Services
- WhatsApp Business API (via wa.me links, no API key required)
- Google Fonts (Poppins, Inter, DM Sans)
- Unsplash for placeholder food images

### Icon Libraries
- Lucide React for general icons
- react-icons for brand icons (WhatsApp, social media)

## Admin Features

### Data Import/Export
All admin tables support CSV and Excel (.xlsx) export/import with Turkish column headers.

#### Customers (Müşteriler)
- **Columns**: Ad Soyad, Telefon, Mahalle, Sokak, Bina No, Daire No, Notlar, Siparis Sayisi
- **Import**: Skips duplicates based on phone number
- **Endpoints**: GET `/api/admin/customers/export/:format`, POST `/api/admin/customers/import`

#### Categories (Kategoriler)
- **Columns**: ID, Kategori Adi, Aciklama, Gorsel URL, Sira, Aktif
- **Import**: Skips duplicates based on category name
- **Endpoints**: GET `/api/admin/categories/export/:format`, POST `/api/admin/categories/import`

#### Menu Items (Menü Öğeleri)
- **Columns**: ID, Urun Adi, Aciklama, Fiyat, Kategori, Gorsel URL, Mevcut, Populer, Kampanya, Kampanya Etiketi, Sira
- **Import**: Skips duplicates based on product name, maps category name to ID
- **Endpoints**: GET `/api/admin/menu-items/export/:format`, POST `/api/admin/menu-items/import`

#### Orders (Siparişler)
- **Columns**: Siparis No, Musteri Adi, Telefon, Adres, Durum, Odeme, Ara Toplam, Toplam, Notlar, Tarih
- **Export only** (no import - orders are created through the ordering process)
- **Endpoint**: GET `/api/admin/orders/export/:format`

#### Reviews (Yorumlar)
- **Columns**: ID, Musteri Adi, Puan, Yorum, Urun, Onaylandi, Tarih
- **Import**: Creates new reviews (no duplicate checking)
- **Endpoints**: GET `/api/admin/reviews/export/:format`, POST `/api/admin/reviews/import`

### Phone Order Entry (Telefon Siparis Girisi)
- **Route**: `/siparis` - Operator-facing phone order entry page
- **Authentication**: Requires admin login (same credentials as admin panel)
- **Features**:
  - Caller ID / phone number lookup to identify customers
  - Customer card with address and order history
  - Create new customers or edit existing customer info
  - Browse menu by category, search products
  - Add items to cart, adjust quantities
  - Re-order from previous orders with one click
  - Delivery type selection (Eve Teslim / Gel Al)
  - Payment method selection (Nakit / POS)
  - Order notes
  - Print dispatch slips (thermal printer format, 280px width)
  - Print previous order slips
  - New order notification sound (bell chime via Web Audio API, toggleable)
  - Automatic WhatsApp confirmation message to customer after order creation
  - Manual WhatsApp resend button for customer notification
- **API Endpoints**:
  - GET `/api/customers/phone/:phone` (admin-protected) - Lookup customer by phone with order history
  - GET `/api/customers/search?q=` (admin-protected) - Search customers by name or phone
  - PATCH `/api/customers/:id` (admin-protected) - Update customer info

### Channel Profit Analysis (Kanal Karı)
- **Admin Tab**: "Kanal Karı" tab in admin panel for daily profit comparison across delivery channels
- **Features**:
  - Add/edit/delete delivery channels (own platform + competitors like Yemeksepeti, Getir, etc.)
  - Per-channel settings: commission rate, courier type (own/external), courier cost per order, VAT rate
  - Own platform (Qollao) revenue auto-calculated from orders table
  - Manual daily revenue entry for competitor channels
  - Date-based profit comparison table showing: revenue, orders, commission, courier cost, VAT, profit before/after VAT
  - Total daily profit across all channels
- **Database Tables**: `profit_channels`, `daily_channel_revenues`
- **API Endpoints**:
  - GET/POST/PATCH/DELETE `/api/admin/profit-channels` - Channel CRUD
  - GET/POST/DELETE `/api/admin/daily-revenues` - Daily revenue data
  - GET `/api/admin/qollao-daily-revenue?date=YYYY-MM-DD` - Auto-calculated own platform revenue

### Admin Authentication
- Default credentials: admin/admin123
- Password is automatically reset on server startup to ensure consistent access after deployments
- Three roles: admin (Yönetici), manager (Müdür), operator (Operatör)
- Admin: Full access including user management
- Manager: Menu management, order processing, customer viewing
- Operator: View orders and update status only
- User management UI uses dialog with radio card role selection and toggle switch for active status