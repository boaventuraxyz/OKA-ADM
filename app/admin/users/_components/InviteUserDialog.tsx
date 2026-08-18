"use client";

import { UserPlus, X } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { inviteManagedUserAction } from "@/features/users/actions";

import styles from "../users.module.css";
import type { UsersChangedHandler } from "./ui-types";

type FieldErrors = Record<string, string[]>;

export function InviteUserDialog({
  onChanged,
}: {
  onChanged: UsersChangedHandler;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId().replace(/:/g, "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  function openDialog() {
    setFieldErrors({});
    setFormError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!pending) dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (!pending && event.target === event.currentTarget) closeDialog();
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      setFieldErrors({});
      setFormError("");
      const result = await inviteManagedUserAction(new FormData(form));

      if (!result.ok) {
        setFieldErrors(result.error.fieldErrors ?? {});
        setFormError(result.error.message);
        return;
      }

      form.reset();
      dialogRef.current?.close();
      onChanged({
        kind: "success",
        message: "Convite enviado e perfil de acesso configurado.",
      });
    });
  }

  return (
    <>
      <Button onClick={openDialog} variant="primary">
        <UserPlus aria-hidden="true" size={18} />
        Convidar usuário
      </Button>

      <dialog
        aria-describedby={`${baseId}-description`}
        aria-labelledby={`${baseId}-title`}
        className={styles.dialog}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={closeOnBackdrop}
        onClose={() => {
          setFieldErrors({});
          setFormError("");
          formRef.current?.reset();
        }}
        ref={dialogRef}
      >
        <div className={styles.dialogHeader}>
          <div>
            <h2 className={styles.dialogTitle} id={`${baseId}-title`}>
              Convidar usuário
            </h2>
            <p className={styles.dialogDescription} id={`${baseId}-description`}>
              A pessoa receberá um link seguro para definir a própria senha.
            </p>
          </div>
          <IconButton
            aria-label="Fechar convite"
            disabled={pending}
            onClick={closeDialog}
            variant="ghost"
          >
            <X aria-hidden="true" size={20} />
          </IconButton>
        </div>

        <form onSubmit={submitInvite} ref={formRef}>
          <div className={styles.dialogBody}>
            {formError ? (
              <p className={styles.formAlert} role="alert">
                {formError}
              </p>
            ) : null}

            <div className={styles.formGrid}>
              <FormField
                error={fieldError("displayName")}
                id={`${baseId}-name`}
                label="Nome"
                required
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    autoComplete="name"
                    autoFocus
                    disabled={pending}
                    maxLength={160}
                    minLength={2}
                    name="displayName"
                    placeholder="Nome completo"
                    required
                  />
                )}
              </FormField>

              <FormField
                error={fieldError("email")}
                id={`${baseId}-email`}
                label="E-mail"
                required
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    autoComplete="email"
                    disabled={pending}
                    inputMode="email"
                    maxLength={320}
                    name="email"
                    placeholder="nome@exemplo.com"
                    required
                    type="email"
                  />
                )}
              </FormField>

              <FormField
                description="Master gerencia usuários; admin gerencia conteúdo; editor trabalha em rascunhos."
                error={fieldError("role")}
                id={`${baseId}-role`}
                label="Papel"
                required
              >
                {(controlProps) => (
                  <Select
                    {...controlProps}
                    defaultValue="editor"
                    disabled={pending}
                    name="role"
                    required
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                    <option value="master">Master</option>
                  </Select>
                )}
              </FormField>

              <Checkbox
                description="Se desmarcado, a pessoa poderá definir a senha, mas não acessar o painel."
                disabled={pending}
                error={fieldError("isActive")}
                id={`${baseId}-active`}
                label="Ativar acesso após o convite"
                name="isActive"
              />
            </div>
          </div>

          <div className={styles.dialogActions}>
            <Button disabled={pending} onClick={closeDialog} variant="secondary">
              Cancelar
            </Button>
            <Button loading={pending} type="submit" variant="primary">
              {pending ? "Enviando…" : "Enviar convite"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
