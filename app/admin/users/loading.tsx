import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

import styles from "./users.module.css";

export default function AdminUsersLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando usuários" className={styles.page}>
      <PageHeader
        description="Carregando perfis e permissões da plataforma."
        eyebrow="Administração"
        title="Usuários"
      />
      <Card className={styles.listPanel}>
        <CardHeader className={styles.listHeader}>
          <div className={styles.loadingCopy}>
            <Skeleton height={20} width={180} />
            <Skeleton height={14} width="min(420px, 100%)" />
          </div>
        </CardHeader>
        <CardContent className={styles.loadingList}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton height={118} key={index} radius={12} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
