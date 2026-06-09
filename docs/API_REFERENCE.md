# API Reference

## Base URL

All API routes are served under the `/api/` prefix.

**Development:** `http://localhost:3000/api/`

---

## Authentication

The API does not currently implement authentication. The Gemini API key is used server-side only and is never exposed to the client.

---

## Endpoints

### `GET /api/menu-items`

Returns all menu items sorted by category, then name.

#### Response

```json
{
  "success": true,
  "items": [
    {
      "id": "clx...",
      "name": "Nasi Lemak Ayam Goreng",
      "price": 14.5,
      "category": "Mains"
    },
    {
      "id": "clx...",
      "name": "Kopi O Ais",
      "price": 3.5,
      "category": "Drinks"
    }
  ]
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Failed to fetch menu items."
}
```

---

### `GET /api/tables`

Returns all tables with their active (non-PAID) orders.

#### Response

```json
{
  "success": true,
  "tables": [
    {
      "id": "clx...",
      "tableNumber": "T01",
      "status": "AVAILABLE",
      "orders": []
    },
    {
      "id": "clx...",
      "tableNumber": "T04",
      "status": "OCCUPIED",
      "orders": [
        {
          "id": "clx...",
          "totalAmount": 32.0,
          "status": "PREPARING",
          "items": [
            {
              "menuItem": { "name": "Nasi Lemak Ayam Goreng" },
              "quantity": 2
            }
          ]
        }
      ]
    }
  ]
}
```

---

### `PATCH /api/tables`

Updates a table's status.

#### Request Body

```json
{
  "id": "clx...",
  "status": "BILLING"
}
```

#### Response

```json
{
  "success": true,
  "table": {
    "id": "clx...",
    "tableNumber": "T04",
    "status": "BILLING"
  }
}
```

#### Error Response (Missing fields)

```json
{
  "success": false,
  "error": "Missing table id or status."
}
```

---

### `POST /api/orders` (Primary Endpoint)

Processes a new order through the AI kitchen expediter pipeline.

#### Request Body

```json
{
  "tableId": "clx...",
  "items": [
    { "menuItemId": "clx...", "quantity": 2 },
    { "menuItemId": "clx...", "quantity": 1 }
  ],
  "rawNotes": "Hold the sambal on 1 nasi lemak, make roti canai super crispy"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `tableId` | string | Yes | ID of the table placing the order |
| `items` | array | Yes | Array of order items |
| `items[].menuItemId` | string | Yes | ID of the menu item |
| `items[].quantity` | integer | Yes | Quantity (>= 1) |
| `rawNotes` | string | No | Unstructured waitstaff notes for Gemini |

#### Processing Pipeline

1. **Price Lookup** — Each `menuItemId` is resolved to get its price from the database
2. **Total Computation** — `totalAmount = sum(price * quantity)` for all valid items
3. **AI Generation** — Cart items + raw notes are sent to Gemini 2.5 Flash
4. **Atomic Transaction** — `prisma.$transaction` updates table status and creates order

#### Success Response

```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "tableId": "clx...",
    "status": "PREPARING",
    "rawNotes": "Hold the sambal on 1 nasi lemak, make roti canai super crispy",
    "aiKitchenSummary": "**Mains**\n- 2x Nasi Lemak Ayam Goreng\n  ⚠️ **HOLD SAMBAL** on 1 portion\n- 1x Roti Canai\n  ⚠️ **EXTRA CRISPY**\n\n═══════════════════════════════════════════\nESTIMATED PREPARATION TIME: 12 MINS",
    "totalAmount": 32.0,
    "items": [
      {
        "id": "clx...",
        "menuItemId": "clx...",
        "quantity": 2,
        "menuItem": {
          "id": "clx...",
          "name": "Nasi Lemak Ayam Goreng",
          "price": 14.5,
          "category": "Mains"
        }
      }
    ],
    "createdAt": "2026-06-09T14:30:00.000Z"
  }
}
```

#### Error Responses

**Missing parameters:**
```json
{
  "success": false,
  "error": "Missing required order parameters."
}
```
Status: **400**

**Processing error:**
```json
{
  "success": false,
  "error": "Internal server fault handling order loop."
}
```
Status: **500**

---

## Gemini System Instruction

The following system instruction is sent to the model with every order:

```
You are an elite kitchen expediter dashboard. Your task is to process incoming
line items along with unstructured raw server modifications.
Synthesize them into a clean, markdown-formatted kitchen ticket.

Rules:
1. Group the collection into distinct logical courses (e.g., Mains, Drinks, Sides).
2. Explicitly highlight custom structural modifications in bold text with a ⚠️
   prefix (e.g., ⚠️ **NO ONIONS**, ⚠️ **EXTRA CRISPY**).
3. At the absolute bottom, add a single-line block estimation labeled
   "ESTIMATED PREPARATION TIME: [X] MINS" based on item volume and overall
   kitchen processing overhead.
```

---

## TypeScript Types

```typescript
// Request types
interface OrderRequest {
  tableId: string;
  items: OrderItemInput[];
  rawNotes?: string;
}

interface OrderItemInput {
  menuItemId: string;
  quantity: number;
}

interface TablePatchRequest {
  id: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING";
}

// Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface OrderResponse {
  id: string;
  tableId: string;
  status: "PENDING" | "PREPARING" | "SERVED" | "PAID";
  rawNotes: string | null;
  aiKitchenSummary: string | null;
  totalAmount: number;
  items: OrderItemResponse[];
  createdAt: string;
}

interface OrderItemResponse {
  id: string;
  menuItemId: string;
  quantity: number;
  menuItem: MenuItemResponse;
}

interface MenuItemResponse {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface TableResponse {
  id: string;
  tableNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  orders: OrderResponse[];
}
```

---

## Rate Limiting

No rate limiting is currently implemented.

---

## CORS

In development, Next.js handles CORS automatically. For production deployment, configure CORS headers in `next.config.ts`.
