# Pontufy MVP - Vercel Deployment Guide

## 1. Environment Variables Checklist
Before deploying to Vercel, ensure the following variables are strictly configured in the **Vercel Dashboard > Project Settings > Environment Variables**:

- [ ] `DATABASE_URL` (Remote PostgreSQL connection string, e.g., Neon DB / Supabase)
- [ ] `NEXTAUTH_URL` (Your production domain, e.g., `https://pontufy-staging.vercel.app`)
- [ ] `NEXTAUTH_SECRET` (Run `npx auth secret` or generate a secure base64 hash)
- [ ] `GEMINI_API_KEY` (For AI Generation via Google AI)
- [ ] `OPENAI_API_KEY` (If using OpenAI fallback)
- [ ] `ANTHROPIC_API_KEY` (If using Anthropic fallback)

## 2. Package.json Updates
The `package.json` script has already been updated to ensure the Prisma Client is generated before the Next.js build:
```json
"scripts": {
  "build": "prisma generate && next build"
}
```

## 3. Remote Database Migrations
Once your environment variables are set and your database is provisioned, safely apply the Prisma schema to your remote database using your local terminal. Run:

```bash
npx prisma migrate deploy
```

*(Optional) To populate the remote database with your MVP test data:*
```bash
npx prisma db seed
```

## 4. Vercel Configuration (`vercel.json`)
A minimalist `vercel.json` has been included in the root directory to extend the maximum execution duration for the AI course generation Serverless Function (prevents Vercel's default 10s-15s timeout):

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "functions": {
    "src/app/api/course/generate/route.ts": {
      "maxDuration": 60
    }
  }
}
```
