-- Migration: Add IssuedCertificate table
-- Apply this to the Supabase PostgreSQL database

CREATE TABLE IF NOT EXISTS "IssuedCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssuedCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IssuedCertificate_userId_courseId_key" ON "IssuedCertificate"("userId", "courseId");
CREATE INDEX IF NOT EXISTS "IssuedCertificate_userId_idx" ON "IssuedCertificate"("userId");
CREATE INDEX IF NOT EXISTS "IssuedCertificate_tenantId_idx" ON "IssuedCertificate"("tenantId");

ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
