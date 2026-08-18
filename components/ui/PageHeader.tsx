import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cx(styles.foundation, styles.pageHeader, className)} {...props}>
      <div className={styles.pageHeaderCopy}>
        {eyebrow ? <p className={styles.pageEyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description ? <p className={styles.pageDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}
