# Design Guidelines: WhatsApp Food Delivery One-Page Website

## Design Approach

**Reference-Based Approach** drawing from successful food delivery platforms (Uber Eats, DoorDash) combined with modern restaurant website aesthetics. Focus on appetite appeal, trust-building, and friction-free ordering flow.

**Core Principles:**
- Mobile-first design (WhatsApp users are mobile-dominant)
- Visual hierarchy prioritizing food imagery and CTAs
- Trust signals throughout the journey
- Seamless single-page flow with clear sections

---

## Typography System

**Primary Font**: Poppins (Google Fonts) - Modern, friendly, excellent readability
**Secondary Font**: Inter (Google Fonts) - Clean for body text and UI elements

**Hierarchy:**
- Hero Headline: text-5xl md:text-6xl font-bold
- Section Headers: text-3xl md:text-4xl font-semibold
- Subsection Titles: text-xl md:text-2xl font-medium
- Body Text: text-base md:text-lg font-normal
- Buttons/CTAs: text-base font-semibold uppercase tracking-wide
- Menu Items: text-lg font-medium
- Prices: text-xl font-bold
- Small Text/Captions: text-sm font-normal

---

## Layout System

**Spacing Units**: Tailwind units of 3, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 to p-8
- Section spacing: py-12 md:py-20
- Card gaps: gap-6 md:gap-8
- Content max-width: max-w-7xl

**Grid Patterns:**
- Menu items: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Features/Trust signals: grid-cols-2 md:grid-cols-4
- Reviews: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## Page Structure & Sections

### 1. Hero Section (100vh on desktop, natural mobile)
Dual-purpose hero showcasing both delivery and dine-in experience with compelling food photography.

**Layout**: Split-screen or layered approach
- Large background: High-quality food photography (fresh, appetizing dishes)
- Overlaid brand logo (large, prominent)
- Compelling headline emphasizing speed and quality
- Dual CTA buttons: "Order via WhatsApp" (primary) + "View Menu" (secondary)
- Trust indicators: "Delivery in 30 mins" | "500+ Happy Customers" | "Fresh Daily"
- Buttons with backdrop-blur-md bg-white/20 treatment

### 2. Brand Story Section
SME company emphasis with authentic imagery.
- 2-column layout: Company photo (left) + Brand narrative (right)
- Founder/team photo or kitchen/restaurant interior
- Brief story (3-4 sentences) highlighting quality, tradition, local connection
- Key differentiators in bullet format

### 3. Menu Showcase
Enticing visual catalog with smart categorization.

**Structure:**
- Category tabs/pills navigation (Main Dishes, Sides, Desserts, Beverages)
- Card-based menu items:
  - Large food image (aspect-ratio-square or 4:3)
  - Item name (prominent)
  - Description (1-2 lines, appetizing)
  - Price (bold, clear)
  - "Add to Order" button with WhatsApp icon
- Subcategories as accordion/expandable sections when SKU count is high

### 4. How It Works (Ordering Process)
3-4 step visual guide:
- Browse Menu → Select Items → WhatsApp Checkout → Enjoy!
- Icons from Heroicons for each step
- Brief description under each

### 5. Customer Reviews
Social proof with authentic testimonials.
- 3-column grid of review cards
- Customer name, photo placeholder, 5-star rating
- Short quote (2-3 sentences)
- Date of order
- Dish/category they ordered (if relevant)

### 6. Delivery & Dine-In Options
Highlighting both service models:
- 2-column split or side-by-side cards
- Icons and benefits for each (Delivery: convenience, speed | Dine-In: ambiance, experience)
- Operating hours clearly stated
- Service area map or radius indicator

### 7. Social Proof Bar
Compact metrics strip:
- Orders completed | Happy customers | Years in business | Average rating
- 4-column responsive grid

### 8. CTA Section
Final conversion push:
- Large "Start Your Order on WhatsApp" button
- Share buttons: "Share with Friends & Family" (WhatsApp, Facebook, Twitter)
- Supporting text: special offers, minimum order, delivery fee info

### 9. Footer
Comprehensive information:
- Business name, address, phone
- Operating hours
- Payment methods (Cash, POS icons)
- Social media links (Instagram, Facebook)
- Quick links: Menu, About, Contact
- Copyright and simple privacy/terms links

---

## Component Library

**Buttons:**
- Primary CTA: Large (px-8 py-4), rounded-lg, shadow-lg with WhatsApp green accent ready
- Secondary: Outlined variant
- Menu Add buttons: Compact (px-4 py-2), rounded-md

**Cards:**
- Menu items: rounded-xl, shadow-md, hover:shadow-xl transition
- Review cards: rounded-lg, p-6, subtle border
- Feature cards: centered content, icon-title-description

**Navigation:**
- Sticky header on scroll with reduced height
- Hamburger menu for mobile
- Desktop: Logo left, menu center, CTA button right

**Forms (for any newsletter/contact):**
- Rounded inputs (rounded-md), clear labels
- Input focus states with subtle border color change
- Validation states (success/error) if needed

**Icons:**
- Heroicons (outline for general use, solid for emphasis)
- WhatsApp logo for order buttons
- Star icons for ratings
- Social media icons for footer

---

## Images

**Large Hero Image**: Full-screen background of signature dish or food spread (blurred overlay treatment for text readability)

**Brand Hero Image**: Authentic photo of restaurant exterior/interior, kitchen, or team (60-80% viewport width)

**Menu Images**: High-quality food photography for each menu item (square or 4:3 ratio, minimum 600x600px)

**Review Images**: Customer photo placeholders or actual photos (circular crop, 80x80px)

**Supporting Images**: Delivery person/vehicle, dine-in ambiance (used in dual-service section)

---

## Accessibility & Performance

- Semantic HTML structure (header, nav, main, section, footer)
- Alt text for all images (especially food items)
- ARIA labels for icon-only buttons
- Lazy loading for menu images below fold
- Optimized image formats (WebP with fallback)
- Form labels and accessible input states
- Keyboard navigation support
- Minimum touch target 44x44px for mobile

---

## WordPress Compatibility Notes

Design uses clean, modular sections that map to WordPress blocks/widgets. Each section should be independently editable. Avoid complex nested structures that complicate CMS integration.