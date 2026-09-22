-- Datihan Phase 7: account-based cart
-- Run this migration in the Supabase SQL Editor.

create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.inventory(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id),
  constraint cart_items_quantity_positive check (quantity > 0)
);

alter table public.cart_items enable row level security;

drop policy if exists "Users can view their own cart" on public.cart_items;
drop policy if exists "Users can add to their own cart" on public.cart_items;
drop policy if exists "Users can update their own cart" on public.cart_items;
drop policy if exists "Users can delete their own cart" on public.cart_items;

create policy "Users can view their own cart"
on public.cart_items for select to authenticated
using (auth.uid() = user_id);

create policy "Users can add to their own cart"
on public.cart_items for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own cart"
on public.cart_items for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own cart"
on public.cart_items for delete to authenticated
using (auth.uid() = user_id);
