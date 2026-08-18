"use client";

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

import styles from "./users.module.css";

export default function AdminUsersError({ reset }: { reset: () => void }) {
  return (
    <div className={styles.page}>
      <PageHeader
        description="O acesso permanece protegido enquanto a consulta não pode ser concluída."
        eyebrow="Administração"
        title="Usuários"
      />
      <Card className={styles.listPanel}>
        <CardContent>
          <EmptyState
            action={
              <Button onClick={reset} variant="primary">
                Tentar novamente
              </Button>
            }
            description="Verifique sua sessão e tente carregar os perfis novamente."
            icon={<CircleAlert size={23} />}
            title="Não foi possível carregar os usuários"
          />
        </CardContent>
      </Card>
    </div>
  );
}
