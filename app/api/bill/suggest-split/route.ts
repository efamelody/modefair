import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" });

const splitSystemInstruction = `
You are a bill-splitting assistant for a restaurant POS system.
Given a list of ordered items with prices and a number of guests, suggest a fair
item-to-guest assignment.

Rules:
1. Mains and individual items are typically assigned to one person each.
2. Sides and shareable items can be split across multiple guests.
3. Drinks are typically assigned to one person.
4. Try to balance the total amount per guest reasonably.
5. Assign each item quantity fully — don't leave items unassigned.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "guestName": "Person 1",
    "assignments": [
      { "orderItemId": "...", "quantity": 1 }
    ]
  }
]

Use names "Person 1", "Person 2", etc.
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      guestNames,
    }: { orderId?: string; guestNames?: string[] } = body;

    if (!orderId || !guestNames || guestNames.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or guestNames." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const itemsDescription = order.items
      .map(
        (i) =>
          `- ${i.menuItem.name} (${i.menuItem.category}, RM${i.menuItem.price}, qty: ${i.quantity}, id: ${i.id})`
      )
      .join("\n");

    const prompt = `
Order items:
${itemsDescription}

Number of guests: ${guestNames.length}
Guest names: ${guestNames.join(", ")}

Suggest a fair split assigning each item to a guest.
`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { systemInstruction: splitSystemInstruction },
    });

    const text = aiResponse.text || "[]";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    let split: { guestName: string; assignments: { orderItemId: string; quantity: number }[] }[];

    try {
      split = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        success: true,
        suggestion: guestNames.map((name) => ({
          guestName: name,
          assignments: [],
        })),
        raw: text,
      });
    }

    return NextResponse.json({ success: true, suggestion: split });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "AI split suggestion failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
