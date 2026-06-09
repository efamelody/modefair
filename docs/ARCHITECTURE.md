# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                              │
│  ┌─────────────────────────┐    ┌────────────────────────────────┐  │
│  │  Table Dashboard        │    │  POS Intake Canvas            │  │
│  │  (app/page.tsx)         │    │  (app/pos/page.tsx)           │  │
│  │  - Table grid w/ status │    │  - Menu grid click-to-cart    │  │
│  │  - Color-coded cards    │    │  - Quantity controls          │  │
│  │  - Link to POS per table│    │  - FOH scratchpad             │  │
│  └──────────┬──────────────┘    │  - AI ticket display          │  │
│             │                   └────────────┬───────────────────┘  │
│             │  fetch('/api/tables')           │ fetch('/api/orders') │
│             ▼                                ▼                      │
└─────────────────────────────────────────────────────────────────────┘
                         │                    │
                         ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS API ROUTES                            │
│                                                                      │
│  ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  GET  /api/tables  │  │ POST /api/orders  │  │ GET /api/menu-  │ │
│  │  PATCH /api/tables │  │                   │  │ items           │ │
│  │                    │  │ 1. Parse request  │  │                 │ │
│  │ - Fetch all tables │  │ 2. Lookup prices  │  │ - Return all    │ │
│  │ - Include active   │  │ 3. Compute total  │  │ menu items      │ │
│  │   orders           │  │ 4. Call Gemini    │  │ sorted by       │ │
│  │ - Update status    │  │ 5. Parse response │  │ category/name   │ │
│  └────────┬───────────┘  │ 6. $transaction  │  └────────┬────────┘ │
│           │              │    - update table │           │          │
│           │              │    - create order │           │          │
│           │              └────────┬──────────┘           │          │
│           ▼                       ▼                      ▼          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PRISMA ORM 7                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  prisma = new PrismaClient({ adapter: new PrismaPg(url) })   │   │
│  │                                                              │   │
│  │  prisma.$transaction(async (tx) => {                         │   │
│  │    await tx.table.update(...)   // status → OCCUPIED         │   │
│  │    await tx.order.create(...)   // order + items             │   │
│  │  })                                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                    │                                 │
│                                    ▼                                 │
│                       ┌────────────────────┐                        │
│                       │    PostgreSQL       │                        │
│                       │    Database         │                        │
│                       └────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE GENERATIVE AI                              │
│                                                                      │
│  ai = new GoogleGenAI({ apiKey })                                   │
│  ai.models.generateContent({                                        │
│    model: 'gemini-2.5-flash',                                      │
│    contents: dynamicPrompt,                                         │
│    config: { systemInstruction }                                    │
│  })                                                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Input: "2x Nasi Lemak, 1x Teh Tarik"                        │   │
│  │         + "Make roti canai super crispy, send drink first"   │   │
│  │                                                              │   │
│  │  Output: Markdown kitchen ticket with:                       │   │
│  │    - Grouped courses (Mains, Drinks)                         │   │
│  │    - ⚠️ Modification highlights                               │   │
│  │    - ESTIMATED PREPARATION TIME: 15 MINS                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle

### Order Dispatch Flow

```
1. Waiter clicks "Dispatch to Kitchen Pipeline"
         │
2. POST /api/orders with { tableId, items[], rawNotes }
         │
3. Server validates request, looks up MenuItem prices
         │
4. Computes totalAmount = sum(price * quantity)
         │
5. Builds Gemini prompt:
   - System instruction (kitchen expediter rules)
   - Dynamic prompt (cart items + raw notes)
         │
6. Calls Gemini 2.5 Flash → receives Markdown kitchen ticket
         │
7. Prisma $transaction:
   ├─ Updates Table.status = "OCCUPIED"
   └─ Creates Order with items, total, aiKitchenSummary
         │
8. Returns { success: true, order } to client
         │
9. Client renders AI ticket in the AI Expediter terminal panel
```

---

## Layer Breakdown

### 1. Presentation Layer (Client Components)

- **`app/page.tsx`** — Table Management Dashboard
  - Fetches all tables on mount via `GET /api/tables`
  - Renders a responsive grid of table cards
  - Color-coded by status: emerald (AVAILABLE), amber (OCCUPIED), red (BILLING)
  - Links to POS page with `tableId` query parameter

- **`app/pos/page.tsx`** — POS Intake Canvas
  - Wrapped in `<Suspense>` boundary for `useSearchParams()`
  - Fetches menu items on mount via `GET /api/menu-items`
  - Groups items by category for organized display
  - Maintains local cart state as array of `CartItem`
  - Dispatches order via `POST /api/orders`

### 2. API Layer (Server Routes)

- **`/api/tables`** — Table CRUD
  - `GET`: Returns all tables with active (non-PAID) orders
  - `PATCH`: Updates a single table's status

- **`/api/orders`** — Order creation with AI processing
  - `POST`: Validates input, computes totals, calls Gemini, writes to DB in transaction

- **`/api/menu-items`** — Menu catalog
  - `GET`: Returns all menu items sorted by category, then name

### 3. Data Layer (Prisma ORM + PostgreSQL)

- Singleton PrismaClient with `@prisma/adapter-pg` for PostgreSQL connectivity
- `lib/prisma.ts` implements global singleton pattern to prevent connection exhaustion in development hot-reloads
- All order creation wrapped in `prisma.$transaction` for atomicity

### 4. AI Layer (Google Gemini 2.5 Flash)

- Uses `@google/genai` SDK (official Google Gen AI TypeScript SDK)
- Prompts designed with structured system instructions for consistent output format
- Handles unstructured natural language from waitstaff notes
- Returns Markdown-formatted kitchen tickets

---

## Project Structure

```
modefair/
├── app/
│   ├── api/
│   │   ├── menu-items/route.ts     # GET menu items
│   │   ├── orders/route.ts         # POST order + AI processing
│   │   └── tables/route.ts         # GET/PATCH tables
│   ├── pos/
│   │   └── page.tsx                # POS intake canvas
│   ├── globals.css                 # Tailwind + dark theme
│   ├── layout.tsx                  # Root layout with Geist fonts
│   └── page.tsx                    # Table Management Dashboard
├── lib/
│   └── prisma.ts                   # PrismaClient singleton
├── prisma/
│   ├── schema.prisma               # Database models
│   ├── seed.ts                     # Seed script (12 items, 10 tables)
│   └── migrations/                 # Auto-generated migrations
├── generated/
│   └── prisma/                     # Auto-generated Prisma Client
├── prisma.config.ts                # Prisma 7 CLI configuration
├── .env.example                    # Environment variable template
└── docs/                           # Documentation
```

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Prisma transactions for order creation | Ensures table status update and order creation are atomic — no orphan orders or stale table states |
| Gemini system instructions | Guarantees consistent ticket formatting regardless of input variation |
| Client-side cart state | Zero-latency UI updates; cart is ephemeral and only persisted when dispatched |
| Singleton PrismaClient | Prevents connection pool exhaustion during Next.js hot module reloading in development |
| `@prisma/adapter-pg` | Required by Prisma 7's new driver adapter architecture — replaces old `url` in `datasource` block |
