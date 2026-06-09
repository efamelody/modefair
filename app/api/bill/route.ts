import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId parameter." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        items: { include: { menuItem: true } },
        guests: {
          include: {
            splits: { include: { orderItem: { include: { menuItem: true } } } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const guestDetails = order.guests.map((g) => {
      let subtotal = 0;
      const itemDetails = g.splits.map((s) => {
        const lineTotal = s.orderItem.menuItem.price * s.quantity;
        subtotal += lineTotal;
        return {
          orderItemId: s.orderItemId,
          name: s.orderItem.menuItem.name,
          price: s.orderItem.menuItem.price,
          quantity: s.quantity,
          lineTotal,
        };
      });
      return {
        id: g.id,
        name: g.name,
        method: g.method,
        subtotal,
        items: itemDetails,
      };
    });

    const settledTotal = guestDetails.reduce((s, g) => s + g.subtotal, 0);

    return NextResponse.json({
      success: true,
      bill: {
        orderId: order.id,
        tableNumber: order.table.tableNumber,
        status: order.status,
        billStatus: order.billStatus,
        totalAmount: order.totalAmount,
        settledTotal,
        items: order.items.map((i) => ({
          id: i.id,
          name: i.menuItem.name,
          price: i.menuItem.price,
          category: i.menuItem.category,
          quantity: i.quantity,
        })),
        guests: guestDetails,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch bill.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
