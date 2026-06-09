import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      include: {
        orders: {
          where: { status: { not: "PAID" } },
          include: { items: { include: { menuItem: true } } },
        },
      },
      orderBy: { tableNumber: "asc" },
    });
    return NextResponse.json({ success: true, tables });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch tables.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status }: { id?: string; status?: string } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing table id or status." },
        { status: 400 }
      );
    }

    const table = await prisma.table.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, table });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update table.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
