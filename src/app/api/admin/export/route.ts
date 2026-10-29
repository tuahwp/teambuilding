import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatIC } from "@/lib/ic";

function escapeCSV(str: string | null | undefined): string {
  if (str === null || str === undefined) return '""';
  const escaped = str.toString().replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
  }

  try {
    const participants = await prisma.participant.findMany({
      include: {
        room: true,
        team: true,
      },
      orderBy: { name: "asc" },
    });

    const headers = [
      "Nama",
      "No. Kad Pengenalan",
      "Saiz Baju",
      "Bilik",
      "Kumpulan",
      "Catatan",
    ];

    const rows = participants.map((p) => [
      escapeCSV(p.name),
      escapeCSV(formatIC(p.ic || p.icNormalized)),
      escapeCSV(p.size),
      escapeCSV(p.room?.name || "Belum Ditetapkan"),
      escapeCSV(p.team?.name || "Belum Ditetapkan"),
      escapeCSV(p.remarks || "-"),
    ]);

    const csvContent =
      "\uFEFF" + // UTF-8 BOM for Microsoft Excel
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="senarai_peserta_teambuilding_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json({ error: "Ralat semasa mengeksport CSV." }, { status: 500 });
  }
}

