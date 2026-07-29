import { requireAdmin } from "@/lib/auth";
import { getCampaignCsvDownload } from "@/lib/campaign-download";
import { isUuid } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  const download = await getCampaignCsvDownload(id);

  if (!download) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  return new Response(download.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${download.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
