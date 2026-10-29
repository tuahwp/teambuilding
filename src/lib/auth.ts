import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "tb_admin_session";
const SESSION_EXPIRATION = "7d"; // 7 hari

function getSecretKey() {
  const secret = process.env.SESSION_SECRET || "default-secret-key-teambuilding-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(secretKey);
}

export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return await verifySessionToken(token);
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  return password.trim() === expected.trim();
}

