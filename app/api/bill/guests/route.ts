import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      guests,
    }: { orderId?: string; guests?: { name: string; method?: string }[] } =
      body;

    if (!orderId || !guests || guests.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or guests." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { guests: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    await prisma.guest.deleteMany({ where: { orderId } });

    const created = await Promise.all(
      guests.map((g) =>
        prisma.guest.create({
          data: {
            orderId,
            name: g.name,
            method: g.method?.toUpperCase() === "CARD" ? "CARD" : "CASH",
          },
        })
      )
    );

    await prisma.guestSplit.deleteMany({
      where: { guest: { orderId } },
    });

    return NextResponse.json({ success: true, guests: created });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to manage guests.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
