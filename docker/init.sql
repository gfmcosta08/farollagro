-- Enable RLS
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Animal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnimalTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TagHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pasture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnimalLot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Weight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Death" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Finance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create policies for Tenant
CREATE POLICY "tenant_isolation_select" ON "Tenant" FOR SELECT USING (true);
CREATE POLICY "tenant_isolation_insert" ON "Tenant" FOR INSERT WITH CHECK (true);
CREATE POLICY "tenant_isolation_update" ON "Tenant" FOR UPDATE USING (true);
CREATE POLICY "tenant_isolation_delete" ON "Tenant" FOR DELETE USING (true);

-- Create policies for User
CREATE POLICY "user_tenant_isolation" ON "User" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Animal
CREATE POLICY "animal_tenant_isolation" ON "Animal" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Tag
CREATE POLICY "tag_tenant_isolation" ON "Tag" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for AnimalTag
CREATE POLICY "animaltag_tenant_isolation" ON "AnimalTag" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for TagHistory
CREATE POLICY "taghistory_tenant_isolation" ON "TagHistory" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Pasture
CREATE POLICY "pasture_tenant_isolation" ON "Pasture" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Lot
CREATE POLICY "lot_tenant_isolation" ON "Lot" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for AnimalLot
CREATE POLICY "animallot_tenant_isolation" ON "AnimalLot" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Contract
CREATE POLICY "contract_tenant_isolation" ON "Contract" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Event
CREATE POLICY "event_tenant_isolation" ON "Event" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Weight
CREATE POLICY "weight_tenant_isolation" ON "Weight" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Purchase
CREATE POLICY "purchase_tenant_isolation" ON "Purchase" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Sale
CREATE POLICY "sale_tenant_isolation" ON "Sale" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Death
CREATE POLICY "death_tenant_isolation" ON "Death" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for Finance
CREATE POLICY "finance_tenant_isolation" ON "Finance" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Create policies for AuditLog
CREATE POLICY "auditlog_tenant_isolation" ON "AuditLog" FOR ALL USING ("tenantId" = current_setting('app.tenant_id', true)::text) WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
