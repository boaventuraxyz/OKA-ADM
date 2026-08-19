import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PlatformAdminShell } from "@/components/admin/PlatformAdminShell";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s | OKA" },
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await requireAdmin();
  const email = context.profile.email || context.user.email || "";

  return (
    <PlatformAdminShell
      profile={{
        displayName: context.profile.displayName || email || "Administrador",
        email,
        role: context.profile.role,
      }}
    >
      {children}
    </PlatformAdminShell>
  );
}
