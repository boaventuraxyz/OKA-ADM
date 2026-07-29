"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const LOADING_CLASS = "route-loading";

export function NavigationProgress() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.remove(LOADING_CLASS);
  }, [pathname]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const nextUrl = new URL(link.href, window.location.href);
      if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) {
        return;
      }

      document.documentElement.classList.add(LOADING_CLASS);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        document.documentElement.classList.remove(LOADING_CLASS);
      }, 10000);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimeout(timeout);
    };
  }, []);

  return <div aria-hidden="true" className="route-progress" />;
}
