"use client";

import { useEffect } from "react";

export function LegacyScripts({ scripts }: { scripts: string[] }) {
  useEffect(() => {
    const mounted: HTMLScriptElement[] = [];

    scripts.forEach((source) => {
      const template = document.createElement("template");
      template.innerHTML = source.trim();
      const original = template.content.querySelector("script");
      if (!original) return;

      const script = document.createElement("script");
      Array.from(original.attributes).forEach((attribute) => {
        script.setAttribute(attribute.name, attribute.value);
      });
      script.text = original.textContent || "";
      document.body.appendChild(script);
      mounted.push(script);
    });

    return () => {
      mounted.forEach((script) => script.remove());
    };
  }, [scripts]);

  return null;
}
