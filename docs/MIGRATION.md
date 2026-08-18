# Guia de migrations

Este projeto usa migrations imperativas, versionadas em
[`supabase/migrations`](../supabase/migrations), para evoluir ambientes
existentes. [`database/setup.sql`](../database/setup.sql) é um bootstrap
autossuficiente para um projeto Supabase novo ou para reconciliação controlada;
ele não substitui o histórico de migrations de produção.

## Estado remoto registrado

Ordem confirmada no histórico remoto em 18 de agosto de 2026:

1. `20260818123702_platform_foundation.sql`
2. `20260818123828_security_hotfix_lock_down_public_data_api.sql`
3. `20260818123919_reconcile_authenticated_platform_grants.sql`
4. `20260818132611_allow_optional_lead_name.sql`

Migration nova, ainda a confirmar no histórico remoto:

5. `20260818194500_review_campaign_copy.sql`

As três primeiras migrations formam a baseline segura consolidada pelo
bootstrap. A quarta é uma evolução aditiva posterior para compatibilizar o form
builder: `assinaturas.nome_assinante` passou a aceitar `NULL`, sem modificar
nenhum valor existente.

Não renomeie migrations já aplicadas. A versão do arquivo local deve ser igual
à versão registrada em `supabase_migrations.schema_migrations`.

## O que cada migration faz

### 1. `platform_foundation`

- cria os enums `app_role` e `campaign_status`;
- cria o schema fechado `private`;
- cria `profiles`, trigger seguro de `auth.users` e RBAC por perfil ativo;
- adiciona ciclo de vida, slug, tema moderno, SEO, JSON de formulário/settings,
  timestamps e atores às campanhas;
- preserva e sincroniza `ativa`/`tema` legados;
- adiciona consentimento, origem, respostas, metadata e user agent aos leads;
- torna a FK `assinaturas → campanhas` `ON DELETE RESTRICT`;
- cria `campaign_activity` e índices de consulta/unicidade;
- habilita RLS, cria policies e grants mínimos.

O backfill de Auth é propositalmente conservador: todos os usuários existentes
entram como `editor` inativo. Metadata pode fornecer somente nome de exibição.

### 2. `security_hotfix_lock_down_public_data_api`

- remove policies públicas antigas (`allow_public_*` e `full_access`);
- revoga grants de `PUBLIC`, `anon` e `authenticated` nas três tabelas legadas;
- revoga execução pública de `rls_auto_enable`;
- reduz privilégios padrão do papel executor.

Essa migration foi registrada depois da fundação e, por isso, também revogou os
grants autenticados protegidos por RLS criados no passo anterior.

### 3. `reconcile_authenticated_platform_grants`

Restaura somente o acesso necessário para sessões administrativas autenticadas:

```text
candidatos   SELECT, INSERT, UPDATE
campanhas    SELECT, INSERT, UPDATE
assinaturas  SELECT
```

`PUBLIC` e `anon` continuam sem acesso. As policies de papel permanecem a
segunda camada de autorização. Nenhum papel autenticado recebe `DELETE`.

### 4. `allow_optional_lead_name`

Executa somente:

```sql
alter table public.assinaturas
  alter column nome_assinante drop not null;
```

Isso é necessário porque uma campanha pode remover o campo nome em
`form_config`. A obrigatoriedade passa a ser validada no servidor para os campos
configurados pela campanha. A migration não preenche, apaga ou reescreve leads.

### 5. `review_campaign_copy`

Corrige quatro problemas editoriais objetivos encontrados na revisão das
campanhas existentes: uma tag HTML sem fechamento, um título com espaços
invisíveis, capitalização de uma legenda e capitalização inconsistente de um
título. Cada `UPDATE` exige o UUID e o valor anterior exato, portanto uma edição
posterior não é sobrescrita ao reproduzir a migration.

## Bootstrap versus migrations

### Ambiente existente

Use as migrations. Não execute `setup.sql` rotineiramente em produção e não
copie SQL manualmente para o Dashboard, pois isso separa schema e histórico.

Fluxo recomendado:

```bash
supabase migration list
supabase db push --dry-run
supabase db push
supabase migration list
```

`db push` aplica somente versões ausentes. Coordene para que uma única pessoa ou
pipeline faça o push por vez.

### Projeto Supabase novo

Há duas estratégias válidas; escolha uma e registre a decisão.

1. **Bootstrap:** execute `database/setup.sql` como dono do banco, verifique o
   catálogo e só então alinhe o histórico das migrations.
2. **Histórico completo:** mantenha uma migration de baseline do schema legado e
   reproduza todas as migrations em ordem com `supabase db reset`/`db push`.

Se usar o bootstrap e o schema já estiver comprovadamente equivalente, as
versões podem ser marcadas como aplicadas sem executar o SQL novamente:

```bash
supabase migration repair --status applied 20260818123702
supabase migration repair --status applied 20260818123828
supabase migration repair --status applied 20260818123919
supabase migration repair --status applied 20260818132611
```

`migration repair` altera somente a tabela de histórico. Nunca use esse comando
para esconder uma diferença de schema: faça primeiro as verificações deste guia.

## SQL legado consolidado

Os arquivos abaixo existiam antes da adoção do histórico atual:

| Arquivo | Estado no bootstrap |
| --- | --- |
| `supabase/campaign-template.sql` | Colunas e constraints dos temas incorporadas; o `DROP html` destrutivo não é repetido |
| `supabase/campaign-theme3.sql` | Conteúdo do tema manifesto e seus limites incorporados |
| `supabase/campaign-theme4.sql` | Tema 4 permitido em `campanhas_tema_valido` |
| `supabase/candidate-domain.sql` | Domínio normalizado, validado e único incorporado |
| `supabase/candidate-hubs.sql` | `slug_publico` incorporado ao schema-alvo do bootstrap |
| `supabase/security-hardening.sql` | Espelho operacional do hotfix; migration versionada é a fonte histórica |

Não execute esses arquivos soltos em produção. Se um ambiente existente ainda
não tiver `candidatos.slug_publico`, promova essa mudança por uma nova migration
timestamped e regenere os tipos; o código mantém fallback temporário até lá.

## Preservação de dados

O bootstrap e as migrations seguem estas regras:

- não removem tabelas nem linhas;
- não removem colunas legadas;
- preenchem somente colunas novas/nulas com defaults compatíveis;
- geram slugs determinísticos e adicionam UUID quando há colisão;
- convertem `ativa` para `status` e `tema` para `theme_key` sem descartar os
  valores antigos;
- interpretam `criado_em` legado como horário de São Paulo ao criar
  `created_at`/`updated_at` com timezone;
- mantêm `consented_at` nulo em leads históricos, sem inventar consentimento;
- trocam cascade por `RESTRICT` na FK de leads, preservando campanha e histórico;
- adicionam checks como `NOT VALID` e tentam validá-los. Se dado legado for
  incompatível, emitem warning e conservam o valor para saneamento explícito;
- não deduplicam leads automaticamente. Um índice único é adicionado somente
  quando não existem colisões normalizadas.

Um warning de constraint ou índice não deve ser ignorado. Registre a exceção,
investigue por contagens/agregações sem exportar PII e crie uma migration de
saneamento revisada.

## Colunas legadas e remoção futura

Nenhuma das colunas abaixo pode ser removida hoje, porque ainda há consumidores
no código ou possível integração externa.

| Legado | Substituto | Condição antes de remover |
| --- | --- | --- |
| `campanhas.ativa` | `campanhas.status` | Migrar páginas públicas/importação e remover trigger de sincronização |
| `campanhas.tema` | `campanhas.theme_key` | Migrar todos os renderers/importadores para o registry por chave |
| `campanhas.criado_em` | `campanhas.created_at` | Migrar queries/exports e validar timezone histórico |
| `campanhas.id_planilha` | Integração a definir | Inventariar integrações externas e confirmar dados não nulos |
| `idx_assinaturas_unico` | `assinaturas_campanha_email_normalized_uidx` | Confirmar planos de execução e ausência de consumidor pelo nome |
| `idx_assinaturas_campanha` | `assinaturas_campanha_assinado_em_idx` | Confirmar que o composto atende todas as consultas/FK |

Os campos textuais específicos de tema não estão depreciados: os renderers
públicos atuais ainda os utilizam. Uma migração para conteúdo estruturado só
pode ocorrer com leitura dupla, backfill e comparação visual das campanhas.

## Como criar a próxima migration

Use sempre a CLI para gerar o timestamp:

```bash
supabase migration new descricao_em_snake_case
```

Checklist antes do push:

1. mudança aditiva ou roll-forward seguro;
2. nenhum `DROP TABLE`, `DROP COLUMN` ou limpeza sem auditoria de dados;
3. constraints adicionadas idempotentemente;
4. índice em toda FK e nos filtros reais;
5. RLS ativado em qualquer tabela exposta;
6. `REVOKE` explícito seguido de grants mínimos;
7. policy com papel explícito e `auth.uid()` quando aplicável;
8. funções `security definer` fora do schema exposto, `search_path` fixo e
   `EXECUTE` revogado;
9. tipos TypeScript regenerados;
10. `supabase db push --dry-run` e revisão do SQL gerado.

## Validação pós-migration sem PII

Histórico:

```bash
supabase migration list
```

Coluna opcional do nome:

```sql
select table_schema, table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'assinaturas'
  and column_name = 'nome_assinante';
```

Contagens agregadas para detectar perda acidental:

```sql
select 'candidatos' as entity, count(*) from public.candidatos
union all
select 'campanhas', count(*) from public.campanhas
union all
select 'assinaturas', count(*) from public.assinaturas
union all
select 'profiles', count(*) from public.profiles
union all
select 'campaign_activity', count(*) from public.campaign_activity;
```

RLS e grants anônimos:

```sql
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'candidatos', 'campanhas', 'assinaturas', 'campaign_activity'
  )
order by c.relname;

select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('PUBLIC', 'anon')
  and table_name in (
    'profiles', 'candidatos', 'campanhas', 'assinaturas', 'campaign_activity'
  );
```

O segundo resultado deve ser vazio.

Constraints não validadas:

```sql
select c.conrelid::regclass as table_name, c.conname
from pg_constraint c
where c.connamespace = 'public'::regnamespace
  and not c.convalidated
order by c.conrelid::regclass::text, c.conname;
```

## Rollback

Produção segue roll-forward. Não use `db reset --linked`, `DROP` ou restauração
de snapshot para desfazer uma migration aditiva.

Se houver problema:

1. interrompa novos writes da funcionalidade afetada, se necessário;
2. crie uma migration corretiva nova;
3. preserve colunas/dados até confirmar a correção;
4. regenere tipos e execute smoke tests;
5. documente o incidente e as verificações.

`supabase db reset --linked` apaga dados e só pode ser usado em ambiente remoto
descartável de desenvolvimento, nunca em produção.
