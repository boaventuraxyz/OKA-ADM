"use client";

import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Palette,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import styles from "./PlatformAdminShell.module.css";

export type PlatformAdminProfile = {
  displayName: string;
  email: string;
  role: string;
};

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  roles?: readonly string[];
};

const contentNavigation = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/campaigns", icon: Megaphone, label: "Campanhas" },
  { href: "/admin/candidates", icon: UserRound, label: "Candidatos" },
  { href: "/admin/themes", icon: Palette, label: "Temas" },
  { href: "/admin/forms", icon: ClipboardList, label: "Formulários" },
  {
    href: "/admin/leads",
    icon: FileText,
    label: "Leads",
    roles: ["master", "admin"]
  }
] as const satisfies readonly NavigationItem[];

const managementNavigation = [
  {
    href: "/admin/users",
    icon: Users,
    label: "Usuários",
    roles: ["master"]
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Configurações",
    roles: ["master", "admin"]
  }
] as const satisfies readonly NavigationItem[];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navigationForRole(
  items: readonly NavigationItem[],
  role: string
) {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

function NavigationGroup({
  items,
  label,
  onNavigate,
  pathname
}: {
  items: readonly NavigationItem[];
  label: string;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <div className={styles.navGroup}>
      <p className={styles.navLabel}>{label}</p>
      <ul className={styles.navList}>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const ItemIcon = item.icon;

          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                href={item.href}
                onClick={onNavigate}
              >
                <ItemIcon aria-hidden="true" size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavigationPanel({
  closeControl,
  initials,
  onNavigate,
  pathname,
  profile,
  titleId
}: {
  closeControl?: ReactNode;
  initials: string;
  onNavigate?: () => void;
  pathname: string;
  profile: PlatformAdminProfile;
  titleId?: string;
}) {
  const visibleContentNavigation = navigationForRole(
    contentNavigation,
    profile.role
  );
  const visibleManagementNavigation = navigationForRole(
    managementNavigation,
    profile.role
  );

  return (
    <div className={styles.sidebarInner}>
      <div className={styles.brandRow}>
        <Link className={styles.brand} href="/admin" onClick={onNavigate}>
          <span aria-hidden="true" className={styles.brandMark}>O</span>
          <span className={styles.brandCopy}>
            <strong>OKA</strong>
            <span id={titleId}>Administração</span>
          </span>
        </Link>
        {closeControl}
      </div>

      <nav aria-label="Navegação administrativa" className={styles.navigation}>
        <NavigationGroup
          items={visibleContentNavigation}
          label="Conteúdo"
          onNavigate={onNavigate}
          pathname={pathname}
        />
        {visibleManagementNavigation.length > 0 ? (
          <NavigationGroup
            items={visibleManagementNavigation}
            label="Administração"
            onNavigate={onNavigate}
            pathname={pathname}
          />
        ) : null}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.sidebarProfile}>
          <span aria-hidden="true" className={styles.sidebarAvatar}>{initials}</span>
          <span className={styles.sidebarIdentity}>
            <strong>{profile.displayName}</strong>
            <span>{profile.email}</span>
            <small>{profile.role}</small>
          </span>
          <form action="/api/logout" method="post">
            <IconButton aria-label="Sair da conta" title="Sair" type="submit" variant="ghost">
              <LogOut aria-hidden="true" size={18} />
            </IconButton>
          </form>
        </div>
      </div>
    </div>
  );
}

export function PlatformAdminNavigation({
  initials,
  profile
}: {
  initials: string;
  profile: PlatformAdminProfile;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);

  function openDrawer() {
    drawerRef.current?.showModal();
  }

  function closeDrawer() {
    drawerRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDrawer();
  }

  return (
    <>
      <IconButton
        aria-controls="platform-admin-mobile-drawer"
        aria-haspopup="dialog"
        aria-label="Abrir navegação"
        className={styles.mobileMenuButton}
        onClick={openDrawer}
        variant="secondary"
      >
        <Menu aria-hidden="true" size={20} />
      </IconButton>

      <aside className={styles.sidebar}>
        <NavigationPanel initials={initials} pathname={pathname} profile={profile} />
      </aside>

      <dialog
        aria-labelledby="platform-admin-drawer-title"
        className={styles.drawer}
        id="platform-admin-mobile-drawer"
        onClick={closeOnBackdrop}
        ref={drawerRef}
      >
        <div className={styles.drawerPanel}>
          <NavigationPanel
            closeControl={
              <IconButton aria-label="Fechar navegação" onClick={closeDrawer} variant="ghost">
                <X aria-hidden="true" size={20} />
              </IconButton>
            }
            initials={initials}
            onNavigate={closeDrawer}
            pathname={pathname}
            profile={profile}
            titleId="platform-admin-drawer-title"
          />
        </div>
      </dialog>
    </>
  );
}
