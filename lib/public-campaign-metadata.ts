import "server-only";

import type { Metadata } from "next";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import { getPublicCampaignView } from "@/lib/public-campaign";
import { isUuid } from "@/lib/validation";

function plainDescription(value?: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export async function publicCampaignMetadata(idCampanha?: string): Promise<Metadata> {
  if (!idCampanha || !isUuid(idCampanha)) {
    return {
      description: "Abaixo-assinado e mobilização cidadã.",
      title: "Formulário indisponível"
    };
  }

  const campanha = await getPublicCampaignView(idCampanha);
  if (
    !campanha ||
    !campaignAcceptsSignatures({
      ativa: campanha.ativa,
      fim_em: campanha.fimEm,
      inicio_em: campanha.inicioEm
    })
  ) {
    return {
      description: "Abaixo-assinado e mobilização cidadã.",
      robots: { follow: false, index: false },
      title: "Campanha não encontrada"
    };
  }

  const title =
    campanha.metaTitle?.trim() || campanha.titulo?.trim() || "Abaixo-assinado";
  const description =
    plainDescription(campanha.metaDescription) ||
    plainDescription(campanha.descricao) ||
    plainDescription(campanha.textoAssinar) ||
    "Participe deste abaixo-assinado.";

  return {
    description,
    openGraph: {
      description: plainDescription(campanha.ogDescription) || description,
      title: campanha.ogTitle?.trim() || title,
      type: "website",
      ...(campanha.ogImage ? { images: [campanha.ogImage] } : {})
    },
    alternates: { canonical: `/formulario/${encodeURIComponent(campanha.id)}` },
    title
  };
}
