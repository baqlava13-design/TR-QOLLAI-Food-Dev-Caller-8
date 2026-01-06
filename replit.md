# Lezzet Express - WhatsApp Food Delivery Website

## Overview

A Turkish food delivery single-page application built for a restaurant in Çorlu, Turkey. The platform enables customers to browse menus, build shopping carts, and submit orders via WhatsApp integration. It features a customer-facing storefront with menu browsing, cart management, and an admin dashboard for order management and analytics.

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
- **Key Entities**: Categories, MenuItems, Orders, OrderItems, Customers, Reviews, UpsellOptions, SiteSettings
- **Migrations**: Managed via Drizzle Kit (`drizzle-kit push`)

### Key Design Patterns
- **Monorepo Structure**: Client code in `client/`, server in `server/`, shared types in `shared/`
- **Path Aliases**: `@/` maps to client source, `@shared/` maps to shared code
- **Storage Layer**: Abstract `IStorage` interface in `server/storage.ts` for database operations
- **Component Organization**: Feature components at `client/src/components/`, UI primitives in `client/src/components/ui/`

### WhatsApp Integration
- Orders are formatted as structured messages and opened in WhatsApp via `wa.me` links
- Business phone number: Set `VITE_WHATSAPP_PHONE` environment variable (defaults to 905551234567)
- Cart contents, customer info, and delivery details included in message
- Customer confirmation link generation for follow-up messaging

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `VITE_WHATSAPP_PHONE`: WhatsApp business number for order integration (optional, has default)

### Build & Deployment
- Development: `npm run dev` runs Vite dev server with Express backend
- Production: `npm run build` creates optimized bundle, `npm start` serves static files
- Build script in `script/build.ts` bundles server with esbuild, client with Vite

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