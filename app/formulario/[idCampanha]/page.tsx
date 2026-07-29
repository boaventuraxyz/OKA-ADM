import { FormularioContent } from "@/app/formulario/page";

export const dynamic = "force-dynamic";

export default async function FormularioIdPage({
  params
}: {
  params: Promise<{ idCampanha: string }>;
}) {
  const { idCampanha } = await params;
  return <FormularioContent idCampanha={idCampanha} />;
}
