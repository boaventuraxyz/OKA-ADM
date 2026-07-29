import { NextResponse } from "next/server";
import { createAssinatura } from "@/lib/supabase";

function text(formData: FormData, ...names: string[]) {
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function nullableText(formData: FormData, ...names: string[]) {
  const value = text(formData, ...names);
  return value || null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const campanhaId = text(formData, "campanha_id", "CampanhaId");

  if (!campanhaId) {
    return NextResponse.json({ sucesso: false, erro: "campanha_id obrigatorio" }, { status: 400 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");

  await createAssinatura({
    campanha_id: campanhaId,
    nome_assinante: nullableText(formData, "nome_assinante", "NomeAssinante"),
    numero_assinante: nullableText(formData, "numero_assinante", "NumeroAssinante"),
    email_assinante: nullableText(formData, "email_assinante", "EmailAssinante"),
    endereco_assinante: nullableText(formData, "endereco_assinante", "EnderecoAssinante"),
    n_assinante: Number(text(formData, "n_assinante", "NAssinante")) || null,
    complemento_assinante: nullableText(formData, "complemento_assinante", "ComplementoAssinante"),
    cidade_assinante: nullableText(formData, "cidade_assinante", "CidadeAssinante"),
    cep_assinante: nullableText(formData, "cep_assinante", "CepAssinante"),
    estado_assinante: nullableText(formData, "estado_assinante", "EstadoAssinante"),
    ip_origem: forwardedFor || realIp || null,
    assinado_em: new Date().toISOString()
  });

  return NextResponse.json({ sucesso: true });
}
