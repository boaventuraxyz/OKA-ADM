import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
};

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cx(styles.foundation, styles.emptyState, className)} {...props}>
      {icon ? <div aria-hidden="true" className={styles.emptyIcon}>{icon}</div> : null}
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyDescription}>{description}</p>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}
