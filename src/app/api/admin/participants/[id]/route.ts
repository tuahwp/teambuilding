import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeIC } from "@/lib/ic";

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
    const { name, ic, size, roomId, teamId, remarks } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama peserta diperlukan." }, { status: 400 });
    }

    if (!size || !size.trim()) {
      return NextResponse.json({ error: "Saiz baju diperlukan." }, { status: 400 });
    }

    const icNormalized = normalizeIC(ic);

    // If IC given, check if another participant has it
    if (icNormalized) {
      const existing = await prisma.participant.findFirst({
        where: {
          icNormalized,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Nombor IC ini sudah didaftarkan untuk peserta "${existing.name}".` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.participant.findUnique({
        where: { id },
      });
      if (!current) {
        throw new Error("Peserta tidak dijumpai.");
      }

      // Check room capacity if room changed or set
      if (roomId && roomId !== current.roomId) {
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

      // Check team capacity if team changed or set
      if (teamId && teamId !== current.teamId) {
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

      return await tx.participant.update({
        where: { id },
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

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update participant error:", error);
    return NextResponse.json(
      { error: error.message || "Ralat semasa mengemas kini peserta." },
      { status: 400 }
    );
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
    await prisma.participant.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: "Peserta berjaya dipadam." });
  } catch (error) {
    console.error("Delete participant error:", error);
    return NextResponse.json(
      { error: "Ralat semasa memadam peserta." },
      { status: 500 }
    );
  }
}

