import { permanentRedirect } from "next/navigation";

export default function LegacyCandidatesPage() {
  permanentRedirect("/admin/candidates");
}
