"use client";

import { createClient } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createCampaignVideoUploadAction,
} from "@/features/campaigns/actions";
import {
  CAMPAIGN_VIDEO_MIME_TYPES,
  MAX_CAMPAIGN_VIDEO_BYTES,
  MAX_CAMPAIGN_VIDEOS,
  type CampaignVideoItem,
} from "@/lib/campaign-video-carousel";

import styles from "./CampaignVideoCarouselField.module.css";

const acceptedVideoTypes = new Set<string>(CAMPAIGN_VIDEO_MIME_TYPES);

function fileLabel(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim().slice(0, 300);
}

export function CampaignVideoCarouselField({
  inputId,
  items,
  onChange,
}: {
  inputId: string;
  items: readonly CampaignVideoItem[];
  onChange: (items: CampaignVideoItem[]) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const form = fieldRef.current?.closest("form");
    if (!form) return;

    function preventSubmitWhileProcessing(event: SubmitEvent) {
      if (!processing) return;
      event.preventDefault();
      setError("Aguarde o envio dos vídeos terminar.");
    }

    form.addEventListener("submit", preventSubmitWhileProcessing);
    return () => form.removeEventListener("submit", preventSubmitWhileProcessing);
  }, [processing]);

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setError("");

    if (items.length + files.length > MAX_CAMPAIGN_VIDEOS) {
      setError(`O carrossel aceita até ${MAX_CAMPAIGN_VIDEOS} vídeos.`);
      return;
    }

    const invalid = files.find((file) => (
      !acceptedVideoTypes.has(file.type) || file.size > MAX_CAMPAIGN_VIDEO_BYTES
    ));
    if (invalid) {
      setError("Selecione vídeos MP4, WebM ou MOV de até 100 MB cada.");
      return;
    }

    setProcessing(true);
    let nextItems = [...items];

    try {
      for (const file of files) {
        const ticket = await createCampaignVideoUploadAction({
          contentType: file.type,
          size: file.size,
        });
        if (!ticket.ok) throw new Error(ticket.error.message);

        const supabase = createClient(
          ticket.data.supabaseUrl,
          ticket.data.publishableKey,
          {
            auth: {
              autoRefreshToken: false,
              detectSessionInUrl: false,
              persistSession: false,
            },
          },
        );
        const { error: uploadError } = await supabase.storage
          .from(ticket.data.bucket)
          .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        nextItems = [
          ...nextItems,
          { caption: fileLabel(file.name), url: ticket.data.publicUrl },
        ];
        onChange(nextItems);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar o vídeo.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function updateItem(index: number, patch: Partial<CampaignVideoItem>) {
    onChange(items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setError("");
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className={styles.field} ref={fieldRef}>
      <div className={styles.heading}>
        <div>
          <h4>Vídeos do carrossel</h4>
          <p>Envie até {MAX_CAMPAIGN_VIDEOS} arquivos MP4, WebM ou MOV, com no máximo 100 MB cada.</p>
        </div>
        <span>{items.length}/{MAX_CAMPAIGN_VIDEOS}</span>
      </div>

      {items.length > 0 ? (
        <div className={styles.list}>
          {items.map((item, index) => (
            <article className={styles.item} key={`${item.url}-${index}`}>
              <div className={styles.preview}>
                <video aria-label={`Prévia do vídeo ${index + 1}`} controls playsInline preload="metadata" src={item.url} />
              </div>
              <div className={styles.itemContent}>
                <label htmlFor={`${inputId}-caption-${index}`}>Legenda do vídeo {index + 1}</label>
                <input
                  id={`${inputId}-caption-${index}`}
                  maxLength={300}
                  onChange={(event) => updateItem(index, { caption: event.target.value })}
                  placeholder="Ex.: Relato da comunidade"
                  type="text"
                  value={item.caption}
                />
                <div className={styles.itemActions}>
                  <button aria-label={`Mover vídeo ${index + 1} para cima`} disabled={index === 0} onClick={() => moveItem(index, -1)} type="button">
                    <ArrowUp aria-hidden="true" size={15} />
                  </button>
                  <button aria-label={`Mover vídeo ${index + 1} para baixo`} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} type="button">
                    <ArrowDown aria-hidden="true" size={15} />
                  </button>
                  <button aria-label={`Remover vídeo ${index + 1}`} className={styles.removeButton} onClick={() => removeItem(index)} type="button">
                    <Trash2 aria-hidden="true" size={15} />
                    Remover
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Video aria-hidden="true" size={26} />
          <span>Nenhum vídeo adicionado</span>
        </div>
      )}

      <div className={styles.footer}>
        <label
          aria-disabled={processing || items.length >= MAX_CAMPAIGN_VIDEOS}
          className={styles.uploadButton}
          htmlFor={inputId}
        >
          {processing ? (
            <LoaderCircle aria-hidden="true" className={styles.spin} size={16} />
          ) : (
            <Plus aria-hidden="true" size={16} />
          )}
          {processing ? "Enviando vídeos" : "Adicionar vídeos"}
        </label>
        <input
          accept={CAMPAIGN_VIDEO_MIME_TYPES.join(",")}
          className={styles.fileInput}
          disabled={processing || items.length >= MAX_CAMPAIGN_VIDEOS}
          id={inputId}
          multiple
          onChange={(event) => void uploadFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
