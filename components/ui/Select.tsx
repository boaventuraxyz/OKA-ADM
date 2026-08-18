import { forwardRef, type SelectHTMLAttributes } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        className={cx(styles.foundation, styles.select, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
