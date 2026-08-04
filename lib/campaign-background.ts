import "server-only";

import { createHash } from "node:crypto";

export const MAX_CAMPAIGN_BACKGROUND_BYTES = 900 * 1024;
export const MAX_CAMPAIGN_BACKGROUND_DATA_URL_LENGTH = 1_230_000;

type CampaignBackground = {
  bytes: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  version: string;
};

function hasExpectedSignature(bytes: Buffer, mimeType: CampaignBackground["mimeType"]) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
  }

  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function parseCampaignBackground(value: unknown): CampaignBackground | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_CAMPAIGN_BACKGROUND_DATA_URL_LENGTH
  ) {
    return null;
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;

  const mimeType = match[1] as CampaignBackground["mimeType"];
  const encoded = match[2];
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length > MAX_CAMPAIGN_BACKGROUND_BYTES) return null;

  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedOutput = bytes.toString("base64").replace(/=+$/, "");
  if (normalizedInput !== normalizedOutput || !hasExpectedSignature(bytes, mimeType)) return null;

  return {
    bytes,
    mimeType,
    version: createHash("sha256").update(bytes).digest("hex").slice(0, 16)
  };
}

