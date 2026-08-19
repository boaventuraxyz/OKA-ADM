export const CAMPAIGN_VIDEO_BUCKET = "campaign-videos";
export const MAX_CAMPAIGN_VIDEOS = 8;
export const MAX_CAMPAIGN_VIDEO_MEGABYTES = 50;
export const MAX_CAMPAIGN_VIDEO_BYTES = MAX_CAMPAIGN_VIDEO_MEGABYTES * 1024 * 1024;

export const CAMPAIGN_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime"
] as const;

export type CampaignVideoItem = {
  caption: string;
  url: string;
};

export type CampaignVideoBucketConfiguration = {
  allowed_mime_types?: readonly string[] | null;
  file_size_limit?: number | null;
  public: boolean;
};

export function campaignVideoBucketNeedsUpdate(
  bucket: CampaignVideoBucketConfiguration,
) {
  return (
    !bucket.public ||
    bucket.file_size_limit !== MAX_CAMPAIGN_VIDEO_BYTES ||
    CAMPAIGN_VIDEO_MIME_TYPES.some(
      (mimeType) => !bucket.allowed_mime_types?.includes(mimeType),
    )
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function validCampaignVideoUrl(value: unknown): value is string {
  return typeof value === "string" && /^(https:\/\/|\/)/i.test(value.trim());
}

export function parseCampaignVideoCarousel(
  settings: unknown
): CampaignVideoItem[] | null {
  const settingsRecord = record(settings);
  if (!settingsRecord || !("video_carousel" in settingsRecord)) return null;
  if (!Array.isArray(settingsRecord.video_carousel)) return [];

  return settingsRecord.video_carousel
    .slice(0, MAX_CAMPAIGN_VIDEOS)
    .flatMap((value) => {
      const item = record(value);
      if (!validCampaignVideoUrl(item?.url)) return [];
      return [{
        caption: typeof item?.caption === "string"
          ? item.caption.trim().slice(0, 300)
          : "",
        url: item.url.trim().slice(0, 2048)
      }];
    });
}

export function legacyCampaignVideoCarousel({
  caption,
  url
}: {
  caption?: string | null;
  url?: string | null;
}): CampaignVideoItem[] {
  if (!validCampaignVideoUrl(url)) return [];
  return [{
    caption: caption?.trim().slice(0, 300) || "",
    url: url.trim().slice(0, 2048)
  }];
}
