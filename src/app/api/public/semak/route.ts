import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { normalizeIC } from "@/lib/ic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`semak:${ip}`, 10, 60 * 1000);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak cubaan semakan dari alamat IP anda. Sila tunggu ${rate.resetInSeconds} saat sebelum mencuba lagi.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const rawIC = body.ic;

    if (!rawIC || typeof rawIC !== "string" || !rawIC.trim()) {
      return NextResponse.json(
        { error: "Sila masukkan nombor Kad Pengenalan (IC) anda." },
        { status: 400 }
      );
    }

    const cleanIC = normalizeIC(rawIC);
    if (!cleanIC) {
      return NextResponse.json(
        { error: "Format IC tidak sah. Sila semak semula." },
        { status: 400 }
      );
    }

    // Find participant by icNormalized
    const participant = await prisma.participant.findUnique({
      where: { icNormalized: cleanIC },
      include: {
        room: {
          include: {
            participants: {
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            },
          },
        },
        team: {
          include: {
            participants: {
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "IC tak dijumpai. Semak semula atau hubungi urusetia." },
        { status: 404 }
      );
    }

    // Prepare roommates (names only, excluding themselves)
    const roommates = participant.room
      ? participant.room.participants
          .filter((p) => p.id !== participant.id)
          .map((p) => p.name)
      : [];

    // Prepare teammates (names only, excluding themselves)
    const teammates = participant.team
      ? participant.team.participants
          .filter((p) => p.id !== participant.id)
          .map((p) => p.name)
      : [];

    return NextResponse.json({
      found: true,
      participant: {
        name: participant.name,
        size: participant.size,
        room: participant.room
          ? {
              name: participant.room.name,
              roommates,
            }
          : null,
        team: participant.team
          ? {
              name: participant.team.name,
              color: participant.team.color,
              teammates,
            }
          : null,
        remarks: participant.remarks || null,
      },
    });
  } catch (error) {
    console.error("Public semak error:", error);
    return NextResponse.json(
      { error: "Ralat semasa membuat semakan. Sila cuba sebentar lagi." },
      { status: 500 }
    );
  }
}

