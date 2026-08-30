// Roda as migracoes de seed contra o schema real em PGlite, para saber se o SQL
// aplica sem erro e com os valores esperados antes de tocar o banco de verdade.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFile(join(root, path), "utf8");

const setupSql = await read("database/setup.sql");
const schemaMigrations = [
  "20260821153000_add_bandeira_campaign_theme.sql",
  "20260821161500_raise_campaign_image_limit.sql",
];
const seedMigrations = [
  "20260821164500_seed_felipe_sertanejo_campaign.sql",
  "20260830213058_seed_miguel_patriota_informational_campaign.sql",
];

const baseline = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb,
    created_at timestamptz,
    updated_at timestamptz
  );
  create function auth.uid()
  returns uuid language sql stable
  as $$ select null::uuid $$;
`;

const db = new PGlite();
await db.exec(baseline);
await db.exec(setupSql);
for (const name of schemaMigrations) {
  await db.exec(await read(join("supabase", "migrations", name)));
}

// Reproduz producao: Miguel ja existe, mas com cadastro parcial e UF incorreta.
// A migration precisa reaproveitar o registro, preservar o partido informado e
// corrigir apenas cargo/UF, sem manter um municipio incompatível.
await db.exec(`
  insert into public.candidatos (
    id, nome, slug_publico, partido, cargo, estado, municipio
  )
  values (
    '33333333-3333-4333-8333-333333333333',
    'Miguel Patriota',
    'miguel-patriota',
    'Partido já cadastrado',
    null,
    'SP',
    'São Paulo'
  );
`);

// Primeira aplicacao.
for (const name of seedMigrations) {
  await db.exec(await read(join("supabase", "migrations", name)));
}
// Segunda aplicacao: precisa ser inofensiva.
for (const name of seedMigrations) {
  await db.exec(await read(join("supabase", "migrations", name)));
}

const { rows } = await db.query(`
  select
    c.slug,
    c.titulo,
    c.tema,
    c.theme_key,
    c.status,
    c.ativa,
    cand.nome as candidato,
    cand.cargo,
    c.settings -> 'candidate_number' as numero,
    jsonb_array_length(c.form_config -> 'fields') as campos,
    jsonb_array_length(c.form_config -> 'capture' -> 'steps') as etapas,
    c.form_config -> 'capture' -> 'done' -> 'title' as confirmacao,
    array_length(string_to_array(btrim(c.texto_topicos), E'\\n\\n'), 1) as bandeiras,
    array_length(string_to_array(btrim(c.texto_conclusao), E'\\n'), 1) as beneficios,
    c.settings -> 'legal' as rodape_legal
  from public.campanhas c
  left join public.candidatos cand on cand.id = c.candidato_id
  where c.slug = 'felipe-sertanejo'
`);

const { rows: counts } = await db.query(
  `select count(*)::int as total from public.campanhas where slug = 'felipe-sertanejo'`,
);

const campaign = rows[0];
const problems = [];
if (!campaign) problems.push("campanha nao foi criada");
if (counts[0].total !== 1) problems.push(`aplicar duas vezes duplicou (${counts[0].total})`);
if (campaign?.tema !== 8) problems.push(`tema ${campaign?.tema} != 8`);
if (campaign?.theme_key !== "bandeira") problems.push(`theme_key ${campaign?.theme_key}`);
if (campaign?.status !== "draft") problems.push(`status ${campaign?.status} deveria ser draft`);
if (campaign?.ativa !== false) problems.push("campanha nao deveria nascer ativa");
if (campaign?.etapas !== 2) problems.push(`etapas do formulario: ${campaign?.etapas}`);
if (campaign?.campos !== 3) problems.push(`campos do formulario: ${campaign?.campos}`);
if (campaign?.bandeiras !== 7) problems.push(`bandeiras: ${campaign?.bandeiras}`);
if (campaign?.beneficios !== 4) problems.push(`beneficios: ${campaign?.beneficios}`);
if (campaign?.rodape_legal !== null) {
  problems.push("rodape legal nao deveria vir na migracao (dado pessoal)");
}

console.log(JSON.stringify(campaign, null, 2));

if (problems.length) {
  console.error("\nFALHAS:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("\nseed valida: aplica, e idempotente e nao carrega dado pessoal");

const { rows: miguelRows } = await db.query(`
  select
    c.slug,
    c.titulo,
    c.tema,
    c.theme_key,
    c.status,
    c.ativa,
    c.url_formulario,
    cand.nome as candidato,
    cand.partido,
    cand.cargo,
    btrim(cand.estado) as estado,
    cand.municipio,
    c.settings ->> 'candidate_number' as numero,
    c.settings -> 'bandeira_labels' ->> 'hero' as rotulo_hero,
    c.settings -> 'bandeira_labels' ->> 'support' as rotulo_candidaturas,
    c.settings -> 'bandeira_labels' ->> 'topics' as rotulo_conteudos,
    c.settings -> 'bandeira_labels' ->> 'group' as rotulo_atualizacoes,
    jsonb_array_length(c.form_config -> 'fields') as campos,
    jsonb_array_length(c.form_config -> 'capture' -> 'steps') as etapas,
    array_length(string_to_array(btrim(c.texto_topicos), E'\\n\\n'), 1) as topicos,
    array_length(string_to_array(btrim(c.texto_conclusao), E'\\n'), 1) as beneficios,
    c.settings -> 'legal' as rodape_legal,
    position('Rony Gabriel' in c.texto_contexto) > 0 as menciona_rony
  from public.campanhas c
  left join public.candidatos cand on cand.id = c.candidato_id
  where c.slug = 'miguel-patriota'
`);

const { rows: miguelCounts } = await db.query(`
  select
    (select count(*)::int from public.campanhas where slug = 'miguel-patriota') as campanhas,
    (select count(*)::int from public.candidatos where lower(btrim(nome)) = 'miguel patriota') as candidatos
`);

const miguel = miguelRows[0];
const miguelCount = miguelCounts[0];
const miguelProblems = [];
if (!miguel) miguelProblems.push("campanha informativa nao foi criada");
if (miguelCount.campanhas !== 1) {
  miguelProblems.push(`aplicar duas vezes duplicou a campanha (${miguelCount.campanhas})`);
}
if (miguelCount.candidatos !== 1) {
  miguelProblems.push(`aplicar duas vezes duplicou o candidato (${miguelCount.candidatos})`);
}
if (miguel?.tema !== 8 || miguel?.theme_key !== "bandeira") {
  miguelProblems.push(`tema inesperado: ${miguel?.tema}/${miguel?.theme_key}`);
}
if (miguel?.status !== "draft" || miguel?.ativa !== false) {
  miguelProblems.push("campanha informativa deveria nascer como rascunho inativo");
}
if (miguel?.candidato !== "Miguel Patriota" || miguel?.cargo !== "Deputado Estadual") {
  miguelProblems.push("identificacao de Miguel Patriota incorreta");
}
if (miguel?.estado !== "RS" || miguel?.numero !== "20221") {
  miguelProblems.push("estado ou numero de Miguel Patriota incorreto");
}
if (miguel?.partido !== "Partido já cadastrado") {
  miguelProblems.push("partido existente nao foi preservado");
}
if (miguel?.municipio !== null) {
  miguelProblems.push("municipio incompatível com a UF nao foi removido");
}
if (!miguel?.menciona_rony) miguelProblems.push("Rony Gabriel nao aparece no conteudo");
if (miguel?.campos !== 3 || miguel?.etapas !== 2) {
  miguelProblems.push(`formulario inesperado: ${miguel?.campos} campos/${miguel?.etapas} etapas`);
}
if (miguel?.topicos !== 4 || miguel?.beneficios !== 4) {
  miguelProblems.push(`conteudo inesperado: ${miguel?.topicos} topicos/${miguel?.beneficios} beneficios`);
}
if (
  miguel?.rotulo_hero !== "Informações oficiais" ||
  miguel?.rotulo_candidaturas !== "Candidaturas" ||
  miguel?.rotulo_conteudos !== "Conteúdos" ||
  miguel?.rotulo_atualizacoes !== "Atualizações"
) {
  miguelProblems.push("rotulos informativos do tema nao foram preservados");
}
if (miguel?.url_formulario !== null) miguelProblems.push("URL nao fornecida foi inventada");
if (miguel?.rodape_legal !== null) miguelProblems.push("rodape legal nao deveria conter dado inventado");

console.log(JSON.stringify(miguel, null, 2));

if (miguelProblems.length) {
  console.error("\nFALHAS NA CAMPANHA MIGUEL:\n- " + miguelProblems.join("\n- "));
  process.exit(1);
}
console.log("\ncampanha informativa de Miguel valida: rascunho, idempotente e sem dados inventados");
