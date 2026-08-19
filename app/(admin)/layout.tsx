import type { ReactNode } from "react";

/**
 * Grupo mantido apenas para redirecionar as rotas antigas em português para o
 * painel atual em /admin. Nenhuma tela é renderizada aqui.
 */
export const dynamic = "force-dynamic";

export default function LegacyRoutesLayout({ children }: { children: ReactNode }) {
  return children;
}
