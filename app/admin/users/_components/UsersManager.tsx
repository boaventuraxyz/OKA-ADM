"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AlertDialog } from "@/components/ui/AlertDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AppRole } from "@/features/auth/types";
import { resendManagedUserAccessAction } from "@/features/users/actions";
import type { ManagedUser, ManagedUserPage } from "@/features/users/types";

import styles from "../users.module.css";
import { InviteUserDialog } from "./InviteUserDialog";
import { UserAccessDialog } from "./UserAccessDialog";
import type { UsersChangedHandler, UsersFeedback } from "./ui-types";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  master: "Master",
};

const ROLE_BADGES: Record<AppRole, BadgeVariant> = {
  admin: "info",
  editor: "neutral",
  master: "success",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function formatDate(value: string | null): string {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : dateFormatter.format(date);
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "Usuário";
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "US"
  );
}

function UserCard({
  onChanged,
  onFeedback,
  user,
}: {
  onChanged: UsersChangedHandler;
  onFeedback: UsersChangedHandler;
  user: ManagedUser;
}) {
  const mode = user.confirmedAt ? "recovery" : "invite";
  const canManage = user.profileExists && user.role !== null;
  const canSendAccess = canManage && Boolean(user.email);

  async function resendAccess() {
    const result = await resendManagedUserAccessAction({ id: user.id, mode });

    if (!result.ok) {
      onFeedback({ kind: "error", message: result.error.message });
      throw new Error(result.error.code);
    }

    onChanged({
      kind: "success",
      message:
        mode === "invite"
          ? "Convite reenviado com sucesso."
          : "Recuperação de senha enviada com sucesso.",
    });
  }

  return (
    <li className={styles.userItem}>
      <div className={styles.identityCell}>
        <span aria-hidden="true" className={styles.avatar}>
          {initials(user.displayName, user.email)}
        </span>
        <div className={styles.identityCopy}>
          <h3>{user.displayName ?? "Nome não informado"}</h3>
          <p>{user.email ?? "E-mail não informado"}</p>
        </div>
      </div>

      <div className={styles.accessCell}>
        <span className={styles.cellLabel}>Acesso</span>
        <div className={styles.badges}>
          {user.role ? (
            <Badge variant={ROLE_BADGES[user.role]}>
              <ShieldCheck aria-hidden="true" size={13} />
              {ROLE_LABELS[user.role]}
            </Badge>
          ) : (
            <Badge variant="danger">Perfil ausente</Badge>
          )}
          <Badge variant={user.isActive ? "success" : "warning"}>
            {user.isActive ? "Ativo" : "Inativo"}
          </Badge>
          {!user.confirmedAt ? <Badge variant="warning">Convite pendente</Badge> : null}
          {user.passwordChangeRequired ? (
            <Badge variant="info">Troca de senha pendente</Badge>
          ) : null}
        </div>
      </div>

      <div className={styles.activityCell}>
        <span className={styles.cellLabel}>Atividade</span>
        <span className={styles.activityLine}>
          <Clock3 aria-hidden="true" size={15} />
          {user.lastSignInAt ? (
            <time dateTime={user.lastSignInAt}>
              Último acesso: {formatDate(user.lastSignInAt)}
            </time>
          ) : (
            "Ainda não acessou"
          )}
        </span>
        <time className={styles.createdAt} dateTime={user.createdAt}>
          Criado em {formatDate(user.createdAt)}
        </time>
      </div>

      <div className={styles.actionsCell}>
        {canManage && user.role ? (
          <UserAccessDialog
            onChanged={onChanged}
            user={{
              id: user.id,
              displayName: user.displayName,
              email: user.email,
              isActive: user.isActive,
              role: user.role,
            }}
          />
        ) : null}

        {canSendAccess ? (
          <AlertDialog
            confirmLabel={mode === "invite" ? "Reenviar convite" : "Enviar recuperação"}
            confirmVariant="primary"
            description={
              mode === "invite"
                ? "Um novo link de convite será enviado para o e-mail cadastrado."
                : "O usuário precisará definir uma nova senha antes de voltar ao painel."
            }
            onConfirm={resendAccess}
            title={mode === "invite" ? "Reenviar convite?" : "Enviar recuperação de senha?"}
            trigger={
              <>
                {mode === "invite" ? (
                  <Mail aria-hidden="true" size={17} />
                ) : (
                  <RefreshCw aria-hidden="true" size={17} />
                )}
                {mode === "invite" ? "Reenviar convite" : "Recuperar senha"}
              </>
            }
            triggerVariant="ghost"
          />
        ) : null}

        {!canManage ? (
          <p className={styles.unavailableAction}>
            Corrija o perfil no banco antes de gerenciar este acesso.
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Pagination({ page }: { page: ManagedUserPage }) {
  if (page.pageCount <= 1) return null;

  return (
    <nav aria-label="Paginação de usuários" className={styles.pagination}>
      <p>
        Página <strong>{page.page}</strong> de <strong>{page.pageCount}</strong>
      </p>
      <div className={styles.paginationActions}>
        {page.page > 1 ? (
          <Link
            className={styles.pageLink}
            href={`/admin/users?page=${page.page - 1}`}
            prefetch={false}
          >
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={styles.pageLinkDisabled}>
            Anterior
          </span>
        )}
        {page.page < page.pageCount ? (
          <Link
            className={styles.pageLink}
            href={`/admin/users?page=${page.page + 1}`}
            prefetch={false}
          >
            Próxima
          </Link>
        ) : (
          <span aria-disabled="true" className={styles.pageLinkDisabled}>
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}

export function UsersManager({ page }: { page: ManagedUserPage }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<UsersFeedback | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const handleChanged: UsersChangedHandler = (nextFeedback) => {
    setFeedback(nextFeedback);
    startRefresh(() => router.refresh());
  };

  return (
    <div aria-busy={refreshing || undefined} className={styles.page}>
      <PageHeader
        actions={<InviteUserDialog onChanged={handleChanged} />}
        description="Convide pessoas, defina responsabilidades e controle quem pode acessar o painel."
        eyebrow="Administração"
        title="Usuários"
      />

      {feedback ? (
        <div
          className={
            feedback.kind === "success"
              ? styles.feedbackSuccess
              : styles.feedbackError
          }
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" size={20} />
          ) : (
            <CircleAlert aria-hidden="true" size={20} />
          )}
          <p>{feedback.message}</p>
          <IconButton
            aria-label="Dispensar mensagem"
            onClick={() => setFeedback(null)}
            variant="ghost"
          >
            <X aria-hidden="true" size={18} />
          </IconButton>
        </div>
      ) : null}

      <Card className={styles.listPanel}>
        <CardHeader className={styles.listHeader}>
          <div>
            <h2>Perfis da plataforma</h2>
            <p>Os papéis e o status ativo são a fonte de autorização do sistema.</p>
          </div>
          <Badge variant="neutral">
            {page.total} {page.total === 1 ? "perfil" : "perfis"}
          </Badge>
        </CardHeader>

        <CardContent className={styles.listContent}>
          {page.items.length > 0 ? (
            <ul className={styles.userList}>
              {page.items.map((user) => (
                <UserCard
                  key={user.id}
                  onChanged={handleChanged}
                  onFeedback={setFeedback}
                  user={user}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              description="Envie o primeiro convite para começar a distribuir acessos com segurança."
              icon={<UsersRound size={23} />}
              title="Nenhum perfil encontrado"
            />
          )}
        </CardContent>
      </Card>

      <Pagination page={page} />

      <p className={styles.securityNote}>
        <UserRound aria-hidden="true" size={16} />
        Senhas, tokens e identificadores internos nunca são exibidos nesta tela.
      </p>
    </div>
  );
}
