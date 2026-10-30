-- AlterTable Document - add nullable columns for applications, storage and extraction
ALTER TABLE "Document" 
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "outcome" TEXT,
  ADD COLUMN IF NOT EXISTS "ocrChars" INTEGER,
  ADD COLUMN IF NOT EXISTS "extractedFields" JSONB,
  ADD COLUMN IF NOT EXISTS "applicationId" TEXT,
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AlterTable Document - make legacy columns optional
ALTER TABLE "Document" ALTER COLUMN "path" DROP NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "embedding" DROP NOT NULL;

-- CreateEnum ApplicationStatus
DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RECOMMENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum DocOutcome
DO $$ BEGIN
  CREATE TYPE "DocOutcome" AS ENUM ('CLASSIFIED', 'NEEDS_REVIEW', 'UNREADABLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum Severity
DO $$ BEGIN
  CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable Application
CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "title" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable CheckResult
CREATE TABLE IF NOT EXISTS "CheckResult" (
    "id" SERIAL NOT NULL,
    "applicationId" TEXT NOT NULL,
    "check" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable Review
CREATE TABLE IF NOT EXISTS "Review" (
    "id" SERIAL NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- AlterTable AuditLog
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Application_applicantId_idx" ON "Application"("applicantId");
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application"("status");
CREATE INDEX IF NOT EXISTS "Document_applicationId_idx" ON "Document"("applicationId");
CREATE INDEX IF NOT EXISTS "CheckResult_applicationId_idx" ON "CheckResult"("applicationId");
CREATE INDEX IF NOT EXISTS "Review_applicationId_idx" ON "Review"("applicationId");
CREATE INDEX IF NOT EXISTS "Review_reviewerId_idx" ON "Review"("reviewerId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "CheckResult" ADD CONSTRAINT "CheckResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
