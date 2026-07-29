"use client";

import { useEffect } from "react";

export function FormAutoHeight() {
  useEffect(() => {
    function ajustarAlturaFundo() {
      const pagina = document.querySelector<HTMLElement>(".pagina-campanha");
      const fundo = document.querySelector<HTMLElement>(".conteudo-campanha");
      const formLateral = document.querySelector<HTMLElement>(".formulario-lateral");
      const formCard = formLateral?.querySelector<HTMLElement>(".form-card");

      if (!pagina || !fundo || !formLateral) return;

      if (window.innerWidth <= 900) {
        pagina.style.minHeight = "";
        fundo.style.minHeight = "";
        return;
      }

      const alturaCard = formCard ? formCard.offsetHeight : formLateral.offsetHeight;
      const topo = formLateral.offsetTop;
      const alturaFinal = Math.max(window.innerHeight, topo + alturaCard + 80);

      pagina.style.minHeight = `${alturaFinal}px`;
      fundo.style.minHeight = `${alturaFinal}px`;
    }

    ajustarAlturaFundo();
    window.addEventListener("load", ajustarAlturaFundo);
    window.addEventListener("resize", ajustarAlturaFundo);

    const alvo = document.querySelector(".formulario-lateral");
    const resizeObserver =
      alvo && "ResizeObserver" in window ? new ResizeObserver(ajustarAlturaFundo) : null;

    if (alvo && resizeObserver) {
      resizeObserver.observe(alvo);
    }

    return () => {
      window.removeEventListener("load", ajustarAlturaFundo);
      window.removeEventListener("resize", ajustarAlturaFundo);
      resizeObserver?.disconnect();
    };
  }, []);

  return null;
}
