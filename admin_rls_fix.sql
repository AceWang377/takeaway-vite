create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.role = 'admin'
  );
$$;

alter table public.admin_users enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.drivers enable row level security;
alter table public.expenses enable row level security;
alter table public.menus_by_date enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "admin_users_self_select" on public.admin_users;
create policy "admin_users_self_select"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "orders_select_admin" on public.orders;
drop policy if exists "orders_insert_admin" on public.orders;
drop policy if exists "orders_update_admin" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_select_admin" on public.orders for select to authenticated using (public.is_current_user_admin());
create policy "orders_insert_admin" on public.orders for insert to authenticated with check (public.is_current_user_admin());
create policy "orders_update_admin" on public.orders for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "orders_delete_admin" on public.orders for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "customers_select_admin" on public.customers;
drop policy if exists "customers_insert_admin" on public.customers;
drop policy if exists "customers_update_admin" on public.customers;
drop policy if exists "customers_delete_admin" on public.customers;
create policy "customers_select_admin" on public.customers for select to authenticated using (public.is_current_user_admin());
create policy "customers_insert_admin" on public.customers for insert to authenticated with check (public.is_current_user_admin());
create policy "customers_update_admin" on public.customers for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "customers_delete_admin" on public.customers for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "drivers_select_admin" on public.drivers;
drop policy if exists "drivers_insert_admin" on public.drivers;
drop policy if exists "drivers_update_admin" on public.drivers;
create policy "drivers_select_admin" on public.drivers for select to authenticated using (public.is_current_user_admin());
create policy "drivers_insert_admin" on public.drivers for insert to authenticated with check (public.is_current_user_admin());
create policy "drivers_update_admin" on public.drivers for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists "expenses_select_admin" on public.expenses;
drop policy if exists "expenses_insert_admin" on public.expenses;
drop policy if exists "expenses_update_admin" on public.expenses;
drop policy if exists "expenses_delete_admin" on public.expenses;
create policy "expenses_select_admin" on public.expenses for select to authenticated using (public.is_current_user_admin());
create policy "expenses_insert_admin" on public.expenses for insert to authenticated with check (public.is_current_user_admin());
create policy "expenses_update_admin" on public.expenses for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "expenses_delete_admin" on public.expenses for delete to authenticated using (public.is_current_user_admin());

drop policy if exists "menus_by_date_select_admin" on public.menus_by_date;
drop policy if exists "menus_by_date_insert_admin" on public.menus_by_date;
drop policy if exists "menus_by_date_update_admin" on public.menus_by_date;
create policy "menus_by_date_select_admin" on public.menus_by_date for select to authenticated using (public.is_current_user_admin());
create policy "menus_by_date_insert_admin" on public.menus_by_date for insert to authenticated with check (public.is_current_user_admin());
create policy "menus_by_date_update_admin" on public.menus_by_date for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists "app_settings_select_admin" on public.app_settings;
drop policy if exists "app_settings_insert_admin" on public.app_settings;
drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_select_admin" on public.app_settings for select to authenticated using (public.is_current_user_admin());
create policy "app_settings_insert_admin" on public.app_settings for insert to authenticated with check (public.is_current_user_admin());
create policy "app_settings_update_admin" on public.app_settings for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
