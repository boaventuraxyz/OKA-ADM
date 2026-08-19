"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Mensagens que o Supabase devolve no fragmento quando o link não vale mais. */
function messageForLinkError(code: string, description: string) {
  if (code === "otp_expired" || /expired/i.test(description)) return "expirado";
  if (code === "access_denied") return "usado";
  return "invalido";
}

export function AuthLinkBridge() {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    // O fragmento carrega os tokens; some da barra antes de qualquer navegação.
    window.history.replaceState(null, "", window.location.pathname);

    const linkError = fragment.get("error") || fragment.get("error_code");
    if (linkError) {
      router.replace(
        `/login?auth_error=${messageForLinkError(
          fragment.get("error_code") || "",
          fragment.get("error_description") || "",
        )}`,
      );
      return;
    }

    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    if (!accessToken || !refreshToken) {
      router.replace("/login?auth_error=invalido");
      return;
    }

    fetch("/api/auth/session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        refreshToken,
        type: fragment.get("type") || "invite",
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | { success: true; data: { next: string } }
          | { success: false };
        if (!response.ok || !payload.success) throw new Error("session");
        window.location.replace(payload.data.next);
      })
      .catch(() => {
        setFailed(true);
        router.replace("/login?auth_error=invalido");
      });
  }, [router]);

  return (
    <p aria-live="polite" role="status">
      {failed ? "Não foi possível concluir o acesso." : "Validando seu link de acesso…"}
    </p>
  );
}
