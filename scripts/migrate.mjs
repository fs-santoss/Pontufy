// Applies pending Prisma migrations during the build, portably and resiliently.
//
// Why a script instead of `prisma migrate deploy` inline in the build command:
//  1. Portability — it does not depend on POSIX shell `${VAR:-default}` expansion,
//     which is not guaranteed in every CI/build shell.
//  2. `directUrl` fallback — Prisma validates DIRECT_URL whenever the schema
//     references it; here it defaults to DATABASE_URL so a single connection
//     string is enough for the common case.
//  3. Fail-soft — a migration failure (e.g. DATABASE_URL is a transaction-mode
//     pooler that can't run DDL) must NOT break the deploy. We warn loudly and
//     let `next build` proceed; the operator then sets DIRECT_URL (direct
//     endpoint) or runs `npm run db:migrate` once.
import { execSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    '\n🟠 DATABASE_URL is not set — skipping migrations. Set it (PostgreSQL) to ' +
      'apply the schema.\n',
  );
  process.exit(0);
}

// Prisma migrate uses directUrl; fall back to the main URL when unset.
const env = { ...process.env, DIRECT_URL: process.env.DIRECT_URL || databaseUrl };

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
} catch {
  console.warn(
    '\n🟠 `prisma migrate deploy` failed during build — continuing so the deploy ' +
      'completes.\n' +
      '   If DATABASE_URL is a transaction-mode pooler (PgBouncer / Supabase :6543 / ' +
      'Neon -pooler), migrations cannot run through it. Set DIRECT_URL to the direct ' +
      '(:5432) endpoint and redeploy, or run `npm run db:migrate` against the direct URL.\n',
  );
  // Intentionally exit 0: never block the deploy on a migration error.
  process.exit(0);
}
