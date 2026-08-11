"use client";

import { useState } from "react";

export function CampaignShareButtons({ shareText }: { shareText: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  function fullText() {
    return `${shareText} ${window.location.href}`;
  }

  return (
    <div className="campaign-theme3-share">
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault();
          window.open(
            `https://wa.me/?text=${encodeURIComponent(fullText())}`,
            "_blank",
            "noopener"
          );
        }}
        rel="noopener"
        target="_blank"
      >
        Enviar no WhatsApp
      </a>
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault();
          navigator.clipboard
            .writeText(fullText())
            .then(() => setCopied("ok"))
            .catch(() => setCopied("fail"));
        }}
      >
        {copied === "ok"
          ? "Texto copiado ✔"
          : copied === "fail"
            ? "Copie o link da página"
            : "Copiar texto para divulgar"}
      </a>
    </div>
  );
}
