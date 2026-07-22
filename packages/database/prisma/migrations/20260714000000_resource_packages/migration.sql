-- CreateEnum
CREATE TYPE "ResourcePackageType" AS ENUM ('KUBECONFIG', 'VPN');

-- CreateTable
CREATE TABLE "ResourcePackage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourcePackageType" NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResourcePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageKubeconfigItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "kubeconfigId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageKubeconfigItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageVpnProfileItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "vpnProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageVpnProfileItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamResourcePackage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamResourcePackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourcePackage_organizationId_idx" ON "ResourcePackage"("organizationId");
CREATE INDEX "ResourcePackage_deletedAt_idx" ON "ResourcePackage"("deletedAt");
CREATE UNIQUE INDEX "ResourcePackage_organizationId_name_type_key" ON "ResourcePackage"("organizationId", "name", "type");

CREATE INDEX "PackageKubeconfigItem_kubeconfigId_idx" ON "PackageKubeconfigItem"("kubeconfigId");
CREATE UNIQUE INDEX "PackageKubeconfigItem_packageId_kubeconfigId_key" ON "PackageKubeconfigItem"("packageId", "kubeconfigId");

CREATE INDEX "PackageVpnProfileItem_vpnProfileId_idx" ON "PackageVpnProfileItem"("vpnProfileId");
CREATE UNIQUE INDEX "PackageVpnProfileItem_packageId_vpnProfileId_key" ON "PackageVpnProfileItem"("packageId", "vpnProfileId");

CREATE INDEX "TeamResourcePackage_packageId_idx" ON "TeamResourcePackage"("packageId");
CREATE UNIQUE INDEX "TeamResourcePackage_teamId_packageId_key" ON "TeamResourcePackage"("teamId", "packageId");

-- AddForeignKey
ALTER TABLE "ResourcePackage" ADD CONSTRAINT "ResourcePackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourcePackage" ADD CONSTRAINT "ResourcePackage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageKubeconfigItem" ADD CONSTRAINT "PackageKubeconfigItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ResourcePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageKubeconfigItem" ADD CONSTRAINT "PackageKubeconfigItem_kubeconfigId_fkey" FOREIGN KEY ("kubeconfigId") REFERENCES "Kubeconfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PackageVpnProfileItem" ADD CONSTRAINT "PackageVpnProfileItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ResourcePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageVpnProfileItem" ADD CONSTRAINT "PackageVpnProfileItem_vpnProfileId_fkey" FOREIGN KEY ("vpnProfileId") REFERENCES "VpnProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamResourcePackage" ADD CONSTRAINT "TeamResourcePackage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamResourcePackage" ADD CONSTRAINT "TeamResourcePackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ResourcePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
