import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getCampaignHtmlDownload } from "@/lib/campaign-download";
import { campaignCacheTag } from "@/lib/public-campaign";
import {
  isSameOrigin,
  readFormDataWithinLimit,
  requestBodyWithinLimit
} from "@/lib/request-security";
import { updateCampanha } from "@/lib/supabase";
import { isUuid } from "@/lib/validation";

const MAX_HTML_BYTES = 3 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  const download = await getCampaignHtmlDownload(id);

  if (!download) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  return new Response(download.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${download.filename}"`,
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  if (
    !isUuid(id) ||
    !isSameOrigin(request) ||
    !requestBodyWithinLimit(request, MAX_HTML_BYTES + 16 * 1024) ||
    !request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")
  ) {
    return new Response("Requisicao invalida.", { status: 400 });
  }

  const formData = await readFormDataWithinLimit(
    request,
    MAX_HTML_BYTES + 16 * 1024
  );
  if (!formData) {
    return new Response("HTML invalido ou muito grande.", { status: 400 });
  }

  const formId = formData.get("id");
  const html = formData.get("html");
  if (
    formId !== id ||
    typeof html !== "string" ||
    Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES
  ) {
    return new Response("HTML invalido ou muito grande.", { status: 400 });
  }

  await updateCampanha(id, {
    html: Buffer.from(html, "utf8").toString("base64")
  });
  updateTag(campaignCacheTag(id));
  revalidatePath("/campanhas");

  return Response.redirect(new URL("/campanhas", request.url), 303);
}
