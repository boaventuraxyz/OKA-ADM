"use client";

import { LoaderCircle } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

type PendingLinkProps = ComponentProps<typeof Link> & {
  pendingLabel?: string;
};

function PendingLinkContent({
  children,
  pendingLabel
}: {
  children: ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useLinkStatus();

  if (!pending) return children;

  return (
    <>
      <LoaderCircle aria-hidden="true" className="spin" size={16} />
      {pendingLabel ? <span>{pendingLabel}</span> : null}
    </>
  );
}

export function PendingLink({
  children,
  pendingLabel,
  ...props
}: PendingLinkProps) {
  return (
    <Link {...props}>
      <PendingLinkContent pendingLabel={pendingLabel}>{children}</PendingLinkContent>
    </Link>
  );
}
