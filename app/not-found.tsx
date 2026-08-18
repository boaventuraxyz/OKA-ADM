import Link from "next/link";
import styles from "./system-state.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>
          O endereço pode ter mudado ou não existe. Volte ao início para continuar
          navegando com segurança.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/">
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
