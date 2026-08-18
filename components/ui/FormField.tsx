import type { ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export type FormFieldControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  id: string;
};

type FormFieldProps = {
  children: ReactNode | ((controlProps: FormFieldControlProps) => ReactNode);
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  id: string;
  label: ReactNode;
  required?: boolean;
};

export function FormField({
  children,
  className,
  description,
  error,
  id,
  label,
  required = false
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const controlProps: FormFieldControlProps = {
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    id
  };

  return (
    <div className={cx(styles.foundation, styles.formField, className)}>
      <label className={styles.formLabel} htmlFor={id}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className={styles.requiredMark}> *</span>
            <span className={styles.srOnly}> (obrigatório)</span>
          </>
        ) : null}
      </label>
      {typeof children === "function" ? children(controlProps) : children}
      {description ? (
        <p className={styles.formDescription} id={descriptionId}>{description}</p>
      ) : null}
      {error ? (
        <p className={styles.formError} id={errorId} role="alert">{error}</p>
      ) : null}
    </div>
  );
}
