# Pontufy — Blueprint para Reformulação

> Exportação do conceito, domínio e aprendizados da v1 para guiar a construção da v2 em repositório limpo.

---

## O que é o Pontufy

**Plataforma B2B SaaS de gamificação corporativa.**

Empresas (tenants) contratam o serviço para transformar treinamentos internos em experiências engajadoras. Colaboradores completam aulas, acumulam pontos e trocam por recompensas reais em uma loja de benefícios integrada. O diferencial é a geração de cursos por IA: o RH descreve o objetivo do treinamento e a plataforma monta curso completo em segundos.

**Quem usa:**
- `admin_rh` — gestor de RH da empresa; cria cursos, gerencia recompensas, vê analytics, exporta relatórios.
- `employee` — colaborador; assiste aulas, acumula pontos, resgata recompensas.
- `guest` — acesso restrito (somente leitura de conteúdo, sem resgate).
- `super_admin` — interno Pontufy; acessa console global de tenants.

---

## Modelo de Dados (o que ficou certo)

```
Tenant
  id, name, sector, contractStatus, aiCredits, locale
  → users[], courses[], pointsLedger[], rewards[], invitations[]

User
  id, tenantId, name, email, passwordHash, role, pointsBalance
  roles: 'admin_rh' | 'employee' | 'guest' | 'super_admin'

Course
  id, tenantId, title, description, aiCreditsSpent, quizJson, status ('draft'|'published')
  → lessons[]

Lesson
  id, courseId, title, type ('text'|'video'), contentUrl (Markdown), pointsAssigned
  → completions[]

LessonCompletion
  id, userId, tenantId, lessonId
  UNIQUE(userId, lessonId)  ← garante idempotência

PointsLedger
  id, userId, tenantId, type ('gain'|'loss'), pointsAmount, description, timestamp
  ← log imutável de toda movimentação de pontos

Reward
  id, tenantId (null = global), partnerStore, title, affiliateLink, pricePoints,
  imageUrl, category ('tech'|'health'|'home'|'coupons'), isActive

IssuedCertificate
  id, userId, tenantId, courseId, courseName, issuedAt
  UNIQUE(userId, courseId)

Invitation
  id, tenantId, email, token, role, expiresAt, usedAt
  ← registro se auto-cadastro via convite; cria User ao ser usado

AuditLog
  id, tenantId, userId, action, ipAddress, previousValues, newValues, createdAt
```

**Regra de isolamento multi-tenant:** toda query que toca dados de tenant DEVE filtrar por `tenantId`. Nunca expor dados cross-tenant. Operações globais (auth, criação de tenant) usam o client Prisma direto.

---

## Funcionalidades Que Funcionam (preservar na v2)

### 1. Geração de Cursos por IA

O coração do produto. O admin descreve o objetivo e opcionalmente cola material de referência. A IA gera curso completo com aulas em Markdown e quiz.

**Schema obrigatório por aula:**
- `title` (string)
- `content` (Markdown, mínimo 200 chars — não `contentSummary`)
- `pointsAwarded` (inteiro 1-100)

**Schema do quiz:**
- `question`, `options` (array 3-5), `correctIndex` (0-based)

**Fallback em cadeia:** Gemini → OpenAI → Anthropic → template local.

Créditos de IA por tenant (`aiCredits`). Débito atômico dentro de `$transaction` com `updateMany({ where: { id, aiCredits: { gte: 1 } } })` — previne race condition.

Rate limit: 10 gerações/dia/tenant (via Redis).

### 2. Sistema de Pontos

- Ganho: ao completar aula (`pointsAssigned` da lição)
- Perda: ao resgatar recompensa (`pricePoints` da reward)
- Todo movimento registrado no `PointsLedger` (auditável, imutável)
- `user.pointsBalance` é o saldo denormalizado (sempre consistente via `$transaction`)

**Segurança na conclusão de aula:**
- Lock distribuído Redis (10s TTL) por `lesson:{tenantId}:{userId}:{lessonId}` — bloqueia duplo clique
- Idempotência: checa `LessonCompletion` antes de debitar
- Velocity check: impede completar múltiplas aulas em < 20s

### 3. Resgate de Recompensas

- Lock distribuído Redis por `redeem:{tenantId}:{userId}`
- Valida `pointsBalance >= reward.pricePoints` dentro da transação
- Gera URL de afiliado com tracking ID
- Registra no `PointsLedger` (type: 'loss')

### 4. Gamificação

- **Leaderboard Top 5** por tenant (cache 60s via `unstable_cache`)
- **Níveis por pontos:**
  - 0-499: Iniciante
  - 500-1999: Analista
  - 2000-4999: Analista Sênior
  - 5000-9999: Especialista
  - 10000+: Mestre
- **Celebração de pontos** animada ao completar aula
- **Quiz** ao final do curso

### 5. Analytics para o RH

Métricas em tempo real via PostgreSQL nativo (sem in-memory):
- Total de colaboradores ativos
- Total de conclusões de aulas
- Total de pontos distribuídos e resgatados
- Gráfico de engajamento diário (30 dias) — `DATE_TRUNC` no SQL, FULL OUTER JOIN entre completions e ledger

### 6. Player de Cursos

- Barra lateral com lista de aulas e progresso
- Renderização de conteúdo Markdown
- Player de vídeo para aulas tipo `video`
- Botão "Concluir Aula" com animação de celebração
- Quiz ao terminar todas as aulas
- Download de certificado PDF (jspdf) após conclusão total

### 7. Loja de Recompensas (Clube de Benefícios)

- Filtro por categoria
- Grid de produtos com saldo disponível
- Checkout drawer com confirmação
- Integração com links de afiliados (Amazon, Magalu, Shopee, MercadoLivre)

### 8. Painel Admin (HR)

- Métricas resumidas (cards)
- Lista de cursos com status
- Toggle de ativação de recompensas
- Gráficos de engajamento (`recharts`)
- Wizard de criação de cursos por IA
- Exportação CSV da folha de benefícios (payroll export)

### 9. Certificados

- Gerado com `jspdf` no servidor
- Inclui nome do usuário, curso, tenant e data
- Deduplicado via `IssuedCertificate` (UNIQUE userId+courseId)

### 10. Convites

- Admin cria convite por email com role
- Token único com expiração
- Registro se auto-cadastro via `?token=` na rota `/register`

---

## Stack Recomendada para a v2

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js (versão estável, não bleeding edge)** | Evitar problemas de middleware/proxy como na v1 |
| Auth | **Clerk** ou **NextAuth v4 (estável)** ou **Supabase Auth** | NextAuth v5 beta foi a maior fonte de dor na v1 |
| ORM | **Prisma + PostgreSQL** | Funcionou bem; manter |
| DB | **Supabase** | Funcionou bem em produção |
| AI | **Vercel AI SDK v4+ (`generateObject`)** | Manter o padrão de `generateObject` com `zod` schema |
| Estado | **Zustand** | Simples e funcionou bem |
| Estilo | **Tailwind CSS** | Manter |
| Email | **Resend** | Simples, funciona |
| Cache | **Upstash Redis** | Manter, mas inicialização lazy obrigatória |
| Pagamentos | **Stripe** | Manter estrutura de webhooks |

**Não usar na v2 (lições aprendidas):**
- ~~QStash~~ — complexidade desnecessária para o estágio atual; `setTimeout`/cron simples resolvem
- ~~Múltiplos endpoints para a mesma funcionalidade~~ — manter um único ponto por feature
- ~~SQLite~~ — partir direto do PostgreSQL
- ~~`src/proxy.ts` como middleware~~ — usar `middleware.ts` padrão do Next.js

---

## Tema Visual (preservar na v2)

```
Fundo principal:     #0a0a0a
Fundo card:          #141414
Fundo input:         #1f1f1f
Bordas:              #2a2a2a
Texto primário:      white
Texto secundário:    gray-400 / gray-500
Accent brand:        emerald-400 / emerald-600
Accent admin:        emerald-400
Accent superadmin:   violet-400
Erro:                red-400 / red-500/10 / red-500/20
```

Estética inspirada no Udemy dark mode. Cards com bordas sutis, sem sombras pesadas.

---

## Endpoints de API Relevantes (arquitetura)

```
POST /api/lessons/complete          ← conclusão de aula com lock + idempotência
POST /api/rewards/redeem            ← resgate de recompensa com lock
GET  /api/courses                   ← lista cursos do tenant
GET  /api/courses/[id]              ← curso com aulas e progresso
GET  /api/courses/enrolled          ← cursos em andamento do usuário
GET  /api/rewards                   ← lista recompensas (global + tenant)
GET  /api/admin/analytics           ← métricas do tenant
GET  /api/integrations/payroll/export  ← CSV de resgates do mês
POST /api/certificates/generate     ← gera PDF de certificado
POST /api/admin/users/invite        ← cria convite por email
GET  /api/users/me                  ← dados do usuário autenticado
GET  /api/users/me/history          ← histórico de pontos
GET  /api/notifications/stream      ← SSE de notificações
```

---

## Variáveis de Ambiente (o mínimo para funcionar)

```bash
# Obrigatórias
AUTH_SECRET="openssl rand -base64 32"
DATABASE_URL="postgresql://...pooled:6543/pontufy?pgbouncer=true"
DIRECT_URL="postgresql://...direct:5432/pontufy"

# IA (pelo menos uma)
GEMINI_API_KEY=""      # primeiro da cadeia de fallback
OPENAI_API_KEY=""      # segundo
ANTHROPIC_API_KEY=""   # terceiro

# Email
RESEND_API_KEY=""
EMAIL_FROM="Pontufy <noreply@pontufy.com>"

# Cache e rate limiting
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Opcionais
NEXTAUTH_URL=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
CRON_SECRET=""
```

---

## Padrões de Código que Ficaram Bons (reusar)

### Geração de curso com fallback de provider

```typescript
async function buildProviderChain(): LanguageModel[] {
  // Gemini → OpenAI → Anthropic
  // Tenta cada um; se falhar, tenta o próximo; se todos falharem, retorna template local
}

const { object } = await generateObject({
  model,
  schema: courseSchema, // zod schema com content mínimo 200 chars
  system: SYSTEM_PROMPT,
  prompt: userPrompt,
});
```

### Lock distribuído (Redis)

```typescript
// Acquire: SET key 'LOCKED' NX EX ttl → retorna true/false
// Release: DEL key no bloco finally
const lockAcquired = await acquireLock(`lesson:${tenantId}:${userId}:${lessonId}`, 10);
if (!lockAcquired) return { error: 'Transação em andamento', status: 429 };
try { ... } finally { await releaseLock(lockKey); }
```

### Transação atômica de pontos

```typescript
await db.$transaction(async (tx) => {
  await tx.lessonCompletion.create({ data: { userId, lessonId } });
  const updated = await tx.user.update({
    where: { id: userId },
    data: { pointsBalance: { increment: pointsToAward } },
  });
  await tx.pointsLedger.create({ data: { userId, tenantId, type: 'gain', ... } });
  return updated;
});
```

### Débito atômico de créditos de IA

```typescript
const debit = await tx.tenant.updateMany({
  where: { id: tenantId, aiCredits: { gte: 1 } }, // condição atômica
  data: { aiCredits: { decrement: 1 } },
});
if (debit.count === 0) throw new Error('INSUFFICIENT_CREDITS');
```

---

## O que NÃO trazer para a v2

| Problema | Por que não trazer |
|---|---|
| `src/proxy.ts` como middleware | Gambiarra do Next.js 16; usar `middleware.ts` normal |
| NextAuth v5 beta | Nunca funcionou de forma confiável em produção |
| Múltiplas implementações da mesma feature | Gerou dead code e confusão; manter um único ponto |
| QStash + workers assíncronos | Overhead desnecessário; nada que justifique no MVP |
| SQLite para desenvolvimento | Diffs de comportamento com prod; PostgreSQL local com Docker |
| `findUnique` em modelos sem PK simples | Use `findFirst` quando houver filtros compostos |
| Clientes Redis no top-level | Sempre lazy init (Vercel Edge) |
| `maxTokens` no AI SDK v6 | É `maxOutputTokens` |
| `toDataStreamResponse()` no AI SDK v6 | É `toTextStreamResponse()` |

---

## Fluxo Principal do Produto (happy path)

```
1. Super admin cria Tenant + concede aiCredits
2. Admin RH faz login → vai para /admin
3. Admin cria curso via IA Wizard:
   - Informa setor + objetivo do treinamento (+ opcional: cola PDF/texto de referência)
   - IA gera: título, descrição, 3-8 aulas (Markdown), quiz
   - Curso é salvo no banco e publicado automaticamente
4. Colaborador faz login → vai para /dashboard
   - Vê courses disponíveis (hero + rows)
   - Clica em curso → /player/[id]
   - Lê aulas, clica "Concluir Aula"
   - Recebe pontos + animação de celebração
   - Ao terminar todas as aulas → pode fazer quiz + baixar certificado
5. Colaborador vai para /loja (Clube de Benefícios)
   - Filtra por categoria
   - Seleciona produto → checkout drawer
   - Confirma resgate → pontos debitados, URL de afiliado exibida
6. Admin vê /admin/analytics:
   - Colaboradores ativos, pontos distribuídos, pontos resgatados
   - Gráfico de engajamento dos últimos 30 dias
   - Exporta CSV de resgates para folha de pagamento
```

---

## Arquitetura de Segurança (manter na v2)

- **Isolamento multi-tenant:** toda query via `getTenantDb(tenantId)` que injeta `WHERE tenantId = ?` automaticamente
- **Roles verificados em toda rota:** session lida server-side antes de qualquer query
- **Locks distribuídos:** previne double-spend de pontos e race conditions
- **Idempotência:** `LessonCompletion` tem `UNIQUE(userId, lessonId)` — nunca pontua duas vezes a mesma aula
- **Hash de senha:** scrypt com salt aleatório, formato `"salt:hash"`, comparação com `timingSafeEqual`
- **Convites com expiração:** tokens UUID únicos, `expiresAt` verificado ao usar
- **CSV Injection prevention:** sanitizar campos começando com `=`, `+`, `-`, `@` no export payroll

---

## Próximas Features para Planejar (não implementar ainda)

1. **Onboarding self-service** — tenant se cadastra, escolhe plano, entra em trial de 14 dias
2. **Notificações in-app** — centro de notificações (novo curso, pontos ganhos, recompensa disponível)
3. **Ranking entre tenants** (opt-in) — benchmark anônimo de engajamento
4. **Integração de payroll** — exportar resgates direto para sistemas de folha (Totvs, Senior)
5. **Modo offline/PWA** — manter progresso de aulas offline com sync posterior
6. **White-label** — logo e cores customizáveis por tenant
