const messages: Record<string, string> = {
  acesso:
    "O Supabase recusou a gravação. Confira a SUPABASE_SECRET_KEY configurada na Vercel.",
  dados:
    "O Supabase recusou os dados da campanha. Revise os valores e tente novamente.",
  imagem:
    "A foto de fundo e invalida ou ficou muito grande. Selecione outra imagem e tente novamente.",
  whatsapp:
    "Informe um link HTTPS valido do WhatsApp, como wa.me ou chat.whatsapp.com.",
  video:
    "Informe um link HTTPS valido para o video (arquivo .mp4).",
  estrutura:
    "A estrutura da tabela campanhas está desatualizada. Execute supabase/campaign-template.sql e supabase/campaign-theme3.sql no SQL Editor do Supabase e tente novamente."
};

export function CampaignSaveAlert({ error }: { error?: string }) {
  const message = error ? messages[error] : null;
  if (!message) return null;

  return (
    <div className="alert error" role="alert">
      {message}
    </div>
  );
}
