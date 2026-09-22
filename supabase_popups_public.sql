-- Datihan: allow the public buyer store to read ACTIVE pop-ups / alerts.
-- Run this once in Supabase SQL Editor.

alter table public.popups enable row level security;

grant select on table public.popups to anon, authenticated;

drop policy if exists "Public can view active popups" on public.popups;
create policy "Public can view active popups"
on public.popups
for select
to anon, authenticated
using (is_active = true);
