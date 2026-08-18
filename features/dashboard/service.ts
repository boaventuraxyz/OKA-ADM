import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

import {
  getCampaignStatusCounts,
  getLeadMetrics,
  getRecentCampaignRows,
  getRecentLeadRows,
  type DashboardDatabaseClient,
} from "./repository";
import type { DashboardOverview } from "./types";

const DASHBOARD_LIST_LIMIT = 5;
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function zonedParts(date: Date, timeZone: string) {
  const entries = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)] as const);

  return Object.fromEntries(entries) as Record<string, number>;
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return wallClockAsUtc - date.getTime();
}

export function startOfTodayInSaoPaulo(now = new Date()) {
  const local = zonedParts(now, SAO_PAULO_TIME_ZONE);
  const targetWallClock = Date.UTC(local.year, local.month - 1, local.day);
  let result = new Date(targetWallClock);

  // A second pass also handles dates close to a daylight-saving transition.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    result = new Date(
      targetWallClock -
        timeZoneOffsetMilliseconds(result, SAO_PAULO_TIME_ZONE),
    );
  }

  return result;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const context = await requireActiveProfile();
  const client = (await createServerClient()) as unknown as DashboardDatabaseClient;
  const isManager =
    context.profile.role === "master" || context.profile.role === "admin";
  const now = new Date();
  const todayStart = startOfTodayInSaoPaulo(now).toISOString();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1_000,
  ).toISOString();

  if (!isManager) {
    const [campaignCounts, recentCampaigns] = await Promise.all([
      getCampaignStatusCounts(client),
      getRecentCampaignRows(client, DASHBOARD_LIST_LIMIT),
    ]);

    return {
      viewerRole: context.profile.role,
      campaignCounts,
      recentCampaigns,
      leads: {
        visible: false,
        metrics: null,
        recentLeads: [],
      },
    };
  }

  const [campaignCounts, recentCampaigns, metrics, recentLeads] =
    await Promise.all([
      getCampaignStatusCounts(client),
      getRecentCampaignRows(client, DASHBOARD_LIST_LIMIT),
      getLeadMetrics(client, todayStart, sevenDaysAgo),
      getRecentLeadRows(client, DASHBOARD_LIST_LIMIT),
    ]);

  return {
    viewerRole: context.profile.role,
    campaignCounts,
    recentCampaigns,
    leads: {
      visible: true,
      metrics,
      recentLeads,
    },
  };
}
