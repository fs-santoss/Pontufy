# Diagnóstico de Produção — Pontufy

Auditoria de código, segurança e confiabilidade da aplicação, com as correções
aplicadas e os itens que dependem de ação do time. Severidades: 🔴 crítica ·
🟠 alta · 🟡 média · ⚪ baixa.

---

## Resumo executivo

A aplicação tinha **um bloqueador fatal de produção** (persistência) e **várias
falhas de isolamento multi-tenant e de segurança de webhooks/credenciais**. Em
um produto B2B multi-tenant, vazamento entre empresas e perda de dados
inviabilizam qualquer cliente — exatamente o sintoma relatado.

- ✅ **Corrigido e no ar** (PR #1 / branch `claude/wizardly-faraday-sxt9gt`):
  isolamento de `Reward` e `Lesson`, autenticação de webhook da fila,
  comparações de assinatura em tempo constante, exposição de senhas, bug de
  link de reset.
- 📦 **Pronto, aguardando provisionamento** (PR #2 / branch
  `claude/postgres-migration`): migração SQLite → PostgreSQL (resolve a perda de
  dados). Validado contra PostgreSQL 16 local.
- ⚠️ **Requer ação do time**: definir `AUTH_SECRET`, `DATABASE_URL`/`DIRECT_URL`
  no Vercel; revisar itens "pendentes" abaixo.

---

## 🔴 1. Persistência — SQLite em serverless (RESOLVIDO em PR #2)

**Causa raiz do "nada funciona/persiste".** Cada instância serverless da Vercel
tem filesystem efêmero. O app empacotava `prisma/dev.db` e copiava para `/tmp`
no cold start, então **toda escrita** (conclusão de aula, pontos, resgates,
novos cadastros, cursos gerados, troca de senha) era gravada apenas na cópia
`/tmp` daquela instância e perdida no próximo cold start — ou nunca vista por
outra instância concorrente.

**Correção:** migração para PostgreSQL (banco único, compartilhado e durável).
Migração inicial validada localmente (`migrate deploy` + `seed` + suíte de
isolamento). Ver `PRODUCTION.md` e **PR #2**.

**Ação necessária:** provisionar Postgres (Neon/Supabase/Vercel Postgres) e
definir `DATABASE_URL` (pooled), `DIRECT_URL` (direct) no Vercel.

---

## 🔴 2. AUTH_SECRET ausente em produção (AÇÃO NECESSÁRIA)

O build da Vercel falhou ao tentar tornar `AUTH_SECRET` obrigatório — o que
**comprova que a variável não está definida** no projeto. Sem ela, o NextAuth
usa um segredo derivável publicamente: **qualquer pessoa pode forjar um JWT de
sessão e se passar por qualquer usuário/role/tenant** (incluindo `super_admin`).

**Correção aplicada:** em vez de quebrar o build, o app agora emite um aviso de
segurança gritante nos logs quando `AUTH_SECRET` falta em produção.

**Ação necessária (urgente):** defina `AUTH_SECRET` no Vercel:
`openssl rand -base64 32`. Isso silencia o aviso e torna as sessões seguras.
(Sessões emitidas antes disso devem ser consideradas comprometidas.)

---

## 🟠 3. Isolamento multi-tenant — `Reward` e `Lesson` (CORRIGIDO em PR #1)

A extensão Zero-Trust `getTenantDb` **não escopava** `Reward` em
`findUnique`/`update`/`delete`, nem `Lesson` (que era totalmente ignorada apesar
do comentário dizer o contrário). Confirmado empiricamente: a base de um tenant
lia/alterava prêmios privados de **outro** tenant.

Impacto: usuário resgatava prêmio de outra empresa; admin desativava prêmio
global/alheio; colaborador concluía aula de outro tenant para ganhar pontos.

**Correção:** leituras de `Reward` expõem global + próprio; escritas restritas ao
próprio tenant. `Lesson` escopada via relação `course.tenantId` (e
`lessons/complete` passou a usar `findFirst`). `rewards/autopilot` deixou de ler
com o cliente sem escopo. Validado: todas as checagens de isolamento passam.

---

## 🟠 4. Webhook da fila sem autenticação real (CORRIGIDO em PR #1)

`/api/webhooks/queue-worker` apenas checava se o header de assinatura
**existia** — nunca o verificava. Qualquer um podia injetar cursos em qualquer
tenant e **drenar créditos de IA** enviando um `tenantId` arbitrário.

**Correção:** verificação HMAC real via `Receiver` do `@upstash/qstash`
(falha fechada; exige `QSTASH_CURRENT_SIGNING_KEY`/`QSTASH_NEXT_SIGNING_KEY`).

---

## 🟡 5. Endurecimento de webhooks e credenciais (CORRIGIDO em PR #1)

- **Assinaturas Stripe/afiliados:** comparação agora em tempo constante
  (`timingSafeEqual`); Stripe ganhou tolerância de timestamp de 5 min
  (anti-replay).
- **Onboarding Stripe:** não retorna mais senha temporária em texto plano; o
  admin define a própria senha via link de setup enviado por e-mail.
- **Import CSV:** cada usuário recebia a **mesma** senha (retornada na resposta).
  Agora cada um recebe um hash único inutilizável e define a senha pelo fluxo de
  "esqueci a senha".
- **Link de reset:** corrigido bug de precedência que gerava
  `https://undefined/reset-password?...`.

---

## Pendências recomendadas (não bloqueiam, mas importam para produção)

- 🟡 **Notificações SSE** (`/api/notifications/stream`) usam um array em memória.
  Em serverless multi-instância, o `broadcast` raramente alcança o ouvinte (estão
  em instâncias diferentes). Migrar para Upstash Redis Pub/Sub ou Ably/Pusher.
- 🟡 **Postback de afiliados** (`backend/postbackHandler.ts`) usa `TENANT_STORE`
  em memória (mock) e `persistCommission` é um stub que só faz `console.log` —
  comissões via postback não são creditadas. Há um caminho paralelo real em
  `/api/webhooks/affiliates`; unificar e persistir.
- 🟡 **Idempotência em memória** (`processedOrders Set`) não funciona entre
  instâncias; usar a tabela/Redis com TTL.
- 🟡 **`link-health` cron** itera uma lista estática de tenants; buscar do banco.
- ⚪ **Rate limiting / cache** dependem do Upstash Redis; sem ele viram no-op
  (degradação graciosa, ok para MVP, mas o rate limit de geração de IA não
  protege de fato sem Redis).
- ⚪ **Observabilidade:** padronizar logs estruturados e capturar erros
  (Sentry/Vercel) — hoje só `console.error`.

---

## Checklist de go-live

1. [ ] Provisionar PostgreSQL (Neon recomendado) e definir `DATABASE_URL`
       (pooled) + `DIRECT_URL` (direct) no Vercel.
2. [ ] Definir `AUTH_SECRET` (`openssl rand -base64 32`) no Vercel.
3. [ ] Revisar e mergear **PR #2** (migração Postgres). O deploy aplica as
       migrations automaticamente.
4. [ ] (Opcional) Rodar `npm run db:seed` para dados de demonstração.
5. [ ] Configurar segredos de webhook em uso: `QSTASH_*`, `STRIPE_WEBHOOK_SECRET`,
       `AFFILIATE_WEBHOOK_SECRET`, `CRON_SECRET`.
6. [ ] Definir provedor de e-mail (`RESEND_API_KEY`) para reset/onboarding reais.
7. [ ] Endereçar as pendências de SSE/postback antes de depender desses fluxos.
