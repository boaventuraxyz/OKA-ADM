"use client";

import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";
import styles from "./ui.module.css";

type AlertDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: Extract<ButtonVariant, "primary" | "danger">;
  description: ReactNode;
  onConfirm: () => Promise<void> | void;
  title: ReactNode;
  trigger: ReactNode;
  triggerVariant?: ButtonVariant;
};

export function AlertDialog({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  confirmVariant = "danger",
  description,
  onConfirm,
  title,
  trigger,
  triggerVariant = "secondary"
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const generatedId = useId().replace(/:/g, "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function open() {
    setError("");
    dialogRef.current?.showModal();
  }

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (!pending && event.target === event.currentTarget) close();
  }

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onConfirm();
      dialogRef.current?.close();
    } catch {
      setError("Não foi possível concluir a ação. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={open} variant={triggerVariant}>{trigger}</Button>
      <dialog
        aria-describedby={`${generatedId}-description`}
        aria-labelledby={`${generatedId}-title`}
        className={`${styles.foundation} ${styles.dialog}`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={closeOnBackdrop}
        onClose={() => setError("")}
        ref={dialogRef}
        role="alertdialog"
      >
        <div className={styles.dialogHeader}>
          <div>
            <h2 className={styles.dialogTitle} id={`${generatedId}-title`}>{title}</h2>
            <p className={styles.dialogDescription} id={`${generatedId}-description`}>
              {description}
            </p>
          </div>
          <button
            aria-label="Fechar confirmação"
            className={styles.dialogClose}
            disabled={pending}
            onClick={close}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {error ? (
          <div className={styles.dialogBody}>
            <p className={styles.dialogError} role="alert">{error}</p>
          </div>
        ) : null}
        <div className={styles.dialogActions}>
          <Button disabled={pending} onClick={close} variant="secondary">
            {cancelLabel}
          </Button>
          <Button loading={pending} onClick={() => void confirm()} variant={confirmVariant}>
            {pending ? "Processando…" : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
