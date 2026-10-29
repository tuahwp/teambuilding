import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const totalParticipants = await prisma.participant.count();

    const roomAssignedCount = await prisma.participant.count({
      where: { roomId: { not: null } },
    });
    const roomPendingCount = totalParticipants - roomAssignedCount;
    const roomAllocationPercent =
      totalParticipants > 0
        ? Math.round((roomAssignedCount / totalParticipants) * 100)
        : 0;

    const teamAssignedCount = await prisma.participant.count({
      where: { teamId: { not: null } },
    });
    const teamPendingCount = totalParticipants - teamAssignedCount;
    const teamAllocationPercent =
      totalParticipants > 0
        ? Math.round((teamAssignedCount / totalParticipants) * 100)
        : 0;

    // Get all defined shirt sizes with ordering
    const sizes = await prisma.shirtSize.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Group participants by size
    const participantSizes = await prisma.participant.groupBy({
      by: ["size"],
      _count: {
        id: true,
      },
    });

    const sizeCountMap = new Map<string, number>();
    for (const item of participantSizes) {
      sizeCountMap.set(item.size, item._count.id);
    }

    const sizeStats = sizes.map((s) => ({
      name: s.name,
      color: s.color,
      count: sizeCountMap.get(s.name) || 0,
    }));

    return NextResponse.json({
      totalParticipants,
      roomAssignedCount,
      roomPendingCount,
      roomAllocationPercent,
      teamAssignedCount,
      teamPendingCount,
      teamAllocationPercent,
      sizes: sizeStats,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Ralat semasa memuat statistik." }, { status: 500 });
  }
}

