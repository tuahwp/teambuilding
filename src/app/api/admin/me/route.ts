import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const authenticated = await getSession();
  return NextResponse.json({ authenticated });
}

