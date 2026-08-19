import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicSignatureForm } from "@/components/PublicSignatureForm";

describe("PublicSignatureForm", () => {
  it("renderiza somente os campos configurados e mantém o consentimento", () => {
    render(
      <PublicSignatureForm
        campanhaId="00000000-0000-4000-8000-000000000001"
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

    expect(screen.getByLabelText("E-mail para contato")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome completo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Endereço")).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: /autorizo o uso dos meus dados exclusivamente/i,
      })
    ).toBeRequired();
  });

  it("preserva os campos completos de campanhas legadas", () => {
    render(
      <PublicSignatureForm
        campanhaId="00000000-0000-4000-8000-000000000001"
        formConfig={{}}
        settings={{}}
        totalAssinaturas={0}
      />
    );

    expect(screen.getByLabelText("Nome completo")).toBeRequired();
    expect(screen.getByLabelText("CEP")).toBeRequired();
    expect(screen.getByLabelText("Endereço")).toBeRequired();
  });

  it("renderiza a prévia com os mesmos campos sem criar um formulário enviável", () => {
    const { container } = render(
      <PublicSignatureForm
        campanhaId="00000000-0000-4000-8000-000000000001"
        formConfig={{
          fields: [
            {
              id: "name",
              key: "nome",
              label: "Nome da prévia",
              options: [],
              placeholder: "Digite seu nome",
              required: true,
              type: "text",
            },
          ],
        }}
        preview
        settings={{ collectAddress: false }}
        totalAssinaturas={1284}
      />
    );

    expect(screen.getByLabelText("Nome da prévia")).toBeInTheDocument();
    expect(screen.getByLabelText("Demonstração do formulário de assinatura")).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });
});
