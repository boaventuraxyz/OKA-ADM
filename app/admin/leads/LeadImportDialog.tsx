"use client";

import { FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Select } from "@/components/ui/Select";
import type { LeadCampaignOption } from "@/features/leads/types";
import type { LeadImportResult } from "@/features/leads/import";

import styles from "./leads-admin.module.css";

export function LeadImportDialog({ campaigns }: { campaigns: readonly LeadCampaignOption[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LeadImportResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/admin/leads/import", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json() as { success: boolean; data?: LeadImportResult; error?: { message?: string } };
      if (!response.ok || !body.success || !body.data) throw new Error(body.error?.message || "Não foi possível importar.");
      setResult(body.data);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível importar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={styles.secondaryLink} onClick={() => dialogRef.current?.showModal()} type="button">
        <FileUp aria-hidden="true" size={17} /> Importar planilha
      </button>
      <dialog className={styles.importDialog} ref={dialogRef}>
        <form className={styles.importForm} onSubmit={submit}>
          <header>
            <div><small>Importação protegida</small><h2>Importar leads</h2></div>
            <button aria-label="Fechar" className={styles.closeButton} onClick={() => dialogRef.current?.close()} type="button"><X size={18} /></button>
          </header>
          <p>Escolha a campanha aqui. A planilha não pode alterar esse vínculo. Duplicados na mesma campanha são ignorados.</p>
          <label htmlFor="lead-import-campaign">Campanha</label>
          <Select id="lead-import-campaign" name="campaignId" required>
            <option value="">Selecione uma campanha</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.titulo}</option>)}
          </Select>
          <label htmlFor="lead-import-file">Planilha CSV ou XLSX</label>
          <input accept=".csv,.xlsx" id="lead-import-file" name="arquivo" required type="file" />
          <a className={styles.modelLink} href="/api/admin/leads/import/model">Baixar modelo CSV</a>
          {error ? <p className={styles.importError} role="alert">{error}</p> : null}
          {result ? (
            <div className={styles.importResult} role="status">
              <strong>Importação concluída</strong>
              <dl>
                <div><dt>Linhas</dt><dd>{result.totalRows}</dd></div>
                <div><dt>Válidas</dt><dd>{result.validRows}</dd></div>
                <div><dt>Inseridos</dt><dd>{result.inserted}</dd></div>
                <div><dt>Atualizados</dt><dd>{result.updated}</dd></div>
                <div><dt>Duplicados</dt><dd>{result.duplicatesIgnored}</dd></div>
                <div><dt>Inválidas</dt><dd>{result.invalidRows}</dd></div>
                <div><dt>Erros</dt><dd>{result.processingErrors}</dd></div>
              </dl>
              {result.errors.length ? <ul>{result.errors.slice(0, 8).map((issue) => <li key={`${issue.line}-${issue.message}`}>Linha {issue.line}: {issue.message}</li>)}</ul> : null}
            </div>
          ) : null}
          <footer>
            <button className={styles.secondaryLink} onClick={() => dialogRef.current?.close()} type="button">Fechar</button>
            <button className={styles.primaryLink} disabled={busy || campaigns.length === 0} type="submit">{busy ? "Importando…" : "Importar"}</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

