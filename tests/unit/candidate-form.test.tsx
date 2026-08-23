import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateForm } from "@/features/candidates/CandidateForm";

describe("formulário de novo candidato", () => {
  it("renderiza todos os campos sem lançar erro", () => {
    render(<CandidateForm action={async () => {}} mode="create" />);

    expect(screen.getByLabelText("Nome * (obrigatório)")).toBeInTheDocument();
    expect(screen.getByLabelText("Partido")).toBeInTheDocument();
    expect(screen.getByLabelText("Cargo")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado")).toBeInTheDocument();
    expect(screen.getByLabelText("Município")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar candidato" })).toBeInTheDocument();
  });
});
