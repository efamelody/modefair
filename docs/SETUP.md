# Setup Guide

## Prerequisites

| Requirement | Version | Check Command |
|---|---|---|
| Node.js | >= 18 | `node --version` |
| npm | >= 9 | `npm --version` |
| PostgreSQL | >= 14 | `psql --version` |
| Git | Any | `git --version` |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/efamelody/modefair.git
cd modefair
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- **Runtime**: `next`, `react`, `react-dom`, `@prisma/client`, `@google/genai`, `dotenv`
- **Database**: `@prisma/adapter-pg`, `pg`
- **Dev**: `typescript`, `prisma`, `tsx`, `@tailwindcss/postcss`, `tailwindcss`, `eslint`, `@types/pg`

---

## Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orderup?schema=public"
GEMINI_API_KEY="AIzaSyYourRealKeyHere"
```

### Database Connection String Format

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]?schema=public
```

| Component | Default | Description |
|---|---|---|
| `USER` | `postgres` | PostgreSQL username |
| `PASSWORD` | | Your PostgreSQL password |
| `HOST` | `localhost` | Database server host |
| `PORT` | `5432` | PostgreSQL default port |
| `DATABASE_NAME` | `orderup` | Database name (created in Step 5) |

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click **Get API Key** in the left sidebar
3. Click **Create API Key**
4. Copy the key and paste it in your `.env` file

---

## Step 4: Understanding Prisma v7 Configuration

This project uses **Prisma 7**, which introduces a new configuration model. Unlike previous versions where the database URL lived inside `prisma/schema.prisma`, Prisma 7 uses a separate `prisma.config.ts` file at the project root:

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

This file configures the **Prisma CLI** (`prisma generate`, `prisma db push`, `prisma migrate`, etc.).

For **runtime database connectivity**, Prisma 7 requires a **driver adapter** passed to the `PrismaClient` constructor:

```typescript
// lib/prisma.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
```

The generated Prisma Client is output to `generated/prisma/` (configured in `schema.prisma` via `output = "../generated/prisma"`).

---

## Step 5: Create the Database

### Option A: Using `psql`

```bash
psql -U postgres
CREATE DATABASE orderup;
\q
```

### Option B: Using `createdb`

```bash
createdb -U postgres orderup
```

---

## Step 6: Push Schema & Seed Data

```bash
# Push the schema to your database (creates tables)
npx prisma db push

# Seed menu items and tables
npm run seed
```

What the seed script creates:

**Menu Items (12)**

| Name | Price | Category |
|---|---|---|
| Nasi Lemak Ayam Goreng | RM 14.50 | Mains |
| Roti Canai | RM 3.00 | Mains |
| Mee Goreng Mamak | RM 10.00 | Mains |
| Nasi Goreng Pattaya | RM 12.00 | Mains |
| Satay Ayam (10 Cucuk) | RM 15.00 | Mains |
| Kopi O Ais | RM 3.50 | Drinks |
| Teh Tarik | RM 3.00 | Drinks |
| Milo Ais | RM 4.00 | Drinks |
| Air Kosong | RM 1.00 | Drinks |
| Telur Mata | RM 2.00 | Sides |
| Keropok Lekor | RM 4.00 | Sides |
| Acar Timun | RM 2.50 | Sides |

**Tables (10):** T01 through T10

---

## Step 7: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the Table Management Dashboard.

---

## Step 8: Verify Your Setup

1. Open the dashboard — you should see 10 table cards
2. Tables should all show **AVAILABLE** in green
3. Click "Seat Guest" on any table to enter the POS
4. Add menu items and verify the cart updates
5. To test the AI pipeline, set a real Gemini API key

---

## Troubleshooting

### `prisma db push` fails with authentication error

```
Error: P1001: Can't reach database server
```

Ensure PostgreSQL is running and your `DATABASE_URL` credentials are correct.

---

### `npx prisma generate` fails with "No prisma.config.ts"

Ensure you're running the command from the project root (same directory as `prisma.config.ts`).

---

### `npm run build` fails with TypeScript errors

Run `npx prisma generate` first to ensure the Prisma Client types are generated.

---

### Gemini API returns 403 or unauthorized

Verify your `GEMINI_API_KEY` in `.env` is valid. The Gemini 2.5 Flash model requires a key with billing enabled (though there is a free tier for testing).

---

### Port 3000 already in use

```bash
# Kill the process using port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

---

### Hydration error in development

The Table Dashboard displays the current time. The `suppressHydrationWarning` attribute is applied to prevent server/client mismatch. This is expected and safe.
