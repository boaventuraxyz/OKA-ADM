import { findCampaignAsset } from "@/lib/campaign-document";
import { decodeCampaignHtml } from "@/lib/format";
import { getCampanhaHtml } from "@/lib/supabase";
import { isUuid } from "@/lib/validation";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ id: string; filename: string }>;
  }
) {
  const { id, filename } = await params;
  if (!isUuid(id)) return new Response("Imagem não encontrada.", { status: 404 });

  const campanha = await getCampanhaHtml(id);
  if (!campanha) return new Response("Imagem não encontrada.", { status: 404 });

  const asset = findCampaignAsset(decodeCampaignHtml(campanha.html), filename);
  if (!asset) return new Response("Imagem não encontrada.", { status: 404 });

  return new Response(new Uint8Array(asset.bytes), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": asset.contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      ETag: `"${filename}"`,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
