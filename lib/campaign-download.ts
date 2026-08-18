import "server-only";

import {
  getCampanhaTitle,
  listAssinaturasExportByCampanha
} from "@/lib/supabase";

function downloadFilename(prefix: string, title: string | null, extension: string) {
  const safeTitle = (title || "campanha")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return `${prefix}_${safeTitle || "campanha"}.${extension}`;
}

function escapeCsv(value?: string | number | null) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text.trimStart())) {
    text = `'${text}`;
  }
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function getCampaignCsvDownload(id: string) {
  const [campanha, assinaturas] = await Promise.all([
    getCampanhaTitle(id),
    listAssinaturasExportByCampanha(id)
  ]);

  if (!campanha) return null;

  const rows = [
    "Nome;Numero;Email;Endereco;Numero End.;Complemento;Cidade;CEP;Estado;IP Origem;Data",
    ...assinaturas.map((assinatura) =>
      [
        assinatura.nome_assinante,
        assinatura.numero_assinante,
        assinatura.email_assinante,
        assinatura.endereco_assinante,
        assinatura.n_assinante,
        assinatura.complemento_assinante,
        assinatura.cidade_assinante,
        assinatura.cep_assinante,
        assinatura.estado_assinante,
        assinatura.ip_origem,
        assinatura.assinado_em
      ]
        .map(escapeCsv)
        .join(";")
    )
  ];

  return {
    body: `\uFEFF${rows.join("\n")}`,
    filename: downloadFilename("Resultado", campanha.titulo, "csv")
  };
}
