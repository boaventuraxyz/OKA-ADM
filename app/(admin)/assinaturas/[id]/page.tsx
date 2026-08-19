import { permanentRedirect } from "next/navigation";

export default function LegacySignatureDetailsPage() {
  permanentRedirect("/admin/leads");
}
