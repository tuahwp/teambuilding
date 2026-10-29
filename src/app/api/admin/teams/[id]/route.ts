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
    const { name, color, capacity } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kumpulan diperlukan." }, { status: 400 });
    }

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      return NextResponse.json({ error: "Kapasiti kumpulan sekurang-kurangnya 1 orang." }, { status: 400 });
    }

    // Check existing participant count
    const memberCount = await prisma.participant.count({
      where: { teamId: id },
    });

    if (cap < memberCount) {
      return NextResponse.json(
        {
          error: `Kapasiti tidak boleh kurang daripada jumlah ahli sedia ada (${memberCount} orang). Sila tukar kumpulan peserta terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: name.trim(),
        color: color?.trim() || "#3b82f6",
        capacity: cap,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("Update team error:", error);
    return NextResponse.json({ error: "Ralat semasa mengemas kini kumpulan." }, { status: 500 });
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
    await prisma.$transaction([
      prisma.participant.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      }),
      prisma.team.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Kumpulan berjaya dipadam." });
  } catch (error) {
    console.error("Delete team error:", error);
    return NextResponse.json({ error: "Ralat semasa memadam kumpulan." }, { status: 500 });
  }
}

