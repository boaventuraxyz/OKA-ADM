import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "medium" | "large";

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger
};

const sizeClass: Record<ButtonSize, string | undefined> = {
  small: styles.buttonSmall,
  medium: undefined,
  large: styles.buttonLarge
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  loading = false,
  size = "medium",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={loading || undefined}
      className={cx(
        styles.foundation,
        styles.button,
        variantClass[variant],
        sizeClass[size],
        fullWidth && styles.buttonFull,
        className
      )}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? <span aria-hidden="true" className={styles.buttonSpinner} /> : null}
      {children}
    </button>
  );
}
