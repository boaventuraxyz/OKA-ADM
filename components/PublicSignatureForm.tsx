"use client";

import { useMemo, useState } from "react";

type Props = {
  campanhaId: string;
  candidatoId?: string | null;
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

  const metaValue = meta ?? 0;
  const restante = Math.max(metaValue - totalAssinaturas, 0);
  const progresso = useMemo(() => {
    if (!metaValue || metaValue <= 0) return 0;
    return Math.min((totalAssinaturas / metaValue) * 100, 100);
  }, [metaValue, totalAssinaturas]);

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
      // A busca de CEP e apenas uma conveniencia; o envio continua disponivel.
    }
  }

  function showToast(text: string, type: "s" | "e") {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 3000);
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

    try {
      const response = await fetch("/api/assinaturas", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Erro ao salvar");

      showToast("Assinatura realizada com sucesso!", "s");
      window.setTimeout(() => {
        if (candidatoId === "f037f25c-cdef-403a-a578-24e4fa863a3d") {
          window.open("https://chat.whatsapp.com/C3ShiDCMTdtKlzWVmw9AfP?s=cl&p=a&mlu=1", "_blank");
        }

        window.location.reload();
      }, 1500);
    } catch {
      showToast("Erro ao enviar formulario", "e");
      setBusy(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url("https://api.fontshare.com/v2/css?f[]=clash-display@400,500,700&display=swap");

        .form-card {
          font-family: "Montserrat", sans-serif;
          background: #1a2338;
          border: 1px solid #2a3a58;
          border-radius: 16px;
          padding: 30px 26px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          color: #e8eaf0;
        }

        .form-card h1,
        .form-card h2,
        .form-card .card-title {
          font-family: "Clash Display", sans-serif;
        }

        .form-card .card-header {
          text-align: center;
        }

        .form-card .card-live {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #e05a5a;
          margin-bottom: 10px;
        }

        .form-card .card-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e05a5a;
          animation: pulseFc 1.4s ease-in-out infinite;
        }

        @keyframes pulseFc {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.5;
            transform: scale(0.75);
          }
        }

        .form-card .card-title {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 6px;
        }

        .form-card .card-desc {
          font-size: 13px;
          color: #7a8baa;
          line-height: 1.5;
        }

        .form-card .card-desc strong {
          color: #e8c84a;
        }

        .form-card .live-count-display {
          background: rgba(232, 200, 74, 0.06);
          border: 1px solid rgba(232, 200, 74, 0.18);
          border-radius: 10px;
          padding: 20px 16px;
          text-align: center;
        }

        .form-card .live-num {
          font-size: 52px;
          font-weight: 800;
          color: #e8c84a;
          line-height: 1;
          letter-spacing: -1px;
        }

        .form-card .live-pessoas {
          font-size: 15px;
          color: #e8eaf0;
          font-weight: 600;
          margin-top: 6px;
        }

        .form-card .remaining-text {
          font-size: 13px;
          color: #e05a5a;
          font-weight: 700;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .form-card .progress-bar-track {
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .form-card .progress-bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #e8c84a 0%, #f5df7f 100%);
          border-radius: 999px;
          transition: width 0.6s ease;
        }

        .form-card .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .form-card .progress-pct {
          font-size: 11px;
          font-weight: 700;
          color: #e8c84a;
          background: rgba(232, 200, 74, 0.12);
          padding: 2px 7px;
          border-radius: 4px;
        }

        .form-card .progress-count {
          font-size: 13px;
          color: #e8eaf0;
          font-weight: 600;
        }

        .form-card .progress-count span {
          color: #7a8baa;
          font-weight: 400;
        }

        .form-card .form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-card .form-input {
          width: 100%;
          background: #1e2c44;
          border: 1px solid #2a3a58;
          border-radius: 8px;
          padding: 13px 16px;
          font-family: "Montserrat", sans-serif;
          font-size: 14px;
          color: #e8eaf0;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .form-card .form-input::placeholder {
          color: #7a8baa;
        }

        .form-card .form-input:focus {
          border-color: #e8c84a;
        }

        .form-card .form-input.error {
          border-color: #e05a5a;
        }

        .form-card .field-error {
          font-size: 11px;
          color: #e05a5a;
          font-weight: 600;
          margin-top: -6px;
          display: none;
        }

        .form-card .field-error.show {
          display: block;
        }

        .form-card .endereco-row {
          display: grid;
          grid-template-columns: 1fr 100px;
          gap: 10px;
        }

        .form-card .btn-sign {
          width: 100%;
          background: #e8c84a;
          color: #0d111a;
          border: none;
          border-radius: 8px;
          padding: 15px;
          font-family: "Montserrat", sans-serif;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition:
            opacity 0.2s ease,
            transform 0.2s ease;
        }

        .form-card .btn-sign:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .form-card .btn-sign:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-card .form-footer {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          font-size: 12px;
          color: #7a8baa;
          text-align: center;
        }

        #toastApp.meutoast {
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          left: auto !important;
          top: auto !important;
          width: auto !important;
          min-width: 250px !important;
          max-width: 400px !important;
          height: auto !important;
          margin: 0 !important;
          padding: 14px 20px !important;
          background-color: #28a745;
          color: #fff;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          line-height: 1.4;
          z-index: 99999 !important;
          opacity: 0;
          transform: translateY(20px);
          transition:
            opacity 0.3s ease,
            transform 0.3s ease;
          pointer-events: none;
          word-wrap: break-word;
          box-sizing: border-box !important;
          display: block !important;
        }

        #toastApp.meutoast.show {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        #toastApp.meutoast.error {
          background-color: #dc3545;
        }

        @media (max-width: 900px) {
          .form-card {
            padding: 22px 20px;
            gap: 14px;
          }

          .form-card .card-title {
            font-size: 16px;
          }

          .form-card .card-desc {
            font-size: 12px;
          }

          .form-card .live-num {
            font-size: 36px;
          }

          .form-card .live-pessoas {
            font-size: 13px;
          }

          .form-card .remaining-text {
            font-size: 11px;
          }

          .form-card .live-count-display {
            padding: 14px 12px;
          }

          .form-card .form-input {
            padding: 11px 12px;
            font-size: 13px;
          }

          .form-card .btn-sign {
            padding: 13px;
            font-size: 14px;
          }

          .form-card .progress-pct {
            font-size: 10px;
          }

          .form-card .progress-count {
            font-size: 11px;
          }

          .form-card .form-footer {
            font-size: 11px;
          }

          .form-card .endereco-row {
            grid-template-columns: 1fr 80px;
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .form-card {
            padding: 18px 16px;
            border-radius: 12px;
            gap: 12px;
          }

          .form-card .card-title {
            font-size: 15px;
          }

          .form-card .card-desc {
            font-size: 11px;
          }

          .form-card .live-num {
            font-size: 30px;
          }

          .form-card .form-input {
            padding: 10px;
            font-size: 12px;
          }

          .form-card .btn-sign {
            padding: 12px;
            font-size: 13px;
          }

          .form-card .endereco-row {
            grid-template-columns: 1fr 70px;
            gap: 6px;
          }

          .form-card .field-error,
          .form-card .remaining-text,
          .form-card .progress-count,
          .form-card .form-footer {
            font-size: 10px;
          }

          .form-card .progress-pct {
            font-size: 9px;
          }
        }

        @media (max-width: 600px) {
          #toastApp.meutoast {
            left: 12px !important;
            right: 12px !important;
            bottom: 12px !important;
            max-width: none !important;
            min-width: 0 !important;
            font-size: 13px;
            padding: 12px 16px !important;
            text-align: center;
          }
        }
      `}</style>

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
            autoComplete="postal-code"
            className={`form-input ${errors.cep ? "error" : ""}`}
            id="cep"
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
              autoComplete="address-line2"
              className={`form-input ${errors.rua ? "error" : ""}`}
              id="numero"
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

          <button className="btn-sign" disabled={busy} type="submit">
            {busy ? "Enviando..." : "Assinar agora"}
          </button>
        </form>

        <div className="form-footer">
          <span>Leva menos de 1 minuto</span>
          <span>Seus dados estão protegidos conforme a LGPD</span>
        </div>
      </div>

      <div id="toastApp" className={`meutoast ${toast ? "show" : ""} ${toast?.type === "e" ? "error" : ""}`}>
        {toast?.text}
      </div>
    </>
  );
}
