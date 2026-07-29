"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  campanhaId: string;
  candidatoId?: string | null;
  textoBotao?: string | null;
  totalAssinaturas: number;
  meta?: number | null;
};

type ViaCepResponse = {
  erro?: boolean;
  localidade?: string;
  logradouro?: string;
  uf?: string;
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
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length >= 5 && clean.split(" ").length >= 2;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validPhone(value: string) {
  const numbers = onlyNumbers(value);
  if (numbers.length < 10 || numbers.length > 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  const ddd = Number(numbers.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  if (numbers.length === 11) {
    return numbers[2] === "9";
  }

  return /^[1-8]/.test(numbers[2]);
}

function validCep(value: string) {
  return /^\d{5}-?\d{3}$/.test(value.trim());
}

export function PublicSignatureForm({
  campanhaId,
  candidatoId,
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
  const [toast, setToast] = useState<{ type: "s" | "e"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const cepRequest = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | null>(null);
  const reloadTimer = useRef<number | null>(null);

  const metaValue = meta ?? 0;
  const restante = Math.max(metaValue - totalAssinaturas, 0);
  const progresso =
    metaValue > 0 ? Math.min((totalAssinaturas / metaValue) * 100, 100) : 0;

  useEffect(() => {
    return () => {
      cepRequest.current?.abort();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    };
  }, []);

  async function lookupCep(nextCep: string) {
    const clean = onlyNumbers(nextCep);
    if (clean.length !== 8) return;

    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
        signal: controller.signal
      });
      if (!response.ok) return;
      const data = (await response.json()) as ViaCepResponse;

      if (!data.erro) {
        setRua(data.logradouro || "");
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // A busca de CEP e apenas uma conveniencia; o envio continua disponivel.
    }
  }

  function showToast(text: string, type: "s" | "e") {
    setToast({ text, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  function validate() {
    const nextErrors = {
      nome: !validName(nome),
      tel: !validPhone(telefone),
      mail: !validEmail(email),
      cep: !validCep(cep),
      rua: rua.trim().length < 3 || numero.trim().length < 1,
      complemento: complemento.trim() === ""
    };

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleSign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setBusy(true);

    const formData = new FormData();
    formData.set("campanha_id", campanhaId);
    formData.set("nome_assinante", nome);
    formData.set("numero_assinante", telefone);
    formData.set("email_assinante", email);
    formData.set("endereco_assinante", rua);
    formData.set("n_assinante", numero);
    formData.set("cep_assinante", cep);
    formData.set("cidade_assinante", cidade);
    formData.set("estado_assinante", estado);
    formData.set("complemento_assinante", complemento);
    formData.set("website", "");

    try {
      const response = await fetch("/api/assinaturas", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Erro ao salvar");

      showToast("Assinatura realizada com sucesso!", "s");
      reloadTimer.current = window.setTimeout(() => {
        if (candidatoId === "f037f25c-cdef-403a-a578-24e4fa863a3d") {
          window.open(
            "https://chat.whatsapp.com/C3ShiDCMTdtKlzWVmw9AfP?s=cl&p=a&mlu=1",
            "_blank",
            "noopener,noreferrer"
          );
        }

        window.location.reload();
      }, 1500);
    } catch {
      showToast("Erro ao enviar formulário", "e");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="form-card">
        <input id="campanhaID" type="hidden" value={campanhaId} />
        <input id="campanhaCandidatoID" type="hidden" value={candidatoId ?? ""} />

        <div className="card-header">
          <div className="card-live">
            <span className="card-live-dot" />
            Assine agora
          </div>

          <div className="card-title">{textoBotao || "Texto Apoio"}</div>

          <div className="card-desc">
            Precisamos de <strong>{metaValue.toLocaleString("pt-BR")} assinaturas</strong> para
            protocolar a solicitação.
          </div>
        </div>

        <div className="live-count-display">
          <div className="live-num" id="liveNum">
            {totalAssinaturas.toLocaleString("pt-BR")}
          </div>
          <div className="live-pessoas">pessoas já assinaram</div>
          <div className="remaining-text" id="remainingText">
            Faltam {restante.toLocaleString("pt-BR")} para a meta
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" id="progressFill" style={{ width: `${progresso}%` }} />
        </div>

        <div className="progress-info">
          <span className="progress-pct" id="progressPct">
            {Math.floor(progresso)}%
          </span>
          <span className="progress-count" id="progressCount">
            {totalAssinaturas.toLocaleString("pt-BR")}{" "}
            <span>/ Meta: {metaValue.toLocaleString("pt-BR")}</span>
          </span>
        </div>

        <form className="form-fields" id="formAssinar" autoComplete="on" onSubmit={handleSign}>
          <input
            aria-hidden="true"
            autoComplete="off"
            name="website"
            style={{ display: "none" }}
            tabIndex={-1}
            type="text"
          />
          <input
            aria-describedby="erroNome"
            aria-invalid={errors.nome || undefined}
            autoComplete="name"
            className={`form-input ${errors.nome ? "error" : ""}`}
            id="nome"
            name="name"
            onBlur={() => setErrors((value) => ({ ...value, nome: !validName(nome) }))}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Seu nome completo"
            type="text"
            value={nome}
          />
          <span className={`field-error ${errors.nome ? "show" : ""}`} id="erroNome">
            Informe seu nome completo
          </span>

          <input
            aria-describedby="erroTel"
            aria-invalid={errors.tel || undefined}
            autoComplete="tel"
            className={`form-input ${errors.tel ? "error" : ""}`}
            id="tel"
            name="phone"
            onChange={(event) => {
              const next = formatPhone(event.target.value);
              setTelefone(next);
              setErrors((value) => ({ ...value, tel: next.trim() !== "" && !validPhone(next) }));
            }}
            placeholder="WhatsApp com DDD"
            type="tel"
            value={telefone}
          />
          <span className={`field-error ${errors.tel ? "show" : ""}`} id="erroTel">
            Informe um telefone válido
          </span>

          <input
            aria-describedby="erroMail"
            aria-invalid={errors.mail || undefined}
            autoComplete="email"
            className={`form-input ${errors.mail ? "error" : ""}`}
            id="mail"
            name="email"
            onBlur={() => setErrors((value) => ({ ...value, mail: !validEmail(email) }))}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Seu melhor e-mail"
            type="email"
            value={email}
          />
          <span className={`field-error ${errors.mail ? "show" : ""}`} id="erroMail">
            Informe um e-mail válido (ex: nome@email.com)
          </span>

          <input
            aria-describedby="erroCep"
            aria-invalid={errors.cep || undefined}
            autoComplete="postal-code"
            className={`form-input ${errors.cep ? "error" : ""}`}
            id="cep"
            inputMode="numeric"
            maxLength={9}
            name="postal-code"
            onChange={(event) => {
              const next = formatCep(event.target.value);
              setCep(next);
              setErrors((value) => ({ ...value, cep: next.trim() !== "" && !validCep(next) }));
              void lookupCep(next);
            }}
            placeholder="CEP (00000-000)"
            type="text"
            value={cep}
          />
          <span className={`field-error ${errors.cep ? "show" : ""}`} id="erroCep">
            Informe um CEP válido (00000-000)
          </span>

          <div className="endereco-row">
            <input id="cidade" name="city" type="hidden" value={cidade} />
            <input id="estado" name="state" type="hidden" value={estado} />
            <input
              aria-describedby="erroRua"
              aria-invalid={errors.rua || undefined}
              autoComplete="address-line1"
              className={`form-input ${errors.rua ? "error" : ""}`}
              id="rua"
              name="address-line1"
              onBlur={() =>
                setErrors((value) => ({
                  ...value,
                  rua: rua.trim().length < 3 || numero.trim().length < 1
                }))
              }
              onChange={(event) => setRua(event.target.value)}
              placeholder="Rua / Av. / Travessa..."
              readOnly
              type="text"
              value={rua}
            />

            <input
              aria-describedby="erroRua"
              aria-invalid={errors.rua || undefined}
              autoComplete="address-line2"
              className={`form-input ${errors.rua ? "error" : ""}`}
              id="numero"
              inputMode="numeric"
              name="address-line2"
              onBlur={() =>
                setErrors((value) => ({
                  ...value,
                  rua: rua.trim().length < 3 || numero.trim().length < 1
                }))
              }
              onChange={(event) => setNumero(event.target.value)}
              placeholder="Nº"
              type="text"
              value={numero}
            />
          </div>
          <span className={`field-error ${errors.rua ? "show" : ""}`} id="erroRua">
            Informe o endereço e o número
          </span>

          <input
            aria-describedby="erroComplemento"
            aria-invalid={errors.complemento || undefined}
            autoComplete="address-line3"
            className={`form-input ${errors.complemento ? "error" : ""}`}
            id="complemento"
            name="address-line3"
            onChange={(event) => {
              setComplemento(event.target.value);
              setErrors((value) => ({
                ...value,
                complemento: event.target.value.trim() === ""
              }));
            }}
            placeholder="Apartamento, bloco, casa"
            type="text"
            value={complemento}
          />
          <span className={`field-error ${errors.complemento ? "show" : ""}`} id="erroComplemento">
            Informe o complemento
          </span>

          <button aria-busy={busy} className="btn-sign" disabled={busy} type="submit">
            {busy ? "Enviando..." : "Assinar agora"}
          </button>
        </form>

        <div className="form-footer">
          <span>Leva menos de 1 minuto</span>
          <span>Seus dados estão protegidos conforme a LGPD</span>
        </div>
      </div>

      <div
        aria-atomic="true"
        aria-live="polite"
        className={`meutoast ${toast ? "show" : ""} ${toast?.type === "e" ? "error" : ""}`}
        id="toastApp"
        role={toast?.type === "e" ? "alert" : "status"}
      >
        {toast?.text}
      </div>
    </>
  );
}
