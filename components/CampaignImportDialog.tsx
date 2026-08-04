"use client";

import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  LoaderCircle,
  TriangleAlert,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DownloadLink } from "@/components/DownloadLink";

type ImportIssue = {
  line: number;
  message: string;
};

type ImportPreview = {
  canApply: boolean;
  createCount: number;
  errors: ImportIssue[];
  totalRows: number;
  updateCount: number;
  validRows: number;
};

type ImportResult = {
  created: number;
  updated: number;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function CampaignImportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"preview" | "apply" | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setPending(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function open() {
    reset();
    dialogRef.current?.showModal();
  }

  function close() {
    if (pending) return;
    dialogRef.current?.close();
    reset();
  }

  async function send(mode: "preview" | "apply") {
    if (!file || pending) return;
    setPending(mode);
    setError("");

    try {
      const formData = new FormData();
      formData.set("arquivo", file);
      formData.set("modo", mode);
      const response = await fetch("/api/campanhas/importar", {
        body: formData,
        credentials: "same-origin",
        method: "POST"
      });
      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? ((await response.json()) as ImportPreview & ImportResult & { erro?: string })
        : null;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !body) {
        throw new Error(body?.erro || "Não foi possível importar a planilha.");
      }

      if (mode === "preview") {
        setPreview(body);
        setResult(null);
      } else {
        setResult({ created: body.created, updated: body.updated });
        setPreview(null);
        router.refresh();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível importar a planilha."
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <button className="button" onClick={open} type="button">
        <FileUp aria-hidden="true" size={16} />
        Importar
      </button>

      <dialog
        aria-labelledby="campaign-import-title"
        className="campaign-import-dialog"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        ref={dialogRef}
      >
        <div className="import-dialog-header">
          <div>
            <h2 id="campaign-import-title">Importar campanhas</h2>
            <p>ID preenchido edita; ID vazio cria uma campanha.</p>
          </div>
          <button
            aria-label="Fechar importação"
            className="button icon"
            disabled={Boolean(pending)}
            onClick={close}
            title="Fechar"
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <div className="import-dialog-body">
          <div className="import-model-row">
            <FileSpreadsheet aria-hidden="true" size={20} />
            <div>
              <strong>Modelo com os dados atuais</strong>
              <span>Compatível com Excel e Google Planilhas.</span>
            </div>
            <DownloadLink
              ariaLabel="Baixar modelo de campanhas"
              className="button"
              fallbackFilename="modelo-campanhas.csv"
              href="/api/campanhas/importar/modelo"
              title="Baixar modelo"
            >
              <Download aria-hidden="true" size={15} />
              Modelo
            </DownloadLink>
          </div>

          <div className="import-file-row">
            <input
              accept=".xlsx,.csv"
              className="sr-only"
              id="campaign-import-file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setPreview(null);
                setResult(null);
                setError("");
                if (nextFile && nextFile.size > MAX_FILE_BYTES) {
                  setFile(null);
                  setError("A planilha deve ter no máximo 2 MB.");
                  return;
                }
                setFile(nextFile);
              }}
              ref={fileInputRef}
              type="file"
            />
            <label className="button" htmlFor="campaign-import-file">
              <FileUp aria-hidden="true" size={16} />
              Selecionar planilha
            </label>
            <span className="import-file-name">{file?.name || "Nenhum arquivo selecionado"}</span>
          </div>

          {preview ? (
            <div aria-live="polite">
              <div className="import-summary">
                <div>
                  <strong>{preview.totalRows}</strong>
                  <span>linhas</span>
                </div>
                <div>
                  <strong>{preview.createCount}</strong>
                  <span>novas</span>
                </div>
                <div>
                  <strong>{preview.updateCount}</strong>
                  <span>edições</span>
                </div>
              </div>

              {preview.errors.length > 0 ? (
                <div className="import-errors" role="alert">
                  <div className="import-errors-title">
                    <TriangleAlert aria-hidden="true" size={17} />
                    Corrija {preview.errors.length} erro(s)
                  </div>
                  <ul>
                    {preview.errors.map((issue, index) => (
                      <li key={`${issue.line}-${index}`}>
                        Linha {issue.line}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <div className="alert success" role="status">
              <CheckCircle2 aria-hidden="true" size={17} />
              {result.created} criada(s) e {result.updated} atualizada(s).
            </div>
          ) : null}

          {error ? (
            <div className="alert error" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className="import-dialog-actions">
          <button className="button" disabled={Boolean(pending)} onClick={close} type="button">
            {result ? "Fechar" : "Cancelar"}
          </button>
          {!result && (!preview || !preview.canApply) ? (
            <button
              className="button primary"
              disabled={!file || Boolean(pending)}
              onClick={() => void send("preview")}
              type="button"
            >
              {pending === "preview" ? (
                <LoaderCircle aria-hidden="true" className="spin" size={16} />
              ) : (
                <FileSpreadsheet aria-hidden="true" size={16} />
              )}
              Analisar planilha
            </button>
          ) : null}
          {!result && preview?.canApply ? (
            <button
              className="button primary"
              disabled={Boolean(pending)}
              onClick={() => void send("apply")}
              type="button"
            >
              {pending === "apply" ? (
                <LoaderCircle aria-hidden="true" className="spin" size={16} />
              ) : (
                <FileUp aria-hidden="true" size={16} />
              )}
              Aplicar importação
            </button>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
