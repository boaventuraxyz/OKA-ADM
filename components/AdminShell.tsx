"use client";

import {
  BarChart3,
  LogOut,
  Menu,
  Megaphone,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function navClass(pathname: string, href: string) {
  if (href === "/") return pathname === "/" ? "nav-item active" : "nav-item";
  return pathname.startsWith(href) ? "nav-item active" : "nav-item";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", open);
    return () => document.body.classList.remove("sidebar-open");
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">ADM</div>
          <div className="brand-sub">Painel administrativo</div>
        </div>

        <div className="nav-section">Geral</div>
        <Link className={navClass(pathname, "/")} href="/">
          <BarChart3 size={17} />
          Dashboard
        </Link>

        <div className="nav-section">Eleitoral</div>
        <Link className={navClass(pathname, "/campanhas")} href="/campanhas">
          <Megaphone size={17} />
          Campanhas
        </Link>
        <Link className={navClass(pathname, "/candidatos")} href="/candidatos">
          <UserRound size={17} />
          Candidatos
        </Link>

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
            onClick={() => setOpen((value) => !value)}
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
