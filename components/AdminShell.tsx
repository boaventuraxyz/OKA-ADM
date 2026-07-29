"use client";

import {
  BarChart3,
  LogOut,
  Menu,
  Megaphone,
  UserRound,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import { PendingLink } from "@/components/PendingLink";

function navClass(pathname: string, href: string) {
  if (href === "/") return pathname === "/" ? "nav-item active" : "nav-item";
  return pathname.startsWith(href) ? "nav-item active" : "nav-item";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState({ pathname, open: false });
  const open = menu.pathname === pathname ? menu.open : false;

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", open);
    return () => document.body.classList.remove("sidebar-open");
  }, [open]);

  const title =
    pathname === "/"
      ? "Dashboard"
      : pathname.startsWith("/campanhas")
        ? "Campanhas"
        : pathname.startsWith("/candidatos")
          ? "Candidatos"
          : pathname.startsWith("/assinaturas")
            ? "Assinaturas"
            : "ADM";

  return (
    <div className="admin-shell">
      <NavigationProgress />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">ADM</div>
          <div className="brand-sub">Painel administrativo</div>
        </div>

        <div className="nav-section">Geral</div>
        <PendingLink className={navClass(pathname, "/")} href="/">
          <BarChart3 size={17} />
          Dashboard
        </PendingLink>

        <div className="nav-section">Eleitoral</div>
        <PendingLink className={navClass(pathname, "/campanhas")} href="/campanhas">
          <Megaphone size={17} />
          Campanhas
        </PendingLink>
        <PendingLink className={navClass(pathname, "/candidatos")} href="/candidatos">
          <UserRound size={17} />
          Candidatos
        </PendingLink>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">AD</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 760 }}>Administrador</div>
            </div>
            <form action="/api/logout" method="post">
              <button className="ghost-button" title="Sair" type="submit">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="main-wrapper">
        <div className="topbar">
          <button
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="button icon sidebar-toggle"
            onClick={() =>
              setMenu((value) => ({
                pathname,
                open: value.pathname === pathname ? !value.open : true
              }))
            }
            type="button"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="topbar-title">{title}</div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
