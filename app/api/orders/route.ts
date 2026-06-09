import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type OrderItemInput = {
  menuItemId: string;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, items, rawNotes }: { tableId?: string; items?: OrderItemInput[]; rawNotes?: string } = body;

    if (!tableId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required order parameters." },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    const computedItemsLine: string[] = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });
      if (!menuItem) continue;

      totalAmount += menuItem.price * item.quantity;
      computedItemsLine.push(`${item.quantity}x ${menuItem.name}`);
    }

    const systemInstruction = `
      You are an elite kitchen expediter dashboard. Your task is to process incoming line items along with unstructured raw server modifications.
      Synthesize them into a clean, markdown-formatted kitchen ticket.
      Rules:
      1. Group the collection into distinct logical courses (e.g., Mains, Drinks, Sides).
      2. Explicitly highlight custom structural modifications in bold text with a \u26a0\ufe0f prefix (e.g., \u26a0\ufe0f **NO ONIONS**, \u26a0\ufe0f **EXTRA CRISPY**).
      3. At the absolute bottom, add a single-line block estimation labeled "ESTIMATED PREPARATION TIME: [X] MINS" based on item volume and overall kitchen processing overhead.
    `;

    const dynamicPrompt = `
      Current Structured Cart Items: ${computedItemsLine.join(", ")}
      Unstructured Raw Server Notes: "${rawNotes || "None"}"
    `;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: dynamicPrompt,
      config: { systemInstruction },
    });

    const aiKitchenSummary =
      aiResponse.text || "Standard preparation sequence applied.";

    const activeOrder = await prisma.$transaction(async (tx) => {
      await tx.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });

      return await tx.order.create({
        data: {
          tableId,
          status: "PREPARING",
          rawNotes,
          aiKitchenSummary,
          totalAmount,
          items: {
            create: items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: { include: { menuItem: true } } },
      });
    });

    return NextResponse.json({ success: true, order: activeOrder });
  } catch (error: unknown) {
    console.error("Critical POS System Failure Engine:", error);
    const message =
      error instanceof Error ? error.message : "Internal server fault handling order loop.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
