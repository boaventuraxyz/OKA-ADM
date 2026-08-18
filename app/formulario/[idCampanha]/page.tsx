import type { Metadata } from "next";
import { FormularioContent } from "@/app/formulario/page";
import { publicCampaignMetadata } from "@/lib/public-campaign-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ idCampanha: string }>;
}): Promise<Metadata> {
  const { idCampanha } = await params;
  return publicCampaignMetadata(idCampanha);
}

export default async function FormularioIdPage({
  params
}: {
  params: Promise<{ idCampanha: string }>;
}) {
  const { idCampanha } = await params;
  return <FormularioContent idCampanha={idCampanha} />;
}
