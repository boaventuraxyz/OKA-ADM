import { describe, expect, it } from "vitest";

import { normalizePublicFormConfiguration } from "@/features/forms/config";

describe("configuração pública de formulários", () => {
  it("preserva o formulário completo para campanhas legadas", () => {
    const config = normalizePublicFormConfiguration({}, {});
    expect(config.legacy).toBe(true);
    expect(config.collectAddress).toBe(true);
    expect(config.fields.map((field) => field.type)).toEqual(
      expect.arrayContaining(["text", "email", "phone", "cep", "city", "state"])
    );
  });

  it("normaliza campos configurados e mantém consentimento obrigatório", () => {
    const config = normalizePublicFormConfiguration(
      {
        fields: [
          { id: "name", key: "nome", label: "Nome", type: "text", required: true },
          { id: "topic", key: "assunto", label: "Assunto", type: "select", options: [" A ", "B"] },
        ],
      },
      { collect_address: false, require_consent: false }
    );

    expect(config.legacy).toBe(false);
    expect(config.collectAddress).toBe(true);
    expect(config.requireConsent).toBe(true);
    expect(config.fields.find((field) => field.key === "assunto")?.options).toEqual([
      "A",
      "B",
    ]);
    expect(config.capture?.steps).toHaveLength(2);
  });

  it("descarta chaves repetidas e campos inválidos", () => {
    const config = normalizePublicFormConfiguration({
      fields: [
        { key: "email", label: "E-mail", type: "email" },
        { key: "email", label: "Outro", type: "text" },
        { key: "invalida!", label: "Inválido", type: "text" },
      ],
    }, {});
    expect(config.fields.filter((field) => field.key === "email")).toHaveLength(1);
    expect(config.fields.some((field) => field.key === "invalida!")).toBe(false);
    expect(config.fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(["nome", "telefone", "email", "cep", "bairro", "cidade", "estado"]),
    );
  });
});
