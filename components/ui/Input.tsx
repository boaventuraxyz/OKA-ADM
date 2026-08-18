import { forwardRef, type InputHTMLAttributes } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        className={cx(styles.foundation, styles.input, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
