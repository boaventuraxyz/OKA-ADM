"use client";

import {
  Check,
  Monitor,
  Palette,
  RotateCcw,
  Search,
  Smartphone,
  Tablet,
  Users,
  type LucideIcon
} from "lucide-react";
import { useId, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { ThemePreview, type PreviewDevice } from "./ThemePreview";
import {
  THEME_REGISTRY,
  type ThemeCapabilities,
  type ThemeStatus
} from "./registry";
import styles from "./AdminThemeLibrary.module.css";

type RegistryTheme = (typeof THEME_REGISTRY)[number];

export type AdminThemeLibraryProps = {
  usageCounts?: Record<string, number>;
};

type DeviceOption = {
  icon: LucideIcon;
  id: PreviewDevice;
  label: string;
};

const combiningMarks = /[\u0300-\u036f]/g;
const emptyUsageCounts: Record<string, number> = {};

const categoryOptions = Array.from(new Set(THEME_REGISTRY.map((theme) => theme.category)));
const statusOptions = Array.from(new Set(THEME_REGISTRY.map((theme) => theme.status)));

const devices = [
  { icon: Monitor, id: "desktop", label: "Desktop" },
  { icon: Tablet, id: "tablet", label: "Tablet" },
  { icon: Smartphone, id: "mobile", label: "Celular" }
] as const satisfies readonly DeviceOption[];

const statusPresentation: Record<ThemeStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Ativo", variant: "success" },
  beta: { label: "Beta", variant: "info" },
  deprecated: { label: "Descontinuado", variant: "warning" }
};

const capabilityLabels: Record<keyof ThemeCapabilities, string> = {
  backgroundImage: "Imagem de fundo",
  longform: "Conteúdo longo",
  sharing: "Compartilhamento",
  sideImage: "Imagem lateral",
  signatureModal: "Assinatura em modal",
  video: "Vídeo"
};

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(combiningMarks, "").toLocaleLowerCase("pt-BR").trim();
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function formatCampaignCount(count: number) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? "campanha" : "campanhas"}`;
}

function resolveUsageCount(usageCounts: Record<string, number>, theme: RegistryTheme) {
  const rawCount = usageCounts[theme.key] ?? usageCounts[String(theme.id)] ?? 0;
  return Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0;
}

function PaletteSwatches({ compact = false, theme }: { compact?: boolean; theme: RegistryTheme }) {
  return (
    <div
      aria-label={`Paleta do tema ${theme.name}`}
      className={`${styles.paletteSwatches} ${compact ? styles.paletteCompact : ""}`}
      role="group"
    >
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
  );
}

function ThemeCard({
  detailId,
  onSelect,
  selected,
  theme,
  usageCount
}: {
  detailId: string;
  onSelect: () => void;
  selected: boolean;
  theme: RegistryTheme;
  usageCount: number;
}) {
  const status = statusPresentation[theme.status];

  return (
    <article>
      <Card className={`${styles.themeCard} ${selected ? styles.themeCardSelected : ""}`}>
        <div aria-hidden="true" className={styles.cardPreview}>
          <ThemePreview device="desktop" theme={theme} />
        </div>
        <CardHeader className={styles.cardHeader}>
          <div className={styles.cardTitleBlock}>
            <span className={styles.themeId}>Tema {theme.id}</span>
            <h3>{theme.name}</h3>
            <code>{theme.key}</code>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardHeader>
        <CardContent className={styles.cardContent}>
          <p className={styles.description}>{theme.description}</p>
          <div className={styles.cardMeta}>
            <span className={styles.category}>{capitalize(theme.category)}</span>
            <span className={styles.usage}>
              <Users aria-hidden="true" size={15} />
              {formatCampaignCount(usageCount)}
            </span>
          </div>
          <div aria-label="Tags do tema" className={styles.tags}>
            {theme.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
          <div className={styles.cardPaletteRow}>
            <span>Paleta</span>
            <PaletteSwatches compact theme={theme} />
          </div>
          <Button
            aria-controls={detailId}
            aria-label={selected ? `${theme.name}: tema selecionado` : `Ver detalhes do tema ${theme.name}`}
            aria-pressed={selected}
            fullWidth
            onClick={onSelect}
            variant={selected ? "primary" : "secondary"}
          >
            {selected ? <Check aria-hidden="true" size={17} /> : <Palette aria-hidden="true" size={17} />}
            {selected ? "Tema selecionado" : "Ver detalhes"}
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}

function ThemeDetail({
  detailId,
  device,
  onDeviceChange,
  theme,
  usageCount
}: {
  detailId: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  theme: RegistryTheme;
  usageCount: number;
}) {
  const status = statusPresentation[theme.status];
  const supportedCapabilities = Object.entries(theme.capabilities)
    .filter(([, supported]) => supported)
    .map(([capability]) => capabilityLabels[capability as keyof ThemeCapabilities]);

  return (
    <aside aria-labelledby={`${detailId}-title`} className={styles.detail} id={detailId}>
      <Card className={styles.detailCard}>
        <CardHeader className={styles.detailHeader}>
          <div>
            <p className={styles.detailEyebrow}>Prévia selecionada · Tema {theme.id}</p>
            <h2 id={`${detailId}-title`}>{theme.name}</h2>
            <code>{theme.key}</code>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardHeader>

        <CardContent className={styles.previewContent}>
          <div aria-label="Dispositivo da prévia" className={styles.deviceControls} role="group">
            {devices.map((option) => {
              const DeviceIcon = option.icon;
              const selected = device === option.id;
              return (
                <Button
                  aria-pressed={selected}
                  key={option.id}
                  onClick={() => onDeviceChange(option.id)}
                  size="small"
                  variant={selected ? "primary" : "secondary"}
                >
                  <DeviceIcon aria-hidden="true" size={16} />
                  {option.label}
                </Button>
              );
            })}
          </div>
          <div className={styles.detailPreview}>
            <ThemePreview device={device} theme={theme} />
          </div>
        </CardContent>

        <CardContent className={styles.detailMetadata}>
          <p className={styles.description}>{theme.description}</p>
          <dl className={styles.definitionList}>
            <div>
              <dt>Categoria</dt>
              <dd>{capitalize(theme.category)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{status.label}</dd>
            </div>
            <div>
              <dt>Uso atual</dt>
              <dd>{formatCampaignCount(usageCount)}</dd>
            </div>
            <div>
              <dt>Identificador legado</dt>
              <dd>{theme.id}</dd>
            </div>
          </dl>

          <div className={styles.detailGroup}>
            <h3>Paleta</h3>
            <PaletteSwatches theme={theme} />
          </div>
          <div className={styles.detailGroup}>
            <h3>Tags</h3>
            <div className={styles.tags}>
              {theme.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          </div>
          <div className={styles.detailGroup}>
            <h3>Recursos disponíveis</h3>
            <ul className={styles.capabilityList}>
              {supportedCapabilities.map((capability) => (
                <li key={capability}>
                  <Check aria-hidden="true" size={14} />
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

export function AdminThemeLibrary({ usageCounts = emptyUsageCounts }: AdminThemeLibraryProps) {
  const generatedId = useId().replace(/:/g, "");
  const detailId = `${generatedId}-theme-detail`;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedKey, setSelectedKey] = useState<RegistryTheme["key"]>(THEME_REGISTRY[0].key);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const normalizedSearch = normalizeSearch(search);

  const filteredThemes = THEME_REGISTRY.filter((theme) => {
    const searchable = normalizeSearch([
      theme.id,
      theme.key,
      theme.name,
      theme.description,
      theme.category,
      ...theme.tags
    ].join(" "));

    return (
      (!normalizedSearch || searchable.includes(normalizedSearch)) &&
      (category === "all" || theme.category === category) &&
      (status === "all" || theme.status === status)
    );
  });

  const selectedTheme =
    filteredThemes.find((theme) => theme.key === selectedKey) || filteredThemes[0];

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setStatus("all");
  }

  function selectTheme(themeKey: RegistryTheme["key"]) {
    setSelectedKey(themeKey);

    if (window.matchMedia("(max-width: 1050px)").matches) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.requestAnimationFrame(() => {
        document.getElementById(detailId)?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start"
        });
      });
    }
  }

  return (
    <section aria-label="Biblioteca administrativa de temas" className={styles.library}>
      <PageHeader
        actions={<Badge variant="info">{THEME_REGISTRY.length} temas registrados</Badge>}
        description="Pesquise, compare a identidade visual e veja onde cada tema já está sendo usado."
        eyebrow="Aparência das campanhas"
        title="Biblioteca de temas"
      />

      <div aria-label="Filtros da biblioteca" className={styles.toolbar} role="search">
        <div className={`${styles.field} ${styles.searchField}`}>
          <label htmlFor={`${generatedId}-search`}>Buscar tema</label>
          <div className={styles.searchControl}>
            <Search aria-hidden="true" size={18} />
            <Input
              autoComplete="off"
              id={`${generatedId}-search`}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, key, tag ou descrição"
              type="search"
              value={search}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={`${generatedId}-category`}>Categoria</label>
          <Select
            id={`${generatedId}-category`}
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="all">Todas as categorias</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{capitalize(option)}</option>
            ))}
          </Select>
        </div>

        <div className={styles.field}>
          <label htmlFor={`${generatedId}-status`}>Status</label>
          <Select
            id={`${generatedId}-status`}
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="all">Todos os status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{statusPresentation[option].label}</option>
            ))}
          </Select>
        </div>

        <Button className={styles.clearButton} onClick={clearFilters} variant="ghost">
          <RotateCcw aria-hidden="true" size={17} />
          Limpar filtros
        </Button>
      </div>

      <div className={styles.resultSummary}>
        <p aria-live="polite">
          <strong>{filteredThemes.length}</strong>{" "}
          {filteredThemes.length === 1 ? "tema encontrado" : "temas encontrados"}
        </p>
        {selectedTheme ? (
          <p className={styles.srOnly} aria-live="polite">
            Tema selecionado: {selectedTheme.name}
          </p>
        ) : null}
      </div>

      {selectedTheme ? (
        <div className={styles.contentGrid}>
          <div className={styles.catalog}>
            <div className={styles.cardGrid}>
              {filteredThemes.map((theme) => (
                <ThemeCard
                  detailId={detailId}
                  key={theme.key}
                  onSelect={() => selectTheme(theme.key)}
                  selected={theme.key === selectedTheme.key}
                  theme={theme}
                  usageCount={resolveUsageCount(usageCounts, theme)}
                />
              ))}
            </div>
          </div>

          <ThemeDetail
            detailId={detailId}
            device={device}
            onDeviceChange={setDevice}
            theme={selectedTheme}
            usageCount={resolveUsageCount(usageCounts, selectedTheme)}
          />
        </div>
      ) : (
        <EmptyState
          action={
            <Button onClick={clearFilters} variant="secondary">
              <RotateCcw aria-hidden="true" size={17} />
              Limpar filtros
            </Button>
          }
          description="Ajuste a busca, a categoria ou o status para voltar a visualizar os temas cadastrados."
          icon={<Search size={22} />}
          title="Nenhum tema encontrado"
        />
      )}
    </section>
  );
}
