import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAssinatura: vi.fn(),
  findAssinaturasByContact: vi.fn(),
  getCampanhaSubmissionConfig: vi.fn(),
  getCandidato: vi.fn(),
  updateAssinatura: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: () => ({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue("disabled"),
}));

vi.mock("@/lib/supabase", () => ({
  createAssinatura: mocks.createAssinatura,
  findAssinaturasByContact: mocks.findAssinaturasByContact,
  getCampanhaSubmissionConfig: mocks.getCampanhaSubmissionConfig,
  getCandidato: mocks.getCandidato,
  SupabaseRequestError: class SupabaseRequestError extends Error {
    constructor(public readonly status: number) {
      super("Supabase error");
    }
  },
  updateAssinatura: mocks.updateAssinatura,
}));

import { POST } from "@/app/api/assinaturas/route";
import { SupabaseRequestError } from "@/lib/supabase";

const campaignId = "00000000-0000-4000-8000-000000000000";
const leadId = "10000000-0000-4000-8000-000000000000";

function contactForm() {
  const data = new FormData();
  data.set("campanha_id", campaignId);
  data.set("submission_phase", "contact");
  data.set("nome_assinante", "Julio Boaventura");
  data.set("numero_assinante", "(11) 98783-8530");
  data.set("email_assinante", "julio@example.com");
  return data;
}

function request(data: FormData) {
  return new Request("https://okaservices.vercel.app/api/assinaturas", {
    body: data,
    headers: {
      origin: "https://okaservices.vercel.app",
      "user-agent": "vitest-progressive-form",
    },
    method: "POST",
  });
}

describe("API de assinatura progressiva", () => {
  const previousSecret = process.env.PROGRESSIVE_LEAD_SECRET;

  beforeEach(() => {
    process.env.PROGRESSIVE_LEAD_SECRET = "segredo-de-teste-com-entropia-suficiente";
    mocks.createAssinatura.mockReset().mockResolvedValue({ id: leadId });
    mocks.findAssinaturasByContact.mockReset().mockResolvedValue([]);
    mocks.updateAssinatura.mockReset().mockResolvedValue({ id: leadId });
    mocks.getCampanhaSubmissionConfig.mockReset().mockResolvedValue({
      ativa: true,
      candidato_id: null,
      fim_em: null,
      form_config: {},
      id: campaignId,
      inicio_em: null,
      settings: {},
      url_formulario: null,
    });
    mocks.getCandidato.mockReset();
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.PROGRESSIVE_LEAD_SECRET;
    else process.env.PROGRESSIVE_LEAD_SECRET = previousSecret;
  });

  it("faz INSERT na etapa 1 e UPDATE no mesmo ID na etapa 2", async () => {
    const captureResponse = await POST(request(contactForm()));
    const captureBody = await captureResponse.json() as {
      leadId: string;
      leadToken: string;
      phase: string;
    };

    expect(captureResponse.status).toBe(200);
    expect(captureBody.leadId).toBe(leadId);
    expect(captureBody.phase).toBe("contact_captured");
    expect(mocks.createAssinatura).toHaveBeenCalledTimes(1);
    expect(mocks.createAssinatura).toHaveBeenCalledWith(
      expect.objectContaining({
        campanha_id: campaignId,
        consented_at: null,
        email_assinante: "julio@example.com",
        metadata: expect.objectContaining({ status: "contact_captured" }),
      }),
    );

    const completion = contactForm();
    completion.set("submission_phase", "complete");
    completion.set("lead_id", captureBody.leadId);
    completion.set("lead_token", captureBody.leadToken);
    completion.set("consentimento", "sim");
    completion.set("cep_assinante", "01001-000");
    completion.set("endereco_assinante", "Praça da Sé");
    completion.set("n_assinante", "10");
    completion.set("cidade_assinante", "São Paulo");
    completion.set("estado_assinante", "SP");
    completion.set("responses", JSON.stringify({ bairro: "Sé" }));

    const completionResponse = await POST(request(completion));

    expect(completionResponse.status).toBe(200);
    expect(mocks.createAssinatura).toHaveBeenCalledTimes(1);
    expect(mocks.updateAssinatura).toHaveBeenCalledTimes(1);
    expect(mocks.updateAssinatura).toHaveBeenCalledWith(
      leadId,
      campaignId,
      expect.objectContaining({
        endereco_assinante: "Praça da Sé",
        metadata: expect.objectContaining({ status: "completed" }),
        responses: { bairro: "Sé" },
      }),
    );
  });

  it("rejeita tentativa de atualizar outro lead com o mesmo token", async () => {
    const captureResponse = await POST(request(contactForm()));
    const captureBody = await captureResponse.json() as { leadToken: string };
    const completion = contactForm();
    completion.set("submission_phase", "complete");
    completion.set("lead_id", "20000000-0000-4000-8000-000000000000");
    completion.set("lead_token", captureBody.leadToken);
    completion.set("consentimento", "sim");

    const response = await POST(request(completion));

    expect(response.status).toBe(400);
    expect(mocks.updateAssinatura).not.toHaveBeenCalled();
  });

  it("reaproveita e atualiza o lead quando o contato já existe", async () => {
    mocks.createAssinatura.mockRejectedValueOnce(new SupabaseRequestError(409));
    mocks.findAssinaturasByContact.mockResolvedValueOnce([{
      campanha_id: campaignId,
      email_assinante: "julio@example.com",
      id: leadId,
      numero_assinante: "11987838530",
    }]);

    const response = await POST(request(contactForm()));
    const body = await response.json() as {
      leadId: string;
      leadToken: string;
      phase: string;
      reused: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      leadId,
      phase: "contact_updated",
      reused: true,
    });
    expect(body.leadToken).toEqual(expect.any(String));
    expect(mocks.findAssinaturasByContact).toHaveBeenCalledWith(campaignId, {
      email: "julio@example.com",
      telefone: "11987838530",
    });
    expect(mocks.updateAssinatura).toHaveBeenCalledWith(
      leadId,
      campaignId,
      expect.objectContaining({
        email_assinante: "julio@example.com",
        nome_assinante: "Julio Boaventura",
        numero_assinante: "11987838530",
      }),
    );
  });

  it("não mescla cadastros quando e-mail e telefone pertencem a leads diferentes", async () => {
    mocks.createAssinatura.mockRejectedValueOnce(new SupabaseRequestError(409));
    mocks.findAssinaturasByContact.mockResolvedValueOnce([
      {
        campanha_id: campaignId,
        email_assinante: "julio@example.com",
        id: leadId,
        numero_assinante: "11987838530",
      },
      {
        campanha_id: campaignId,
        email_assinante: "outra@example.com",
        id: "20000000-0000-4000-8000-000000000000",
        numero_assinante: "11999999999",
      },
    ]);

    const response = await POST(request(contactForm()));
    const body = await response.json() as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE_CONTACT_CONFLICT");
    expect(mocks.updateAssinatura).not.toHaveBeenCalled();
  });
});
