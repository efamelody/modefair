import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" });

type OrderItemInput = {
  menuItemId: string;
  quantity: number;
};

const systemInstruction = `
  You are an elite kitchen expediter dashboard. Your task is to process incoming line items along with unstructured raw server modifications.
  Synthesize them into a clean, markdown-formatted kitchen ticket.
  Rules:
  1. Group the collection into distinct logical courses (e.g., Mains, Drinks, Sides).
  2. Explicitly highlight custom structural modifications in bold text with a \u26a0\ufe0f prefix (e.g., \u26a0\ufe0f **NO ONIONS**, \u26a0\ufe0f **EXTRA CRISPY**).
  3. At the absolute bottom, add a single-line block estimation labeled "ESTIMATED PREPARATION TIME: [X] MINS" based on item volume and overall kitchen processing overhead.
`;

async function computeOrderDetails(items: OrderItemInput[]) {
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

  return { totalAmount, computedItemsLine };
}

async function generateKitchenSummary(
  computedItemsLine: string[],
  rawNotes?: string
) {
  const dynamicPrompt = `
    Current Structured Cart Items: ${computedItemsLine.join(", ")}
    Unstructured Raw Server Notes: "${rawNotes || "None"}"
  `;

  const aiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: dynamicPrompt,
    config: { systemInstruction: [{ text: systemInstruction }] },
  });

  return aiResponse.text || "Standard preparation sequence applied.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tableId,
      items,
      rawNotes,
    }: { tableId?: string; items?: OrderItemInput[]; rawNotes?: string } =
      body;

    if (!tableId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required order parameters." },
        { status: 400 }
      );
    }

    const { totalAmount, computedItemsLine } = await computeOrderDetails(items);
    const aiKitchenSummary = await generateKitchenSummary(
      computedItemsLine,
      rawNotes
    );

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
      error instanceof Error
        ? error.message
        : "Internal server fault handling order loop.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      items,
      rawNotes,
    }: { orderId?: string; items?: OrderItemInput[]; rawNotes?: string } =
      body;

    if (!orderId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required order parameters." },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const { totalAmount, computedItemsLine } = await computeOrderDetails(items);
    const aiKitchenSummary = await generateKitchenSummary(
      computedItemsLine,
      rawNotes
    );

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId } });

      return await tx.order.update({
        where: { id: orderId },
        data: {
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

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: unknown) {
    console.error("Critical POS System Failure Engine:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Internal server fault handling order loop.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
