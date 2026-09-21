-- Datihan role system
-- Run this in Supabase SQL Editor before using login.html.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'buyer' check (role in ('buyer','shop_owner','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_shop_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('shop_owner','admin')
  );
$$;

-- Users can read their own profile. Admins can read all profiles.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

-- Only admins can change roles/profile records through the table.
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

-- Automatically create a buyer profile for newly registered accounts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'buyer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Inventory: shop owners and admins manage it; buyers can read available items.
drop policy if exists "Public can view available inventory" on public.inventory;
create policy "Public can view available inventory"
on public.inventory for select
using (status = 'available' or public.is_shop_owner_or_admin());

-- Only shop owners/admins can insert, update, or delete inventory.
drop policy if exists "Shop owners and admins insert inventory" on public.inventory;
create policy "Shop owners and admins insert inventory"
on public.inventory for insert
with check (public.is_shop_owner_or_admin());

drop policy if exists "Shop owners and admins update inventory" on public.inventory;
create policy "Shop owners and admins update inventory"
on public.inventory for update
using (public.is_shop_owner_or_admin())
with check (public.is_shop_owner_or_admin());

drop policy if exists "Shop owners and admins delete inventory" on public.inventory;
create policy "Shop owners and admins delete inventory"
on public.inventory for delete
using (public.is_shop_owner_or_admin());
