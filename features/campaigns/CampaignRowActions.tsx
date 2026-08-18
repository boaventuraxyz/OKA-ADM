"use client";

import { Archive, Copy, Eye, FilePenLine, Globe2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

import {
  archiveCampaignAction,
  duplicateCampaignAction,
  publishCampaignAction,
  unpublishCampaignAction,
} from "./actions";
import type { CampaignStatus } from "./domain";
import type { ActionResult, CampaignMutationResult } from "./types";
import styles from "./campaign-admin.module.css";

type CampaignMutationAction = (
  input: { id: string }
) => Promise<ActionResult<CampaignMutationResult>>;

export function CampaignRowActions({
  id,
  status,
}: {
  id: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  async function run(
    name: string,
    action: CampaignMutationAction,
    navigateToResult = false,
    reportErrorToCaller = false
  ) {
    setPending(name);
    setFeedback("");

    try {
      const result = await action({ id });
      if (!result.ok) throw new Error(result.error.message);

      if (navigateToResult) {
        router.push(`/admin/campaigns/${result.data.id}/edit`);
      } else {
        setFeedback("Ação concluída.");
        router.refresh();
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível concluir a ação."
      );
      if (reportErrorToCaller) throw error;
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.rowActions}>
      <Link className={styles.rowActionLink} href={`/admin/campaigns/${id}/edit`}>
        <FilePenLine aria-hidden="true" size={15} /> Editar
      </Link>
      {status === "published" ? (
        <Link className={styles.rowActionLink} href={`/formulario/${encodeURIComponent(id)}`} target="_blank">
          <Eye aria-hidden="true" size={15} /> Visualizar
        </Link>
      ) : null}
      <Button
        disabled={pending !== null}
        onClick={() => void run("duplicate", duplicateCampaignAction, true)}
        size="small"
        variant="ghost"
      >
        <Copy aria-hidden="true" size={15} />
        {pending === "duplicate" ? "Duplicando…" : "Duplicar"}
      </Button>
      {status === "draft" ? (
        <AlertDialog
          confirmLabel="Publicar campanha"
          confirmVariant="primary"
          description="Revise conteúdo, formulário, tema, SEO e preview. Depois da confirmação, a campanha ficará disponível publicamente."
          onConfirm={() => run("publish", publishCampaignAction, false, true)}
          title="Publicar esta campanha?"
          trigger={
            <>
              <Globe2 aria-hidden="true" size={15} /> Publicar
            </>
          }
          triggerVariant="ghost"
        />
      ) : null}
      {status === "published" ? (
        <AlertDialog
          confirmLabel="Retirar do ar"
          description="A página pública deixará de aceitar acessos e assinaturas. A campanha voltará para rascunho sem perder conteúdo ou leads."
          onConfirm={() => run("unpublish", unpublishCampaignAction, false, true)}
          title="Retirar esta campanha do ar?"
          trigger={
            <>
              <Undo2 aria-hidden="true" size={15} /> Despublicar
            </>
          }
          triggerVariant="ghost"
        />
      ) : null}
      {status !== "archived" ? (
        <AlertDialog
          confirmLabel="Arquivar campanha"
          description="A campanha sairá de circulação, mas seus dados e histórico serão preservados."
          onConfirm={() => run("archive", archiveCampaignAction, false, true)}
          title="Arquivar esta campanha?"
          trigger={
            <>
              <Archive aria-hidden="true" size={15} /> Arquivar
            </>
          }
          triggerVariant="ghost"
        />
      ) : null}
      <span aria-live="polite" className={styles.actionFeedback}>
        {feedback}
      </span>
    </div>
  );
}
