"use client";

import type { MouseEvent, ReactNode } from "react";
import { createContext, useContext, useRef } from "react";

/**
 * Um único diálogo por página, aberto por vários gatilhos. Renderizar um modal
 * por botão duplicaria o formulário no DOM e faria a pessoa perder o que já
 * havia digitado ao abrir por outro botão.
 */
const CaptureContext = createContext<(() => void) | null>(null);

function openDialog(dialog: HTMLDialogElement | null) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

export function CampaignCaptureProvider({
  children,
  form,
  title,
}: {
  children: ReactNode;
  form: ReactNode;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog(event.currentTarget);
  }

  return (
    <CaptureContext.Provider value={() => openDialog(dialogRef.current)}>
      {children}

      <dialog
        aria-modal="true"
        aria-labelledby="campaign-capture-modal-title"
        className="campaign-capture-modal"
        onClick={closeOnBackdrop}
        ref={dialogRef}
      >
        <div className="campaign-capture-panel">
          <div className="campaign-capture-header">
            <h2 id="campaign-capture-modal-title">{title}</h2>
            <button
              aria-label="Fechar formulário"
              className="campaign-capture-close"
              onClick={() => closeDialog(dialogRef.current)}
              type="button"
            >
              ×
            </button>
          </div>
          {form}
        </div>
      </dialog>
    </CaptureContext.Provider>
  );
}

export function CampaignCaptureTrigger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const open = useContext(CaptureContext);

  return (
    <button
      aria-haspopup="dialog"
      className={`campaign-capture-trigger ${className}`}
      disabled={!open}
      onClick={() => open?.()}
      type="button"
    >
      {children}
    </button>
  );
}
