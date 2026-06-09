import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { not: "PAID" } },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: "Table not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, table });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch table.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
