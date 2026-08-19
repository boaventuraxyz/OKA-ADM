import { permanentRedirect } from "next/navigation";

export default function LegacyNewCandidatePage() {
  permanentRedirect("/admin/candidates/new");
}
