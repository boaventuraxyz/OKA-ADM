import "server-only";

import { unstable_cache } from "next/cache";
import { parseCampaignBackground } from "@/lib/campaign-background";
import { getCampanha, getCandidato } from "@/lib/supabase";

export const campaignCacheTag = (id: string) => `campanha-publica:${id}`;
export const publicCandidatesCacheTag = "candidatos-publicos";

export function getPublicCampaignView(id: string) {
  return unstable_cache(
    async () => {
      const campanha = await getCampanha(id);
      if (!campanha) return null;
      const candidato = campanha.candidato_id
        ? await getCandidato(campanha.candidato_id)
        : null;
      const background = parseCampaignBackground(campanha.imagem_fundo);
      const sideImage = parseCampaignBackground(campanha.imagem_lateral);

      return {
        assinaturasMeta: campanha.assinaturas_meta,
        candidato: candidato
          ? {
              cargo: candidato.cargo,
              estado: candidato.estado,
              municipio: candidato.municipio,
              nome: candidato.nome,
              partido: candidato.partido
            }
          : null,
        corDestaque: campanha.cor_destaque,
        descricao: campanha.descricao,
        destaquePrimario: campanha.destaque_primario,
        destaqueSecundario: campanha.destaque_secundario,
        id: campanha.id,
        imagemFundoVersao: background?.version ?? null,
        imagemLateralVersao: sideImage?.version ?? null,
        tema: campanha.tema === 2 ? 2 : 1,
        textoContexto: campanha.texto_contexto,
        textoDot: campanha.texto_dot,
        textoForm: campanha.texto_form,
        textoImpacto: campanha.texto_impacto,
        textoImpactoApoio: campanha.texto_impacto_apoio,
        textoProposta: campanha.texto_proposta,
        titulo: campanha.titulo
      };
    },
    ["campanha-publica", id],
    {
      revalidate: 300,
      tags: [campaignCacheTag(id), publicCandidatesCacheTag]
    }
  )();
}
