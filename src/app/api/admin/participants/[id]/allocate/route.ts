import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
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
    const { roomId, teamId } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { id },
      });

      if (!participant) {
        throw new Error("Peserta tidak dijumpai.");
      }

      // Check room change
      if (roomId !== undefined && roomId !== participant.roomId) {
        if (roomId) {
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { _count: { select: { participants: true } } },
          });

          if (!room) {
            throw new Error("Bilik yang dipilih tidak wujud.");
          }

          if (room._count.participants >= room.capacity) {
            throw new Error(
              `Alamak, ${room.name} ni dah penuh (maksimum ${room.capacity} orang)! Sila pilih bilik lain ya.`
            );
          }
        }
      }

      // Check team change
      if (teamId !== undefined && teamId !== participant.teamId) {
        if (teamId) {
          const team = await tx.team.findUnique({
            where: { id: teamId },
            include: { _count: { select: { participants: true } } },
          });

          if (!team) {
            throw new Error("Kumpulan yang dipilih tidak wujud.");
          }

          if (team._count.participants >= team.capacity) {
            throw new Error(
              `Alamak, ${team.name} ni dah penuh (maksimum ${team.capacity} orang)! Sila pilih kumpulan lain ya.`
            );
          }
        }
      }

      const dataToUpdate: any = {};
      if (roomId !== undefined) dataToUpdate.roomId = roomId || null;
      if (teamId !== undefined) dataToUpdate.teamId = teamId || null;

      return await tx.participant.update({
        where: { id },
        data: dataToUpdate,
        include: {
          room: { select: { id: true, name: true, capacity: true } },
          team: { select: { id: true, name: true, color: true, capacity: true } },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Allocate error:", error);
    return NextResponse.json(
      { error: error.message || "Ralat semasa membuat agihan." },
      { status: 400 }
    );
  }
}

