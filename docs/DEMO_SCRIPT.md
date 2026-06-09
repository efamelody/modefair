# Demo Script

This guide walks through a complete presentation of OrderUp from start to finish. Use it to demonstrate the system to evaluators, stakeholders, or team members.

**Total estimated time:** 5–7 minutes

---

## Setup Requirements

Before presenting, ensure:

- [ ] PostgreSQL database is running with schema pushed (`npx prisma db push`)
- [ ] Database is seeded (`npm run seed`)
- [ ] Dev server is running (`npm run dev`)
- [ ] A real Gemini API key is set in `.env`
- [ ] Browser is open to `http://localhost:3000`

---

## Demo Walkthrough

### Slide 1: The Problem (30 seconds)

**Say:**
> "Restaurants face three core frictions. First, customers change their minds mid-meal — 'Can we change that normal Nasi Lemak to extra spicy, add fried egg, and serve drinks immediately?' Servers type this chaotically. Second, kitchen staff can't read messy tickets — they need clean, actionable counts. Third, tables need to review orders and settle smoothly. OrderUp solves all three with an AI-powered pipeline."

---

### Slide 2: Table Management Dashboard (60 seconds)

**Action:** Point to the browser showing the table grid at `localhost:3000`.

**Say:**
> "This is the Table Management Dashboard. We have 10 tables, each color-coded by status — green for available, amber for occupied, red for billing. This gives the front-of-house an instant visual map of the restaurant."

**Action:** Hover over a few table cards.

> "Each card shows the table number, current status badge, and any active order summary — item count and total amount."

**Action:** Click "Seat Guest" on an AVAILABLE table (e.g., T04).

> "Clicking 'Seat Guest' navigates us to the POS intake canvas for that table."

---

### Slide 3: POS Intake Canvas (90 seconds)

**Action:** Point to the POS page layout.

**Say:**
> "Here we have the POS Intake Canvas — a split-view interface. The left column is the order input area. The right column handles cart processing and AI output."

**Action:** Click menu items to build an order.

> "Menu items are grouped by category — Mains, Drinks, Sides. I'll tap to add 2 Nasi Lemak Ayam Goreng, 1 Roti Canai, and 1 Teh Tarik."

**Action:** Use +/- buttons to adjust quantities.

> "Each item has inline quantity controls. The total at the bottom updates automatically."

**Action:** Type in the scratchpad.

> "Now for the FOH Chaos Note Scratchpad — this is where the magic happens. I'll type: 'Hold the sambal on 1 nasi lemak, make roti canai super crispy, send teh tarik out first sharp.'"

---

### Slide 4: AI Kitchen Expediting (90 seconds)

**Action:** Click "Dispatch to Kitchen Pipeline".

**Say:**
> "Now I'll dispatch this order. Behind the scenes, here's what happens in under 2 seconds..."

**Action:** While loading, explain the pipeline.

> "First, the server looks up each menu item's price from the database and computes the total. Then it sends both the structured cart items AND the unstructured waiter notes to Gemini 2.5 Flash."

**Action:** Point to the AI ticket when it appears.

> "And here's the result. Gemini has synthesized everything into a clean, production-ready kitchen ticket."

**Say:**
> "Notice three things: First, items are grouped into logical courses — Mains and Drinks. Second, my modifications are highlighted with warning prefixes — 'HOLD SAMBAL' and 'EXTRA CRISPY'. Third, the system estimates preparation time at the bottom — 12 minutes."

**Key talking points:**
> "This is the core innovation. Before Gemini, kitchen staff had to read messy handwritten notes or disjointed digital tickets. Now they get a standardized format with clearly highlighted modifications and time estimates for planning their workflow."

---

### Slide 5: Database Integrity (30 seconds)

**Action:** Open a terminal and run `npx prisma studio`.

**Say:**
> "Let's verify database integrity. I'll open Prisma Studio — the built-in database GUI."

**Action:** Navigate to the Order table in Prisma Studio.

> "The order was created with PREPARING status, the total of RM 32.00 is accurate, and the AI summary is stored alongside the raw notes. The transaction was atomic — table status updated and order created in a single database transaction."

---

### Slide 6: Technical Highlights (60 seconds)

**Say:**
> "From a technical perspective, a few highlights:"

> "1. **Atomic Transactions** — Order creation and table status updates are wrapped in `prisma.$transaction`. If either operation fails, both roll back. No orphan orders, no stale table states."

> "2. **Gemini System Instructions** — The AI prompt is carefully engineered with system instructions that guarantee consistent output formatting regardless of how chaotically the waiter types."

> "3. **Prisma 7 Driver Adapter** — We use Prisma's latest version with the new driver adapter pattern, connecting through `@prisma/adapter-pg` for direct PostgreSQL access."

> "4. **TypeScript End-to-End** — From database schema to API routes to client components — everything is type-safe."

---

### Slide 7: Future Roadmap (30 seconds)

**Say:**
> "This is an operational core loop, not a shallow prototype. The architecture supports several planned enhancements:"

> "1. **Edge WebSockets** — Real-time table status updates across all devices without polling."
> "2. **Offline Sync** — IndexedDB browser storage for when the network drops — orders queue locally and sync when reconnected."
> "3. **Bill Splitting** — Algorithmic split of bills across mixed payment methods."
> "4. **Role-based Views** — Separate FOH waitstaff and BOH kitchen interfaces with tailored information density."

---

## Key Messages Summary

| Topic | Key Message |
|---|---|
| Problem | Three real-world frictions: modifications, kitchen readability, settlement |
| Solution | AI-powered pipeline with structured cart + unstructured notes → clean ticket |
| AI Integration | Gemini 2.5 Flash is a core operational layer, not a bolt-on chatbot |
| Technical Quality | Atomic transactions, type safety, driver adapter architecture, clean schema |
| Product Thinking | Deep operational core loop, not shallow feature list. Solves messy real-world scenarios |
| Future Ready | WebSockets, offline sync, bill splitting — architecture supports growth |

---

## Sample Q&A Answers

**Q: Why Next.js instead of Java/Spring Boot?**

> "Next.js + TypeScript was selected for iteration speed, unified compile-time type safety across database and UI tiers, and to meet development constraints. The App Router provides both server-rendered pages and API routes in a single codebase."

**Q: How does the AI handle bad input?**

> "The Gemini system instruction is designed to be resilient. If notes are minimal or nonsensical, the AI still produces a valid ticket with just the structured cart items. The system instruction acts as a safety net."

**Q: Can this handle a busy restaurant?**

> "Yes. Each API call is stateless, and the AI processing takes under 2 seconds. The PostgreSQL database handles concurrent connections efficiently. The bottleneck would be network latency, which WebSocket updates would address in the next iteration."

**Q: How do you prevent duplicate dispatches?**

> "The transaction is atomic — if the client sends the same request twice, the table status check prevents creating a second active order for the same table. Additionally, we plan to add idempotency keys in the next iteration."
