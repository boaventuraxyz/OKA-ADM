import { readFile } from "node:fs/promises";
import { PGlite } from "file:///C:/Users/julio/AppData/Local/Temp/codex-platform-foundation-validation/node_modules/@electric-sql/pglite/dist/index.js";

const root =
  "C:/Users/julio/Documents/Codex/2026-08-18/https-github-com-boaventuraxyz-oka-adm/OKA-ADM";
const read = (path) => readFile(`${root}/${path}`, "utf8");

const setupSql = await read("database/setup.sql");
const legacySql = await Promise.all([
  read("supabase/campaign-template.sql"),
  read("supabase/campaign-theme3.sql"),
  read("supabase/campaign-theme4.sql"),
  read("supabase/candidate-domain.sql"),
  read("supabase/candidate-hubs.sql"),
]);
const migrations = await Promise.all([
  read("supabase/migrations/20260818123702_platform_foundation.sql"),
  read("supabase/migrations/20260818123828_security_hotfix_lock_down_public_data_api.sql"),
  read("supabase/migrations/20260818123919_reconcile_authenticated_platform_grants.sql"),
  read("supabase/migrations/20260818132611_allow_optional_lead_name.sql"),
  read("supabase/migrations/20260818194500_review_campaign_copy.sql"),
]);

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

  create table public.candidatos (
    id uuid primary key default gen_random_uuid(),
    nome character varying not null,
    partido character varying,
    cargo character varying,
    estado character(2),
    municipio character varying,
    criado_em timestamp without time zone default now()
  );
  create table public.campanhas (
    id uuid primary key default gen_random_uuid(),
    titulo character varying not null,
    descricao text,
    candidato_id uuid,
    url_formulario character varying,
    ativa boolean default true,
    inicio_em timestamp without time zone,
    fim_em timestamp without time zone,
    criado_em timestamp without time zone default now(),
    id_planilha text,
    assinaturas_meta bigint,
    constraint campanhas_candidato_id_fkey
      foreign key (candidato_id) references public.candidatos(id) on delete set null
  );
  create table public.assinaturas (
    id uuid primary key default gen_random_uuid(),
    campanha_id uuid not null,
    nome_assinante character varying not null,
    numero_assinante character varying,
    email_assinante character varying,
    endereco_assinante character varying,
    n_assinante integer,
    cidade_assinante character varying,
    cep_assinante character varying,
    estado_assinante character(2),
    ip_origem text,
    assinado_em timestamptz default (now() at time zone 'America/Sao_Paulo'),
    complemento_assinante character varying,
    constraint assinaturas_campanha_id_fkey
      foreign key (campanha_id) references public.campanhas(id) on delete cascade
  );
  create index idx_assinaturas_campanha
    on public.assinaturas (campanha_id);
  create unique index idx_assinaturas_unico
    on public.assinaturas (campanha_id, email_assinante);

  create function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path = pg_catalog
  as $$ begin end $$;
`;

const migrationDb = new PGlite();
await migrationDb.exec(baseline);
for (const sql of legacySql) await migrationDb.exec(sql);
for (const sql of migrations) await migrationDb.exec(sql);

const setupDb = new PGlite();
await setupDb.exec(baseline);
await setupDb.exec(setupSql);

const catalogQuery = `
  select jsonb_build_object(
    'columns', (
      select jsonb_agg(jsonb_build_object(
        'table', table_name,
        'column', column_name,
        'data_type', data_type,
        'udt_name', udt_name,
        'nullable', is_nullable,
        'default', column_default
      ) order by table_name, ordinal_position)
      from information_schema.columns
      where table_schema='public'
        and table_name in (
          'profiles','candidatos','campanhas','assinaturas','campaign_activity'
        )
    ),
    'constraints', (
      select jsonb_agg(jsonb_build_object(
        'table', r.relname,
        'name', c.conname,
        'type', c.contype,
        'validated', c.convalidated,
        'definition', pg_get_constraintdef(c.oid)
      ) order by r.relname, c.conname)
      from pg_constraint c
      join pg_class r on r.oid=c.conrelid
      join pg_namespace n on n.oid=r.relnamespace
      where n.nspname='public'
        and r.relname in (
          'profiles','candidatos','campanhas','assinaturas','campaign_activity'
        )
    ),
    'indexes', (
      select jsonb_agg(jsonb_build_object(
        'table', tablename,
        'name', indexname,
        'definition', indexdef
      ) order by tablename,indexname)
      from pg_indexes
      where schemaname='public'
        and tablename in (
          'profiles','candidatos','campanhas','assinaturas','campaign_activity'
        )
    ),
    'policies', (
      select jsonb_agg(jsonb_build_object(
        'table', tablename,
        'name', policyname,
        'command', cmd,
        'roles', roles,
        'using', qual,
        'check', with_check
      ) order by tablename,policyname)
      from pg_policies
      where schemaname='public'
        and tablename in (
          'profiles','candidatos','campanhas','assinaturas','campaign_activity'
        )
    ),
    'grants', (
      select jsonb_agg(jsonb_build_object(
        'table', table_name,
        'grantee', grantee,
        'privilege', privilege_type
      ) order by table_name,grantee,privilege_type)
      from information_schema.role_table_grants
      where table_schema='public'
        and table_name in (
          'profiles','candidatos','campanhas','assinaturas','campaign_activity'
        )
        and grantee in ('PUBLIC','anon','authenticated','service_role')
    ),
    'triggers', (
      select jsonb_agg(jsonb_build_object(
        'table', n.nspname || '.' || r.relname,
        'name', t.tgname,
        'definition', pg_get_triggerdef(t.oid)
      ) order by n.nspname,r.relname,t.tgname)
      from pg_trigger t
      join pg_class r on r.oid=t.tgrelid
      join pg_namespace n on n.oid=r.relnamespace
      where not t.tgisinternal
        and ((n.nspname='public' and r.relname in (
          'profiles','candidatos','campanhas','assinaturas','campaign_activity'
        )) or (n.nspname='auth' and r.relname='users'))
    )
  ) catalog
`;

const migrationCatalog = (await migrationDb.query(catalogQuery)).rows[0].catalog;
const setupCatalog = (await setupDb.query(catalogQuery)).rows[0].catalog;

const stable = (value) => JSON.stringify(value, null, 2);
const differences = [];
for (const section of Object.keys(migrationCatalog)) {
  if (stable(migrationCatalog[section]) !== stable(setupCatalog[section])) {
    differences.push(section);
  }
}

console.log(JSON.stringify({
  result: differences.length === 0 ? "EQUIVALENT" : "EXPECTED_SUPERSET_DIFFERENCE",
  differingSections: differences,
  migrationCounts: Object.fromEntries(
    Object.entries(migrationCatalog).map(([key, value]) => [key, value?.length ?? 0]),
  ),
  setupCounts: Object.fromEntries(
    Object.entries(setupCatalog).map(([key, value]) => [key, value?.length ?? 0]),
  ),
}, null, 2));

if (differences.length) {
  for (const section of differences) {
    console.log(`SECTION ${section}`);
    console.log("MIGRATIONS", stable(migrationCatalog[section]));
    console.log("SETUP", stable(setupCatalog[section]));
  }
}

await migrationDb.close();
await setupDb.close();
