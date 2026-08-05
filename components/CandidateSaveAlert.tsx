const messages: Record<string, string> = {
  acesso:
    "O Supabase recusou a gravacao. Confira a SUPABASE_SECRET_KEY configurada na Vercel.",
  dados: "O dominio ou identificador do hub ja esta em uso por outro candidato.",
  dominio: "Informe somente o dominio, como tieminevoeiro.com, sem caminho ou porta.",
  slug: "Use apenas letras, numeros e hifens no identificador do hub publico.",
  estrutura:
    "A tabela candidatos esta desatualizada. Execute supabase/candidate-domain.sql e supabase/candidate-hubs.sql no SQL Editor do Supabase."
};

export function CandidateSaveAlert({ error }: { error?: string }) {
  const message = error ? messages[error] : null;
  if (!message) return null;

  return (
    <div className="alert error" role="alert">
      {message}
    </div>
  );
}
