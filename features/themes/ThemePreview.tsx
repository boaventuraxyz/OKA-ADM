"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CampaignThemeDefinition, ThemePalette } from "./registry";
import { CAMPAIGN_PREVIEW_MESSAGE, createThemePreviewCampaign, type ThemePreviewContent } from "./theme-preview-data";
import styles from "./ThemePreview.module.css";

export type PreviewDevice = "desktop" | "tablet" | "mobile";
export type { ThemePreviewContent } from "./theme-preview-data";

export function ThemePreview({
  accent,
  content = {},
  device = "desktop",
  palette,
  theme,
}: {
  accent?: string;
  content?: ThemePreviewContent;
  device?: PreviewDevice;
  palette?: ThemePalette;
  theme: CampaignThemeDefinition;
}) {
  const rawId = useId();
  const instanceId = useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, ""), [rawId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const selectedAccent = accent || palette?.accent || theme.palette.accent;
  const campaign = useMemo(
    () => createThemePreviewCampaign({ accent: selectedAccent, content, theme }),
    [content, selectedAccent, theme],
  );
  const deviceLabel = { desktop: "desktop", tablet: "tablet", mobile: "celular" }[device];

  const sendPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { instanceId, payload: campaign, type: CAMPAIGN_PREVIEW_MESSAGE },
      window.location.origin,
    );
  }, [campaign, instanceId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldRender) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = window.setTimeout(() => setShouldRender(true), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    sendPreview();
  }, [sendPreview, shouldRender]);

  useEffect(() => {
    function handleReady(event: MessageEvent<{ instanceId?: string; type?: string }>) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== `${CAMPAIGN_PREVIEW_MESSAGE}:ready`) return;
      if (event.data.instanceId !== instanceId) return;
      sendPreview();
    }

    window.addEventListener("message", handleReady);
    return () => window.removeEventListener("message", handleReady);
  }, [instanceId, sendPreview]);

  return (
    <div
      aria-label={`Prévia renderizada do tema ${theme.name} em ${deviceLabel}`}
      className={`${styles.preview} ${styles[device]}`}
      ref={containerRef}
      role="img"
    >
      <div className={styles.frame}>
        <div className={styles.viewport}>
          {shouldRender ? (
            <iframe
              aria-hidden="true"
              className={styles.render}
              loading="lazy"
              onLoad={sendPreview}
              ref={iframeRef}
              sandbox="allow-same-origin allow-scripts"
              src={`/theme-preview?theme=${theme.id}&instance=${encodeURIComponent(instanceId)}`}
              tabIndex={-1}
              title={`Render do tema ${theme.name}`}
            />
          ) : (
            <span aria-hidden="true" className={styles.placeholder} />
          )}
        </div>
      </div>
    </div>
  );
}
