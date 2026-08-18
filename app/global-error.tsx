"use client";

import styles from "./system-state.module.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className={styles.page}>
          <section className={styles.card}>
            <p className={styles.eyebrow}>Erro inesperado</p>
            <h1>O sistema precisa recarregar</h1>
            <p>Tente novamente. Se o problema continuar, retorne em alguns instantes.</p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={reset} type="button">
                Recarregar
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
