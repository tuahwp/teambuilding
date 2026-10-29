import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeIC } from "@/lib/ic";

export async function GET(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const size = searchParams.get("size") || "ALL";
  const roomStatus = searchParams.get("roomStatus") || "ALL";
  const teamStatus = searchParams.get("teamStatus") || "ALL";

  try {
    const where: any = {};

    if (search) {
      const cleanSearch = normalizeIC(search) || search;
      where.OR = [
        { name: { contains: search } },
        { ic: { contains: search } },
        { icNormalized: { contains: cleanSearch } },
      ];
    }

    if (size !== "ALL") {
      where.size = size;
    }

    if (roomStatus === "assigned") {
      where.roomId = { not: null };
    } else if (roomStatus === "unassigned") {
      where.roomId = null;
    }

    if (teamStatus === "assigned") {
      where.teamId = { not: null };
    } else if (teamStatus === "unassigned") {
      where.teamId = null;
    }

    const participants = await prisma.participant.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, capacity: true } },
        team: { select: { id: true, name: true, color: true, capacity: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("List participants error:", error);
    return NextResponse.json({ error: "Ralat semasa memuat peserta." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, ic, size, roomId, teamId, remarks } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama peserta diperlukan." }, { status: 400 });
    }

    if (!size || !size.trim()) {
      return NextResponse.json({ error: "Saiz baju diperlukan." }, { status: 400 });
    }

    const icNormalized = normalizeIC(ic);

    // If an IC is given, ensure it is unique
    if (icNormalized) {
      const existing = await prisma.participant.findUnique({
        where: { icNormalized },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Nombor IC ini sudah didaftarkan untuk peserta "${existing.name}".` },
          { status: 400 }
        );
      }
    }

    // Run creation inside transaction to guarantee capacity checks
    const participant = await prisma.$transaction(async (tx) => {
      if (roomId) {
        const room = await tx.room.findUnique({
          where: { id: roomId },
          include: { _count: { select: { participants: true } } },
        });
        if (!room) {
          throw new Error("Bilik yang dipilih tidak wujud.");
        }
        if (room._count.participants >= room.capacity) {
          throw new Error(`Alamak, ${room.name} ni dah penuh (maksimum ${room.capacity} orang)! Sila pilih bilik lain ya.`);
        }
      }

      if (teamId) {
        const team = await tx.team.findUnique({
          where: { id: teamId },
          include: { _count: { select: { participants: true } } },
        });
        if (!team) {
          throw new Error("Kumpulan yang dipilih tidak wujud.");
        }
        if (team._count.participants >= team.capacity) {
          throw new Error(`Alamak, ${team.name} ni dah penuh (maksimum ${team.capacity} orang)! Sila pilih kumpulan lain ya.`);
        }
      }

      return await tx.participant.create({
        data: {
          name: name.trim(),
          ic: ic?.trim() || null,
          icNormalized,
          size: size.trim(),
          roomId: roomId || null,
          teamId: teamId || null,
          remarks: remarks?.trim() || null,
        },
        include: {
          room: true,
          team: true,
        },
      });
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error: any) {
    console.error("Create participant error:", error);
    return NextResponse.json(
      { error: error.message || "Ralat semasa mendaftar peserta." },
      { status: 400 }
    );
  }
}

