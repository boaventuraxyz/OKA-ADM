import { LegacyScripts } from "@/components/LegacyScripts";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { decodeCampaignHtml, splitScripts } from "@/lib/format";
import { getCampanha, listAssinaturasByCampanha } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function FormularioPage({
  searchParams
}: {
  searchParams: Promise<{ idCampanha?: string }>;
}) {
  const { idCampanha } = await searchParams;

  if (!idCampanha) {
    return (
      <main className="public-form-page">
        <div className="login-card">
          <h1>Formulário indisponível</h1>
          <p>O parâmetro idCampanha é obrigatório.</p>
        </div>
      </main>
    );
  }

  return <FormularioContent idCampanha={idCampanha} />;
}

export async function FormularioContent({ idCampanha }: { idCampanha: string }) {
  const [campanha, assinaturas] = await Promise.all([
    getCampanha(idCampanha),
    listAssinaturasByCampanha(idCampanha)
  ]);

  if (!campanha) {
    return (
      <main className="public-form-page">
        <div className="login-card">
          <h1>Campanha não encontrada</h1>
          <p>Confira o link e tente novamente.</p>
        </div>
      </main>
    );
  }

  const { markup, scripts } = splitScripts(decodeCampaignHtml(campanha.html));

  return (
    <main className="public-form-page">
      <div className="petition-shell">
        <div className="petition-bg" dangerouslySetInnerHTML={{ __html: markup }} />
        <div className="petition-form-wrap">
          <PublicSignatureForm
            campanhaId={campanha.id}
            candidatoId={campanha.candidato_id}
            descricao={campanha.descricao}
            meta={campanha.assinaturas_meta}
            textoBotao={campanha.texto_form}
            titulo={campanha.titulo}
            totalAssinaturas={assinaturas.length}
          />
        </div>
      </div>
      <LegacyScripts scripts={scripts} />
    </main>
  );
}
