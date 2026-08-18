"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./system-state.module.css";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Falha inesperada na interface", error.digest || error.name);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Algo deu errado</p>
        <h1>Não foi possível carregar esta página</h1>
        <p>
          Nenhuma alteração adicional foi feita. Tente novamente ou volte ao início.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={reset} type="button">
            Tentar novamente
          </button>
          <Link className={styles.secondary} href="/">
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
