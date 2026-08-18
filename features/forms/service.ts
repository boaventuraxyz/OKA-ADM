import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import type { Json } from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";

export type CampaignFormSummary = {
  fieldCount: number;
  formConfig: Json;
  id: string;
  slug: string | null;
  status: "draft" | "published" | "archived";
  title: string;
  updatedAt: string;
};

function configuredFieldCount(config: Json) {
  if (!config || Array.isArray(config) || typeof config !== "object") return 0;
  const fields = (config as { fields?: unknown }).fields;
  return Array.isArray(fields) ? fields.length : 0;
}

export async function listCampaignForms(page = 1, pageSize = 24) {
  await requireActiveProfile();
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(50, Math.max(1, Math.trunc(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const supabase = await createServerClient();
  const { data, error, count } = await supabase
    .from("campanhas")
    .select("id, titulo, slug, status, form_config, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, from + safePageSize - 1);

  if (error) {
    throw new Error("Não foi possível carregar os formulários.", { cause: error });
  }

  const items: CampaignFormSummary[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.titulo,
    slug: row.slug,
    status: row.status,
    formConfig: row.form_config,
    fieldCount: configuredFieldCount(row.form_config),
    updatedAt: row.updated_at,
  }));

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
    pageCount: Math.ceil((count ?? 0) / safePageSize),
  };
}
