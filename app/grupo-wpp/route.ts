import { readGrupoWppView } from "@/lib/static-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const html = await readGrupoWppView("Index.cshtml");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
