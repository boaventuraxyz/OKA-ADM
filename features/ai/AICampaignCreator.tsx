"use client";

import { Bot, Check, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
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

export function AICampaignCreator() {
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
          topic: form.get("topic"),
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
        description="Informe o contexto; a IA prepara uma primeira versão completa para você revisar."
        eyebrow="Assistente editorial"
        title="Criar campanha com IA"
      />

      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <CardHeader className={styles.cardHeader}>
            <span className={styles.icon}><Bot aria-hidden="true" size={22} /></span>
            <div>
              <h2>Briefing da campanha</h2>
              <p>Seja específico sobre o objetivo, público e tom da mensagem.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form className={styles.form} onSubmit={submit}>
              <FormField id="ai-topic" label="Tema" required>
                <Input
                  autoComplete="off"
                  id="ai-topic"
                  maxLength={160}
                  minLength={3}
                  name="topic"
                  placeholder="Ex.: segurança pública"
                  required
                />
              </FormField>
              <FormField
                description="Inclua objetivo, argumentos permitidos e qualquer fato já verificado."
                id="ai-brief"
                label="Copy e contexto"
                required
              >
                <Textarea
                  id="ai-brief"
                  maxLength={6000}
                  minLength={20}
                  name="brief"
                  placeholder="Quero uma campanha sobre…"
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

              {error ? <p className={styles.error} role="alert">{error}</p> : null}

              <Button fullWidth loading={pending} size="large" type="submit" variant="primary">
                <Sparkles aria-hidden="true" size={18} />
                {pending ? "Gerando rascunho…" : "Gerar rascunho"}
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
                  "Tema válido da biblioteca",
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
