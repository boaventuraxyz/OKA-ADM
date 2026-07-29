import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCampanha, listAssinaturasByCampanha } from "@/lib/supabase";

function escapeCsv(value?: string | number | null) {
  const text = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const [campanha, assinaturas] = await Promise.all([
    getCampanha(id),
    listAssinaturasByCampanha(id)
  ]);

  if (!campanha) {
    return NextResponse.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  const rows = [
    "Nome;Numero;Email;Endereco;Numero End.;Complemento;Cidade;CEP;Estado;IP Origem;Data",
    ...assinaturas.map((a) =>
      [
        a.nome_assinante,
        a.numero_assinante,
        a.email_assinante,
        a.endereco_assinante,
        a.n_assinante,
        a.complemento_assinante,
        a.cidade_assinante,
        a.cep_assinante,
        a.estado_assinante,
        a.ip_origem,
        a.assinado_em
      ]
        .map(escapeCsv)
        .join(";")
    )
  ];

  const safeTitle = (campanha.titulo || "campanha").replace(/[\\/:*?"<>|]/g, "");
  const body = `\uFEFF${rows.join("\n")}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Resultado_${safeTitle}.csv"`
    }
  });
}
