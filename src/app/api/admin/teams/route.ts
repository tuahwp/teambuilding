import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { naturalSortByName } from "@/lib/sort";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const teams = await prisma.team.findMany({
      include: {
        participants: {
          select: { id: true, name: true, size: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    const sortedTeams = naturalSortByName(teams);

    return NextResponse.json(sortedTeams);
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json({ error: "Ralat semasa memuat senarai kumpulan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, color, capacity } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kumpulan diperlukan." }, { status: 400 });
    }

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      return NextResponse.json({ error: "Kapasiti kumpulan sekurang-kurangnya 1 orang." }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        color: color?.trim() || "#3b82f6",
        capacity: cap,
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json({ error: "Ralat semasa menambah kumpulan." }, { status: 500 });
  }
}
