# Banco de dados

Este documento descreve o schema-alvo da plataforma OKA em Supabase Postgres.
Ele corresponde ao bootstrap autossuficiente em [`database/setup.sql`](../database/setup.sql)
e consolida o estado seguro das migrations registradas. Para a ordem e o
procedimento de evolução de ambientes existentes, consulte
[`docs/MIGRATION.md`](./MIGRATION.md).

## Princípios

- O banco é Supabase Postgres e usa UUIDs como chaves primárias.
- Nenhuma credencial ou usuário fixo é criado por SQL.
- `auth.users` é a fonte de identidade; `public.profiles` é a fonte de papel e
  ativação da plataforma.
- Dados de autorização nunca vêm de `raw_user_meta_data`.
- Tabelas em `public` usam RLS e grants explícitos. RLS e grants são camadas
  independentes e ambas precisam autorizar uma operação.
- `anon` não recebe acesso a nenhuma tabela da aplicação. Formulários públicos
  passam por endpoints confiáveis do servidor.
- Usuários autenticados não possuem `DELETE`. Campanhas são arquivadas e o
  histórico é preservado.
- Leads são dados pessoais. Somente `master` e `admin` podem consultá-los.
- Alterações de schema são aditivas e orientadas a migrations. Remoções só
  podem ocorrer depois de inventário de referências, dados e integrações.

Referências atuais do Supabase:

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Mudança de grants explícitos na Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## Mapa do schema

```text
auth.users
    1
    │ id (ON DELETE CASCADE)
    1
public.profiles
    │
    ├──< public.campanhas.created_by / updated_by (ON DELETE SET NULL)
    │
    └──< public.campaign_activity.user_id (ON DELETE SET NULL)

public.candidatos
    1
    │ candidato_id (ON DELETE SET NULL)
    N
public.campanhas
    1
    ├──< public.assinaturas (ON DELETE RESTRICT)
    └──< public.campaign_activity (ON DELETE RESTRICT)
```

Os relacionamentos `RESTRICT` impedem que uma campanha com leads ou histórico
seja apagada por acidente.

## Tipos

### `public.app_role`

Valores permitidos:

| Valor | Uso |
| --- | --- |
| `master` | Administração total da plataforma e de usuários |
| `admin` | Administração operacional, campanhas e leads |
| `editor` | Leitura do painel e criação/edição apenas de drafts |

### `public.campaign_status`

Valores permitidos:

| Valor | Significado |
| --- | --- |
| `draft` | Rascunho editável por editor |
| `published` | Campanha publicada |
| `archived` | Retida sem exclusão física |

## Tabelas

### `public.profiles`

Perfil de acesso associado 1:1 a `auth.users`.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK e FK para `auth.users.id`, cascade no usuário Auth |
| `email` | `text` | Cópia normalizada para administração, até 320 caracteres |
| `display_name` | `text` | Nome de exibição, até 160 caracteres |
| `role` | `app_role` | Obrigatório; novo usuário começa como `editor` |
| `is_active` | `boolean` | Obrigatório; novo usuário começa inativo |
| `created_at` | `timestamptz` | Criação |
| `updated_at` | `timestamptz` | Atualizado automaticamente |

O trigger de Auth pode usar metadata somente para o nome de exibição. Mesmo que
o cadastro envie `role=master` ou `is_active=true` em metadata, o perfil criado
será `editor` e inativo.

### `public.candidatos`

Entidade responsável por uma ou mais campanhas.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `nome` | `varchar` | Obrigatório |
| `partido`, `cargo`, `municipio` | `varchar` | Metadados opcionais |
| `estado` | `char(2)` | UF opcional |
| `dominio_formularios` | `text` | Domínio normalizado e único quando presente |
| `slug_publico` | `text` | Slug estável, válido, único e obrigatório no schema-alvo |
| `criado_em` | `timestamp` | Timestamp legado |

`slug_publico` está no bootstrap final para suportar hubs de candidato. O código
continua tolerando temporariamente ambientes legados onde a coluna ainda não foi
promovida por migration.

### `public.campanhas`

Conteúdo, ciclo de vida, tema, configuração do formulário e SEO da campanha.

Campos estruturais:

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `titulo` | `varchar` | Obrigatório |
| `descricao` | `text` | Opcional |
| `candidato_id` | `uuid` | FK para `candidatos`, `SET NULL` |
| `status` | `campaign_status` | Obrigatório |
| `slug` | `text` | Slug normalizado, único quando presente |
| `theme_key` | `text` | Chave do registry visual, obrigatória |
| `created_at`, `updated_at` | `timestamptz` | Auditoria temporal moderna |
| `published_at`, `archived_at` | `timestamptz` | Marcos de ciclo de vida |
| `created_by`, `updated_by` | `uuid` | FKs opcionais para `profiles` |
| `form_config` | `jsonb` | Objeto JSON; configuração dos campos |
| `settings` | `jsonb` | Objeto JSON; configurações da campanha |

Campos de SEO:

| Coluna | Limite |
| --- | --- |
| `meta_title`, `og_title` | 120 caracteres |
| `meta_description`, `og_description` | 320 caracteres |
| `og_image` | 2048 caracteres e URL HTTPS ou caminho absoluto |

Campos de conteúdo ainda consumidos pelos quatro temas:

```text
texto_form, texto_dot, destaque_primario, destaque_secundario,
cor_destaque, imagem_fundo, imagem_lateral, texto_contexto,
texto_proposta, texto_conclusao, texto_impacto, texto_impacto_apoio,
texto_faixa, titulo_topicos, texto_topicos_intro, texto_topicos,
titulo_citacao, texto_citacao, nota_citacao, titulo_video, video_url,
texto_video, legenda_video, nota_video, titulo_assinar, texto_assinar,
texto_compartilhar, url_formulario
```

Campos de integração/compatibilidade:

```text
ativa, tema, criado_em, inicio_em, fim_em, id_planilha, assinaturas_meta
```

Os triggers mantêm `ativa ↔ status` e `tema ↔ theme_key` sincronizados durante a
transição. Uma atualização de status também preenche `published_at` ou
`archived_at` quando necessário.

### `public.assinaturas`

Leads e respostas dos formulários públicos.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `campanha_id` | `uuid` | FK obrigatória, `ON DELETE RESTRICT` |
| `nome_assinante` | `varchar` | Opcional no schema-alvo; depende de `form_config` |
| `numero_assinante`, `email_assinante` | `varchar` | PII opcional; unicidade normalizada por campanha quando presente |
| `endereco_assinante`, `n_assinante`, `complemento_assinante` | vários | Endereço opcional |
| `cidade_assinante`, `cep_assinante`, `estado_assinante` | vários | Localização opcional |
| `ip_origem` | `text` | Dado técnico restrito |
| `assinado_em` | `timestamptz` | Momento do envio |
| `source` | `text` | Origem, padrão `public_form`, até 80 caracteres |
| `consented_at` | `timestamptz` | Consentimento explícito; nulo apenas em histórico legado |
| `responses` | `jsonb` | Objeto com respostas configuráveis |
| `metadata` | `jsonb` | Objeto técnico controlado pelo servidor |
| `user_agent` | `text` | Dado técnico, até 512 caracteres |

A obrigatoriedade de nome, e-mail, telefone ou outro campo é regra do formulário
da campanha e deve ser validada no servidor. O banco mantém esses campos
opcionais para que o form builder não precise inventar PII que não foi pedido.

O frontend administrativo e a exportação não devem expor `ip_origem`,
`user_agent` ou `metadata`.

### `public.campaign_activity`

Log imutável de atividade de campanha.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `campaign_id` | `uuid` | FK obrigatória, `RESTRICT` |
| `user_id` | `uuid` | Ator; `SET NULL` se o perfil for removido |
| `action` | `text` | `created`, `edited`, `published`, `unpublished`, `duplicated` ou `archived` |
| `details` | `jsonb` | Objeto JSON |
| `created_at` | `timestamptz` | Criação |

Não há grant nem policy de `UPDATE` ou `DELETE`. `details` deve conter somente
contexto operacional mínimo, nunca PII de lead, tokens ou secrets.

## RLS e grants

Matriz efetiva para a aplicação:

| Objeto | `anon` | `editor` ativo | `admin`/`master` ativo | `service_role`/secret server-side |
| --- | --- | --- | --- | --- |
| `profiles` | nenhum | próprio perfil; atualiza só `display_name` | lê perfis; gestão de acesso usa serviço confiável | `SELECT`, `INSERT`, `UPDATE` |
| `candidatos` | nenhum | `SELECT` | `SELECT`, `INSERT`, `UPDATE` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `campanhas` | nenhum | lê; cria/edita somente `draft` | lê, cria e atualiza todos os status | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `assinaturas` | nenhum | nenhum | `SELECT` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `campaign_activity` | nenhum | `SELECT`, `INSERT` próprio | `SELECT`, `INSERT` próprio | `SELECT`, `INSERT` |

Observações:

- Perfis inativos falham em todas as policies baseadas em papel.
- Não existe policy autenticada de `DELETE`.
- A policy de inserção no histórico exige `user_id = auth.uid()` e `details` como
  objeto JSON.
- A Data API pública não lê campanhas diretamente. Páginas públicas usam o
  servidor, que devolve apenas o payload necessário.
- A chave secreta do Supabase só pode existir em contexto server-side. Nunca
  use `SUPABASE_SECRET_KEY` ou chave equivalente em código do navegador.

## Funções e triggers

| Função | Segurança | Uso |
| --- | --- | --- |
| `private.set_updated_at()` | invoker, `search_path=''` | Atualiza `updated_at` |
| `private.handle_new_auth_user_profile()` | definer, `search_path=''` | Cria perfil inativo após cadastro Auth |
| `private.has_role(app_role[])` | definer, stable, `search_path=''` | Autoriza RLS consultando perfil ativo |
| `private.sync_campaign_legacy_fields()` | invoker | Sincroniza status/tema legados |
| `private.set_campaign_actor()` | invoker | Grava `created_by`/`updated_by` da sessão |
| `public.rls_auto_enable()` | definer, `search_path=pg_catalog` | Ativa RLS em novas tabelas `public` |

Somente `authenticated` recebe `USAGE` no schema `private` e `EXECUTE` em
`private.has_role`. As funções de trigger têm execução revogada de todos os
papéis da Data API.

Triggers instalados:

```text
auth.users.platform_create_profile_after_auth_user_insert
public.profiles.profiles_set_updated_at
public.campanhas.campaigns_10_sync_legacy_fields
public.campanhas.campaigns_20_set_actor
public.campanhas.campaigns_90_set_updated_at
event trigger ensure_rls
```

## Índices

Índices principais por padrão de consulta:

- `profiles_email_normalized_idx`: busca administrativa por e-mail.
- `candidatos_dominio_formularios_unico`: roteamento por domínio.
- `candidatos_slug_publico_unico`: hub público por slug.
- `campanhas_slug_normalized_uidx`: slug case-insensitive.
- `campanhas_candidato_id_idx`: FK e campanhas por candidato.
- `campanhas_status_updated_at_idx`: filtro de status + ordenação recente.
- `campanhas_theme_key_idx`: filtro/contagem por tema.
- `campanhas_created_by_idx` e `campanhas_updated_by_idx`: auditoria de ator.
- `assinaturas_campanha_assinado_em_idx`: paginação de leads por campanha/data.
- `assinaturas_campanha_email_normalized_uidx`: e-mail normalizado por campanha.
- `assinaturas_campanha_phone_normalized_uidx`: telefone numérico por campanha.
- `campaign_activity_campaign_created_at_idx`: timeline da campanha.
- `campaign_activity_user_created_at_idx`: ações por usuário.

Os índices legados `idx_assinaturas_campanha` e `idx_assinaturas_unico` são
preservados no bootstrap para compatibilidade e estão candidatos a remoção
futura, depois de confirmar planos de execução e integrações.

## Privilégios padrão

O bootstrap revoga os privilégios padrão de tabela, sequence, função e tipo para
`PUBLIC`, `anon`, `authenticated` e `service_role`, mas somente para o papel que
executa o arquivo. Essa é uma limitação nativa de `ALTER DEFAULT PRIVILEGES`.

Não há comando `FOR ROLE supabase_admin`: em projetos hospedados, esse papel
interno pode não ser assumível pelo executor e a tentativa falha. Por isso todos
os objetos da aplicação também recebem `REVOKE` explícito antes dos grants
mínimos. Novas migrations devem repetir o trio:

1. `GRANT` mínimo e explícito;
2. `ENABLE ROW LEVEL SECURITY`;
3. policies específicas.

## Criação do primeiro Master

O SQL não cria credenciais. O procedimento seguro é:

1. criar ou convidar a pessoa pelo Supabase Auth;
2. confirmar que o trigger criou `public.profiles` como `editor`, inativo;
3. com acesso administrativo ao banco, atualizar o perfil pelo UUID de
   `auth.users`, definindo `role = 'master'` e `is_active = true`;
4. confirmar o login e então administrar os demais usuários pelo painel.

Exemplo a executar no SQL Editor somente depois de substituir o UUID:

```sql
update public.profiles
set role = 'master'::public.app_role,
    is_active = true
where id = '<AUTH_USER_UUID>'::uuid;
```

Não use e-mail como fonte de autorização, não grave senha no SQL e não faça
commit de UUIDs pessoais como seed.

## Verificações sem ler PII

RLS e policies:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'candidatos', 'campanhas', 'assinaturas', 'campaign_activity'
  )
group by c.relname, c.relrowsecurity
order by c.relname;
```

Grants da Data API:

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles', 'candidatos', 'campanhas', 'assinaturas', 'campaign_activity'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;
```

Constraints que aguardam saneamento legado:

```sql
select c.conrelid::regclass as table_name, c.conname
from pg_constraint c
where c.connamespace = 'public'::regnamespace
  and not c.convalidated
order by c.conrelid::regclass::text, c.conname;
```

FK de retenção dos leads:

```sql
select pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.assinaturas'::regclass
  and conname = 'assinaturas_campanha_id_fkey';
```

Essas consultas usam apenas catálogo, nunca conteúdo de `profiles` ou
`assinaturas`.
