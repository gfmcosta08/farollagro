-- Setup RLS for schema farollagro (Supabase)
-- Safe to run multiple times.

begin;

grant usage on schema farollagro to anon, authenticated;
grant select, insert, update, delete on all tables in schema farollagro to authenticated;
grant usage, select on all sequences in schema farollagro to authenticated;

alter table farollagro."Tenant" enable row level security;
alter table farollagro."User" enable row level security;
alter table farollagro."Animal" enable row level security;
alter table farollagro."Tag" enable row level security;
alter table farollagro."AnimalTag" enable row level security;
alter table farollagro."Weight" enable row level security;
alter table farollagro."Event" enable row level security;
alter table farollagro."Purchase" enable row level security;
alter table farollagro."Sale" enable row level security;
alter table farollagro."Death" enable row level security;
alter table farollagro."Finance" enable row level security;
alter table farollagro."Pasture" enable row level security;
alter table farollagro."Lot" enable row level security;
alter table farollagro."Contract" enable row level security;
alter table farollagro."TagHistory" enable row level security;
alter table farollagro."AnimalLot" enable row level security;

create or replace function farollagro.current_user_tenant_id()
returns text
language sql
security definer
stable
set search_path = farollagro, public
as $$
  select "tenantId"
  from farollagro."User"
  where id = auth.uid()::text
    and "deletedAt" is null
  limit 1;
$$;

revoke all on function farollagro.current_user_tenant_id() from public;
grant execute on function farollagro.current_user_tenant_id() to authenticated;

drop policy if exists tenant_select on farollagro."Tenant";
drop policy if exists tenant_insert on farollagro."Tenant";
drop policy if exists tenant_update on farollagro."Tenant";

create policy tenant_select on farollagro."Tenant"
for select to authenticated
using (id = farollagro.current_user_tenant_id());

create policy tenant_insert on farollagro."Tenant"
for insert to authenticated
with check (auth.uid() is not null);

create policy tenant_update on farollagro."Tenant"
for update to authenticated
using (id = farollagro.current_user_tenant_id())
with check (id = farollagro.current_user_tenant_id());

drop policy if exists user_select on farollagro."User";
drop policy if exists user_insert on farollagro."User";
drop policy if exists user_update on farollagro."User";

create policy user_select on farollagro."User"
for select to authenticated
using (
  id = auth.uid()::text
  or "tenantId" = farollagro.current_user_tenant_id()
);

create policy user_insert on farollagro."User"
for insert to authenticated
with check (
  id = auth.uid()::text
  and "tenantId" is not null
);

create policy user_update on farollagro."User"
for update to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

drop policy if exists animal_rw on farollagro."Animal";
create policy animal_rw on farollagro."Animal"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists tag_rw on farollagro."Tag";
create policy tag_rw on farollagro."Tag"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists weight_rw on farollagro."Weight";
create policy weight_rw on farollagro."Weight"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists event_rw on farollagro."Event";
create policy event_rw on farollagro."Event"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists purchase_rw on farollagro."Purchase";
create policy purchase_rw on farollagro."Purchase"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists sale_rw on farollagro."Sale";
create policy sale_rw on farollagro."Sale"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists death_rw on farollagro."Death";
create policy death_rw on farollagro."Death"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists finance_rw on farollagro."Finance";
create policy finance_rw on farollagro."Finance"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists pasture_rw on farollagro."Pasture";
create policy pasture_rw on farollagro."Pasture"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists lot_rw on farollagro."Lot";
create policy lot_rw on farollagro."Lot"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists contract_rw on farollagro."Contract";
create policy contract_rw on farollagro."Contract"
for all to authenticated
using ("tenantId" = farollagro.current_user_tenant_id())
with check ("tenantId" = farollagro.current_user_tenant_id());

drop policy if exists animaltag_rw on farollagro."AnimalTag";
create policy animaltag_rw on farollagro."AnimalTag"
for all to authenticated
using (
  exists (
    select 1
    from farollagro."Animal" a
    where a.id = "AnimalTag"."animalId"
      and a."tenantId" = farollagro.current_user_tenant_id()
  )
)
with check (
  exists (
    select 1
    from farollagro."Animal" a
    where a.id = "AnimalTag"."animalId"
      and a."tenantId" = farollagro.current_user_tenant_id()
  )
);

drop policy if exists animallot_rw on farollagro."AnimalLot";
create policy animallot_rw on farollagro."AnimalLot"
for all to authenticated
using (
  exists (
    select 1
    from farollagro."Lot" l
    where l.id = "AnimalLot"."lotId"
      and l."tenantId" = farollagro.current_user_tenant_id()
  )
)
with check (
  exists (
    select 1
    from farollagro."Lot" l
    where l.id = "AnimalLot"."lotId"
      and l."tenantId" = farollagro.current_user_tenant_id()
  )
);

drop policy if exists taghistory_rw on farollagro."TagHistory";
create policy taghistory_rw on farollagro."TagHistory"
for all to authenticated
using (
  exists (
    select 1
    from farollagro."Tag" t
    where t.id = "TagHistory"."tagId"
      and t."tenantId" = farollagro.current_user_tenant_id()
  )
)
with check (
  exists (
    select 1
    from farollagro."Tag" t
    where t.id = "TagHistory"."tagId"
      and t."tenantId" = farollagro.current_user_tenant_id()
  )
);

commit;
