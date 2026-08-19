import { permanentRedirect } from "next/navigation";

export default function LegacyThemesPage() {
  permanentRedirect("/admin/themes");
}
