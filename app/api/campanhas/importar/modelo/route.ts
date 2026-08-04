import { isAuthenticated } from "@/lib/auth";
import { campaignImportModelCsv } from "@/lib/campaign-import";
import { listCampanhasForImport, listCandidatosForSelect } from "@/lib/supabase";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const [campaigns, candidates] = await Promise.all([
    listCampanhasForImport(),
    listCandidatosForSelect()
  ]);
  const body = campaignImportModelCsv(campaigns, candidates);

  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="modelo-campanhas.csv"',
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
