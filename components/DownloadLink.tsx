"use client";

import { LoaderCircle } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useRef, useState } from "react";

type DownloadPayload = {
  blob: Blob;
  filename: string;
};

type DownloadLinkProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  fallbackFilename: string;
  href: string;
  title: string;
};

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") || "";
  const utf8Filename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8Filename) return decodeURIComponent(utf8Filename);

  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export function DownloadLink({
  ariaLabel,
  children,
  className,
  fallbackFilename,
  href,
  title
}: DownloadLinkProps) {
  const [pending, setPending] = useState(false);
  const preparedDownload = useRef<Promise<DownloadPayload> | null>(null);

  function prepareDownload() {
    if (preparedDownload.current) return preparedDownload.current;

    const request = fetch(href, {
      credentials: "same-origin",
      priority: "high"
    })
      .then(async (response) => {
        if (!response.ok || response.redirected) {
          throw new Error(`Download indisponivel: HTTP ${response.status}`);
        }

        return {
          blob: await response.blob(),
          filename: responseFilename(response, fallbackFilename)
        };
      })
      .catch((error) => {
        if (preparedDownload.current === request) {
          preparedDownload.current = null;
        }
        throw error;
      });

    preparedDownload.current = request;
    return request;
  }

  function preload() {
    void prepareDownload().catch(() => undefined);
  }

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (pending) return;
    setPending(true);

    try {
      const payload = await prepareDownload();
      const objectUrl = URL.createObjectURL(payload.blob);
      const anchor = document.createElement("a");
      anchor.download = payload.filename;
      anchor.href = objectUrl;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.location.assign(href);
    } finally {
      setPending(false);
    }
  }

  return (
    <a
      aria-busy={pending}
      aria-label={ariaLabel}
      className={className}
      download={fallbackFilename}
      href={href}
      onClick={handleClick}
      onFocus={preload}
      onPointerEnter={preload}
      title={pending ? "Preparando download..." : title}
    >
      {pending ? <LoaderCircle className="spin" size={15} /> : children}
    </a>
  );
}
