import { requireAdmin } from "@/lib/auth";
import { decodeCampaignHtml } from "@/lib/format";
import { getCampanhaHtml } from "@/lib/supabase";

function downloadFilename(title?: string | null) {
  const safeTitle = (title || "campanha")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return `Campanha_${safeTitle || "campanha"}.html`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const campanha = await getCampanhaHtml(id);

  if (!campanha) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  return new Response(decodeCampaignHtml(campanha.html), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${downloadFilename(campanha.titulo)}"`,
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
