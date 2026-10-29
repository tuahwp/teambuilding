import { NextResponse } from "next/server";
import { createSessionToken, verifyAdminPassword, SESSION_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`login:${ip}`, 5, 60 * 1000);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak cubaan log masuk. Sila tunggu ${rate.resetInSeconds} saat lagi.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { password } = body;

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: "Kata laluan admin tidak sah." },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    const res = NextResponse.json({ success: true, message: "Log masuk berjaya." });

    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Ralat semasa memproses log masuk." },
      { status: 500 }
    );
  }
}

