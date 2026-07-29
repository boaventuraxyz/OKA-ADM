import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { getCampanha, listAssinaturasByCampanha } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AssinaturasPage({
  searchParams
}: {
  searchParams: Promise<{ campanhaId?: string }>;
}) {
  const { campanhaId } = await searchParams;

  if (!campanhaId) {
    return (
      <div className="panel panel-padding">
        <h1>Assinaturas</h1>
        <p className="page-toolbar-subtitle">Abra as assinaturas a partir de uma campanha.</p>
        <Link className="button" href="/campanhas">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>
    );
  }

  const [campanha, assinaturas] = await Promise.all([
    getCampanha(campanhaId),
    listAssinaturasByCampanha(campanhaId)
  ]);

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Assinaturas</h1>
          <p className="page-toolbar-subtitle">{campanha?.titulo || campanhaId}</p>
        </div>
        <Link className="button" href="/campanhas">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <div className="panel">
        {assinaturas.length === 0 ? (
          <div className="empty-state">Nenhuma assinatura encontrada.</div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Cidade</th>
                  <th>Data</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assinaturas.map((assinatura) => (
                  <tr key={assinatura.id}>
                    <td>{assinatura.nome_assinante || "-"}</td>
                    <td>{assinatura.numero_assinante || "-"}</td>
                    <td>{assinatura.email_assinante || "-"}</td>
                    <td>
                      {[assinatura.cidade_assinante, assinatura.estado_assinante]
                        .filter(Boolean)
                        .join(" / ") || "-"}
                    </td>
                    <td>{formatDateTime(assinatura.assinado_em)}</td>
                    <td className="table-actions">
                      <Link className="button" href={`/assinaturas/${assinatura.id}`}>
                        <Eye size={15} />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
