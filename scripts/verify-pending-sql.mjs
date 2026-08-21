// Aplica o SQL consolidado partindo de um banco ATRASADO, como o de producao:
// sem os temas 5-8, com o limite antigo de imagem e sem as colunas que vinham
// dos scripts avulsos (slug_publico e dominio_formularios).
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFile(join(root, path), "utf8");

/** Reproduz o schema anterior as migracoes pendentes. */
function outdatedSetup(setup) {
  return setup
    .replace("(tema in (1, 2, 3, 4, 5, 6, 7, 8))", "(tema in (1, 2, 3, 4))")
    .replace(/octet_length\(imagem_fundo\) <= 7000000/g, "octet_length(imagem_fundo) <= 1230000")
    .replace(/octet_length\(imagem_lateral\) <= 7000000/g, "octet_length(imagem_lateral) <= 1230000");
}

/** Remove as colunas que so existiam nos scripts avulsos. */
const dropLegacyColumns = `
  alter table public.candidatos
    drop constraint if exists candidatos_slug_publico_valido,
    drop constraint if exists candidatos_dominio_formularios_valido;
  drop index if exists public.candidatos_slug_publico_unico;
  drop index if exists public.candidatos_dominio_formularios_unico;
  alter table public.candidatos
    drop column if exists slug_publico,
    drop column if exists dominio_formularios;
`;

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create role service_role nologin bypassrls; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`);
await db.exec(outdatedSetup(await read("database/setup.sql")));
await db.exec(dropLegacyColumns);

// Dois candidatos pre-existentes: um qualquer, para conferir o backfill do
// slug, e o proprio Felipe Sertanejo, que e o caso do banco do Julio. O seed
// precisa reaproveitar esse, nao criar um segundo.
await db.exec(`
  insert into public.candidatos (id, nome, partido, cargo, estado, municipio)
  values
    ('11111111-1111-4111-8111-111111111111', 'Júlia de Castro', 'PL', 'Deputada', 'SP', 'São Paulo'),
    ('22222222-2222-4222-8222-222222222222', 'Felipe Sertanejo', 'PL', 'Deputado Estadual', 'SP', 'São Paulo');
`);

const columnsBefore = await db.query(`
  select column_name from information_schema.columns
  where table_schema='public' and table_name='candidatos'
    and column_name in ('slug_publico','dominio_formularios')
`);
console.log("antes:", columnsBefore.rows.map((r) => r.column_name).join(", ") || "(nenhuma das duas)");

// Cola o arquivo inteiro uma vez, como o Julio fara.
await db.exec(await read("migracoes-pendentes.sql"));

const checks = await db.query(`
  select
    (select pg_get_constraintdef(oid) from pg_constraint where conname='campanhas_tema_valido') as tema,
    (select pg_get_constraintdef(oid) from pg_constraint where conname='campanhas_imagem_fundo_valida') as imagem,
    (select count(*)::int from public.campanhas where slug='felipe-sertanejo') as campanhas,
    (select count(*)::int from public.candidatos where nome='Felipe Sertanejo') as felipes,
    (select candidato_id from public.campanhas where slug='felipe-sertanejo') as vinculado_a,
    (select slug_publico from public.candidatos where nome='Felipe Sertanejo' limit 1) as slug_novo,
    (select slug_publico from public.candidatos where nome='Júlia de Castro') as slug_backfill,
    (select is_nullable from information_schema.columns
       where table_schema='public' and table_name='candidatos' and column_name='slug_publico') as slug_nulo,
    (select count(*)::int from information_schema.columns
       where table_schema='public' and table_name='candidatos'
         and column_name='dominio_formularios') as tem_dominio
`);

const r = checks.rows[0];
console.log(JSON.stringify(r, null, 2));

const problems = [];
if (!r.tema?.includes("8")) problems.push("tema 8 nao liberado");
if (!r.imagem?.includes("7000000")) problems.push("limite de imagem nao subiu");
if (r.campanhas !== 1) problems.push(`campanha criada ${r.campanhas}x`);
if (!r.slug_novo) problems.push("candidato sem slug_publico");
if (r.felipes !== 1) problems.push(`candidato Felipe duplicado (${r.felipes})`);
if (r.vinculado_a !== '22222222-2222-4222-8222-222222222222')
  problems.push("campanha nao foi vinculada ao candidato que ja existia");
if (!r.slug_backfill) problems.push("candidato antigo nao recebeu slug no backfill");
if (r.slug_nulo !== "NO") problems.push("slug_publico deveria ser not null");
if (r.tem_dominio !== 1) problems.push("dominio_formularios nao foi criado");

if (problems.length) {
  console.error("\nFALHAS:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("\nOK: partindo de um banco atrasado, colar o arquivo aplica tudo");
