import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

import { THEME_REGISTRY } from "./registry";

export async function getThemeUsageCounts(): Promise<Record<string, number>> {
  await requireActiveProfile();
  const supabase = await createServerClient();
  const entries = await Promise.all(
    THEME_REGISTRY.map(async (theme) => {
      const { count, error } = await supabase
        .from("campanhas")
        .select("id", { count: "exact", head: true })
        .eq("theme_key", theme.key);

      if (error) {
        throw new Error("Não foi possível contar as campanhas por tema.", {
          cause: error,
        });
      }

      return [theme.key, count ?? 0] as const;
    })
  );

  return Object.fromEntries(entries);
}
