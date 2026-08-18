import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import uiStyles from "@/components/ui/ui.module.css";
import { ThemeLibraryGallery } from "@/features/themes/ThemeLibraryGallery";
import { THEME_REGISTRY } from "@/features/themes/registry";
import styles from "./theme-library.module.css";

export const metadata: Metadata = {
  description: "Compare os temas disponíveis para páginas públicas de campanha.",
  title: "Biblioteca de temas"
};

export default function ThemeLibraryPage() {
  const activeThemes = THEME_REGISTRY.filter((theme) => theme.status === "active").length;
  const categories = new Set(THEME_REGISTRY.map((theme) => theme.category)).size;

  return (
    <main className={`${uiStyles.foundation} ${styles.page}`}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: "OKA" }, { label: "Biblioteca de temas" }]} />
        <PageHeader
          actions={<Badge variant="success">Catálogo público</Badge>}
          className={styles.header}
          description="Veja uma aproximação real de cada página, compare a adaptação por dispositivo e escolha a direção visual mais adequada para a campanha."
          eyebrow="Design de campanhas"
          title="Biblioteca de temas"
        />

        <div aria-label="Resumo da biblioteca" className={styles.summary}>
          <div className={styles.summaryItem}>
            <strong>{THEME_REGISTRY.length}</strong>
            <span>temas com IDs legados preservados</span>
          </div>
          <div className={styles.summaryItem}>
            <strong>{activeThemes}</strong>
            <span>temas disponíveis para uso</span>
          </div>
          <div className={styles.summaryItem}>
            <strong>{categories}</strong>
            <span>direções visuais diferentes</span>
          </div>
        </div>

        <ThemeLibraryGallery />
      </div>
    </main>
  );
}
