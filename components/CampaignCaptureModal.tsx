"use client";

import type { MouseEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";

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
  autoOpen = false,
  autoOpenDelayMs = 0,
  children,
  form,
  title,
}: {
  autoOpen?: boolean;
  autoOpenDelayMs?: number;
  children: ReactNode;
  form: ReactNode;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    if (!autoOpen) return;

    const timeout = window.setTimeout(() => {
      if (!hasInteractedRef.current) openDialog(dialogRef.current);
    }, Math.max(0, autoOpenDelayMs));

    return () => window.clearTimeout(timeout);
  }, [autoOpen, autoOpenDelayMs]);

  const openFromTrigger = useCallback(() => {
    // Se a pessoa abriu por conta própria, o temporizador não deve reabrir o
    // formulário depois que ela já o dispensou.
    hasInteractedRef.current = true;
    openDialog(dialogRef.current);
  }, []);

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog(event.currentTarget);
  }

  return (
    <CaptureContext.Provider value={openFromTrigger}>
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
            <h2 className="campaign-capture-title" id="campaign-capture-modal-title">
              {title}
            </h2>
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
