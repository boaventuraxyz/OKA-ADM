import { describe, expect, it } from "vitest";

import { listLeadExportRows, listLeadRows, type LeadDatabaseClient } from "@/features/leads/repository";

function recordingClient() {
  const filters: Array<[string, unknown]> = [];
  const query = {
    eq(column: string, value: unknown) { filters.push([column, value]); return query; },
    gte() { return query; },
    lte() { return query; },
    or() { return query; },
    order() { return query; },
    range: async () => ({ data: [], error: null, count: 0 }),
    select() { return query; },
  };
  const client = { from: () => query } as unknown as LeadDatabaseClient;
  return { client, filters };
}

describe("isolamento de consultas de leads", () => {
  it("aplica campanha à listagem antes de paginar", async () => {
    const { client, filters } = recordingClient();
    await listLeadRows(client, { campaignId: "campaign-a", page: 1, pageSize: 20 });
    expect(filters).toContainEqual(["campanha_id", "campaign-a"]);
  });

  it("aplica a mesma campanha à exportação", async () => {
    const { client, filters } = recordingClient();
    await listLeadExportRows(client, { campaignId: "campaign-b" }, 0, 100);
    expect(filters).toContainEqual(["campanha_id", "campaign-b"]);
  });
});

