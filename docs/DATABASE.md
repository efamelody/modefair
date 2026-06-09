# Database Schema

## Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      Table       │       │    MenuItem       │
├──────────────────┤       ├──────────────────┤
│ PK │ id (cuid)   │       │ PK │ id (cuid)   │
│    │ tableNumber │       │    │ name         │
│    │ status      │       │    │ price        │
└────────┬─────────┘       │    │ category     │
         │                 └────────┬─────────┘
         │                          │
         │ 1                        │ 1
         │                          │
         │ N                        │ N
         │                          │
┌────────▼──────────────────────────▼─────────┐
│                  Order                       │
├──────────────────────────────────────────────┤
│ PK │ id (cuid)                               │
│ FK │ tableId → Table.id                      │
│    │ status                                  │
│    │ rawNotes                                │
│    │ aiKitchenSummary                        │
│    │ totalAmount                             │
│    │ createdAt                               │
└──────────────────────┬───────────────────────┘
                       │
                       │ 1
                       │
                       │ N
                 ┌─────▼──────────────────────┐
                 │        OrderItem            │
                 ├─────────────────────────────┤
                 │ PK │ id (cuid)              │
                 │ FK │ orderId → Order.id     │
                 │ FK │ menuItemId → MenuItem.id│
                 │    │ quantity               │
                 └─────────────────────────────┘
```

## Models

### Table

Represents a physical restaurant table.

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | String (cuid) | Auto | Primary key |
| `tableNumber` | String (unique) | Required | Human-readable table identifier (e.g., "T01") |
| `status` | String | `"AVAILABLE"` | `AVAILABLE` \| `OCCUPIED` \| `BILLING` |

**Relationships:**
- `orders` — One-to-many with `Order` (a table can have multiple orders over time)

**Status Machine:**
```
AVAILABLE ──(seat)──▶ OCCUPIED ──(serve)──▶ OCCUPIED
                                              │
                                              │ (bill)
                                              ▼
AVAILABLE ◀──(pay)─── BILLING
```

### MenuItem

Represents an item on the restaurant menu.

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | String (cuid) | Auto | Primary key |
| `name` | String | Required | Display name (e.g., "Nasi Lemak Ayam Goreng") |
| `price` | Float | Required | Price in Malaysian Ringgit |
| `category` | String | Required | Grouping category: `Mains` \| `Drinks` \| `Sides` |

**Relationships:**
- `orderItems` — One-to-many with `OrderItem` (a menu item appears in many orders)

### Order

Represents a table's order session.

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | String (cuid) | Auto | Primary key |
| `tableId` | String | Required | Foreign key to `Table` |
| `status` | String | `"PENDING"` | `PENDING` \| `PREPARING` \| `SERVED` \| `PAID` |
| `rawNotes` | String? | `null` | Raw waitstaff notes sent to Gemini |
| `aiKitchenSummary` | String? | `null` | Gemini-generated kitchen ticket (Markdown) |
| `totalAmount` | Float | `0.0` | Computed total = sum of item prices × quantities |
| `createdAt` | DateTime | `now()` | Timestamp of order creation |

**Relationships:**
- `table` — Many-to-one with `Table`
- `items` — One-to-many with `OrderItem` (cascade delete)

**Status Machine:**
```
PENDING ──(acknowledge)──▶ PREPARING ──(serve)──▶ SERVED ──(pay)──▶ PAID
```

### OrderItem

Represents a single line item within an order.

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | String (cuid) | Auto | Primary key |
| `orderId` | String | Required | Foreign key to `Order` |
| `menuItemId` | String | Required | Foreign key to `MenuItem` |
| `quantity` | Int | Required | Number of this item ordered |

**Relationships:**
- `order` — Many-to-one with `Order` (cascade delete: removing an Order deletes its OrderItems)
- `menuItem` — Many-to-one with `MenuItem`

---

## Cascade Delete Behavior

```
Table ──cascade──▶ Order ──cascade──▶ OrderItem
```

When a `Table` is deleted, all its associated `Order` records are deleted. When an `Order` is deleted (e.g., if we implement order cancellation), all its `OrderItem` records are deleted. This ensures referential integrity without orphaned records.

`MenuItem` is **not** cascade-deleted when an `OrderItem` is deleted — menu items are stable catalog entries that persist independently.

---

## Schema File

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

model Table {
  id          String   @id @default(cuid())
  tableNumber String   @unique
  status      String   @default("AVAILABLE")
  orders      Order[]
}

model MenuItem {
  id         String      @id @default(cuid())
  name       String
  price      Float
  category   String
  orderItems OrderItem[]
}

model Order {
  id              String      @id @default(cuid())
  tableId         String
  table           Table       @relation(fields: [tableId], references: [id])
  status          String      @default("PENDING")
  rawNotes        String?
  aiKitchenSummary String?
  totalAmount     Float       @default(0.0)
  items           OrderItem[]
  createdAt       DateTime    @default(now())
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId String
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  quantity   Int
}
```

---

## Prisma Config (v7)

In Prisma 7, the database URL is configured in `prisma.config.ts` at the project root, not in the schema file:

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

For runtime connectivity, `@prisma/adapter-pg` wraps a `pg.Pool` and is passed to the `PrismaClient` constructor.

---

## Seed Data

The seed script (`prisma/seed.ts`) creates:
- **12 menu items** across 3 categories (Mains, Drinks, Sides)
- **10 tables** (T01–T10)

Run it with:
```bash
npm run seed
```

---

## Useful Prisma Commands

| Command | Purpose |
|---|---|
| `npx prisma generate` | Regenerate Prisma Client after schema changes |
| `npx prisma db push` | Push schema to database without migrations |
| `npx prisma db pull` | Introspect database and generate schema |
| `npx prisma studio` | Open browser-based database GUI |
| `npm run seed` | Execute seed script |
