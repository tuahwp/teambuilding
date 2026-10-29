import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const sizes = await prisma.shirtSize.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(sizes);
  } catch (error) {
    console.error("List sizes error:", error);
    return NextResponse.json({ error: "Ralat semasa memuat saiz baju." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, color, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama saiz baju diperlukan." }, { status: 400 });
    }

    const cleanName = name.trim().toUpperCase();

    const existing = await prisma.shirtSize.findUnique({
      where: { name: cleanName },
    });
    if (existing) {
      return NextResponse.json({ error: "Saiz baju ini sudah wujud." }, { status: 400 });
    }

    const count = await prisma.shirtSize.count();

    const size = await prisma.shirtSize.create({
      data: {
        name: cleanName,
        color: color?.trim() || "#3b82f6",
        sortOrder: typeof sortOrder === "number" ? sortOrder : count + 1,
      },
    });

    return NextResponse.json(size, { status: 201 });
  } catch (error) {
    console.error("Create size error:", error);
    return NextResponse.json({ error: "Ralat semasa menambah saiz baju." }, { status: 500 });
  }
}

