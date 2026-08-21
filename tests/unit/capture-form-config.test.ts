import { describe, expect, it } from "vitest";

import { normalizePublicFormConfiguration } from "@/features/forms/config";

const fields = [
  { id: "name", key: "nome", label: "Nome", options: [], placeholder: "", required: true, type: "text" },
  { id: "phone", key: "telefone", label: "WhatsApp", options: [], placeholder: "", required: true, type: "phone" },
  { id: "state", key: "estado", label: "Seu estado", options: [], placeholder: "", required: true, type: "state" },
];

const capture = {
  consentText: "Autorizo a campanha a me enviar avisos por WhatsApp.",
  done: {
    buttonLabel: "Fazer parte do grupo",
    label: "Pronto",
    message: "Você já faz parte do movimento.",
    title: "Cadastro confirmado!",
  },
  steps: [
    {
      fields: ["nome", "telefone"],
      label: "Seus dados",
      note: "Ao continuar, seu nome fica registrado.",
      submitLabel: "Continuar",
      subtitle: "Leva 10 segundos.",
      title: "Preencha e entre para o movimento",
    },
    {
      fields: ["estado"],
      label: "Seu estado",
      note: "",
      submitLabel: "Entrar no grupo",
      subtitle: "É assim que a campanha se organiza por região.",
      title: "Qual o seu estado?",
    },
  ],
};

describe("configuração do modo captação", () => {
  it("permanece desligado quando form_config não declara capture", () => {
    const configuration = normalizePublicFormConfiguration({ fields }, {});
    expect(configuration.capture).toBeNull();
    expect(configuration.fields).toHaveLength(3);
  });

  it("permanece desligado no formulário legado", () => {
    expect(normalizePublicFormConfiguration(null, {}).capture).toBeNull();
  });

  it("lê as etapas declaradas", () => {
    const configuration = normalizePublicFormConfiguration({ capture, fields }, {});
    expect(configuration.capture?.steps).toHaveLength(2);
    expect(configuration.capture?.steps[0].fields).toEqual(["nome", "telefone"]);
    expect(configuration.capture?.steps[1].submitLabel).toBe("Entrar no grupo");
    expect(configuration.capture?.consentText).toContain("Autorizo");
    expect(configuration.capture?.done.title).toBe("Cadastro confirmado!");
  });

  it("descarta capture sem nenhuma etapa aproveitável", () => {
    expect(
      normalizePublicFormConfiguration({ capture: { steps: [] }, fields }, {}).capture,
    ).toBeNull();
    expect(
      normalizePublicFormConfiguration({ capture: { steps: [{ title: "" }] }, fields }, {}).capture,
    ).toBeNull();
  });

  it("preenche rótulos padrão e ignora chaves de campo inválidas", () => {
    const configuration = normalizePublicFormConfiguration(
      {
        capture: { steps: [{ title: "Etapa", fields: ["nome", "NOME INVALIDO", "9x"] }] },
        fields,
      },
      {},
    );
    const step = configuration.capture?.steps[0];
    expect(step?.fields).toEqual(["nome"]);
    expect(step?.submitLabel).toBe("Continuar");
    expect(configuration.capture?.done.title).toBe("Cadastro confirmado!");
  });

  it("mantém o consentimento obrigatório mesmo com capture ligado", () => {
    const configuration = normalizePublicFormConfiguration({ capture, fields }, {});
    expect(configuration.requireConsent).toBe(true);
  });
});
