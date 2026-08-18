import { parseCampaignBackground } from "@/lib/campaign-background";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import { getCampanhaBackground } from "@/lib/supabase";
import { isUuid } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const campanha = await getCampanhaBackground(id);
  if (!campanha || !campaignAcceptsSignatures(campanha)) {
    return new Response(null, { status: 404 });
  }
  const background = parseCampaignBackground(campanha?.imagem_fundo);
  if (!background) return new Response(null, { status: 404 });

  const etag = `"${background.version}"`;
  const headers = {
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": background.mimeType,
    ETag: etag,
    "X-Content-Type-Options": "nosniff"
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { headers, status: 304 });
  }

  return new Response(new Uint8Array(background.bytes), { headers });
}
