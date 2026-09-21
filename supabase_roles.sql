-- Datihan role system
-- One Buyer role for customers, ONE shared Shop Owner account for the shop,
-- and Admin account(s) for system maintenance.
-- Run this in Supabase SQL Editor before using login.html.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer','shop_owner','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Exactly ONE Shop Owner account is allowed.
create unique index if not exists one_shop_owner_only_idx
on public.profiles ((role))
where role = 'shop_owner';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_shop_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'shop_owner');
$$;

create or replace function public.is_shop_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('shop_owner','admin'));
$$;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all
using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'buyer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- BUYERS: available inventory only.
drop policy if exists "Public can view available inventory" on public.inventory;
drop policy if exists "Buyers can view available inventory" on public.inventory;
create policy "Buyers can view available inventory" on public.inventory for select
using (status = 'available');

-- SHOP OWNER: this is the ONE shared shop-owner account, so it manages all shop inventory.
drop policy if exists "Shop owners can view own inventory" on public.inventory;
drop policy if exists "Shop owners can view all inventory" on public.inventory;
create policy "Shop owners can view all inventory" on public.inventory
using (public.is_shop_owner());

-- ADMIN: full inventory access.
drop policy if exists "Admins can view all inventory" on public.inventory;
create policy "Admins can view all inventory" on public.inventory
using (public.is_admin());

-- SHOP OWNER / ADMIN: add inventory.
drop policy if exists "Shop owners and admins insert inventory" on public.inventory;
drop policy if exists "Shop owners insert own inventory" on public.inventory;
drop policy if exists "Shop owners insert inventory" on public.inventory;
drop policy if exists "Admins insert inventory" on public.inventory;
create policy "Shop owners insert inventory" on public.inventory for insert
with check (public.is_shop_owner());
create policy "Admins insert inventory" on public.inventory for insert
with check (public.is_admin());

-- SHOP OWNER / ADMIN: update inventory.
drop policy if exists "Shop owners and admins update inventory" on public.inventory;
drop policy if exists "Shop owners update own inventory" on public.inventory;
drop policy if exists "Shop owners update inventory" on public.inventory;
drop policy if exists "Admins update inventory" on public.inventory;
create policy "Shop owners update inventory" on public.inventory for update
using (public.is_shop_owner()) with check (public.is_shop_owner());
create policy "Admins update inventory" on public.inventory for update
using (public.is_admin()) with check (public.is_admin());

-- SHOP OWNER / ADMIN: delete inventory.
drop policy if exists "Shop owners and admins delete inventory" on public.inventory;
drop policy if exists "Shop owners delete own inventory" on public.inventory;
drop policy if exists "Shop owners delete inventory" on public.inventory;
drop policy if exists "Admins delete inventory" on public.inventory;
create policy "Shop owners delete inventory" on public.inventory for delete
using (public.is_shop_owner());
create policy "Admins delete inventory" on public.inventory for delete
using (public.is_admin());

create index if not exists inventory_consignor_id_idx on public.inventory (consignor_id);
