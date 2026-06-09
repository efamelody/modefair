import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
