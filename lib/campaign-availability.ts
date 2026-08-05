type CampaignAvailability = {
  ativa: boolean | null;
  inicio_em: string | null;
  fim_em: string | null;
};

export function campaignAcceptsSignatures(
  campaign: CampaignAvailability,
  now = Date.now()
) {
  if (!campaign.ativa) return false;

  const startsAt = campaign.inicio_em ? Date.parse(campaign.inicio_em) : null;
  const endsAt = campaign.fim_em ? Date.parse(campaign.fim_em) : null;
  return (
    (startsAt === null || (Number.isFinite(startsAt) && startsAt <= now)) &&
    (endsAt === null || (Number.isFinite(endsAt) && endsAt >= now))
  );
}
