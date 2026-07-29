"use client";

import { useMemo, useState } from "react";

type Props = {
  campanhaId: string;
  candidatoId?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  textoBotao?: string | null;
  totalAssinaturas: number;
  meta?: number | null;
};

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);
  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
      let result = "";
      if (a) result += `(${a}`;
      if (a.length === 2) result += ") ";
      if (b) result += b;
      if (c) result += `-${c}`;
      return result;
    });
  }
  return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
}

function formatCep(value: string) {
  const numbers = onlyNumbers(value).slice(0, 8);
  return numbers.replace(/^(\d{5})(\d{0,3}).*/, (_, a, b) => (b ? `${a}-${b}` : a));
}

function validName(value: string) {
  const parts = value.trim().replace(/\s+/g, " ").split(" ");
  return value.trim().length >= 5 && parts.length >= 2;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validPhone(value: string) {
  const numbers = onlyNumbers(value);
  if (numbers.length < 10 || numbers.length > 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  const ddd = Number(numbers.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  return numbers.length === 11 ? numbers[2] === "9" : /^[1-8]/.test(numbers[2]);
}

function validCep(value: string) {
  return /^\d{5}-?\d{3}$/.test(value.trim());
}

export function PublicSignatureForm({
  campanhaId,
  candidatoId,
  titulo,
  descricao,
  textoBotao,
  totalAssinaturas,
  meta
}: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const progress = useMemo(() => {
    if (!meta || meta <= 0) return 0;
    return Math.min((totalAssinaturas / meta) * 100, 100);
  }, [meta, totalAssinaturas]);

  async function lookupCep(nextCep: string) {
    const clean = onlyNumbers(nextCep);
    if (clean.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setRua(data.logradouro || "");
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      }
    } catch {
      // CEP lookup is a convenience; submission still works if it fails.
    }
  }

  function validate() {
    const nextErrors = {
      nome: !validName(nome),
      telefone: !validPhone(telefone),
      email: !validEmail(email),
      cep: !validCep(cep),
      endereco: rua.trim().length < 3 || numero.trim().length < 1,
      complemento: complemento.trim().length < 1
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setToast(null);

    const formData = new FormData();
    formData.set("campanha_id", campanhaId);
    formData.set("nome_assinante", nome);
    formData.set("numero_assinante", telefone);
    formData.set("email_assinante", email);
    formData.set("cep_assinante", cep);
    formData.set("endereco_assinante", rua);
    formData.set("n_assinante", numero);
    formData.set("complemento_assinante", complemento);
    formData.set("cidade_assinante", cidade);
    formData.set("estado_assinante", estado);

    try {
      const response = await fetch("/api/assinaturas", {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("Erro ao salvar");

      setToast({ type: "success", text: "Assinatura realizada com sucesso!" });
      setTimeout(() => {
        if (candidatoId === "f037f25c-cdef-403a-a578-24e4fa863a3d") {
          window.open("https://chat.whatsapp.com/C3ShiDCMTdtKlzWVmw9AfP?s=cl&p=a&mlu=1", "_blank");
        }
        window.location.reload();
      }, 900);
    } catch {
      setToast({ type: "error", text: "Erro ao enviar formulário." });
      setBusy(false);
    }
  }

  return (
    <div className="signature-card">
      <h1>{titulo || "Abaixo-assinado"}</h1>
      <p className="desc">{descricao || "Preencha seus dados para participar."}</p>

      {meta && meta > 0 ? (
        <>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="page-toolbar-subtitle">
            {totalAssinaturas.toLocaleString("pt-BR")} / Meta: {meta.toLocaleString("pt-BR")}
          </p>
        </>
      ) : null}

      <form className="signature-grid" onSubmit={onSubmit}>
        <input
          className={`input ${errors.nome ? "invalid" : ""}`}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Nome completo"
          value={nome}
        />
        <input
          className={`input ${errors.telefone ? "invalid" : ""}`}
          onChange={(event) => setTelefone(formatPhone(event.target.value))}
          placeholder="Telefone"
          type="tel"
          value={telefone}
        />
        <input
          className={`input ${errors.email ? "invalid" : ""}`}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-mail"
          type="email"
          value={email}
        />
        <input
          className={`input ${errors.cep ? "invalid" : ""}`}
          onChange={(event) => {
            const next = formatCep(event.target.value);
            setCep(next);
            void lookupCep(next);
          }}
          placeholder="CEP"
          value={cep}
        />
        <div className="two-cols">
          <input
            className={`input ${errors.endereco ? "invalid" : ""}`}
            onChange={(event) => setRua(event.target.value)}
            placeholder="Endereço"
            value={rua}
          />
          <input
            className={`input ${errors.endereco ? "invalid" : ""}`}
            onChange={(event) => setNumero(event.target.value)}
            placeholder="Número"
            value={numero}
          />
        </div>
        <input
          className={`input ${errors.complemento ? "invalid" : ""}`}
          onChange={(event) => setComplemento(event.target.value)}
          placeholder="Complemento"
          value={complemento}
        />
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Enviando..." : textoBotao || "Assinar agora"}
        </button>
      </form>

      {toast ? <div className={`toast show ${toast.type}`}>{toast.text}</div> : null}
      <p className="policy-text">Seus dados são tratados conforme a LGPD.</p>
    </div>
  );
}
