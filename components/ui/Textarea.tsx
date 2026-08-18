import { forwardRef, type TextareaHTMLAttributes } from "react";
import styles from "./ui.module.css";
import { cx } from "./utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        className={cx(styles.foundation, styles.textarea, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
