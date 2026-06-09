# OrderUp Documentation

An AI-powered Restaurant Point-of-Sale system built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, and **Google Gemini 2.5 Flash**.

---

## Documentation Contents

| Document | Description |
|---|---|
| [Architecture Overview](ARCHITECTURE.md) | System layers, data flow, request lifecycle |
| [Setup Guide](SETUP.md) | Local development environment setup |
| [User Guide](USER_GUIDE.md) | Walkthrough of all features and workflows |
| [API Reference](API_REFERENCE.md) | Endpoint docs, request/response schemas |
| [Database Schema](DATABASE.md) | ERD, models, relationships, migrations |
| [Demo Script](DEMO_SCRIPT.md) | Step-by-step presentation walkthrough |

---

## Quick Links

- **Live Dashboard**: [http://localhost:3000](http://localhost:3000)
- **POS Intake**: [http://localhost:3000/pos?tableId=<id>](http://localhost:3000/pos)
- **Prisma Studio**: `npx prisma studio`

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server-side rendering, API routes, file-based routing |
| Language | TypeScript 5 | End-to-end type safety |
| Styling | Tailwind CSS v4 | Utility-first responsive design |
| Database ORM | Prisma 7 | Type-safe database access, migrations, seeding |
| Database | PostgreSQL | Relational data storage |
| AI Engine | Google Gemini 2.5 Flash | Kitchen ticket generation from chaotic waitstaff notes |
| Driver Adapter | `@prisma/adapter-pg` | PostgreSQL connectivity for Prisma 7 |

---

## Key Design Decisions

1. **Next.js App Router** over Pages Router for nested layouts, server components, and streamlined API routes
2. **Prisma 7** over raw SQL for type-safe queries, auto-generated client, and atomic transactions
3. **PostgreSQL** over SQLite for production-grade concurrency, JSON support, and deployment compatibility
4. **Gemini 2.5 Flash** over GPT-4o for faster inference, lower latency kitchen ticket generation and bill-split suggestions
5. **`@prisma/adapter-pg`** required by Prisma 7's new driver adapter architecture for database connectivity
6. **Guest + GuestSplit models** over a flat split table for per-item, per-person granularity with quantity-level precision
