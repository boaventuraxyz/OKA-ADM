import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import {
  CAMPAIGN_IMPORT_MAX_BYTES,
  prepareCampaignImport
} from "@/lib/campaign-import";
import { campaignCacheTag } from "@/lib/public-campaign";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOrigin,
  readFormDataWithinLimit,
  requestBodyWithinLimit
} from "@/lib/request-security";
import {
  listCampanhasForImport,
  listCandidatosForSelect,
  SupabaseRequestError,
  upsertCampanhas
} from "@/lib/supabase";

export const runtime = "nodejs";

function json(body: object, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...headers
    }
  });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return json({ erro: "Sessão expirada." }, 401);
  if (!isSameOrigin(request)) return json({ erro: "Origem não permitida." }, 403);

  const rateLimit = consumeRateLimit("campanhas-importar", request.headers, {
    limit: 12,
    windowMs: 60_000
  });
  if (!rateLimit.allowed) {
    return json({ erro: "Muitas tentativas. Aguarde um minuto." }, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds)
    });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLocaleLowerCase("en-US").startsWith("multipart/form-data")) {
    return json({ erro: "Formato de envio inválido." }, 415);
  }

  const maxBodyBytes = CAMPAIGN_IMPORT_MAX_BYTES + 64_000;
  if (!requestBodyWithinLimit(request, maxBodyBytes)) {
    return json({ erro: "A planilha deve ter no máximo 2 MB." }, 413);
  }

  const formData = await readFormDataWithinLimit(request, maxBodyBytes);
  if (!formData) return json({ erro: "A planilha deve ter no máximo 2 MB." }, 413);
  const file = formData?.get("arquivo");
  const mode = formData?.get("modo");

  if (!(file instanceof File) || (mode !== "preview" && mode !== "apply")) {
    return json({ erro: "Selecione uma planilha válida." }, 400);
  }
  if (!/\.(csv|xlsx)$/i.test(file.name)) {
    return json({ erro: "Use um arquivo .xlsx ou .csv." }, 400);
  }

  try {
    const [campaigns, candidates] = await Promise.all([
      listCampanhasForImport(),
      listCandidatosForSelect()
    ]);
    const prepared = await prepareCampaignImport(file, campaigns, candidates);

    if (mode === "preview") return json(prepared.preview);
    if (!prepared.preview.canApply) {
      return json(
        { erro: "Corrija os erros da planilha antes de importar.", ...prepared.preview },
        422
      );
    }

    const saved = await upsertCampanhas(prepared.payloads);
    for (const campaign of saved) {
      revalidateTag(campaignCacheTag(campaign.id), { expire: 0 });
    }
    revalidatePath("/campanhas");

    return json({
      created: prepared.preview.createCount,
      updated: prepared.preview.updateCount
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError) {
      if (error.code === "PGRST204") {
        return json({ erro: "A estrutura da tabela campanhas está desatualizada." }, 409);
      }
      if (error.status === 401 || error.status === 403) {
        return json({ erro: "O Supabase recusou a gravação." }, 502);
      }
      return json({ erro: "Não foi possível gravar as campanhas." }, 502);
    }

    return json({ erro: "Não foi possível ler a planilha." }, 400);
  }
}
