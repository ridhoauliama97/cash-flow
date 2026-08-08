-- ============================================================================
-- 0006: RLS master data — tulis tidak lagi khusus admin.
--
-- Permission matrix Fase 1 memberi Kepala Finance (dan staff) hak tulis
-- customer/supplier/cost center/CoA. Otoritas sebenarnya ada di service layer
-- (requirePermission), jadi RLS di sini cukup kasar: authenticated boleh tulis.
-- ============================================================================

drop policy "chart_of_accounts: admin write" on accounting.chart_of_accounts;
drop policy "customers: admin write" on accounting.customers;
drop policy "suppliers: admin write" on accounting.suppliers;
drop policy "cost_centers: admin write" on accounting.cost_centers;

create policy "chart_of_accounts: authenticated write" on accounting.chart_of_accounts
  for all to authenticated using (true) with check (true);
create policy "customers: authenticated write" on accounting.customers
  for all to authenticated using (true) with check (true);
create policy "suppliers: authenticated write" on accounting.suppliers
  for all to authenticated using (true) with check (true);
create policy "cost_centers: authenticated write" on accounting.cost_centers
  for all to authenticated using (true) with check (true);
