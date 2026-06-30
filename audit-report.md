# Relatório de Auditoria — Projeto Pontufy

**Data:** 14 de Junho de 2024
**Auditores:** Jules (Principal Cloud Architect & Cybersecurity Specialist)
**Status:** Concluído (Read-Only)

---

## 1. SEGURANÇA E ISOLAMENTO MULTITENANT (Zero Trust)

### [CRÍTICO] Injeção de Dados e Quebra de Isolamento via `coursePayload`
- **Arquivo:** `src/app/api/lessons/complete/route.ts` (Linhas 16-48)
- **Causa Raiz:** A API aceita um objeto `coursePayload` opcional vindo do cliente. Se o curso não for encontrado no banco escopado, o sistema usa o cliente `prisma` (global/unscoped) para realizar um `upsert` do curso e de todas as aulas fornecidas no payload.
- **Risco:** Um atacante autenticado pode injetar cursos e aulas arbitrárias em seu tenant ou até mesmo colidir IDs de outros tenants se os UUIDs não forem validados, além de manipular `pointsAssigned` para inflar saldos.
- **Proposta de Refatoração:** Remover a lógica de auto-provisionamento de cursos na rota de conclusão de aula. Cursos devem ser criados exclusivamente via `generateTrainingCourse` com validação de crédito e permissão `admin_rh`.

### [CRÍTICO] Gaps na Extensão Prisma Zero-Trust
- **Arquivo:** `src/backend/db.ts` (Linha 61)
- **Causa Raiz:** O modelo `LessonCompletion` foi explicitamente excluído do escopo automático no `$allModels` interceptor: `if (model === 'Tenant' || model === 'LessonCompletion') { return query(args); }`.
- **Risco:** Embora as APIs atuais filtrem por `userId` da sessão, qualquer erro de implementação em novas rotas ou no uso do cliente global `prisma` pode resultar em Cross-Tenant Data Leakage (ex: contar total de conclusões do sistema em vez de apenas do tenant).
- **Proposta de Refatoração:** Incluir `LessonCompletion` no isolamento. Adicionar a coluna `tenantId` à tabela `LessonCompletion` no `schema.prisma` para permitir filtragem nativa e performática sem depender de joins com `User`.

### [DÍVIDA TÉCNICA] Uso Inconsistente de Clientes Prisma
- **Arquivos:** `src/app/api/cron/expire-points/route.ts`, `src/app/api/webhooks/affiliates/route.ts`, entre outros.
- **Causa Raiz:** Várias rotas importam o `prisma` global diretamente em vez de usar `getTenantDb(tenantId)`.
- **Risco:** Falha humana. O desenvolvedor pode esquecer de incluir `where: { tenantId }` em queries complexas.
- **Proposta de Refatoração:** Proibir a exportação direta do cliente `prisma` no `db.ts` (torná-lo privado ao módulo) e forçar o uso de `getTenantDb` ou um `getSystemDb` (para crons globais com auditoria explícita).

---

## 2. ALTA DISPONIBILIDADE E GESTÃO DE ESTADO (HA & Edge)

### [CRÍTICO] Estado em Memória em Ambiente Serverless (SSE)
- **Arquivo:** `src/app/api/notifications/stream/route.ts` (Linha 12)
- **Causa Raiz:** O array `const listeners: Listener[] = [];` é mantido em nível de módulo. Em ambiente Vercel/Serverless, cada invocação pode cair em uma micro-VM diferente.
- **Risco:** Notificações enviadas por um processo (ex: conclusão de geração de curso) nunca chegarão ao usuário se o listener estiver em outra instância.
- **Proposta de Refatoração:** Migrar o sistema de broadcast para **Upstash Redis Pub/Sub**. O backend publica no canal `tenant:{id}` e as rotas SSE subscrevem ao canal correspondente.

### [PERFORMANCE] Agregação de Analytics em Memória (Não Escalonável)
- **Arquivo:** `src/app/api/admin/analytics/route.ts` (Linhas 16-35)
- **Causa Raiz:** O sistema busca todos os usuários do tenant e todas as conclusões de aulas para processar médias e totais via JavaScript (`map`, `filter`, `reduce`).
- **Risco:** Em tenants com milhares de usuários, esta rota causará `Memory Limit Exceeded` na Vercel e timeouts de banco.
- **Proposta de Refatoração:** Substituir o processamento em JS por `db.lessonCompletion.count()` e `db.pointsLedger.aggregate()` com agrupamento (`groupBy`) nativo do PostgreSQL. Implementar uma tabela `DailyAnalytics` para pre-agregação.

---

## 3. RESILIÊNCIA TRANSACIONAL (Gamification Engine)

### [PERFORMANCE] Concorrência em `completeLesson`
- **Arquivo:** `src/actions/lessons.ts` (Linhas 46-70)
- **Causa Raiz:** Embora utilize `$transaction`, a rota de conclusão de aula não utiliza um lock distribuído (Mutex) como a rota de recompensas.
- **Risco:** Em cenários de "double-tap" extremamente rápidos, se o `findUnique` de idempotência e o `create` do completion ocorrerem em milissegundos idênticos em instâncias diferentes, pode haver duplicidade de pontos (embora o `@unique` no banco vá disparar um erro, a experiência do usuário será uma falha 500 intermitente).
- **Proposta de Refatoração:** Adotar o padrão de Mutex Redis usado em `src/actions/rewards.ts` também para a conclusão de aulas críticas.

---

## 4. ESTABILIDADE DO MOTOR DE IA (AI Fallback Core)

### [DÍVIDA TÉCNICA] Duplicação de Lógica de Inicialização Redis
- **Arquivos:** `src/lib/redis.ts` e `src/lib/redis/mutex.ts`
- **Causa Raiz:** Ambos os arquivos implementam sua própria função `getRedis()` com variáveis de ambiente.
- **Risco:** Inconsistência de configuração e dificuldade de manutenção.
- **Proposta de Refatoração:** Centralizar a instância do Redis em `src/lib/redis.ts` e exportar uma única instância singleton (Lazy Initialized).

### [PERFORMANCE] Ausência de Cache em Recomendações
- **Arquivo:** `src/app/api/courses/recommendations/route.ts`
- **Causa Raiz:** A query de recomendações roda `notIn` contra um array potencialmente grande de `completedLessonIds` em cada request.
- **Risco:** Custo computacional alto no banco de dados para uma funcionalidade de "descoberta".
- **Proposta de Refatoração:** Utilizar `unstable_cache` do Next.js com tags de expiração vinculadas ao `userId`.

---

## 5. DÍVIDA TÉCNICA E QUALIDADE DE CÓDIGO (Linting)

### [DÍVIDA TÉCNICA] Débito Massivo de Tipagem (`any`)
- **Evidência:** 141 erros de linting relacionados a `no-explicit-any`.
- **Impacto:** Perda de segurança de tipos em operações críticas (Prisma transactions, AI payloads), aumentando o risco de bugs em produção que o compilador não consegue capturar.
- **Proposta de Refatoração:** Definir interfaces Zod/TypeScript para todos os payloads de API e resultados de query. Banir o uso de `any` via regras de CI.

### [PERFORMANCE] Componentes React e Imagens não Otimizadas
- **Evidência:** Múltiplos avisos de `no-img-element` e `set-state-in-effect`.
- **Impacto:** LCP lento e re-renders desnecessários.
- **Proposta de Refatoração:** Migrar para `next/image` e refatorar `Navbar.tsx` para evitar cascading renders.

---

## CONCLUSÃO DA AUDITORIA

O sistema apresenta uma arquitetura sólida de isolamento via extensão do Prisma, mas possui **vulnerabilidades críticas de segurança em rotas legadas** que aceitam payloads de escrita sem validação de origem (course injection). A gestão de estado para notificações SSE é o principal impedimento para escalabilidade horizontal em produção.

**Prioridade Máxima:**
1. Sanear `src/app/api/lessons/complete/route.ts` (Remover course injection).
2. Implementar Redis Pub/Sub para SSE.
3. Corrigir gap de isolamento em `LessonCompletion`.
