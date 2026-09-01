"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import NextImage from "next/image";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 2560;
const MAX_HEIGHT = 1440;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel ler a imagem."));
    };
    image.src = objectUrl;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Nao foi possivel otimizar a imagem."));
        else resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nao foi possivel preparar a imagem."));
    reader.readAsDataURL(blob);
  });
}

type ImageTarget = {
  height: number;
  width: number;
};

async function optimizeImage(file: File, target?: ImageTarget) {
  if (!/^image\/(?:jpeg|png|webp)$/.test(file.type) || file.size > MAX_SOURCE_BYTES) {
    throw new Error("Selecione uma imagem JPG, PNG ou WebP de ate 20 MB.");
  }

  const image = await loadImage(file);
  if (target) {
    if (image.naturalWidth < target.width || image.naturalHeight < target.height) {
      throw new Error(
        `Use uma imagem com pelo menos ${target.width} x ${target.height} pixels.`,
      );
    }
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = target.width / target.height;
    const ratioDifference = Math.abs(sourceRatio / targetRatio - 1);
    if (ratioDifference > 0.02) {
      const orientation = target.width > target.height ? "horizontal" : "vertical";
      throw new Error(
        `Use uma imagem ${orientation} na proporcao de ${target.width} x ${target.height}.`,
      );
    }
  }

  const initialScale = target
    ? 1
    : Math.min(1, MAX_WIDTH / image.naturalWidth, MAX_HEIGHT / image.naturalHeight);
  let width = target?.width ?? Math.max(1, Math.round(image.naturalWidth * initialScale));
  let height = target?.height ?? Math.max(1, Math.round(image.naturalHeight * initialScale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("O navegador nao conseguiu processar a imagem.");

  for (let attempt = 0; attempt < 6; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#0d111a";
    context.fillRect(0, 0, width, height);
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    context.drawImage(
      image,
      (width - renderedWidth) / 2,
      (height - renderedHeight) / 2,
      renderedWidth,
      renderedHeight,
    );

    const quality = target
      ? Math.max(0.72, 0.92 - attempt * 0.04)
      : Math.max(0.5, 0.84 - attempt * 0.07);
    const blob = await canvasBlob(canvas, quality);
    if (blob.type === "image/webp" && blob.size <= MAX_OUTPUT_BYTES) {
      return blobDataUrl(blob);
    }

    if (target) continue;
    width = Math.max(1, Math.round(width * 0.84));
    height = Math.max(1, Math.round(height * 0.84));
  }

  throw new Error("A imagem continuou muito grande depois da otimizacao.");
}

type CampaignImageFieldProps = {
  defaultValue?: string | null;
  description?: string;
  inputId?: string;
  label?: string;
  name?: string;
  onChange?: (value: string) => void;
  targetHeight?: number;
  targetWidth?: number;
  value?: string;
};

export function CampaignBackgroundField({
  defaultValue = null,
  description,
  inputId = "campaign-background-file",
  label = "Foto de fundo desta campanha (opcional)",
  name = "imagem_fundo",
  onChange,
  targetHeight,
  targetWidth,
  value: controlledValue
}: CampaignImageFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const value = controlledValue ?? internalValue;
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const form = fieldRef.current?.closest("form");
    if (!form) return;

    function preventSubmitWhileProcessing(event: SubmitEvent) {
      if (!processing) return;
      event.preventDefault();
      setError("Aguarde o processamento da imagem terminar.");
    }

    form.addEventListener("submit", preventSubmitWhileProcessing);
    return () => form.removeEventListener("submit", preventSubmitWhileProcessing);
  }, [processing]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setProcessing(true);

    try {
      const target = targetWidth && targetHeight
        ? { height: targetHeight, width: targetWidth }
        : undefined;
      const nextValue = await optimizeImage(file, target);
      setInternalValue(nextValue);
      onChange?.(nextValue);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel preparar a imagem.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage() {
    setInternalValue("");
    onChange?.("");
    setError("");
  }

  return (
    <div className="field campaign-background-field" ref={fieldRef}>
      <label htmlFor={inputId}>{label}</label>
      {description ? <p className="field-help">{description}</p> : null}
      <input name={name} readOnly type="hidden" value={value} />
      <div className="campaign-background-control">
        <div
          className="campaign-background-preview"
          style={targetWidth && targetHeight
            ? { aspectRatio: `${targetWidth} / ${targetHeight}` }
            : undefined}
        >
          {value ? (
            <NextImage
              alt="Pre-visualizacao da foto de fundo"
              fill
              sizes="180px"
              src={value}
              unoptimized
            />
          ) : (
            <div className="campaign-background-empty">
              <ImageIcon aria-hidden="true" size={24} />
              <span>Sem imagem</span>
            </div>
          )}
        </div>
        <div className="campaign-background-actions">
          <label
            aria-disabled={processing}
            className="button"
            htmlFor={inputId}
          >
            {processing ? (
              <LoaderCircle aria-hidden="true" className="spin" size={16} />
            ) : (
              <ImagePlus aria-hidden="true" size={16} />
            )}
            {processing ? "Processando" : value ? "Trocar imagem" : "Selecionar imagem"}
          </label>
          {value ? (
            <button
              aria-label="Remover foto de fundo"
              className="button danger icon"
              onClick={removeImage}
              title="Remover foto de fundo"
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>
      </div>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={processing}
        id={inputId}
        onChange={(event) => void handleFile(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />
      {error ? (
        <p className="campaign-background-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
