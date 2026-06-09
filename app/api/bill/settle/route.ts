import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      splits,
      guestMethods,
    }: {
      orderId?: string;
      splits?: { guestId: string; orderItemId: string; quantity: number }[];
      guestMethods?: { guestId: string; method: string }[];
    } = body;

    if (!orderId || !splits) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or splits." },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { table: true, guests: true },
      });
      if (!order) throw new Error("Order not found.");

      await tx.guestSplit.deleteMany({
        where: { guest: { orderId } },
      });

      if (splits.length > 0) {
        await tx.guestSplit.createMany({ data: splits });
      }

      if (guestMethods) {
        for (const gm of guestMethods) {
          await tx.guest.update({
            where: { id: gm.guestId },
            data: {
              method: gm.method.toUpperCase() === "CARD" ? "CARD" : "CASH",
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { billStatus: "SETTLED", status: "PAID" },
      });

      await tx.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          guests: {
            include: {
              splits: { include: { orderItem: { include: { menuItem: true } } } },
            },
          },
        },
      });
    });

    const receipt = updatedOrder!.guests.map((g) => {
      let subtotal = 0;
      const items = g.splits.map((s) => {
        const lineTotal = s.orderItem.menuItem.price * s.quantity;
        subtotal += lineTotal;
        return {
          name: s.orderItem.menuItem.name,
          quantity: s.quantity,
          lineTotal,
        };
      });
      return {
        name: g.name,
        method: g.method,
        subtotal,
        items,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Bill settled. Table released.",
      receipt: {
        tableNumber: updatedOrder!.table.tableNumber,
        total: updatedOrder!.totalAmount,
        guests: receipt,
        settledAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to settle bill.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
