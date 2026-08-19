import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import { candidateSaveErrorMessage } from "@/components/CandidateSaveAlert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import type { CandidateAdminRow } from "./service";
import styles from "./candidates-admin.module.css";

const states = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG",
  "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR",
  "RS", "SC", "SE", "SP", "TO"
] as const;

export function CandidateForm({
  action,
  candidate,
  error,
  mode
}: {
  action: (formData: FormData) => Promise<void>;
  candidate?: CandidateAdminRow;
  error?: string;
  mode: "create" | "edit";
}) {
  const errorMessage = candidateSaveErrorMessage(error);

  return (
    <form action={action} className={styles.formCard}>
      <input name="candidate_ui" type="hidden" value="admin" />
      {candidate ? <input name="id" type="hidden" value={candidate.id} /> : null}

      {errorMessage ? (
        <p className={styles.formAlert} role="alert">{errorMessage}</p>
      ) : null}

      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2>Identificação</h2>
          <p>Dados exibidos no painel e associados às campanhas.</p>
        </div>
        <div className={styles.formGrid}>
          <FormField id="candidate-name" label="Nome" required>
            {(controlProps) => (
              <Input
                {...controlProps}
                defaultValue={candidate?.nome ?? ""}
                maxLength={120}
                name="nome"
                required
              />
            )}
          </FormField>
          <FormField id="candidate-party" label="Partido">
            {(controlProps) => (
              <Input
                {...controlProps}
                defaultValue={candidate?.partido ?? ""}
                maxLength={80}
                name="partido"
              />
            )}
          </FormField>
          <FormField id="candidate-role" label="Cargo">
            {(controlProps) => (
              <Input
                {...controlProps}
                defaultValue={candidate?.cargo ?? ""}
                maxLength={100}
                name="cargo"
              />
            )}
          </FormField>
          <FormField id="candidate-state" label="Estado">
            {(controlProps) => (
              <Select
                {...controlProps}
                defaultValue={candidate?.estado ?? ""}
                name="estado"
              >
                <option value="">Selecione</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </Select>
            )}
          </FormField>
          <FormField id="candidate-city" label="Município">
            {(controlProps) => (
              <Input
                {...controlProps}
                defaultValue={candidate?.municipio ?? ""}
                maxLength={120}
                name="municipio"
              />
            )}
          </FormField>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2>Hub público</h2>
          <p>Configure o endereço público que reúne as campanhas deste candidato.</p>
        </div>
        <div className={styles.formGrid}>
          <FormField
            description="Use letras minúsculas, números e hífens. No cadastro, deixe vazio para gerar pelo nome."
            id="candidate-public-slug"
            label="Slug do hub"
            required={mode === "edit"}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                defaultValue={candidate?.slug_publico ?? ""}
                maxLength={80}
                name="slug_publico"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="nome-do-candidato"
                required={mode === "edit"}
              />
            )}
          </FormField>
          <FormField
            description="Informe somente o domínio, sem protocolo, caminho ou porta."
            id="candidate-domain"
            label="Domínio personalizado"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                defaultValue={candidate?.dominio_formularios ?? ""}
                inputMode="url"
                maxLength={253}
                name="dominio_formularios"
                placeholder="candidato.com.br"
              />
            )}
          </FormField>
        </div>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary">
          <Save aria-hidden="true" size={17} />
          {mode === "create" ? "Criar candidato" : "Salvar alterações"}
        </Button>
        <Link className={styles.secondaryLink} href="/admin/candidates">
          <ArrowLeft aria-hidden="true" size={17} /> Cancelar
        </Link>
      </div>
    </form>
  );
}
