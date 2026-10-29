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
    const { name, color, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama saiz baju diperlukan." }, { status: 400 });
    }

    const cleanName = name.trim().toUpperCase();

    const existing = await prisma.shirtSize.findFirst({
      where: {
        name: cleanName,
        id: { not: id },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Saiz baju ini sudah wujud." }, { status: 400 });
    }

    const current = await prisma.shirtSize.findUnique({
      where: { id },
    });
    if (!current) {
      return NextResponse.json({ error: "Saiz baju tidak dijumpai." }, { status: 404 });
    }

    // If name changed, also update participants who have this old size name
    await prisma.$transaction(async (tx) => {
      if (current.name !== cleanName) {
        await tx.participant.updateMany({
          where: { size: current.name },
          data: { size: cleanName },
        });
      }

      await tx.shirtSize.update({
        where: { id },
        data: {
          name: cleanName,
          color: color?.trim() || current.color,
          sortOrder: typeof sortOrder === "number" ? sortOrder : current.sortOrder,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Saiz baju berjaya dikemas kini." });
  } catch (error) {
    console.error("Update size error:", error);
    return NextResponse.json({ error: "Ralat semasa mengemas kini saiz baju." }, { status: 500 });
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
    const size = await prisma.shirtSize.findUnique({
      where: { id },
    });
    if (!size) {
      return NextResponse.json({ error: "Saiz baju tidak dijumpai." }, { status: 404 });
    }

    // Check if participants are using this size
    const inUseCount = await prisma.participant.count({
      where: { size: size.name },
    });

    if (inUseCount > 0) {
      return NextResponse.json(
        {
          error: `Saiz "${size.name}" tidak boleh dipadam kerana sedang digunakan oleh ${inUseCount} orang peserta. Sila tukar saiz peserta tersebut terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await prisma.shirtSize.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Saiz baju berjaya dipadam." });
  } catch (error) {
    console.error("Delete size error:", error);
    return NextResponse.json({ error: "Ralat semasa memadam saiz baju." }, { status: 500 });
  }
}

