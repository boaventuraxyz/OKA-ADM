"use client";

import { useEffect, useState } from "react";
import { CampaignPublicRenderer, type CampaignRenderData } from "@/components/CampaignPublicRenderer";
import { CAMPAIGN_PREVIEW_MESSAGE, createThemePreviewCampaign } from "./theme-preview-data";
import { getThemeById, THEME_REGISTRY } from "./registry";

type PreviewMessage = {
  instanceId: string;
  payload: CampaignRenderData;
  type: typeof CAMPAIGN_PREVIEW_MESSAGE;
};

export function CampaignThemePreviewCanvas({ instanceId, themeId }: { instanceId: string; themeId: number }) {
  const theme = getThemeById(themeId) || THEME_REGISTRY[0];
  const [campaign, setCampaign] = useState(() => createThemePreviewCampaign({ theme }));

  useEffect(() => {
    function receivePreview(event: MessageEvent<PreviewMessage>) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== CAMPAIGN_PREVIEW_MESSAGE) return;
      if (event.data.instanceId !== instanceId) return;
      setCampaign(event.data.payload);
    }

    window.addEventListener("message", receivePreview);
    window.parent.postMessage({ instanceId, type: `${CAMPAIGN_PREVIEW_MESSAGE}:ready` }, window.location.origin);
    return () => window.removeEventListener("message", receivePreview);
  }, [instanceId]);

  return (
    <div className="campaign-preview-document">
      <CampaignPublicRenderer campanha={campaign} preview totalAssinaturas={1284} />
    </div>
  );
}
