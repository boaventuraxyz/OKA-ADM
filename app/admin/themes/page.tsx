import type { Metadata } from "next";

import { AdminThemeLibrary } from "@/features/themes/AdminThemeLibrary";
import { getThemeUsageCounts } from "@/features/themes/service";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Temas" };
export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  await requireAdmin();
  const usageCounts = await getThemeUsageCounts();
  return <AdminThemeLibrary usageCounts={usageCounts} />;
}
