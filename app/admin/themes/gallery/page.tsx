import type { Metadata } from "next";

import { AdminThemeCarousel } from "@/features/themes/AdminThemeCarousel";
import { getThemeUsageCounts } from "@/features/themes/service";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Carrossel de temas" };
export const dynamic = "force-dynamic";

export default async function AdminThemeGalleryPage() {
  await requireAdmin();
  const usageCounts = await getThemeUsageCounts();
  return <AdminThemeCarousel usageCounts={usageCounts} />;
}
