const messages: Record<string, string> = {
  acesso:
    "O Supabase recusou a gravacao. Confira a SUPABASE_SECRET_KEY configurada na Vercel.",
  dados: "O dominio informado ja esta em uso por outro candidato.",
  dominio: "Informe somente o dominio, como tieminevoeiro.com, sem caminho ou porta.",
  estrutura:
    "A tabela candidatos esta desatualizada. Execute supabase/candidate-domain.sql no SQL Editor do Supabase."
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
