# Pontufy — Go-Live Runbook (PostgreSQL)

This branch (`claude/postgres-migration`) moves Pontufy off SQLite onto
PostgreSQL, which is the **only production-viable** datastore for the app.

## Why this change is required

On Vercel, every serverless instance has its **own ephemeral filesystem**. The
previous setup bundled `prisma/dev.db` and copied it to `/tmp` on cold start, so:

- Every write (lesson completions, points, redemptions, new signups, generated
  courses, password changes) was saved only to that one instance's `/tmp` copy.
- The next cold start — or any other concurrent instance — never saw those
  writes, and they were silently lost.

That is why "nothing persists." PostgreSQL gives every instance a single shared,
durable database.

## What you must provision (one time)

1. **Create a PostgreSQL database** with a serverless-friendly pooler. Any of:
   - **Neon** (recommended): gives a pooled URL and a direct URL out of the box.
   - **Supabase**: pooled connection on port `6543`, direct on `5432`.
   - **Vercel Postgres**.

2. **Set environment variables** in Vercel → Settings → Environment Variables
   (Production *and* Preview), see `.env.example`:

   | Variable | Required? | Value |
   |---|---|---|
   | `AUTH_SECRET` | **yes** | `openssl rand -base64 32` — **currently unset; sessions are forgeable until you set this** |
   | `DATABASE_URL` | **yes** | the **pooled** connection string (PgBouncer / port 6543) |
   | `DIRECT_URL` | optional | the **direct** connection string (port 5432) |

   `DIRECT_URL` is optional: the build (`prisma migrate deploy`) falls back to
   `DATABASE_URL` when it is unset. Set it only if your `DATABASE_URL` is a
   transaction-mode pooler that can't run migrations (e.g. Supabase on `:6543`) —
   then point `DIRECT_URL` at the direct/session endpoint.

## Deploy

`npm run build` applies pending migrations (`scripts/migrate.mjs`) and then
builds. Migration is **fail-soft**: if it can't run (e.g. `DATABASE_URL` is a
transaction-mode pooler that rejects DDL), the build still succeeds and logs a
warning instead of failing the deploy.

- **Direct/reachable `DATABASE_URL`** → migrations apply automatically; tables are
  created on the first deploy. Nothing else to do.
- **Pooled `DATABASE_URL`** (PgBouncer / Supabase `:6543` / Neon `-pooler`) →
  set `DIRECT_URL` to the direct (`:5432`) endpoint **or** run the schema once
  yourself:

  ```bash
  # against the DIRECT (non-pooled) connection string
  DATABASE_URL="postgresql://…:5432/db" npm run db:migrate
  ```

## Seed (optional demo data)

```bash
# locally, with DATABASE_URL pointing at the new Postgres
npm run db:seed
```

Demo login after seeding: `admin@empresaalpha.com` / `123456` (role `admin_rh`).
In production, prefer onboarding real admins via Stripe checkout (which emails a
password-setup link) or the CSV import + "forgot password" flow.

## Local development

```bash
cp .env.example .env        # fill DATABASE_URL / DIRECT_URL / AUTH_SECRET
npx prisma migrate dev      # create local schema
npm run db:seed             # optional
npm run dev
```

## Schema changes from here on

Use migrations (never `db push` in production):

```bash
npx prisma migrate dev --name <change>   # authors + applies locally
git add prisma/migrations && git commit  # ship it; deploy applies it
```
