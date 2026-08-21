import { describe, expect, it } from "vitest";

import {
  MAX_CAMPAIGN_BACKGROUND_BYTES,
  MAX_CAMPAIGN_BACKGROUND_DATA_URL_LENGTH,
  parseCampaignBackground,
} from "@/lib/campaign-background";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngDataUrl(bytes: number) {
  const buffer = Buffer.alloc(Math.max(PNG_SIGNATURE.length, bytes));
  for (const [index, byte] of PNG_SIGNATURE.entries()) buffer[index] = byte;
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

describe("limite das imagens da campanha", () => {
  it("aceita 5 MB decodificados", () => {
    expect(MAX_CAMPAIGN_BACKGROUND_BYTES).toBe(5 * 1024 * 1024);
  });

  it("reserva folga suficiente no data URI para os bytes permitidos", () => {
    // base64 gera 4 caracteres por 3 bytes, e ainda há o prefixo do data URI.
    const encoded = Math.ceil(MAX_CAMPAIGN_BACKGROUND_BYTES / 3) * 4;
    expect(MAX_CAMPAIGN_BACKGROUND_DATA_URL_LENGTH).toBeGreaterThan(
      encoded + "data:image/webp;base64,".length,
    );
  });

  it("aceita uma imagem no tamanho máximo", () => {
    const parsed = parseCampaignBackground(pngDataUrl(MAX_CAMPAIGN_BACKGROUND_BYTES));
    expect(parsed?.mimeType).toBe("image/png");
    expect(parsed?.bytes.length).toBe(MAX_CAMPAIGN_BACKGROUND_BYTES);
  });

  it("recusa uma imagem acima do limite", () => {
    expect(parseCampaignBackground(pngDataUrl(MAX_CAMPAIGN_BACKGROUND_BYTES + 1))).toBeNull();
  });

  it("continua recusando conteúdo que não é imagem", () => {
    expect(parseCampaignBackground("data:text/html;base64,PGgxPm9pPC9oMT4=")).toBeNull();
    expect(parseCampaignBackground(`data:image/png;base64,${Buffer.from("nao e png").toString("base64")}`)).toBeNull();
    expect(parseCampaignBackground("")).toBeNull();
    expect(parseCampaignBackground(null)).toBeNull();
  });
});
