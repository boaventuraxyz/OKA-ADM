"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ThemePreview, type PreviewDevice } from "./ThemePreview";
import { THEME_REGISTRY } from "./registry";
import styles from "./ThemeLibraryGallery.module.css";

const devices = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Celular", icon: Smartphone }
] as const;

const capabilityLabels = {
  backgroundImage: "Imagem de fundo",
  sideImage: "Imagem lateral",
  video: "Vídeo",
  longform: "Conteúdo longo",
  signatureModal: "Assinatura em modal",
  sharing: "Compartilhamento"
} as const;

export function ThemeLibraryGallery() {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  return (
    <section aria-labelledby="theme-gallery-title" className={styles.gallery}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <strong id="theme-gallery-title">Visualização responsiva</strong>
          <span>Troque o dispositivo para comparar todos os temas.</span>
        </div>
        <div aria-label="Dispositivo da prévia" className={styles.deviceControls} role="group">
          {devices.map((option) => {
            const DeviceIcon = option.icon;
            const selected = device === option.id;
            return (
              <Button
                aria-pressed={selected}
                key={option.id}
                onClick={() => setDevice(option.id)}
                variant={selected ? "primary" : "secondary"}
              >
                <DeviceIcon aria-hidden="true" size={17} />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className={styles.grid}>
        {THEME_REGISTRY.map((theme) => {
          const capabilities = Object.entries(theme.capabilities)
            .filter(([, supported]) => supported)
            .map(([capability]) => capabilityLabels[capability as keyof typeof capabilityLabels]);

          return (
            <article className={styles.themeArticle} key={theme.key}>
              <Card className={styles.themeCard}>
                <ThemePreview device={device} theme={theme} />
                <CardHeader>
                  <div className={styles.themeHeader}>
                    <div>
                      <p className={styles.themeId}>Tema legado {theme.id}</p>
                      <h2 className={styles.themeTitle}>{theme.name}</h2>
                      <code className={styles.themeKey}>{theme.key}</code>
                    </div>
                  </div>
                  <Badge variant="success">Disponível</Badge>
                </CardHeader>
                <CardContent>
                  <p className={styles.description}>{theme.description}</p>
                  <div className={styles.meta}>
                    <div className={styles.metaGroup}>
                      <span className={styles.metaLabel}>Categoria e recursos</span>
                      <div className={styles.tagList}>
                        <Badge variant="info">{theme.category}</Badge>
                        {capabilities.map((capability) => (
                          <Badge key={capability}>{capability}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className={styles.metaGroup}>
                      <span className={styles.metaLabel}>Tags</span>
                      <div className={styles.tagList}>
                        {theme.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                      </div>
                    </div>
                    <div className={styles.metaGroup}>
                      <span className={styles.metaLabel}>Paleta</span>
                      <div aria-label={`Paleta do tema ${theme.name}`} className={styles.palette}>
                        {Object.entries(theme.palette).map(([name, color]) => (
                          <span
                            aria-label={`${name}: ${color}`}
                            className={styles.swatch}
                            key={name}
                            role="img"
                            style={{ backgroundColor: color }}
                            title={`${name}: ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </article>
          );
        })}
      </div>
    </section>
  );
}
