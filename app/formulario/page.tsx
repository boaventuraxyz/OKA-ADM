import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CampaignPublicRenderer } from "@/components/CampaignPublicRenderer";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import {
  candidateDomainMatches,
  isPlatformHostname,
  normalizeRequestHostname
} from "@/lib/candidate-domain";
import { getPublicCampaignView } from "@/lib/public-campaign";
import { publicCampaignMetadata } from "@/lib/public-campaign-metadata";
import { countAssinaturasByCampanha } from "@/lib/supabase";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ idCampanha?: string }>;
}): Promise<Metadata> {
  const { idCampanha } = await searchParams;
  return publicCampaignMetadata(idCampanha);
}

function CampaignUnavailable({ description, title }: { description: string; title: string }) {
  return (
    <main className="campaign-public-page">
      <section className="campaign-unavailable">
        <span>Abaixo-assinado</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </main>
  );
}

export default async function FormularioPage({
  searchParams
}: {
  searchParams: Promise<{ idCampanha?: string }>;
}) {
  const { idCampanha } = await searchParams;

  if (!idCampanha) {
    notFound();
  }

  return <FormularioContent idCampanha={idCampanha} />;
}

export async function FormularioContent({ idCampanha }: { idCampanha: string }) {
  if (!isUuid(idCampanha)) {
    notFound();
  }

  const [campanha, assinaturas, requestHeaders] = await Promise.all([
    getPublicCampaignView(idCampanha),
    countAssinaturasByCampanha(idCampanha),
    headers()
  ]);

  if (!campanha) {
    notFound();
  }

  if (!campanha.ativa) notFound();

  if (
    !campaignAcceptsSignatures({
      ativa: campanha.ativa,
      fim_em: campanha.fimEm,
      inicio_em: campanha.inicioEm
    })
  ) {
    return (
      <CampaignUnavailable
        description="Este abaixo-assinado não está recebendo assinaturas no momento."
        title="Campanha indisponível"
      />
    );
  }

  const requestHostname = normalizeRequestHostname(
    requestHeaders.get("host") || requestHeaders.get("x-forwarded-host")
  );
  if (
    !isPlatformHostname(requestHostname) &&
    !candidateDomainMatches(
      requestHostname,
      campanha.candidato?.dominioFormularios
    )
  ) {
    notFound();
  }

  return <CampaignPublicRenderer campanha={campanha} totalAssinaturas={assinaturas} />;
}
