"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
};

export function Checkbox({
  className,
  description,
  error,
  id,
  label,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id || `checkbox-${generatedId.replace(/:/g, "")}`;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className={cx(styles.foundation, styles.checkbox, className)} htmlFor={checkboxId}>
      <input
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={styles.checkboxInput}
        id={checkboxId}
        type="checkbox"
        {...props}
      />
      <span className={styles.checkboxCopy}>
        <span className={styles.checkboxLabel}>{label}</span>
        {description ? (
          <span className={styles.checkboxDescription} id={descriptionId}>{description}</span>
        ) : null}
      </span>
      {error ? (
        <span className={styles.checkboxError} id={errorId} role="alert">{error}</span>
      ) : null}
    </label>
  );
}
