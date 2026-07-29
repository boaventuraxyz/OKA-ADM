"use client";

import { useEffect } from "react";

export function CampaignInteractions() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest(
        ".conteudo-campanha [data-scroll-to-form]"
      );
      if (!trigger) return;

      event.preventDefault();
      document.querySelector(".form-card")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
