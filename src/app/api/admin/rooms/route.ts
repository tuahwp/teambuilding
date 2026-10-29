import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const rooms = await prisma.room.findMany({
      include: {
        participants: {
          select: { id: true, name: true, size: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("List rooms error:", error);
    return NextResponse.json({ error: "Ralat semasa memuat senarai bilik." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, capacity } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama bilik diperlukan." }, { status: 400 });
    }

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      return NextResponse.json({ error: "Kapasiti bilik sekurang-kurangnya 1 orang." }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        capacity: cap,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json({ error: "Ralat semasa menambah bilik." }, { status: 500 });
  }
}

