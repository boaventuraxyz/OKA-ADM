import { Suspense, type ReactNode } from "react";
import {
  PlatformAdminNavigation,
  type PlatformAdminProfile
} from "./PlatformAdminNavigation";
import styles from "./PlatformAdminShell.module.css";

export type { PlatformAdminProfile } from "./PlatformAdminNavigation";

export type PlatformAdminShellProps = {
  breadcrumbs?: ReactNode;
  children: ReactNode;
  headerActions?: ReactNode;
  /** Contexto curto da área; o título da página vem do PageHeader de cada tela. */
  workspaceLabel?: string;
  profile: PlatformAdminProfile;
};

function getInitials(displayName: string, email: string) {
  const source = displayName.trim() || email.trim();
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "AD";
}

export function PlatformAdminShell({
  breadcrumbs,
  children,
  headerActions,
  workspaceLabel = "Painel administrativo",
  profile
}: PlatformAdminShellProps) {
  const initials = getInitials(profile.displayName, profile.email);

  return (
    <div className={`${styles.shell} platform-admin-shell`}>
      <a className={styles.skipLink} href="#platform-admin-main">
        Ir para o conteúdo principal
      </a>

      <Suspense
        fallback={<aside aria-hidden="true" className={`${styles.sidebar} ${styles.sidebarFallback}`} />}
      >
        <PlatformAdminNavigation initials={initials} profile={profile} />
      </Suspense>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span aria-hidden="true" className={styles.mobileHeaderSpacer} />
          <span className={styles.headerContext}>{workspaceLabel}</span>

          <div className={styles.headerEnd}>
            {headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}
            <div className={styles.headerProfile}>
              <span aria-hidden="true" className={styles.headerAvatar}>{initials}</span>
              <span className={styles.headerIdentity}>
                <strong>{profile.displayName}</strong>
                <span>{profile.email}</span>
              </span>
              <span className={styles.rolePill}>{profile.role}</span>
            </div>
          </div>
        </header>

        <div className={styles.viewport}>
          {breadcrumbs ? <div className={styles.breadcrumbSlot}>{breadcrumbs}</div> : null}
          <main className={styles.main} id="platform-admin-main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
