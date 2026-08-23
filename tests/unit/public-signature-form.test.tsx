import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicSignatureForm } from "@/components/PublicSignatureForm";

const campaignId = "00000000-0000-4000-8000-000000000001";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PublicSignatureForm", () => {
  it("completa configurações antigas com os dados essenciais", () => {
    render(
      <PublicSignatureForm
        campanhaId={campaignId}
        formConfig={{
          version: 1,
          fields: [
            {
              id: "email",
              key: "email",
              label: "E-mail para contato",
              options: [],
              placeholder: "nome@email.com",
              required: true,
              type: "email",
            },
          ],
        }}
        settings={{ collect_address: false }}
        totalAssinaturas={0}
      />
    );

    expect(screen.getByLabelText("Nome completo")).toBeRequired();
    expect(screen.getByLabelText("WhatsApp")).toBeRequired();
    expect(screen.getByLabelText("E-mail para contato")).toBeRequired();
    expect(screen.queryByLabelText("CEP")).not.toBeInTheDocument();
  });

  it("mostra o endereço completo depois que o contato foi salvo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            leadId: "10000000-0000-4000-8000-000000000000",
            leadToken: "a".repeat(43),
            sucesso: true,
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(
      <PublicSignatureForm
        campanhaId={campaignId}
        formConfig={{}}
        settings={{}}
        totalAssinaturas={0}
      />
    );

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Julio Boaventura" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11987838530" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "julio@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByLabelText("CEP")).toBeRequired();
    expect(screen.getByLabelText("Endereço")).toBeRequired();
    expect(screen.getByLabelText("Número")).toBeRequired();
    expect(screen.getByLabelText("Complemento (opcional)")).not.toBeRequired();
    expect(screen.getByLabelText("Bairro")).toBeRequired();
    expect(screen.getByLabelText("Cidade")).toBeRequired();
    expect(screen.getByLabelText("UF")).toBeRequired();
  });

  it("renderiza a prévia sem criar um formulário enviável", () => {
    const { container } = render(
      <PublicSignatureForm
        campanhaId={campaignId}
        formConfig={{}}
        preview
        settings={{}}
        totalAssinaturas={1284}
      />
    );

    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Demonstração do formulário de assinatura")).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });
});
