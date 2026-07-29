import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "adm_session";

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.SENHA_ADMIN || "dev-session-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function makeSessionValue() {
  const value = "admin";
  return `${value}.${sign(value)}`;
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return false;

  const [value, signature] = session.split(".");
  if (!value || !signature) return false;

  const expected = sign(value);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function requireAdmin() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, makeSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function getAdminPassword() {
  return process.env.SENHA_ADMIN;
}
