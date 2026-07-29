import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteAssinaturaAction } from "@/app/actions";
import { formatDateTime } from "@/lib/format";
import { getAssinatura } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AssinaturaDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assinatura = await getAssinatura(id);
  if (!assinatura) notFound();

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Detalhe da assinatura</h1>
          <p className="page-toolbar-subtitle">{assinatura.nome_assinante}</p>
        </div>
        <Link className="button" href={`/assinaturas?campanhaId=${assinatura.campanha_id}`}>
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <div className="panel panel-padding detail-stack">
        <div className="detail-item">
          <span>Nome</span>
          <strong>{assinatura.nome_assinante || "-"}</strong>
        </div>
        <div className="detail-item">
          <span>Telefone</span>
          <strong>{assinatura.numero_assinante || "-"}</strong>
        </div>
        <div className="detail-item">
          <span>Email</span>
          <strong>{assinatura.email_assinante || "-"}</strong>
        </div>
        <div className="detail-item">
          <span>Endereço</span>
          <strong>
            {assinatura.endereco_assinante || "-"}
            {assinatura.n_assinante ? `, ${assinatura.n_assinante}` : ""}
            {assinatura.complemento_assinante
              ? ` - ${assinatura.complemento_assinante}`
              : ""}
          </strong>
        </div>
        <div className="detail-item">
          <span>Cidade/Estado</span>
          <strong>
            {[assinatura.cidade_assinante, assinatura.estado_assinante]
              .filter(Boolean)
              .join(" / ") || "-"}
          </strong>
        </div>
        <div className="detail-item">
          <span>CEP</span>
          <strong>{assinatura.cep_assinante || "-"}</strong>
        </div>
        <div className="detail-item">
          <span>IP de origem</span>
          <strong>{assinatura.ip_origem || "-"}</strong>
        </div>
        <div className="detail-item">
          <span>Assinado em</span>
          <strong>{formatDateTime(assinatura.assinado_em)}</strong>
        </div>
        <form action={deleteAssinaturaAction}>
          <input name="id" type="hidden" value={assinatura.id} />
          <input name="campanha_id" type="hidden" value={assinatura.campanha_id} />
          <button className="button danger" type="submit">
            <Trash2 size={16} />
            Excluir assinatura
          </button>
        </form>
      </div>
    </>
  );
}
