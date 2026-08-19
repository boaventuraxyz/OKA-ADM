import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_VIDEO_MIME_TYPES,
  campaignVideoBucketNeedsUpdate,
  legacyCampaignVideoCarousel,
  MAX_CAMPAIGN_VIDEO_BYTES,
  MAX_CAMPAIGN_VIDEOS,
  parseCampaignVideoCarousel,
} from "@/lib/campaign-video-carousel";

describe("carrossel de vídeos da campanha", () => {
  it("mantém URLs válidas, limita itens e normaliza legendas", () => {
    const items = Array.from({ length: MAX_CAMPAIGN_VIDEOS + 2 }, (_, index) => ({
      caption: ` Vídeo ${index + 1} `,
      url: `https://cdn.example.com/video-${index + 1}.mp4`,
    }));

    const parsed = parseCampaignVideoCarousel({ video_carousel: items });

    expect(parsed).toHaveLength(MAX_CAMPAIGN_VIDEOS);
    expect(parsed?.[0]).toEqual({
      caption: "Vídeo 1",
      url: "https://cdn.example.com/video-1.mp4",
    });
  });

  it("descarta itens inválidos e diferencia ausência de lista vazia", () => {
    expect(parseCampaignVideoCarousel({})).toBeNull();
    expect(parseCampaignVideoCarousel({ video_carousel: [
      { caption: "Inválido", url: "javascript:alert(1)" },
    ] })).toEqual([]);
  });

  it("preserva o vídeo único das campanhas antigas", () => {
    expect(legacyCampaignVideoCarousel({
      caption: "Relato principal",
      url: "/videos/relato.mp4",
    })).toEqual([{
      caption: "Relato principal",
      url: "/videos/relato.mp4",
    }]);
  });

  it("não reconfigura o bucket quando ele já aceita os vídeos", () => {
    expect(campaignVideoBucketNeedsUpdate({
      allowed_mime_types: [...CAMPAIGN_VIDEO_MIME_TYPES],
      file_size_limit: MAX_CAMPAIGN_VIDEO_BYTES,
      public: true,
    })).toBe(false);

    expect(campaignVideoBucketNeedsUpdate({
      allowed_mime_types: ["video/mp4"],
      file_size_limit: MAX_CAMPAIGN_VIDEO_BYTES,
      public: true,
    })).toBe(true);
  });
});
