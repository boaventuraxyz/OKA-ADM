import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

type IconButtonVariant = "secondary" | "ghost" | "danger";

const variantClass: Record<IconButtonVariant, string | undefined> = {
  secondary: undefined,
  ghost: styles.iconButtonGhost,
  danger: styles.iconButtonDanger
};

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  "aria-label": string;
  children: ReactNode;
  variant?: IconButtonVariant;
};

export function IconButton({
  children,
  className,
  type = "button",
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cx(styles.foundation, styles.iconButton, variantClass[variant], className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
