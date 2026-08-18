import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export function Card({
  children,
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; interactive?: boolean }) {
  return (
    <div
      className={cx(styles.foundation, styles.card, interactive && styles.cardInteractive, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.cardHeader, className)} {...props}>{children}</div>;
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.cardContent, className)} {...props}>{children}</div>;
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.cardFooter, className)} {...props}>{children}</div>;
}
