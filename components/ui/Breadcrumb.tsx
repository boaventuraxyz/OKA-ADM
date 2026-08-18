import Link from "next/link";
import type { HTMLAttributes } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumb({
  className,
  items,
  ...props
}: HTMLAttributes<HTMLElement> & { items: readonly BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Navegação estrutural"
      className={cx(styles.foundation, styles.breadcrumb, className)}
      {...props}
    >
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li className={styles.breadcrumbItem} key={`${item.href || "current"}-${item.label}`}>
              {item.href && !current ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={current ? "page" : undefined} className={styles.breadcrumbCurrent}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
