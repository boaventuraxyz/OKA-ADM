import "server-only";

import { requireRole } from "@/features/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

import { LEAD_CSV_BOM, LEAD_CSV_HEADER, leadRowsToCsv } from "./csv";
import {
  LeadRepositoryError,
  listLeadExportRows,
  type LeadDatabaseClient,
} from "./repository";
import { leadExportQuerySchema } from "./service";
import type { LeadExportRow, LeadFilters } from "./types";

const LEAD_EXPORT_ROLES = ["master", "admin"] as const;

export const LEAD_EXPORT_BATCH_SIZE = 250;
export const LEAD_EXPORT_MAX_ROWS = 5_000;

type LeadExportAudit = {
  actorId: string;
  campaignId: string | null;
  from: string | null;
  hasSearch: boolean;
  rowLimit: number;
  to: string | null;
};

function logExport(
  event: "started" | "completed" | "cancelled" | "failed",
  audit: LeadExportAudit,
  details: { exportedRows?: number; limitReached?: boolean; code?: string } = {},
) {
  console.info(`[audit] lead_export_${event}`, { ...audit, ...details });
}

function exportFilename() {
  return `leads_${new Date().toISOString().slice(0, 10)}.csv`;
}

function createCsvStream(
  client: LeadDatabaseClient,
  filters: LeadFilters,
  firstBatch: LeadExportRow[],
  audit: LeadExportAudit,
) {
  const encoder = new TextEncoder();
  let pendingBatch: LeadExportRow[] | null = firstBatch;
  let offset = 0;
  let exportedRows = 0;
  let finished = false;

  function finish(
    controller: ReadableStreamDefaultController<Uint8Array>,
    limitReached: boolean,
  ) {
    if (finished) return;
    finished = true;
    logExport("completed", audit, { exportedRows, limitReached });
    controller.close();
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${LEAD_CSV_BOM}${LEAD_CSV_HEADER}\r\n`));
    },

    async pull(controller) {
      if (finished) return;

      try {
        const remaining = LEAD_EXPORT_MAX_ROWS - exportedRows;
        if (remaining <= 0) {
          finish(controller, true);
          return;
        }

        const requestSize = Math.min(LEAD_EXPORT_BATCH_SIZE, remaining);
        const rows =
          pendingBatch ??
          (await listLeadExportRows(client, filters, offset, requestSize));
        pendingBatch = null;

        if (rows.length === 0) {
          finish(controller, false);
          return;
        }

        controller.enqueue(encoder.encode(`${leadRowsToCsv(rows)}\r\n`));
        exportedRows += rows.length;
        offset += rows.length;

        if (rows.length < requestSize) {
          finish(controller, false);
        } else if (exportedRows >= LEAD_EXPORT_MAX_ROWS) {
          finish(controller, true);
        }
      } catch (error) {
        finished = true;
        logExport("failed", audit, {
          exportedRows,
          code:
            error instanceof LeadRepositoryError
              ? (error.databaseCode ?? "DATABASE_ERROR")
              : "INTERNAL_ERROR",
        });
        controller.error(new Error("Falha durante a exportação de leads."));
      }
    },

    cancel() {
      if (finished) return;
      finished = true;
      logExport("cancelled", audit, { exportedRows });
    },
  });
}

export async function createLeadCsvExport(input: unknown) {
  const context = await requireRole(LEAD_EXPORT_ROLES);
  const filters = leadExportQuerySchema.parse(input);
  const client = (await createServerClient()) as unknown as LeadDatabaseClient;
  const audit: LeadExportAudit = {
    actorId: context.user.id,
    campaignId: filters.campaignId ?? null,
    from: filters.from ?? null,
    hasSearch: Boolean(filters.search),
    rowLimit: LEAD_EXPORT_MAX_ROWS,
    to: filters.to ?? null,
  };

  logExport("started", audit);

  try {
    const firstBatch = await listLeadExportRows(
      client,
      filters,
      0,
      LEAD_EXPORT_BATCH_SIZE,
    );

    return {
      filename: exportFilename(),
      rowLimit: LEAD_EXPORT_MAX_ROWS,
      stream: createCsvStream(client, filters, firstBatch, audit),
    };
  } catch (error) {
    logExport("failed", audit, {
      exportedRows: 0,
      code:
        error instanceof LeadRepositoryError
          ? (error.databaseCode ?? "DATABASE_ERROR")
          : "INTERNAL_ERROR",
    });
    throw error;
  }
}
