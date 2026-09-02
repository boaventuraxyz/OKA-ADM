import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicSignatureForm } from "@/components/PublicSignatureForm";

const campaignId = "00000000-0000-4000-8000-000000000000";
const leadId = "10000000-0000-4000-8000-000000000000";
const leadToken = "a".repeat(43);

function apiResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function contactSuccess() {
  return apiResponse({ leadId, leadToken, sucesso: true });
}

function renderCapture() {
  return render(
    <PublicSignatureForm
      campanhaId={campaignId}
      formConfig={{}}
      meta={5000}
      settings={{}}
      textoDot="Participe"
      textoForm="Movimento"
      totalAssinaturas={10}
    />
  );
}

function fillContact() {
  fireEvent.change(screen.getByLabelText("Nome completo"), {
    target: { value: "Julio Boaventura" },
  });
  fireEvent.change(screen.getByLabelText("WhatsApp"), {
    target: { value: "11987838530" },
  });
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "julio@example.com" },
  });
}

async function advanceToAddress(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock.mockResolvedValueOnce(contactSuccess());
  fillContact();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByText("Etapa 2 de 2 · Endereço");
}

describe("formulário progressivo compartilhado", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("abre mostrando apenas nome, WhatsApp e e-mail", () => {
    renderCapture();

    expect(screen.getByText("Etapa 1 de 2 · Seus dados")).toBeInTheDocument();
    expect(screen.getByText("Conte um pouco sobre você")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByLabelText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.queryByLabelText("CEP")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });

  it("não chama a API com telefone ou e-mail inválido", () => {
    renderCapture();
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Julio Boaventura" },
    });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11111111111" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "email-invalido" } });

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  it("não avança quando a captura inicial falha", async () => {
    fetchMock.mockResolvedValueOnce(
      apiResponse({ erro: "Não foi possível salvar agora.", sucesso: false }, 502),
    );
    renderCapture();
    fillContact();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar agora.");
    expect(screen.getByText("Etapa 1 de 2 · Seus dados")).toBeInTheDocument();
  });

  it("salva a etapa 1 antes de mostrar o endereço e mantém o lead em abandono", async () => {
    renderCapture();
    await advanceToAddress(fetchMock);

    expect(screen.getByLabelText("CEP")).toBeInTheDocument();
    expect(screen.getByLabelText("Endereço")).toBeInTheDocument();
    expect(screen.getByLabelText("Bairro")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const contactData = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(contactData.get("submission_phase")).toBe("contact");
    expect(contactData.get("campanha_id")).toBe(campaignId);
    expect(contactData.get("email_assinante")).toBe("julio@example.com");
  });

  it("avança normalmente quando a API atualiza um contato já cadastrado", async () => {
    fetchMock.mockResolvedValueOnce(
      apiResponse({
        leadId,
        leadToken,
        phase: "contact_updated",
        reused: true,
        sucesso: true,
      }),
    );
    renderCapture();
    fillContact();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Etapa 2 de 2 · Endereço")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("impede clique duplo enquanto salva a etapa 1", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    renderCapture();
    fillContact();
    const button = screen.getByRole("button", { name: "Continuar" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    resolveRequest?.(contactSuccess());
    await screen.findByText("Etapa 2 de 2 · Endereço");
  });

  it("volta para editar sem criar outro lead", async () => {
    renderCapture();
    await advanceToAddress(fetchMock);

    fireEvent.click(screen.getByRole("button", { name: "‹ Voltar" }));
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Julio Boaventura");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Etapa 2 de 2 · Endereço")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preenche o endereço pelo CEP e atualiza exatamente o lead criado", async () => {
    fetchMock
      .mockResolvedValueOnce(contactSuccess())
      .mockResolvedValueOnce(
        apiResponse({
          success: true,
          data: {
            city: "São Paulo",
            neighborhood: "Sé",
            state: "SP",
            street: "Praça da Sé",
          },
        }),
      )
      .mockResolvedValueOnce(apiResponse({ redirectUrl: null, sucesso: true }));
    renderCapture();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("Etapa 2 de 2 · Endereço");

    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "01001000" } });
    await waitFor(() => expect(screen.getByLabelText("Endereço")).toHaveValue("Praça da Sé"));
    expect(screen.getByLabelText("Bairro")).toHaveValue("Sé");
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo");
    expect(screen.getByLabelText("UF")).toHaveValue("SP");
    fireEvent.change(screen.getByLabelText("Número"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    await screen.findByText("Cadastro concluído!");
    expect(screen.queryByLabelText("CEP")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "‹ Voltar" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const completedData = fetchMock.mock.calls[2][1]?.body as FormData;
    expect(completedData.get("submission_phase")).toBe("complete");
    expect(completedData.get("lead_id")).toBe(leadId);
    expect(completedData.get("lead_token")).toBe(leadToken);
    expect(completedData.get("responses")).toContain('"bairro":"Sé"');
  });

  it("mantém o consentimento apenas na etapa final", async () => {
    renderCapture();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await advanceToAddress(fetchMock);

    expect(screen.getByRole("checkbox")).toBeRequired();
  });

  it("oferece todos os estados brasileiros e grava a sigla", async () => {
    renderCapture();
    await advanceToAddress(fetchMock);

    const estado = screen.getByLabelText("UF");
    const options = estado.querySelectorAll("option");
    expect(options).toHaveLength(28);
    expect(options[1]).toHaveTextContent("São Paulo");
    expect(options[1]).toHaveValue("SP");
    fireEvent.change(estado, { target: { value: "SP" } });
    expect(estado).toHaveValue("SP");
  });
});
