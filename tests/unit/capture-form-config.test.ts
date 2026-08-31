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
    { fields: ["nome", "telefone"], label: "Dados", note: "", submitLabel: "Avançar", subtitle: "", title: "Dados" },
    { fields: ["estado"], label: "Estado", note: "", submitLabel: "Entrar", subtitle: "", title: "Estado" },
  ],
};

describe("configuração progressiva compartilhada", () => {
  it("padroniza campanhas configuradas sem perder os rótulos existentes", () => {
    const configuration = normalizePublicFormConfiguration({ fields }, {});

    expect(configuration.capture?.steps[0].fields).toEqual(["nome", "telefone", "email"]);
    expect(configuration.capture?.steps[1].fields).toEqual([
      "cep",
      "bairro",
      "cidade",
      "estado",
    ]);
    expect(configuration.collectAddress).toBe(true);
    expect(configuration.fields.map((field) => field.key)).toEqual([
      "nome",
      "telefone",
      "email",
      "cep",
      "bairro",
      "cidade",
      "estado",
    ]);
    expect(configuration.fields.find((field) => field.key === "estado")?.label).toBe("Seu estado");
  });

  it("ativa o mesmo fluxo para formulários legados", () => {
    const configuration = normalizePublicFormConfiguration(null, {});

    expect(configuration.capture?.steps).toHaveLength(2);
    expect(configuration.legacy).toBe(true);
    expect(configuration.collectAddress).toBe(true);
  });

  it("preserva consentimento e confirmação personalizados", () => {
    const configuration = normalizePublicFormConfiguration({ capture, fields }, {});

    expect(configuration.capture?.consentText).toContain("Autorizo");
    expect(configuration.capture?.done.title).toBe("Cadastro confirmado!");
    expect(configuration.capture?.done.buttonLabel).toBe("Fazer parte do grupo");
    expect(configuration.capture?.steps[1].label).toBe("Endereço");
    expect(configuration.capture?.steps[1].submitLabel).toBe("Finalizar");
  });

  it("usa textos seguros quando a configuração antiga de etapas é inválida", () => {
    const configuration = normalizePublicFormConfiguration(
      { capture: { steps: [{ title: "" }] }, fields },
      {},
    );

    expect(configuration.capture?.steps[0].title).toBe("Conte um pouco sobre você");
    expect(configuration.capture?.done.title).toBe("Cadastro concluído!");
  });

  it("leva campos específicos da campanha para a etapa de endereço", () => {
    const configuration = normalizePublicFormConfiguration(
      {
        fields: [
          ...fields,
          { id: "occupation", key: "profissao", label: "Profissão", options: [], placeholder: "", required: false, type: "text" },
        ],
      },
      {},
    );

    expect(configuration.capture?.steps[1].fields).toContain("profissao");
  });

  it("mantém o consentimento obrigatório", () => {
    expect(normalizePublicFormConfiguration({ fields }, {}).requireConsent).toBe(true);
  });

  it("preserva um fluxo explicitamente configurado para campanhas especiais", () => {
    const configuration = normalizePublicFormConfiguration(
      { capture, captureMode: "configured", fields },
      {},
    );

    expect(configuration.capture?.steps[0].title).toBe("Dados");
    expect(configuration.capture?.steps[0].fields).toEqual(["nome", "telefone"]);
    expect(configuration.capture?.steps[1].fields).toEqual(["estado"]);
    expect(configuration.fields.map((field) => field.key)).toEqual([
      "nome",
      "telefone",
      "estado",
    ]);
    expect(configuration.collectAddress).toBe(false);
  });
});
