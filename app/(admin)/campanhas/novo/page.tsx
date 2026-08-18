import { redirect } from "next/navigation";

export default function LegacyNewCampaignPage() {
  redirect("/admin/campaigns/new");
}
