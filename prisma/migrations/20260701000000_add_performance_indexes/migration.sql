-- Composite indexes for hot access patterns identified in the HA/performance audit:
--   User(tenantId, pointsBalance)  — Leaderboard ORDER BY pointsBalance DESC per tenant
--   PointsLedger(userId, timestamp) — velocity check / wallet history ORDER BY timestamp DESC per user

-- CreateIndex
CREATE INDEX "User_tenantId_pointsBalance_idx" ON "User"("tenantId", "pointsBalance");

-- CreateIndex
CREATE INDEX "PointsLedger_userId_timestamp_idx" ON "PointsLedger"("userId", "timestamp");
