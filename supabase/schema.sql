-- Maersk Invoices — schéma Supabase
-- À exécuter une fois dans Supabase : Dashboard → SQL Editor → New query → coller → Run

-- ── Tables ──────────────────────────────────────
create table if not exists public.invoices (
  id          text primary key,              -- "<operator>-<entry>-<month>-<year>", ex. mattel-t1-8-2026
  operator_id text    not null,
  entry_id    text    not null,
  month       smallint not null check (month between 0 and 11),
  year        smallint not null,
  status      text    not null default 'missing'
              check (status in ('missing', 'pending', 'processing', 'paid')),
  amount      numeric,
  pay_mode    text check (pay_mode in ('virement', 'cheque')),
  pay_date    date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (operator_id, entry_id, month, year)
);

create index if not exists invoices_period_idx on public.invoices (year, month);

create table if not exists public.invoice_docs (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  text not null references public.invoices (id) on delete cascade,
  doc_type    text not null check (doc_type in ('invoice', 'payment', 'cheque')),
  file_name   text not null,
  file_id     text not null,                 -- chemin dans le bucket Storage
  file_size   bigint,
  mime_type   text,
  created_at  timestamptz not null default now()
);

create index if not exists invoice_docs_invoice_idx on public.invoice_docs (invoice_id);

-- updated_at automatique
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- ── Row Level Security : accès réservé aux utilisateurs connectés ──
alter table public.invoices     enable row level security;
alter table public.invoice_docs enable row level security;

drop policy if exists "authenticated full access" on public.invoices;
create policy "authenticated full access" on public.invoices
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.invoice_docs;
create policy "authenticated full access" on public.invoice_docs
  for all to authenticated using (true) with check (true);

-- ── Storage : bucket privé pour les PDF / images ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maersk-docs', 'maersk-docs', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "maersk-docs authenticated access" on storage.objects;
create policy "maersk-docs authenticated access" on storage.objects
  for all to authenticated
  using (bucket_id = 'maersk-docs')
  with check (bucket_id = 'maersk-docs');
