"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { BRAZILIAN_STATES } from "@/lib/brazilian-states";
import {
  isValidCampaignFormResponse,
  normalizePublicFormConfiguration,
  resolveStandardFormFields,
  type CampaignFormField,
} from "@/features/forms/config";

type Props = {
  campanhaId: string;
  textoDot?: string | null;
  textoForm?: string | null;
  totalAssinaturas: number;
  meta?: number | null;
  formConfig?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  preview?: boolean;
  variant?: "default" | "editorial";
};

type CepApiResponse = {
  success: boolean;
  data?: {
    city: string;
    state: string;
    street: string;
  };
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

function customFieldInvalid(
  field: CampaignFormField,
  value: string | boolean | undefined
) {
  return !isValidCampaignFormResponse(field, value);
}

export function PublicSignatureForm({
  campanhaId,
  textoDot,
  textoForm,
  totalAssinaturas,
  meta,
  formConfig,
  settings,
  preview = false,
  variant = "default"
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
  const [cepStatus, setCepStatus] = useState<
    "idle" | "loading" | "found" | "manual"
  >("idle");
  const [currentTotal, setCurrentTotal] = useState(totalAssinaturas);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "s" | "e"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [customResponses, setCustomResponses] = useState<Record<string, string | boolean>>({});
  const [step, setStep] = useState(0);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(2);
  const cepRequest = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | null>(null);
  const redirectTimer = useRef<number | null>(null);

  const metaValue = meta ?? 0;
  const restante = Math.max(metaValue - currentTotal, 0);
  const progresso =
    metaValue > 0 ? Math.min((currentTotal / metaValue) * 100, 100) : 0;
  const editorial = variant === "editorial";
  const configuration = useMemo(
    () => normalizePublicFormConfiguration(formConfig, settings),
    [formConfig, settings]
  );
  const standardFields = resolveStandardFormFields(configuration);
  const nameField = standardFields.name;
  const phoneField = standardFields.phone;
  const emailField = standardFields.email;
  const cepField = standardFields.cep;
  const cityField = standardFields.city;
  const stateField = standardFields.state;
  const customFields = standardFields.custom;
  const FormContainer = preview ? "div" : "form";

  const capture = configuration.capture;
  // O widget insere um input oculto cf-turnstile-response dentro do formulário;
  // a rota de assinatura confere o token no servidor.
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const captureSteps = capture?.steps ?? [];
  const lastStep = Math.max(0, captureSteps.length - 1);
  const activeStep = capture ? captureSteps[Math.min(step, lastStep)] : null;
  const onLastStep = !capture || step >= lastStep;
  const done = Boolean(capture) && redirectTarget !== null;
  /** Segmentos da barra: as etapas de preenchimento mais a confirmação. */
  const stepCount = captureSteps.length + 1;

  /** Campo sem etapa declarada aparece na primeira, para nunca sumir da tela. */
  function stepOfField(key: string) {
    const index = captureSteps.findIndex((entry) => entry.fields.includes(key));
    return index >= 0 ? index : 0;
  }

  function fieldVisible(key: string | undefined) {
    if (!capture || !key) return true;
    return stepOfField(key) === Math.min(step, lastStep);
  }

  /** Traduz chaves de campo nas chaves usadas pelo mapa de erros. */
  function errorKeysFor(keys: readonly string[]) {
    const scope = new Set<string>();
    for (const key of keys) {
      if (nameField?.key === key) scope.add("nome");
      if (phoneField?.key === key) scope.add("tel");
      if (emailField?.key === key) scope.add("mail");
      if (cepField?.key === key) {
        scope.add("cep");
        scope.add("rua");
      }
      if (cityField?.key === key || stateField?.key === key) scope.add("localidade");
      if (customFields.some((field) => field.key === key)) scope.add(`custom_${key}`);
    }
    return scope;
  }

  useEffect(() => {
    return () => {
      cepRequest.current?.abort();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!redirectTarget) return;
    if (countdown <= 0) {
      window.location.assign(redirectTarget);
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, redirectTarget]);

  async function lookupCep(nextCep: string) {
    const clean = onlyNumbers(nextCep);
    if (clean.length !== 8) return;

    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;
    setCepStatus("loading");

    try {
      const response = await fetch(`/api/cep/${clean}`, {
        signal: controller.signal
      });
      const result = (await response.json()) as CepApiResponse;

      if (response.ok && result.success && result.data) {
        setRua(result.data.street || rua);
        setCidade(result.data.city);
        setEstado(result.data.state);
        setCepStatus("found");
      } else {
        setCepStatus("manual");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCepStatus("manual");
    }
  }

  function showToast(text: string, type: "s" | "e") {
    setToast({ text, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  function computeErrors() {
    const nextErrors: Record<string, boolean> = {
      nome: Boolean(
        nameField &&
          ((nameField.required && !nome.trim()) || (nome.trim() && !validName(nome)))
      ),
      tel: Boolean(
        phoneField &&
          ((phoneField.required && !telefone.trim()) ||
            (telefone.trim() && !validPhone(telefone)))
      ),
      mail: Boolean(
        emailField &&
          ((emailField.required && !email.trim()) || (email.trim() && !validEmail(email)))
      ),
      cep: Boolean(
        (cepField || configuration.collectAddress) &&
          (((cepField?.required || configuration.collectAddress) && !cep.trim()) ||
            (cep.trim() && !validCep(cep)))
      ),
      rua: configuration.collectAddress &&
        (rua.trim().length < 3 || numero.trim().length < 1),
      localidade:
        Boolean(cityField || stateField || configuration.collectAddress) &&
        ((Boolean(cityField?.required || configuration.collectAddress) && cidade.trim().length < 2) ||
          (Boolean(stateField?.required || configuration.collectAddress) &&
            !/^[A-Z]{2}$/.test(estado)))
    };

    for (const field of customFields) {
      nextErrors[`custom_${field.key}`] = customFieldInvalid(
        field,
        customResponses[field.key]
      );
    }

    return nextErrors;
  }

  /** Sem escopo valida o formulário inteiro; com escopo, só a etapa atual. */
  function validate(scope?: Set<string>) {
    const nextErrors = computeErrors();
    if (!scope) {
      setErrors(nextErrors);
      return !Object.values(nextErrors).some(Boolean);
    }

    const scoped = Object.fromEntries(
      Object.entries(nextErrors).filter(([key]) => scope.has(key))
    );
    setErrors((current) => ({ ...current, ...scoped }));
    return !Object.values(scoped).some(Boolean);
  }

  function advanceStep() {
    if (!activeStep) return;
    if (!validate(errorKeysFor(activeStep.fields))) return;
    setStep((current) => Math.min(current + 1, lastStep));
  }

  function updateCustomResponse(
    field: CampaignFormField,
    rawValue: string | boolean
  ) {
    const value =
      typeof rawValue === "string"
        ? field.type === "phone"
          ? formatPhone(rawValue)
          : field.type === "cep"
            ? formatCep(rawValue)
            : field.type === "state"
              ? rawValue.toUpperCase().slice(0, 2)
              : rawValue
        : rawValue;

    setCustomResponses((current) => ({ ...current, [field.key]: value }));
    setErrors((current) => ({
      ...current,
      [`custom_${field.key}`]: customFieldInvalid(field, value)
    }));
  }

  async function handleSign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    if (capture && !onLastStep) {
      advanceStep();
      return;
    }
    if (!validate()) return;

    setBusy(true);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("campanha_id", campanhaId);
    formData.set("nome_assinante", nameField ? nome : "");
    formData.set("numero_assinante", phoneField ? telefone : "");
    formData.set("email_assinante", emailField ? email : "");
    formData.set("endereco_assinante", configuration.collectAddress ? rua : "");
    formData.set("n_assinante", configuration.collectAddress ? numero : "");
    formData.set("cep_assinante", cepField || configuration.collectAddress ? cep : "");
    formData.set("cidade_assinante", cityField || configuration.collectAddress ? cidade : "");
    formData.set("estado_assinante", stateField || configuration.collectAddress ? estado : "");
    formData.set(
      "complemento_assinante",
      configuration.collectAddress ? complemento.trim() : ""
    );
    formData.set("responses", JSON.stringify(customResponses));

    try {
      const response = await fetch("/api/assinaturas", {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as {
        error?: { message?: string };
        erro?: string;
        redirectUrl?: string | null;
        sucesso?: boolean;
      };
      if (!response.ok || !result.sucesso) {
        throw new Error(result.error?.message || result.erro || "Erro ao salvar");
      }

      if (capture) {
        // A confirmação já é a própria etapa final; o toast seria ruído.
        setRedirectTarget(result.redirectUrl || "");
        setBusy(false);
        return;
      }

      showToast("Assinatura realizada com sucesso!", "s");
      if (result.redirectUrl) {
        const target = result.redirectUrl;
        redirectTimer.current = window.setTimeout(() => {
          window.location.assign(target);
        }, 700);
      } else {
        setCurrentTotal((value) => value + 1);
        setNome("");
        setTelefone("");
        setEmail("");
        setCep("");
        setRua("");
        setNumero("");
        setComplemento("");
        setCidade("");
        setEstado("");
        setCustomResponses({});
        setErrors({});
        formElement.reset();
        setBusy(false);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao enviar formulário", "e");
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`form-card ${editorial ? "form-card-editorial" : ""} ${capture ? "form-card-capture" : ""}`}>
        {capture ? (
          <div aria-label={`Etapa ${step + 1} de ${stepCount}`} className="capture-progress">
            {Array.from({ length: stepCount }, (_, index) => (
              <span
                className={index <= (done ? stepCount - 1 : step) ? "active" : ""}
                key={index}
              />
            ))}
          </div>
        ) : null}

        {capture && done ? (
          <div className="capture-done">
            <span className="capture-step-label">
              {`Etapa ${stepCount} de ${stepCount} · ${capture.done.label}`}
            </span>
            <span aria-hidden="true" className="capture-check">✓</span>
            <h2>{capture.done.title}</h2>
            {capture.done.message ? <p>{capture.done.message}</p> : null}
            {redirectTarget ? (
              <>
                <a className="btn-sign" href={redirectTarget}>
                  {capture.done.buttonLabel}
                </a>
                <small aria-live="polite">
                  {countdown > 0
                    ? `Redirecionando em ${countdown} segundo${countdown === 1 ? "" : "s"}...`
                    : "Abrindo o grupo..."}
                </small>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="card-header" hidden={done}>
          {capture ? (
            <>
              {activeStep?.label ? (
                <span className="capture-step-label">
                  {`Etapa ${step + 1} de ${stepCount} · ${activeStep.label}`}
                </span>
              ) : null}
              <h2 className="card-title">{activeStep?.title}</h2>
              {activeStep?.subtitle ? (
                <p className="card-desc">{activeStep.subtitle}</p>
              ) : null}
            </>
          ) : editorial ? (
            <>
              <h2 className="card-title">Assine o abaixo-assinado</h2>
              <p className="card-desc">
                {textoForm || "Manifeste seu apoio a esta iniciativa."}
              </p>
            </>
          ) : (
            <>
              <div className="card-live">
                <span className="card-live-dot" />
                {textoDot || "Assine agora"}
              </div>

              <div className="card-title">{textoForm || "Texto Apoio"}</div>

              <div className="card-desc">
                Precisamos de <strong>{metaValue.toLocaleString("pt-BR")} assinaturas</strong> para
                protocolar a solicitação.
              </div>
            </>
          )}
        </div>

        {!editorial && !capture ? (
          <>
            <div className="live-count-display">
              <div className="live-num" id="liveNum">
                {currentTotal.toLocaleString("pt-BR")}
              </div>
              <div className="live-pessoas">pessoas já assinaram</div>
              <div className="remaining-text" id="remainingText">
                Faltam {restante.toLocaleString("pt-BR")} para a meta
              </div>
            </div>

            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                id="progressFill"
                style={{ width: `${progresso}%` }}
              />
            </div>

            <div className="progress-info">
              <span className="progress-pct" id="progressPct">
                {Math.floor(progresso)}%
              </span>
              <span className="progress-count" id="progressCount">
                {currentTotal.toLocaleString("pt-BR")}{" "}
                <span>/ Meta: {metaValue.toLocaleString("pt-BR")}</span>
              </span>
            </div>
          </>
        ) : null}

        <FormContainer
          aria-label={preview ? "Demonstração do formulário de assinatura" : undefined}
          autoComplete={preview ? undefined : "on"}
          className="form-fields"
          hidden={done}
          id={preview ? undefined : "formAssinar"}
          onSubmit={preview ? undefined : (event) => {
            void handleSign(event as React.FormEvent<HTMLFormElement>);
          }}
        >
          <input
            aria-hidden="true"
            autoComplete="off"
            name="website"
            style={{ display: "none" }}
            tabIndex={-1}
            type="text"
          />
          {nameField && fieldVisible(nameField.key) ? <div className="signature-field signature-field-name">
            <label htmlFor="nome">{nameField.label}</label>
            <input
              aria-describedby="erroNome"
              aria-invalid={errors.nome || undefined}
              autoComplete="name"
              className={`form-input ${errors.nome ? "error" : ""}`}
              id="nome"
              maxLength={120}
              name="name"
              onBlur={() =>
                setErrors((value) => ({
                  ...value,
                  nome:
                    (nameField.required && !nome.trim()) ||
                    (Boolean(nome.trim()) && !validName(nome))
                }))
              }
              onChange={(event) => setNome(event.target.value)}
              placeholder={nameField.placeholder || "Seu nome completo"}
              required={nameField.required}
              type="text"
              value={nome}
            />
            <span className={`field-error ${errors.nome ? "show" : ""}`} id="erroNome">
              Informe seu nome completo
            </span>
          </div> : null}

          {phoneField && fieldVisible(phoneField.key) ? <div className="signature-field signature-field-phone">
            <label htmlFor="tel">{phoneField.label}</label>
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
                setErrors((value) => ({
                  ...value,
                  tel:
                    (phoneField.required && !next.trim()) ||
                    (Boolean(next.trim()) && !validPhone(next))
                }));
              }}
              placeholder={phoneField.placeholder || (editorial ? "(00) 00000-0000" : "WhatsApp com DDD")}
              required={phoneField.required}
              type="tel"
              value={telefone}
            />
            <span className={`field-error ${errors.tel ? "show" : ""}`} id="erroTel">
              Informe um telefone válido
            </span>
          </div> : null}

          {emailField && fieldVisible(emailField.key) ? <div className="signature-field signature-field-email">
            <label htmlFor="mail">{emailField.label}</label>
            <input
              aria-describedby="erroMail"
              aria-invalid={errors.mail || undefined}
              autoComplete="email"
              className={`form-input ${errors.mail ? "error" : ""}`}
              id="mail"
              maxLength={254}
              name="email"
              onBlur={() =>
                setErrors((value) => ({
                  ...value,
                  mail:
                    (emailField.required && !email.trim()) ||
                    (Boolean(email.trim()) && !validEmail(email))
                }))
              }
              onChange={(event) => setEmail(event.target.value)}
              placeholder={emailField.placeholder || (editorial ? "nome@email.com" : "Seu melhor e-mail")}
              required={emailField.required}
              type="email"
              value={email}
            />
            <span className={`field-error ${errors.mail ? "show" : ""}`} id="erroMail">
              Informe um e-mail válido (ex: nome@email.com)
            </span>
          </div> : null}

          {(cepField || configuration.collectAddress) && fieldVisible(cepField?.key) ? <div className="signature-field signature-field-cep">
            <label htmlFor="cep">{cepField?.label || "CEP"}</label>
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
                setErrors((value) => ({
                  ...value,
                  cep:
                    ((cepField?.required || configuration.collectAddress) && !next.trim()) ||
                    (Boolean(next.trim()) && !validCep(next))
                }));
                if (onlyNumbers(next).length < 8) setCepStatus("idle");
                void lookupCep(next);
              }}
              placeholder={cepField?.placeholder || (editorial ? "00000-000" : "CEP (00000-000)")}
              required={cepField?.required || configuration.collectAddress}
              type="text"
              value={cep}
            />
            <span className={`field-error ${errors.cep ? "show" : ""}`} id="erroCep">
              Informe um CEP válido (00000-000)
            </span>
            <span aria-live="polite" className="field-help">
              {cepStatus === "loading"
                ? "Buscando endereço..."
                : cepStatus === "found"
                  ? "Endereço localizado. Confira os dados."
                  : cepStatus === "manual"
                    ? "Não foi possível preencher automaticamente. Digite o endereço."
                    : "O preenchimento automático é opcional."}
            </span>
          </div> : null}

          {(configuration.collectAddress || cityField || stateField) &&
            fieldVisible(stateField?.key ?? cityField?.key) ? (
          <div className="signature-address-group">
            {configuration.collectAddress ? <>
            <div className="endereco-row">
              <div className="signature-field">
                <label htmlFor="rua">Endereço</label>
                <input
                  aria-describedby="erroRua"
                  aria-invalid={errors.rua || undefined}
                  autoComplete="address-line1"
                  className={`form-input ${errors.rua ? "error" : ""}`}
                  id="rua"
                  maxLength={160}
                  name="address-line1"
                  onBlur={() =>
                    setErrors((value) => ({
                      ...value,
                      rua: rua.trim().length < 3 || numero.trim().length < 1
                    }))
                  }
                  onChange={(event) => setRua(event.target.value)}
                  placeholder="Rua / Av. / Travessa..."
                  required
                  type="text"
                  value={rua}
                />
              </div>

              <div className="signature-field">
                <label htmlFor="numero">Número</label>
                <input
                  aria-describedby="erroRua"
                  aria-invalid={errors.rua || undefined}
                  autoComplete="address-line2"
                  className={`form-input ${errors.rua ? "error" : ""}`}
                  id="numero"
                  inputMode="numeric"
                  maxLength={8}
                  name="address-line2"
                  onBlur={() =>
                    setErrors((value) => ({
                      ...value,
                      rua: rua.trim().length < 3 || numero.trim().length < 1
                    }))
                  }
                  onChange={(event) => setNumero(event.target.value)}
                  placeholder="Nº"
                  required
                  type="text"
                  value={numero}
                />
              </div>
            </div>
            <span className={`field-error ${errors.rua ? "show" : ""}`} id="erroRua">
              Informe o endereço e o número
            </span>
            </> : null}
            <div className="endereco-row signature-location-row">
              {configuration.collectAddress || cityField ? <div className="signature-field">
                <label htmlFor="cidade">{cityField?.label || "Cidade"}</label>
                <input
                  aria-invalid={errors.localidade || undefined}
                  autoComplete="address-level2"
                  className={`form-input ${errors.localidade ? "error" : ""}`}
                  id="cidade"
                  maxLength={100}
                  name="city"
                  onChange={(event) => setCidade(event.target.value)}
                  placeholder={cityField?.placeholder || "Cidade"}
                  required={cityField?.required || configuration.collectAddress}
                  type="text"
                  value={cidade}
                />
              </div> : null}
              {configuration.collectAddress || stateField ? <div className="signature-field signature-field-state">
                <label htmlFor="estado">{stateField?.label || "UF"}</label>
                <select
                  aria-invalid={errors.localidade || undefined}
                  autoComplete="address-level1"
                  className={`form-input ${errors.localidade ? "error" : ""}`}
                  id="estado"
                  name="state"
                  onChange={(event) => setEstado(event.target.value)}
                  required={stateField?.required || configuration.collectAddress}
                  value={estado}
                >
                  <option value="">
                    {stateField?.placeholder || "Selecione o estado"}
                  </option>
                  {BRAZILIAN_STATES.map((state) => (
                    <option key={state.uf} value={state.uf}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div> : null}
            </div>
            <span className={`field-error ${errors.localidade ? "show" : ""}`}>
              Confira os dados de cidade e estado
            </span>
          </div>
          ) : null}

          {configuration.collectAddress ? <div className="signature-field signature-field-complement">
            <label htmlFor="complemento">Complemento (opcional)</label>
            <input
              autoComplete="address-line3"
              className="form-input"
              id="complemento"
              maxLength={120}
              name="address-line3"
              onChange={(event) => setComplemento(event.target.value)}
              placeholder={editorial ? "Apartamento, bloco ou casa" : "Apartamento, bloco, casa"}
              type="text"
              value={complemento}
            />
          </div> : null}

          {customFields.filter((field) => fieldVisible(field.key)).map((field) => {
            const inputId = `custom-${field.id}`;
            const errorKey = `custom_${field.key}`;
            const errorId = `${inputId}-error`;
            const response = customResponses[field.key];

            if (field.type === "checkbox") {
              return (
                <div className="signature-custom-field" key={field.key}>
                  <label className="signature-consent" htmlFor={inputId}>
                    <input
                      aria-describedby={errorId}
                      aria-invalid={errors[errorKey] || undefined}
                      checked={response === true}
                      id={inputId}
                      name={`response_${field.key}`}
                      onChange={(event) => updateCustomResponse(field, event.target.checked)}
                      required={field.required}
                      type="checkbox"
                    />
                    <span>{field.label}</span>
                  </label>
                  <span className={`field-error ${errors[errorKey] ? "show" : ""}`} id={errorId}>
                    Marque esta opção para continuar
                  </span>
                </div>
              );
            }

            return (
              <div className="signature-field signature-custom-field" key={field.key}>
                <label htmlFor={inputId}>
                  {field.label}
                  {field.required ? <span aria-hidden="true"> *</span> : null}
                </label>
                {field.type === "select" ? (
                  <select
                    aria-describedby={errorId}
                    aria-invalid={errors[errorKey] || undefined}
                    className={`form-input ${errors[errorKey] ? "error" : ""}`}
                    id={inputId}
                    name={`response_${field.key}`}
                    onChange={(event) => updateCustomResponse(field, event.target.value)}
                    required={field.required}
                    value={typeof response === "string" ? response : ""}
                  >
                    <option value="">Selecione</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    aria-describedby={errorId}
                    aria-invalid={errors[errorKey] || undefined}
                    className={`form-input signature-textarea ${errors[errorKey] ? "error" : ""}`}
                    id={inputId}
                    maxLength={2000}
                    name={`response_${field.key}`}
                    onChange={(event) => updateCustomResponse(field, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    value={typeof response === "string" ? response : ""}
                  />
                ) : (
                  <input
                    aria-describedby={errorId}
                    aria-invalid={errors[errorKey] || undefined}
                    autoComplete="off"
                    className={`form-input ${errors[errorKey] ? "error" : ""}`}
                    id={inputId}
                    inputMode={field.type === "phone" || field.type === "cep" ? "numeric" : undefined}
                    maxLength={field.type === "email" ? 254 : field.type === "state" ? 2 : 200}
                    name={`response_${field.key}`}
                    onChange={(event) => updateCustomResponse(field, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                    value={typeof response === "string" ? response : ""}
                  />
                )}
                <span className={`field-error ${errors[errorKey] ? "show" : ""}`} id={errorId}>
                  Confira este campo
                </span>
              </div>
            );
          })}

          {turnstileSiteKey && !preview ? (
            <div className="signature-turnstile" hidden={Boolean(capture) && step > 0}>
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
              />
              <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" />
            </div>
          ) : null}

          {!capture || onLastStep ? (
            <label className={`signature-consent ${editorial ? "theme2-consent" : ""}`}>
              <input name="consentimento" required type="checkbox" value="sim" />
              <span>
                {capture?.consentText ||
                  "Declaro meu apoio a esta iniciativa e autorizo o uso dos meus dados exclusivamente para fins relacionados a este abaixo-assinado, conforme a legislação aplicável."}
              </span>
            </label>
          ) : null}

          {capture ? (
            <div className={step > 0 ? "capture-actions" : undefined}>
              {step > 0 ? (
                <button
                  className="capture-back"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  type="button"
                >
                  ‹ Voltar
                </button>
              ) : null}
              {onLastStep ? (
                <button aria-busy={busy} className="btn-sign" disabled={busy} type="submit">
                  {busy ? "Enviando..." : activeStep?.submitLabel || "Enviar"}
                </button>
              ) : (
                <button className="btn-sign" onClick={advanceStep} type="button">
                  {activeStep?.submitLabel || "Continuar"}
                </button>
              )}
            </div>
          ) : (
            <button aria-busy={busy} className="btn-sign" disabled={busy} type="submit">
              {busy ? "Enviando..." : "Assinar agora"}
            </button>
          )}
        </FormContainer>

        {capture ? (
          activeStep?.note && !done ? (
            <p className="capture-note">{activeStep.note}</p>
          ) : null
        ) : editorial ? (
          <p className="theme2-form-note">Seus dados não serão compartilhados com terceiros.</p>
        ) : (
          <div className="form-footer">
            <span>Leva menos de 1 minuto</span>
            <span>Seus dados estão protegidos conforme a LGPD</span>
          </div>
        )}
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
