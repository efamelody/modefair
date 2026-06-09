# OrderUp — AI-Powered Restaurant POS System

A modern restaurant Point-of-Sale system built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, and **Google Gemini 2.5 Flash**. Designed to solve real-world restaurant friction between Front-of-House (FOH) staff and Back-of-House (BOH) kitchen operations, plus intelligent bill splitting for settlement.

> **Full documentation available in [`docs/`](docs/README.md)**

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js App Router                       │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │Table Dashboard│  │  POS Intake      │  │  Bill Review   │ │
│  │  (app/page)   │  │  (app/pos/page)  │  │  (app/bill)    │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────┬────────┘ │
│         │                   │                     │          │
│  ┌──────▼───────────────────▼─────────────────────▼────────┐ │
│  │                   API Routes (app/api/)                    │ │
│  │  /orders  /tables  /menu-items  /bill/*                  │ │
│  └──────┬───────────────────┬─────────────────────┬─────────┘ │
│         │                   │                     │           │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────────▼─────────┐ │
│  │  Prisma ORM  │  │Google GenAI SDK │  │  @prisma/adapter  │ │
│  │ (PostgreSQL) │  │(Gemini 2.5 Flash)│  │      -pg          │ │
│  └──────────────┘  └─────────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Features

- **Table Management Dashboard** — Live visual grid of restaurant tables color-coded by occupancy status (AVAILABLE / OCCUPIED / BILLING)
- **Dynamic POS Intake Canvas** — Menu item click-to-cart grid with inline quantity controls and an FOH voice/text scratchpad for chaotic server notes
- **AI Kitchen Expediter** — Powered by Gemini 2.5 Flash via the official `@google/genai` SDK. Transforms messy waitstaff notes and cart items into a structured, production-ready kitchen ticket with grouped courses, modification highlights, and estimated prep time
- **Intelligent Bill Splitting** — Per-guest, per-item split granularity with CASH/CARD payment method tracking, AI-suggested fair splits via Gemini, and one-click settlement
- **Atomic Database Transactions** — Table status updates and order creation are wrapped in Prisma transactions for data integrity

## Bill Splitting Flow

```
1. Waiter opens Bill page for an OCCUPIED table
2. Adds guests (e.g., "Ahmad", "Sarah")
3. Assigns each order item to one or more guests with quantities
4. (Optional) AI Suggest — Gemini proposes fair item assignment
5. Each guest selects payment method: CASH or CARD
6. Settle Bill — saves splits, transitions table: BILLING → AVAILABLE
```

- Per-item quantity split: two guests can share a Nasi Lemak (1 each) or one takes the whole portion
- Guest subtotals computed automatically from `sum(GuestSplit.quantity × menu item price)`
- AI suggestion accounts for item type: mains/drinks assigned individually, sides treated as sharable

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** (local or remote instance)
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/efamelody/modefair.git
cd modefair

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and GOOGLE_GENERATIVE_AI_API_KEY

# 4. Push the database schema and seed data
npx prisma db push
npm run seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the Table Management Dashboard.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key (preferred) |
| `GEMINI_API_KEY` | Alternative Gemini API key name (fallback) |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Database Adapter | `@prisma/adapter-pg` (Prisma 7 driver adapter) |
| Transactions | Prisma `$transaction` |

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/README.md) directory:

| Document | Description |
|---|---|
| [Architecture Overview](docs/ARCHITECTURE.md) | System layers, data flow, request lifecycle |
| [Setup Guide](docs/SETUP.md) | Local development environment setup |
| [User Guide](docs/USER_GUIDE.md) | Walkthrough of all features and workflows |
| [API Reference](docs/API_REFERENCE.md) | Endpoint docs, request/response schemas |
| [Database Schema](docs/DATABASE.md) | ERD, models, relationships, migrations |
| [Demo Script](docs/DEMO_SCRIPT.md) | Step-by-step presentation walkthrough |

## Project Structure

```
modefair/
├── app/
│   ├── api/
│   │   ├── bill/
│   │   │   ├── route.ts              # GET bill details with guests & splits
│   │   │   ├── guests/route.ts       # POST create/update guest assignments
│   │   │   ├── suggest-split/route.ts# POST AI-proposed fair split (Gemini)
│   │   │   └── settle/route.ts       # POST finalize bill, release table
│   │   ├── menu-items/route.ts       # GET menu items
│   │   ├── orders/route.ts           # POST/PUT orders (with AI processing)
│   │   └── tables/
│   │       ├── route.ts              # GET/PATCH table management
│   │       └── [id]/route.ts         # GET single table with active order
│   ├── bill/page.tsx                 # Bill review & split interface
│   ├── pos/page.tsx                  # POS intake canvas
│   ├── globals.css                   # Tailwind + theme
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Table Management Dashboard
├── lib/
│   └── prisma.ts                     # PrismaClient singleton
├── prisma/
│   ├── schema.prisma                 # Database models
│   ├── seed.ts                       # Seed script (12 items, 10 tables)
│   └── migrations/                   # Auto-generated migrations
├── generated/
│   └── prisma/                       # Auto-generated Prisma Client
├── docs/                             # Full documentation
├── prisma.config.ts                  # Prisma 7 CLI configuration
├── .env.example                      # Environment variable template
└── package.json
```

## Database Schema

### Core Models

- **Table** — Restaurant tables with occupancy status tracking (AVAILABLE / OCCUPIED / BILLING)
- **MenuItem** — Menu catalog items with name, price, and category
- **Order** — Master order records linked to tables with raw notes and AI summary
- **OrderItem** — Individual line items within an order with quantity tracking

### Bill Splitting Models

- **Guest** — A person at a table splitting the bill. Belongs to an Order, has a name, and a payment method (CASH / CARD). Subtotals are computed from assigned item quantities.
- **GuestSplit** — Links a Guest to an OrderItem with a specific quantity. Enables granular per-item, per-person allocation (e.g., Guest A gets 1 of 2 Nasi Lemaks, Guest B gets the other).

```
Order ──1:N──▶ Guest ──1:N──▶ GuestSplit ──N:1──▶ OrderItem
                                    │
                                    └──N:1──▶ MenuItem (via OrderItem)
```

## API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /api/menu-items` | GET | Returns all menu items sorted by category |
| `GET /api/tables` | GET | Returns all tables with active orders |
| `PATCH /api/tables` | PATCH | Updates a table's status |
| `GET /api/tables/[id]` | GET | Returns a single table with its active order |
| `POST /api/orders` | POST | Creates new order + AI kitchen ticket |
| `PUT /api/orders` | PUT | Updates existing order + regenerates AI ticket |
| `GET /api/bill?orderId=X` | GET | Fetches order with guests, splits, and computed subtotals |
| `POST /api/bill/guests` | POST | Creates/updates guests and item assignments |
| `POST /api/bill/suggest-split` | POST | Gemini proposes fair item-to-guest assignment |
| `POST /api/bill/settle` | POST | Finalizes bill, releases table |

## Future Roadmap

- **Distributed State Notifications** via Edge WebSockets for real-time table updates across devices
- **Optimistic Offline Sync** using IndexedDB browser stores for network-resilient order taking
- **Role-based access** for FOH waitstaff vs BOH kitchen views
- **Receipt printing** via thermal printer integration (ESC/POS protocol)
- **Payment gateway integration** for online card processing (e.g., Stripe, Billplz)
