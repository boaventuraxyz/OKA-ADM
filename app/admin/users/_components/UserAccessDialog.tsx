"use client";

import { PencilLine, X } from "lucide-react";
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
import type { AppRole } from "@/features/auth/types";
import { updateManagedUserAction } from "@/features/users/actions";

import styles from "../users.module.css";
import type { UsersChangedHandler } from "./ui-types";

type EditableUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
  role: AppRole;
};

type FieldErrors = Record<string, string[]>;

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  master: "Master",
};

export function UserAccessDialog({
  onChanged,
  user,
}: {
  onChanged: UsersChangedHandler;
  user: EditableUser;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const baseId = useId().replace(/:/g, "");
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [role, setRole] = useState<AppRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [step, setStep] = useState<"confirm" | "edit">("edit");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();

  const normalizedName = displayName.trim();
  const hasChanges =
    normalizedName !== (user.displayName ?? "") ||
    role !== user.role ||
    isActive !== user.isActive;

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  function resetEditor() {
    setDisplayName(user.displayName ?? "");
    setRole(user.role);
    setIsActive(user.isActive);
    setStep("edit");
    setFieldErrors({});
    setFormError("");
  }

  function openDialog() {
    resetEditor();
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!pending) dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (!pending && event.target === event.currentTarget) closeDialog();
  }

  function focusDialogTitle() {
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function reviewChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;
    setFieldErrors({});
    setFormError("");
    setStep("confirm");
    focusDialogTitle();
  }

  function saveChange() {
    startTransition(async () => {
      setFieldErrors({});
      setFormError("");
      const result = await updateManagedUserAction({
        id: user.id,
        displayName: normalizedName,
        role,
        isActive,
      });

      if (!result.ok) {
        setFieldErrors(result.error.fieldErrors ?? {});
        setFormError(result.error.message);
        if (result.error.fieldErrors) {
          setStep("edit");
          focusDialogTitle();
        }
        return;
      }

      dialogRef.current?.close();
      onChanged({
        kind: "success",
        message: "Perfil de acesso atualizado.",
      });
    });
  }

  return (
    <>
      <Button onClick={openDialog} variant="secondary">
        <PencilLine aria-hidden="true" size={17} />
        Editar acesso
      </Button>

      <dialog
        aria-describedby={`${baseId}-description`}
        aria-labelledby={`${baseId}-title`}
        className={styles.dialog}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={closeOnBackdrop}
        onClose={resetEditor}
        ref={dialogRef}
      >
        <div className={styles.dialogHeader}>
          <div>
            <h2
              className={styles.dialogTitle}
              id={`${baseId}-title`}
              ref={titleRef}
              tabIndex={-1}
            >
              {step === "edit" ? "Editar acesso" : "Confirmar alteração"}
            </h2>
            <p className={styles.dialogDescription} id={`${baseId}-description`}>
              {user.email ?? "Usuário sem e-mail informado"}
            </p>
          </div>
          <IconButton
            aria-label="Fechar edição de acesso"
            disabled={pending}
            onClick={closeDialog}
            variant="ghost"
          >
            <X aria-hidden="true" size={20} />
          </IconButton>
        </div>

        {step === "edit" ? (
          <form onSubmit={reviewChange}>
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
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                      value={displayName}
                    />
                  )}
                </FormField>

                <FormField
                  error={fieldError("role")}
                  id={`${baseId}-role`}
                  label="Papel"
                  required
                >
                  {(controlProps) => (
                    <Select
                      {...controlProps}
                      disabled={pending}
                      name="role"
                      onChange={(event) => setRole(event.target.value as AppRole)}
                      required
                      value={role}
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Administrador</option>
                      <option value="master">Master</option>
                    </Select>
                  )}
                </FormField>

                <Checkbox
                  checked={isActive}
                  description="Desativar encerra o acesso nas próximas verificações de autorização."
                  disabled={pending}
                  error={fieldError("isActive")}
                  id={`${baseId}-active`}
                  label="Perfil ativo"
                  name="isActive"
                  onChange={(event) => setIsActive(event.target.checked)}
                />
              </div>
            </div>

            <div className={styles.dialogActions}>
              <Button disabled={pending} onClick={closeDialog} variant="secondary">
                Cancelar
              </Button>
              <Button disabled={!hasChanges} type="submit" variant="primary">
                Revisar alteração
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className={styles.dialogBody}>
              {formError ? (
                <p className={styles.formAlert} role="alert">
                  {formError}
                </p>
              ) : null}
              <p className={styles.confirmationLead}>
                Confirme os dados abaixo. A alteração de acesso terá efeito imediato.
              </p>
              <dl className={styles.confirmationList}>
                <div>
                  <dt>Nome</dt>
                  <dd>{normalizedName}</dd>
                </div>
                <div>
                  <dt>Papel</dt>
                  <dd>{ROLE_LABELS[role]}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{isActive ? "Ativo" : "Inativo"}</dd>
                </div>
              </dl>
            </div>

            <div className={styles.dialogActions}>
              <Button
                disabled={pending}
                onClick={() => {
                  setStep("edit");
                  focusDialogTitle();
                }}
                variant="secondary"
              >
                Voltar
              </Button>
              <Button loading={pending} onClick={saveChange} variant="primary">
                {pending ? "Salvando…" : "Confirmar alteração"}
              </Button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
