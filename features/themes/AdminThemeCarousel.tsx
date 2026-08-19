"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

import { ThemePreview, type PreviewDevice } from "./ThemePreview";
import { THEME_REGISTRY, type ThemeCapabilities } from "./registry";
import styles from "./AdminThemeCarousel.module.css";

type RegistryTheme = (typeof THEME_REGISTRY)[number];

const devices = [
  { icon: Monitor, id: "desktop", label: "Desktop" },
  { icon: Tablet, id: "tablet", label: "Tablet" },
  { icon: Smartphone, id: "mobile", label: "Celular" },
] as const;

const capabilityLabels: Record<keyof ThemeCapabilities, string> = {
  backgroundImage: "Imagem de fundo",
  longform: "Conteúdo longo",
  sharing: "Compartilhamento",
  sideImage: "Imagem lateral",
  signatureModal: "Assinatura em modal",
  video: "Vídeo",
};

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function usageCount(usageCounts: Record<string, number>, theme: RegistryTheme) {
  const value = usageCounts[theme.key] ?? usageCounts[String(theme.id)] ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function AdminThemeCarousel({
  usageCounts,
}: {
  usageCounts: Record<string, number>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [paletteKeys, setPaletteKeys] = useState<Record<string, string>>({});
  const activeThumbnail = useRef<HTMLButtonElement>(null);
  const theme = THEME_REGISTRY[activeIndex];
  const palette =
    theme.paletteOptions.find((option) => option.key === paletteKeys[theme.key]) ??
    theme.paletteOptions[0];
  const capabilities = Object.entries(theme.capabilities)
    .filter(([, supported]) => supported)
    .map(([capability]) => capabilityLabels[capability as keyof ThemeCapabilities]);
  const count = usageCount(usageCounts, theme);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeThumbnail.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIndex]);

  function selectTheme(index: number) {
    setActiveIndex((index + THEME_REGISTRY.length) % THEME_REGISTRY.length);
  }

  function handleCarouselKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTheme(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTheme(activeIndex + 1);
    }
  }

  return (
    <section className={styles.page}>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/admin/themes">
            <ArrowLeft aria-hidden="true" size={17} /> Biblioteca em grade
          </Link>
        }
        description="Passe por todos os modelos, compare paletas e abra uma nova campanha com o tema já selecionado."
        eyebrow="Aparência das campanhas"
        title="Carrossel de temas"
      />

      <section
        aria-label="Carrossel de temas de campanha"
        aria-roledescription="carrossel"
        className={styles.carousel}
        onKeyDown={handleCarouselKeyDown}
        tabIndex={0}
      >
        <div className={styles.carouselTopbar}>
          <div aria-atomic="true" aria-live="polite" className={styles.position}>
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <i aria-hidden="true" />
            <span>{String(THEME_REGISTRY.length).padStart(2, "0")}</span>
          </div>

          <div aria-label="Dispositivo da prévia" className={styles.deviceControls} role="group">
            {devices.map((option) => {
              const DeviceIcon = option.icon;
              return (
                <Button
                  aria-pressed={device === option.id}
                  key={option.id}
                  onClick={() => setDevice(option.id)}
                  size="small"
                  variant={device === option.id ? "primary" : "secondary"}
                >
                  <DeviceIcon aria-hidden="true" size={16} />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className={styles.stage}>
          <button
            aria-label="Tema anterior"
            className={`${styles.arrow} ${styles.arrowPrevious}`}
            onClick={() => selectTheme(activeIndex - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={25} />
          </button>

          <div className={styles.previewColumn} key={`${theme.key}-${device}-${palette.key}`}>
            <div className={styles.previewFrame}>
              <ThemePreview device={device} palette={palette.palette} theme={theme} />
            </div>
          </div>

          <article className={styles.details}>
            <div className={styles.detailsHeading}>
              <div>
                <span className={styles.themeNumber}>Tema {theme.id}</span>
                <h2>{theme.name}</h2>
                <code>{theme.key}</code>
              </div>
              <Badge variant="success">Disponível</Badge>
            </div>

            <p className={styles.description}>{theme.description}</p>

            <div className={styles.summaryRow}>
              <span>{capitalize(theme.category)}</span>
              <span>
                <Users aria-hidden="true" size={15} />
                {count.toLocaleString("pt-BR")} {count === 1 ? "campanha" : "campanhas"}
              </span>
            </div>

            <div className={styles.detailGroup}>
              <span className={styles.groupLabel}>Escolha uma paleta</span>
              <div className={styles.paletteGrid}>
                {theme.paletteOptions.map((option) => {
                  const selected = option.key === palette.key;
                  return (
                    <button
                      aria-label={`${option.name}: ${option.description}`}
                      aria-pressed={selected}
                      className={`${styles.paletteOption} ${selected ? styles.paletteSelected : ""}`}
                      key={option.key}
                      onClick={() =>
                        setPaletteKeys((current) => ({
                          ...current,
                          [theme.key]: option.key,
                        }))
                      }
                      type="button"
                    >
                      <span className={styles.swatches} aria-hidden="true">
                        {Object.values(option.palette).map((color) => (
                          <i key={color} style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      <strong>{option.name}</strong>
                    </button>
                  );
                })}
              </div>
              <p className={styles.paletteDescription}>{palette.description}</p>
            </div>

            <div className={styles.detailGroup}>
              <span className={styles.groupLabel}>Recursos</span>
              <div className={styles.tags}>
                {capabilities.map((capability) => (
                  <Badge key={capability}>{capability}</Badge>
                ))}
              </div>
            </div>

            <Link
              className={styles.campaignLink}
              href={`/admin/campaigns/new?theme=${encodeURIComponent(theme.key)}`}
            >
              <Megaphone aria-hidden="true" size={18} /> Criar campanha com este tema
            </Link>
          </article>

          <button
            aria-label="Próximo tema"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => selectTheme(activeIndex + 1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={25} />
          </button>
        </div>

        <div aria-label="Selecionar tema" className={styles.thumbnailRail} role="group">
          {THEME_REGISTRY.map((option, index) => {
            const selected = index === activeIndex;
            return (
              <button
                aria-label={`Visualizar tema ${option.name}`}
                aria-pressed={selected}
                className={`${styles.thumbnail} ${selected ? styles.thumbnailSelected : ""}`}
                key={option.key}
                onClick={() => selectTheme(index)}
                ref={selected ? activeThumbnail : undefined}
                type="button"
              >
                <span aria-hidden="true" className={styles.thumbnailPreview}>
                  <ThemePreview device="desktop" theme={option} />
                </span>
                <span className={styles.thumbnailLabel}>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <strong>{option.name}</strong>
                </span>
              </button>
            );
          })}
        </div>

        <p className={styles.keyboardHint}>
          Dica: focalize o carrossel e use as setas do teclado para navegar.
        </p>
      </section>
    </section>
  );
}
