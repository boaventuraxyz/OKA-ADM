"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { CampaignVideoItem } from "@/lib/campaign-video-carousel";

export function CampaignVideoCarousel({
  autoPlay = false,
  candidateName,
  className = "",
  videos,
}: {
  autoPlay?: boolean;
  candidateName: string;
  className?: string;
  videos: readonly CampaignVideoItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const index = Math.min(activeIndex, Math.max(0, videos.length - 1));
  const activeVideo = videos[index];
  if (!activeVideo) return null;

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + videos.length) % videos.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % videos.length);
  }

  return (
    <div className={`campaign-theme4-video-carousel ${className}`}>
      <figure className="campaign-theme4-video-panel">
        <div className="campaign-theme4-video-viewport">
          <video
            autoPlay={autoPlay}
            controls
            key={activeVideo.url}
            loop={autoPlay}
            muted={autoPlay}
            playsInline
            preload="metadata"
            src={activeVideo.url}
          >
            Seu navegador não suporta a exibição deste vídeo.
          </video>
          {videos.length > 1 ? (
            <div className="campaign-theme4-video-arrows">
              <button aria-label="Vídeo anterior" onClick={showPrevious} type="button">
                <ChevronLeft aria-hidden="true" size={22} />
              </button>
              <button aria-label="Próximo vídeo" onClick={showNext} type="button">
                <ChevronRight aria-hidden="true" size={22} />
              </button>
            </div>
          ) : null}
        </div>
        <figcaption className="campaign-theme4-video-meta" aria-live="polite">
          <span><b aria-hidden="true">●</b> vídeo {index + 1} de {videos.length}</span>
          <span>{activeVideo.caption || candidateName}</span>
        </figcaption>
      </figure>

      {videos.length > 1 ? (
        <div aria-label="Selecionar vídeo" className="campaign-theme4-video-pagination" role="group">
          {videos.map((video, videoIndex) => (
            <button
              aria-label={`Mostrar vídeo ${videoIndex + 1}${video.caption ? `: ${video.caption}` : ""}`}
              aria-pressed={videoIndex === index}
              key={`${video.url}-${videoIndex}`}
              onClick={() => setActiveIndex(videoIndex)}
              type="button"
            >
              <span>{String(videoIndex + 1).padStart(2, "0")}</span>
              {video.caption || `Vídeo ${videoIndex + 1}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
