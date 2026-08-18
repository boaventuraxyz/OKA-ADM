import "server-only";

import { z } from "zod";

import { requireRole } from "@/features/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

import {
  listLeadCampaignOptionRows,
  listLeadRows,
  type LeadDatabaseClient,
} from "./repository";
import type { LeadCampaignOptionPage, LeadPage } from "./types";

const LEAD_ROLES = ["master", "admin"] as const;

/**
 * Keeps PostgREST's raw `.or()` grammar out of user control while preserving
 * the useful characters found in names, email addresses, and phone numbers.
 */
export function sanitizeLeadSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}@+._\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateBoundary(value: string, endOfDay: boolean) {
  const trimmed = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const probe = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
    if (
      probe.getUTCFullYear() !== Number(year) ||
      probe.getUTCMonth() + 1 !== Number(month) ||
      probe.getUTCDate() !== Number(day)
    ) {
      return null;
    }

    // Brazil has used UTC-03:00 year-round since 2019. Date inputs in the
    // admin represent São Paulo calendar days, not UTC calendar days.
    return new Date(
      `${year}-${month}-${day}T${
        endOfDay ? "23:59:59.999" : "00:00:00.000"
      }-03:00`,
    ).toISOString();
  }

  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function dateFilterSchema(endOfDay: boolean) {
  return z
    .string()
    .trim()
    .max(40)
    .transform((value, context) => {
      const parsed = parseDateBoundary(value, endOfDay);
      if (!parsed) {
        context.addIssue({ code: "custom", message: "Data inválida." });
        return z.NEVER;
      }
      return parsed;
    });
}

const leadFilterShape = {
  search: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform(sanitizeLeadSearch)
    .refine((value) => value.length > 0, { message: "Busca inválida." })
    .optional(),
  campaignId: z.string().uuid().optional(),
  from: dateFilterSchema(false).optional(),
  to: dateFilterSchema(true).optional(),
};

function validDateRange(value: { from?: string; to?: string }) {
  return !value.from || !value.to || value.from <= value.to;
}

export const leadListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    ...leadFilterShape,
  })
  .strict()
  .refine(validDateRange, {
    path: ["to"],
    message: "A data final deve ser posterior à inicial.",
  });

export const leadExportQuerySchema = z
  .object(leadFilterShape)
  .strict()
  .refine(validDateRange, {
    path: ["to"],
    message: "A data final deve ser posterior à inicial.",
  });

const leadCampaignOptionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strict();

export async function listLeads(input: unknown = {}): Promise<LeadPage> {
  await requireRole(LEAD_ROLES);
  const parsed = leadListQuerySchema.parse(input);
  const client = (await createServerClient()) as unknown as LeadDatabaseClient;
  const result = await listLeadRows(client, parsed);

  return {
    ...result,
    page: parsed.page,
    pageSize: parsed.pageSize,
    pageCount: Math.ceil(result.total / parsed.pageSize),
  };
}

export async function listLeadCampaignOptions(
  input: unknown = {},
): Promise<LeadCampaignOptionPage> {
  await requireRole(LEAD_ROLES);
  const parsed = leadCampaignOptionsQuerySchema.parse(input);
  const client = (await createServerClient()) as unknown as LeadDatabaseClient;
  const result = await listLeadCampaignOptionRows(
    client,
    parsed.page,
    parsed.pageSize,
  );

  return {
    ...result,
    page: parsed.page,
    pageSize: parsed.pageSize,
    pageCount: Math.ceil(result.total / parsed.pageSize),
  };
}
