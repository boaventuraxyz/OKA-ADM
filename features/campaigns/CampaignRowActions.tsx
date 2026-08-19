"use client";

import { Archive, Copy, Eye, FilePenLine, Globe2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  slug,
  status,
}: {
  id: string;
  slug: string | null;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  async function run(
    name: string,
    action: CampaignMutationAction,
    navigateToResult = false,
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
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.rowActions}>
      <Link className={styles.rowActionLink} href={`/admin/campaigns/${id}/edit`}>
        <FilePenLine aria-hidden="true" size={15} /> Editar
      </Link>
      {status === "published" && slug ? (
        <Link className={styles.rowActionLink} href={`/formulario/${encodeURIComponent(slug)}`} target="_blank">
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
        <Button
          disabled={pending !== null}
          onClick={() => void run("publish", publishCampaignAction)}
          size="small"
          variant="ghost"
        >
          <Globe2 aria-hidden="true" size={15} />
          {pending === "publish" ? "Publicando…" : "Publicar"}
        </Button>
      ) : null}
      {status === "published" ? (
        <Button
          disabled={pending !== null}
          onClick={() => void run("unpublish", unpublishCampaignAction)}
          size="small"
          variant="ghost"
        >
          <Undo2 aria-hidden="true" size={15} />
          {pending === "unpublish" ? "Despublicando…" : "Despublicar"}
        </Button>
      ) : null}
      {status !== "archived" ? (
        <Button
          disabled={pending !== null}
          onClick={() => void run("archive", archiveCampaignAction)}
          size="small"
          variant="ghost"
        >
          <Archive aria-hidden="true" size={15} />
          {pending === "archive" ? "Arquivando…" : "Arquivar"}
        </Button>
      ) : null}
      <span aria-live="polite" className={styles.actionFeedback}>
        {feedback}
      </span>
    </div>
  );
}
