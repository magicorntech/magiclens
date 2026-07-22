-- CreateTable
CREATE TABLE "TeamVpnProfile" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "vpnProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamVpnProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamVpnProfile_vpnProfileId_idx" ON "TeamVpnProfile"("vpnProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamVpnProfile_teamId_vpnProfileId_key" ON "TeamVpnProfile"("teamId", "vpnProfileId");

-- AddForeignKey
ALTER TABLE "TeamVpnProfile" ADD CONSTRAINT "TeamVpnProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVpnProfile" ADD CONSTRAINT "TeamVpnProfile_vpnProfileId_fkey" FOREIGN KEY ("vpnProfileId") REFERENCES "VpnProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
