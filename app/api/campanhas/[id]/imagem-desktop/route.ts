import { parseCampaignBackground } from "@/lib/campaign-background";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import { getCampanhaDesktopImage } from "@/lib/supabase";
import { isUuid } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const campanha = await getCampanhaDesktopImage(id);
  if (!campanha || !campaignAcceptsSignatures(campanha)) {
    return new Response(null, { status: 404 });
  }
  const image = parseCampaignBackground(campanha.imagem_desktop);
  if (!image) return new Response(null, { status: 404 });

  const etag = `"${image.version}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": image.mimeType,
      ETag: etag,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
