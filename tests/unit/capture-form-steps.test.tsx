import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicSignatureForm } from "@/components/PublicSignatureForm";

const fields = [
  { id: "name", key: "nome", label: "Nome", options: [], placeholder: "Como você quer ser chamado", required: true, type: "text" },
  { id: "phone", key: "telefone", label: "WhatsApp", options: [], placeholder: "(11) 9 9999-9999", required: true, type: "phone" },
  { id: "state", key: "estado", label: "Seu estado", options: [], placeholder: "", required: true, type: "state" },
];

const capture = {
  consentText: "Autorizo a campanha e o partido a me enviarem avisos por WhatsApp.",
  done: {
    buttonLabel: "Fazer parte do grupo",
    label: "Pronto",
    message: "Estamos te levando para o grupo oficial.",
    title: "Cadastro confirmado!",
  },
  steps: [
    {
      fields: ["nome", "telefone"],
      label: "Seus dados",
      note: "Você conclui o cadastro na próxima etapa.",
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

function renderCapture() {
  return render(
    <PublicSignatureForm
      campanhaId="00000000-0000-4000-8000-000000000000"
      formConfig={{ capture, fields, version: 1 }}
      meta={5000}
      settings={{ allow_sharing: true, collect_address: false, require_consent: true }}
      textoDot="Entre no grupo"
      textoForm="Movimento"
      totalAssinaturas={10}
    />
  );
}

describe("formulário em etapas (modo captação)", () => {
  it("abre na etapa 1 mostrando só os campos dela", () => {
    renderCapture();

    expect(screen.getByText("Etapa 1 de 3 · Seus dados")).toBeInTheDocument();
    expect(screen.getByText("Preencha e entre para o movimento")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("WhatsApp")).toBeInTheDocument();
    expect(screen.queryByLabelText("Seu estado")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });

  it("não mostra contador de assinaturas nem meta", () => {
    const { container } = renderCapture();
    expect(container.querySelector(".live-count-display")).toBeNull();
    expect(container.querySelector(".progress-bar-track")).toBeNull();
    expect(container.querySelector(".capture-progress")?.children).toHaveLength(3);
  });

  it("barra a passagem de etapa enquanto os campos não valem", () => {
    renderCapture();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Preencha e entre para o movimento")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-invalid", "true");
  });

  it("avança para a etapa 2 e volta para a 1 preservando o preenchimento", () => {
    renderCapture();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Julio Boaventura" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11987838530" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Etapa 2 de 3 · Seu estado")).toBeInTheDocument();
    expect(screen.getByText("Qual o seu estado?")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu estado")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar no grupo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "‹ Voltar" }));

    expect(screen.getByLabelText("Nome")).toHaveValue("Julio Boaventura");
  });

  it("mostra o consentimento da campanha somente na última etapa", () => {
    renderCapture();

    expect(screen.queryByText(capture.consentText)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Julio Boaventura" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11987838530" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(capture.consentText)).toBeInTheDocument();
  });
});

describe("formulário de abaixo-assinado (sem captação)", () => {
  it("mantém contador, consentimento padrão e botão de assinar", () => {
    const { container } = render(
      <PublicSignatureForm
        campanhaId="00000000-0000-4000-8000-000000000000"
        formConfig={{ fields, version: 1 }}
        meta={5000}
        settings={{ allow_sharing: true, collect_address: false, require_consent: true }}
        textoDot="Assine agora"
        textoForm="Abaixo-assinado"
        totalAssinaturas={10}
      />
    );

    expect(container.querySelector(".live-count-display")).toBeInTheDocument();
    expect(container.querySelector(".capture-progress")).toBeNull();
    expect(screen.getByRole("button", { name: "Assinar agora" })).toBeInTheDocument();
    expect(screen.getByLabelText("Seu estado")).toBeInTheDocument();
    expect(screen.getByText(/Declaro meu apoio a esta iniciativa/)).toBeInTheDocument();
  });
});

describe("campo de estado", () => {
  it("é uma lista de estados, não campo de duas letras", () => {
    renderCapture();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Julio Boaventura" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11987838530" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const estado = screen.getByLabelText("Seu estado");
    expect(estado.tagName).toBe("SELECT");
    // 27 estados mais a opção vazia.
    expect(estado.querySelectorAll("option")).toHaveLength(28);
    expect(screen.getByRole("option", { name: "São Paulo" })).toHaveValue("SP");
    expect(screen.getByRole("option", { name: "Minas Gerais" })).toHaveValue("MG");
  });

  it("grava a sigla, que é o formato aceito pela coluna", () => {
    renderCapture();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Julio Boaventura" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11987838530" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const estado = screen.getByLabelText("Seu estado");
    fireEvent.change(estado, { target: { value: "SP" } });
    expect(estado).toHaveValue("SP");
  });
});
