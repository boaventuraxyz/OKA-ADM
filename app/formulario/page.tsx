import { LegacyScripts } from "@/components/LegacyScripts";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { getPublicCampaignView } from "@/lib/public-campaign";
import { countAssinaturasByCampanha } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function FormularioPage({
  searchParams
}: {
  searchParams: Promise<{ idCampanha?: string }>;
}) {
  const { idCampanha } = await searchParams;

  if (!idCampanha) {
    return (
      <main className="formulario-page-legacy">
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
    getPublicCampaignView(idCampanha),
    countAssinaturasByCampanha(idCampanha)
  ]);

  if (!campanha) {
    return (
      <main className="formulario-page-legacy">
        <div className="login-card">
          <h1>Campanha não encontrada</h1>
          <p>Confira o link e tente novamente.</p>
        </div>
      </main>
    );
  }

  const { css, imagePreloads, markup, scripts, stylesheets } = campanha.document;

  return (
    <>
      {imagePreloads.map(({ href, media }) => (
        <link as="image" href={href} key={href} media={media} rel="preload" />
      ))}
      {stylesheets.map((href) => (
        <link href={href} key={href} precedence="campaign" rel="stylesheet" />
      ))}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} precedence="campaign" /> : null}

      <main className="formulario-page-legacy">
        <div className="pagina-campanha">
          {markup ? (
            <div className="conteudo-campanha" dangerouslySetInnerHTML={{ __html: markup }} />
          ) : (
            <div className="conteudo-campanha">
              <div className="fallback-campanha">
                <strong>Sem conteúdo HTML</strong>
              </div>
            </div>
          )}

          <div className="formulario-lateral">
            <PublicSignatureForm
              campanhaId={campanha.id}
              candidatoId={campanha.candidatoId}
              meta={campanha.assinaturasMeta}
              textoBotao={campanha.textoBotao}
              totalAssinaturas={assinaturas}
            />
          </div>
        </div>

        <footer className="formulario-footer">
          <PoliticasRodape />
        </footer>

        <LegacyScripts scripts={scripts} />
      </main>
    </>
  );
}
