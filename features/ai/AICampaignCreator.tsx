"use client";

import { Bot, Check, CircleAlert, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { THEME_REGISTRY } from "@/features/themes/registry";

import { AI_TONES } from "./schemas";
import styles from "./ai-campaign.module.css";

type CreationResponse =
  | {
      success: true;
      data: { campaign: { id: string }; generation: { suggestedThemeKey: string } };
    }
  | { success: false; error: { code: string; message: string } };

const toneLabels: Record<(typeof AI_TONES)[number], string> = {
  institucional: "Institucional",
  mobilizador: "Mobilizador",
  editorial: "Editorial",
  urgente: "Urgente",
};

export function AICampaignCreator({
  credentialVisible = true
}: {
  credentialVisible?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/ai/campaigns", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: form.get("brief"),
          tone: form.get("tone"),
          preferredThemeKey: selectedTheme || null,
        }),
      });
      const payload = (await response.json()) as CreationResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success ? "Não foi possível gerar o rascunho." : payload.error.message
        );
      }

      router.push(`/admin/campaigns/${payload.data.campaign.id}/edit?generated=1`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível gerar o rascunho. Tente novamente."
      );
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        description="Cole a copy. A IA identifica o assunto, escolhe o tema e organiza todos os campos para você revisar."
        eyebrow="Assistente editorial"
        title="Cole a copy e crie a campanha"
      />

      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <CardHeader className={styles.cardHeader}>
            <span className={styles.icon}><Bot aria-hidden="true" size={22} /></span>
            <div>
              <h2>Copy da campanha</h2>
              <p>Pode ser um texto cru. O assistente transforma o conteúdo em um rascunho completo.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form className={styles.form} onSubmit={submit}>
              <FormField
                description="Inclua os fatos e argumentos que podem ser usados. O assunto será identificado automaticamente."
                id="ai-brief"
                label="Cole a copy"
                required
              >
                <Textarea
                  id="ai-brief"
                  maxLength={6000}
                  minLength={20}
                  name="brief"
                  placeholder="Cole aqui o texto, a ideia ou o briefing da campanha…"
                  required
                  rows={10}
                />
              </FormField>
              <FormField id="ai-tone" label="Tom">
                <Select defaultValue="mobilizador" id="ai-tone" name="tone">
                  {AI_TONES.map((tone) => (
                    <option key={tone} value={tone}>{toneLabels[tone]}</option>
                  ))}
                </Select>
              </FormField>

              <fieldset className={styles.themeFieldset}>
                <legend>Tema visual preferido <span>(opcional)</span></legend>
                <div className={styles.themeGrid}>
                  {THEME_REGISTRY.map((theme) => {
                    const selected = selectedTheme === theme.key;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`${styles.themeChoice} ${selected ? styles.themeSelected : ""}`}
                        key={theme.key}
                        onClick={() => setSelectedTheme(selected ? "" : theme.key)}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={styles.themeSwatch}
                          style={{ background: `linear-gradient(135deg, ${theme.palette.background}, ${theme.palette.accent})` }}
                        />
                        <span><strong>{theme.name}</strong><small>{theme.category}</small></span>
                        {selected ? <Check aria-hidden="true" size={18} /> : null}
                      </button>
                    );
                  })}
                </div>
                <p>A IA só pode sugerir temas cadastrados nesta biblioteca.</p>
              </fieldset>

              {credentialVisible ? null : (
                <p className={styles.notice} role="status">
                  <CircleAlert aria-hidden="true" size={17} />
                  <span>
                    Não encontramos a credencial do AI Gateway no ambiente. Se o projeto usa
                    OIDC da Vercel a geração ainda funciona; caso contrário, defina{" "}
                    <code>AI_GATEWAY_API_KEY</code>.
                  </span>
                </p>
              )}

              {error ? <p className={styles.error} role="alert">{error}</p> : null}

              <Button fullWidth loading={pending} size="large" type="submit" variant="primary">
                <Sparkles aria-hidden="true" size={18} />
                {pending ? "Montando a campanha…" : "Criar campanha completa"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className={styles.side}>
          <Card>
            <CardHeader><h2>O que será criado</h2></CardHeader>
            <CardContent>
              <ul className={styles.checkList}>
                {[
                  "Título, headline, subtítulo e slogan",
                  "Texto principal, CTA e confirmação",
                  "Slug e metadados de SEO",
                  "Tema compatível com a biblioteca",
                  "Variações de copy para revisão",
                ].map((item) => <li key={item}><Check aria-hidden="true" size={16} /> {item}</li>)}
              </ul>
            </CardContent>
          </Card>
          <div className={styles.safetyNote}>
            <ShieldCheck aria-hidden="true" size={21} />
            <div>
              <strong>Revisão humana obrigatória</strong>
              <p>A campanha é salva como rascunho e nunca será publicada automaticamente.</p>
            </div>
            <Badge variant="warning">Draft</Badge>
          </div>
        </aside>
      </div>
    </div>
  );
}
