import type { HTMLAttributes } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const variantClass: Record<BadgeVariant, string> = {
  neutral: styles.badgeNeutral,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cx(styles.foundation, styles.badge, variantClass[variant], className)}
      {...props}
    />
  );
}
