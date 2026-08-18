import { Skeleton } from "@/components/ui/Skeleton";

import styles from "./leads-admin.module.css";

export default function AdminLeadsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando leads"
      className={styles.loading}
      role="status"
    >
      <Skeleton height="7rem" />
      <Skeleton height="6rem" />
      <Skeleton height="24rem" />
      <span className={styles.srOnly}>Carregando leads…</span>
    </div>
  );
}
