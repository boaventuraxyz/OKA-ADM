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
});
