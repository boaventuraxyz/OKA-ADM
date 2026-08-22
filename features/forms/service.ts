import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import { paginationFor, positiveInteger } from "@/lib/pagination";
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
  const safePage = positiveInteger(page, 1);
  const safePageSize = positiveInteger(pageSize, 24, 50);
  const supabase = await createServerClient();

  function fetchPage(currentPage: number) {
    const from = (currentPage - 1) * safePageSize;
    return supabase
      .from("campanhas")
      .select("id, titulo, slug, status, form_config, updated_at", {
        count: "exact",
      })
      .order("updated_at", { ascending: false })
      .range(from, from + safePageSize - 1);
  }

  let result = await fetchPage(safePage);

  if (result.error) {
    throw new Error("Não foi possível carregar os formulários.", { cause: result.error });
  }

  let pagination = paginationFor(result.count ?? 0, safePage, safePageSize);
  if (pagination.page !== safePage) {
    result = await fetchPage(pagination.page);
    if (result.error) {
      throw new Error("Não foi possível carregar os formulários.", { cause: result.error });
    }
    pagination = paginationFor(
      result.count ?? 0,
      pagination.page,
      safePageSize,
    );
  }

  const items: CampaignFormSummary[] = (result.data ?? []).map((row) => ({
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
    ...pagination,
  };
}
