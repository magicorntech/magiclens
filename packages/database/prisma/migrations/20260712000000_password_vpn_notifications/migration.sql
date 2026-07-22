-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "VpnProfileStatus" AS ENUM ('ACTIVE', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "VpnProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'generic',
    "serverHost" TEXT,
    "protocol" TEXT,
    "encryptedConfig" TEXT,
    "encryptedDataKey" TEXT,
    "status" "VpnProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "VpnProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserVpnProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vpnProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserVpnProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VpnProfile_organizationId_name_key" ON "VpnProfile"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "VpnProfile_organizationId_idx" ON "VpnProfile"("organizationId");
CREATE INDEX IF NOT EXISTS "VpnProfile_status_idx" ON "VpnProfile"("status");
CREATE INDEX IF NOT EXISTS "VpnProfile_deletedAt_idx" ON "VpnProfile"("deletedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "UserVpnProfile_userId_vpnProfileId_key" ON "UserVpnProfile"("userId", "vpnProfileId");
CREATE INDEX IF NOT EXISTS "UserVpnProfile_vpnProfileId_idx" ON "UserVpnProfile"("vpnProfileId");

CREATE INDEX IF NOT EXISTS "UserNotification_userId_readAt_createdAt_idx" ON "UserNotification"("userId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "UserNotification_createdAt_idx" ON "UserNotification"("createdAt");

DO $$ BEGIN
  ALTER TABLE "VpnProfile" ADD CONSTRAINT "VpnProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "VpnProfile" ADD CONSTRAINT "VpnProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "UserVpnProfile" ADD CONSTRAINT "UserVpnProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "UserVpnProfile" ADD CONSTRAINT "UserVpnProfile_vpnProfileId_fkey" FOREIGN KEY ("vpnProfileId") REFERENCES "VpnProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
