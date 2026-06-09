# User Guide

## Overview

OrderUp solves three real-world restaurant frictions:

1. **The Modification Nightmare** — Customers change their minds mid-meal. Servers type chaotically.
2. **The Kitchen Bottleneck** — Kitchen staff cannot read messy, sequential text updates.
3. **The Settlement Split** — Tables need to review orders, see calculated charges, and settle.

---

## Feature 1: Table Management Dashboard

**URL:** `http://localhost:3000`

The dashboard displays a grid of all restaurant tables, each represented as a card with color-coded status:

```
┌─────────────────────┐
│  T04                │
│  [AVAILABLE]        │  ← Green badge
│  No active order    │
│                     │
│  [Seat Guest]       │  ← Green button
└─────────────────────┘

┌─────────────────────┐
│  T07                │
│  [OCCUPIED]         │  ← Amber badge
│  3 items · RM 21.00 │
│  preparing          │
│                     │
│  [Manage Order]     │  ← Green button
└─────────────────────┘
```

### Status Legend

| Status | Color | Meaning |
|---|---|---|
| AVAILABLE | Emerald Green | Table is empty and ready for seating |
| OCCUPIED | Amber | Table has an active order in progress |
| BILLING | Red | Table is reviewing bill and settling payment |

### Actions

- **Refresh** button in the top-right reloads table data
- **Seat Guest** (AVAILABLE tables) navigates to the POS intake for that table
- **Manage Order** (OCCUPIED/BILLING tables) navigates to the POS to modify the existing order

---

## Feature 2: POS Intake Canvas

**URL:** `http://localhost:3000/pos?tableId=<table_id>`

The POS intake is a split-view interface:

### Left Column: Order Input

#### Menu Items Matrix

Items are grouped by category (Mains, Drinks, Sides). Tap any item to add it to the cart:

```
┌──────────────────────────────────────────────┐
│  Mains                                        │
│  ┌─────────────────────┐ ┌─────────────────┐ │
│  │ Nasi Lemak Ayam     │ │ Roti Canai      │ │
│  │ Goreng              │ │          RM 3.00│ │
│  │          RM 14.50   │ └─────────────────┘ │
│  └─────────────────────┘                      │
│  ┌─────────────────────┐ ┌─────────────────┐ │
│  │ Mee Goreng Mamak    │ │ Nasi Goreng     │ │
│  │          RM 10.00   │ │ Pattaya         │ │
│  └─────────────────────┘ │       RM 12.00  │ │
│                           └─────────────────┘ │
└──────────────────────────────────────────────┘
```

#### FOH Chaos Note Scratchpad

A textarea for waitstaff to type unstructured notes about modifications:

```
┌──────────────────────────────────────────────┐
│ FOH Chaos Note Scratchpad                     │
│ ┌──────────────────────────────────────────┐  │
│ │ Hold the sambal on 1 nasi lemak, make   │  │
│ │ roti canai super crispy, send drink out  │  │
│ │ first sharp!!                            │  │
│ └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

These notes are sent to Gemini along with the structured cart items. The AI synthesizes both into a coherent kitchen ticket.

### Right Column: Cart & Dispatch

#### Live Cart Processing

Shows current cart items with quantity controls:

```
┌──────────────────────────────────────────────┐
│ Live Cart Processing                          │
│                                              │
│ Nasi Lemak Ayam Goreng  [-][2][+]  RM 29.00  │
│ Teh Tarik               [-][1][+]  RM  3.00  │
│ --------------------------------------------  │
│ Total                            RM 32.00    │
│                                              │
│ [Dispatch to Kitchen Pipeline]               │
└──────────────────────────────────────────────┘
```

**Quantity controls:**
- `[-]` Decreases quantity by 1 (removes item at 0)
- `[+]` Increases quantity by 1
- Total updates automatically

**Dispatch button:**
- Disabled when cart is empty or no table selected
- Shows "Transmitting to Expediter System..." while processing
- On success, clears the cart and displays the AI kitchen ticket

#### AI Expediter Terminal

Displays the Gemini-generated kitchen ticket:

```
┌──────────────────────────────────────────────┐
│ /// KITCHEN_LIVE_TICKET_STAMP                │
│                                              │
│ **Mains**                                    │
│ - 2x Nasi Lemak Ayam Goreng                 │
│   ⚠️ **HOLD SAMBAL** on 1 portion           │
│ - 1x Roti Canai                              │
│   ⚠️ **EXTRA CRISPY**                        │
│                                              │
│ **Drinks**                                   │
│ - 1x Teh Tarik — **SERVE IMMEDIATELY**      │
│                                              │
│ ═══════════════════════════════════════════  │
│ ESTIMATED PREPARATION TIME: 12 MINS          │
└──────────────────────────────────────────────┘
```

---

## Feature 3: AI Kitchen Expediting

### How It Works

1. **Input 1: Structured Cart Items** — The waiter taps menu items, forming a precise list (e.g., "2x Nasi Lemak, 1x Roti Canai")
2. **Input 2: Unstructured Notes** — The waiter types natural language modifications in the scratchpad
3. **Gemini Processing** — The API combines both inputs and processes them through a system instruction prompt designed for kitchen expediting
4. **Output** — A clean Markdown kitchen ticket with grouped courses, highlighted modifications, and estimated prep time

### Example Transformation

**Before (Input):**
```
Cart: 2x Nasi Lemak Ayam Goreng, 1x Roti Canai, 1x Teh Tarik
Notes: "Hold the sambal on 1 nasi lemak, make roti canai super crispy, send drink out first sharp!!"
```

**After (Output):**
```
**Mains**
- 2x Nasi Lemak Ayam Goreng
  ⚠️ **HOLD SAMBAL** on 1 portion
- 1x Roti Canai
  ⚠️ **EXTRA CRISPY**

**Drinks**
- 1x Teh Tarik — **SERVE IMMEDIATELY**

═══════════════════════════════════════════
ESTIMATED PREPARATION TIME: 12 MINS
```

### Why This Matters

- **Before AI:** Kitchen staff read messy handwritten notes or disjointed digital tickets
- **After AI:** Standardized format grouped by course with modifications clearly highlighted and time estimates for planning

---

## Complete Order Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  PENDING │───▶│PREPARING │───▶│  SERVED  │───▶│   PAID   │
│          │    │          │    │          │    │          │
│ Order    │    │ Kitchen  │    │ Delivered│    │ Settled  │
│ placed   │    │ working  │    │ to table │    │ & closed │
└──────────┘    └──────────┘    └──────────┘    └──────────┘

Table Status:        AVAILABLE → OCCUPIED → OCCUPIED → BILLING → AVAILABLE
```

| Stage | Order Status | Table Status | Description |
|---|---|---|---|
| 1 | PENDING | OCCUPIED | Order created, waiting for kitchen pickup |
| 2 | PREPARING | OCCUPIED | Kitchen has acknowledged and is cooking |
| 3 | SERVED | OCCUPIED | Food delivered to table, order editable |
| 4 | PAID | AVAILABLE | Bill settled, table released |
