"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRef } from "react";

export function CampaignTheme4SignatureModal({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="campaign-theme4-button campaign-theme4-sign-button"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        Assinar agora
      </button>

      <dialog
        aria-labelledby="campaign-theme4-modal-title"
        className="campaign-theme4-modal"
        onClick={closeOnBackdrop}
        ref={dialogRef}
      >
        <div className="campaign-theme4-modal-panel">
          <div className="campaign-theme4-modal-header">
            <h2 id="campaign-theme4-modal-title">Assine o abaixo-assinado</h2>
            <button
              aria-label="Fechar formulário"
              className="campaign-theme4-modal-close"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="campaign-theme4-form">{children}</div>
        </div>
      </dialog>
    </>
  );
}
