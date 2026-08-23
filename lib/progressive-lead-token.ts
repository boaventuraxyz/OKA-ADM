import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";

function signingSecret() {
  const secret =
    process.env.PROGRESSIVE_LEAD_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secret) {
    throw new Error("Configure PROGRESSIVE_LEAD_SECRET ou SUPABASE_SECRET_KEY.");
  }

  return secret;
}

function payload(leadId: string, campaignId: string) {
  return `${TOKEN_VERSION}:${campaignId}:${leadId}`;
}

export function createProgressiveLeadToken(
  leadId: string,
  campaignId: string,
) {
  return createHmac("sha256", signingSecret())
    .update(payload(leadId, campaignId))
    .digest("base64url");
}

export function verifyProgressiveLeadToken(
  token: string,
  leadId: string,
  campaignId: string,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;

  const expected = createProgressiveLeadToken(leadId, campaignId);
  const receivedBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
