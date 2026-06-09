# OrderUp — AI-Powered Restaurant POS System

A modern restaurant Point-of-Sale system built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, and **Google Gemini 2.5 Flash**. Designed to solve real-world restaurant friction between Front-of-House (FOH) staff and Back-of-House (BOH) kitchen operations.

> **Full documentation available in [`docs/`](docs/README.md)**

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Next.js App Router              │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Table Dashboard│  │   POS Intake Canvas      │ │
│  │  (app/page)   │  │   (app/pos/page)          │ │
│  └──────┬───────┘  └───────────┬──────────────┘ │
│         │                      │                 │
│  ┌──────▼──────────────────────▼──────────────┐ │
│  │          API Routes (app/api/)              │ │
│  │  /orders  /tables  /menu-items             │ │
│  └──────┬──────────────────────┬──────────────┘ │
│         │                      │                 │
│  ┌──────▼──────┐  ┌───────────▼──────────────┐ │
│  │  Prisma ORM  │  │  Google GenAI SDK        │ │
│  │  (PostgreSQL)│  │  (Gemini 2.5 Flash)      │ │
│  └──────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Features

- **Table Management Dashboard** — Live visual grid of restaurant tables color-coded by occupancy status (AVAILABLE / OCCUPIED / BILLING)
- **Dynamic POS Intake Canvas** — Menu item click-to-cart grid with inline quantity controls and an FOH voice/text scratchpad for chaotic server notes
- **AI Kitchen Expediter** — Powered by Gemini 2.5 Flash via the official `@google/genai` SDK. Transforms messy waitstaff notes and cart items into a structured, production-ready kitchen ticket with grouped courses, modification highlights, and estimated prep time
- **Atomic Database Transactions** — Table status updates and order creation are wrapped in Prisma transactions for data integrity

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
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

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
| `GEMINI_API_KEY` | Google Gemini API key |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
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
│   │   ├── menu-items/route.ts    # GET menu items
│   │   ├── orders/route.ts        # POST orders (with AI processing)
│   │   └── tables/route.ts        # GET/PATCH table management
│   ├── pos/page.tsx               # POS intake canvas
│   ├── globals.css                # Tailwind + theme
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Table Management Dashboard
├── prisma/
│   ├── schema.prisma              # Database models
│   └── seed.ts                    # Seed script
├── .env.example                   # Environment template
└── package.json
```

## Database Schema

- **Table** — Restaurant tables with occupancy status tracking
- **MenuItem** — Menu catalog items with name, price, and category
- **Order** — Master order records linked to tables with raw notes and AI summary
- **OrderItem** — Individual line items within an order with quantity tracking

## Future Roadmap

- **Distributed State Notifications** via Edge WebSockets for real-time table updates
- **Optimistic Offline Sync** using IndexedDB browser stores for offline resilience
- **Bill-splitting algorithms** for handling mixed-payment methods
- **Role-based access** for FOH waitstaff vs BOH kitchen views
