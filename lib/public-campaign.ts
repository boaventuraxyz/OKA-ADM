import "server-only";

import { unstable_cache } from "next/cache";
import { parseCampaignBackground } from "@/lib/campaign-background";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import { normalizeCampaignTheme } from "@/lib/campaign-themes";
import {
  getCampanha,
  getCandidato,
  getCandidatoByDomain,
  getCandidatoByPublicSlug,
  listPublicCampanhasByCandidate
} from "@/lib/supabase";
import type { Candidato } from "@/lib/types";

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
              dominioFormularios: candidato.dominio_formularios,
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
        ativa: campanha.ativa,
        inicioEm: campanha.inicio_em,
        fimEm: campanha.fim_em,
        imagemFundoVersao: background?.version ?? null,
        imagemLateralVersao: sideImage?.version ?? null,
        tema: normalizeCampaignTheme(campanha.tema),
        textoConclusao: campanha.texto_conclusao,
        textoContexto: campanha.texto_contexto,
        textoDot: campanha.texto_dot,
        textoForm: campanha.texto_form,
        textoImpacto: campanha.texto_impacto,
        textoImpactoApoio: campanha.texto_impacto_apoio,
        textoProposta: campanha.texto_proposta,
        titulo: campanha.titulo,
        textoFaixa: campanha.texto_faixa,
        tituloTopicos: campanha.titulo_topicos,
        textoTopicosIntro: campanha.texto_topicos_intro,
        textoTopicos: campanha.texto_topicos,
        tituloCitacao: campanha.titulo_citacao,
        textoCitacao: campanha.texto_citacao,
        notaCitacao: campanha.nota_citacao,
        tituloVideo: campanha.titulo_video,
        videoUrl: campanha.video_url,
        textoVideo: campanha.texto_video,
        legendaVideo: campanha.legenda_video,
        notaVideo: campanha.nota_video,
        tituloAssinar: campanha.titulo_assinar,
        textoAssinar: campanha.texto_assinar,
        textoCompartilhar: campanha.texto_compartilhar,
        slug: campanha.slug ?? null,
        metaTitle: campanha.meta_title ?? null,
        metaDescription: campanha.meta_description ?? null,
        ogTitle: campanha.og_title ?? null,
        ogDescription: campanha.og_description ?? null,
        ogImage: campanha.og_image ?? null,
        formConfig: campanha.form_config ?? null,
        settings: campanha.settings ?? null
      };
    },
    ["campanha-publica", id],
    {
      revalidate: 300,
      tags: [campaignCacheTag(id), publicCandidatesCacheTag]
    }
  )();
}

async function getPublicCandidateHub(candidato: Candidato | null) {
  if (!candidato) return null;

  const campanhas = (await listPublicCampanhasByCandidate(candidato.id)).filter(
    campaignAcceptsSignatures
  );
  return { campanhas, candidato };
}

export async function getPublicCandidateIndex(domain: string) {
  return getPublicCandidateHub(await getCandidatoByDomain(domain));
}

export async function getPublicCandidateIndexBySlug(slug: string) {
  return getPublicCandidateHub(await getCandidatoByPublicSlug(slug));
}
