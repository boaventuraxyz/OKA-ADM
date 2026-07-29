import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-adm_session" : "adm_session";
const LEGACY_COOKIE_NAME = "adm_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const MAX_CLOCK_SKEW_SECONDS = 60;

type SessionPayload = {
  expiresAt: number;
  issuedAt: number;
  nonce: string;
  role: "admin";
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) return null;
  return secret;
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function secureEqual(left: string, right: string) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function makeSessionValue(secret: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    expiresAt: issuedAt + SESSION_DURATION_SECONDS,
    issuedAt,
    nonce: crypto.randomBytes(16).toString("base64url"),
    role: "admin"
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

function parseSession(value: string, secret: string) {
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra || !secureEqual(signature, sign(encoded, secret))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (
      payload.role !== "admin" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 16 ||
      payload.issuedAt > now + MAX_CLOCK_SKEW_SECONDS ||
      payload.expiresAt <= now ||
      payload.expiresAt - payload.issuedAt !== SESSION_DURATION_SECONDS
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function getAuthConfigurationError() {
  const password = process.env.SENHA_ADMIN;
  if (!password || Buffer.byteLength(password, "utf8") < 12) {
    return "SENHA_ADMIN deve ter pelo menos 12 caracteres.";
  }

  if (!sessionSecret()) {
    return "SESSION_SECRET deve ter pelo menos 32 bytes.";
  }

  return null;
}

export function verifyAdminPassword(candidate: string) {
  const password = process.env.SENHA_ADMIN;
  return Boolean(password) && secureEqual(candidate, password || "");
}

export async function isAuthenticated() {
  const secret = sessionSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && parseSession(session, secret));
}

export async function requireAdmin() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function createAdminSession() {
  const secret = sessionSecret();
  if (!secret || !process.env.SENHA_ADMIN) {
    throw new Error("Configuracao de autenticacao invalida.");
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, makeSessionValue(secret), {
    expires: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000),
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  if (COOKIE_NAME !== LEGACY_COOKIE_NAME) {
    cookieStore.delete(LEGACY_COOKIE_NAME);
  }
}
