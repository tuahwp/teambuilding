import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  const { id } = params;

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

    // Check existing participant count
    const memberCount = await prisma.participant.count({
      where: { roomId: id },
    });

    if (cap < memberCount) {
      return NextResponse.json(
        {
          error: `Kapasiti tidak boleh kurang daripada jumlah ahli sedia ada (${memberCount} orang). Sila tukar bilik peserta terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        name: name.trim(),
        capacity: cap,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Update room error:", error);
    return NextResponse.json({ error: "Ralat semasa mengemas kini bilik." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  const { id } = params;

  try {
    // Unassign participants first, then delete room
    await prisma.$transaction([
      prisma.participant.updateMany({
        where: { roomId: id },
        data: { roomId: null },
      }),
      prisma.room.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Bilik berjaya dipadam." });
  } catch (error) {
    console.error("Delete room error:", error);
    return NextResponse.json({ error: "Ralat semasa memadam bilik." }, { status: 500 });
  }
}

