import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

export type CandidateOption = {
  id: string;
  nome: string;
  partido: string | null;
};

export async function listCandidateOptions(): Promise<CandidateOption[]> {
  await requireActiveProfile();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nome, partido")
    .order("nome", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error("Não foi possível carregar os candidatos.", { cause: error });
  }

  return (data ?? [])
    .filter((candidate): candidate is typeof candidate & { nome: string } =>
      Boolean(candidate.nome?.trim())
    )
    .map((candidate) => ({
      id: candidate.id,
      nome: candidate.nome,
      partido: candidate.partido,
    }));
}
