"use client";

import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
> & {
  children: ReactNode;
  confirmMessage?: string;
  pendingLabel?: string;
};

export function PendingSubmitButton({
  children,
  confirmMessage,
  pendingLabel,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="spin" size={16} />
          {pendingLabel ? <span>{pendingLabel}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
