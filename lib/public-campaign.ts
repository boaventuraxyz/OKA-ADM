import "server-only";

import { unstable_cache } from "next/cache";
import { parseCampaignDocument } from "@/lib/campaign-document";
import { decodeCampaignHtml } from "@/lib/format";
import { getCampanha } from "@/lib/supabase";

export const campaignCacheTag = (id: string) => `campanha-publica:${id}`;

export function getPublicCampaignView(id: string) {
  return unstable_cache(
    async () => {
      const campanha = await getCampanha(id);
      if (!campanha) return null;

      return {
        assinaturasMeta: campanha.assinaturas_meta,
        candidatoId: campanha.candidato_id,
        document: parseCampaignDocument(decodeCampaignHtml(campanha.html), campanha.id),
        id: campanha.id,
        textoBotao: campanha.texto_form,
        titulo: campanha.titulo
      };
    },
    ["campanha-publica", id],
    {
      revalidate: 300,
      tags: [campaignCacheTag(id)]
    }
  )();
}
