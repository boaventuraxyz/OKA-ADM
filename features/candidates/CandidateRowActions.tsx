"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteCandidatoAction } from "@/app/actions";
import { AlertDialog } from "@/components/ui/AlertDialog";

import styles from "./candidates-admin.module.css";

export function CandidateRowActions({
  canManage,
  hubHref,
  id,
  name
}: {
  canManage: boolean;
  hubHref: string | null;
  id: string;
  name: string;
}) {
  const router = useRouter();

  async function remove() {
    const formData = new FormData();
    formData.set("candidate_ui", "admin");
    formData.set("id", id);
    await deleteCandidatoAction(formData);
    router.refresh();
  }

  return (
    <div className={styles.rowActions}>
      {hubHref ? (
        <a className={styles.actionLink} href={hubHref} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" size={15} /> Abrir hub
        </a>
      ) : null}
      {canManage ? (
        <>
          <Link className={styles.actionLink} href={`/admin/candidates/${id}/edit`}>
            <Pencil aria-hidden="true" size={15} /> Editar
          </Link>
          <AlertDialog
            confirmLabel="Excluir candidato"
            description={<>O cadastro de <strong>{name}</strong> será removido. Campanhas existentes não serão apagadas.</>}
            onConfirm={remove}
            title="Excluir este candidato?"
            trigger={<><Trash2 aria-hidden="true" size={15} /> Excluir</>}
            triggerVariant="ghost"
          />
        </>
      ) : null}
    </div>
  );
}
