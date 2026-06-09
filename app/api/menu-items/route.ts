import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch menu items.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
