-- Tabelle und Rechte fuer Zwanni.
-- Im Supabase-Dashboard unter "SQL Editor" einfuegen und ausfuehren.
-- Bestehende Daten bleiben unberuehrt ("if not exists").

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished')),
  game_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

-- Live-Updates: ohne diese Zeile bekommen Mitspieler und Zuschauer
-- keine Aenderungen mitgeteilt.
do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end $$;

-- Row Level Security ---------------------------------------------------
alter table public.rooms enable row level security;

-- Wichtig zu wissen: die App spricht ohne Login direkt mit der
-- Datenbank. Diese Regeln erlauben deshalb jedem mit dem
-- oeffentlichen Schluessel, Raeume zu lesen und zu aendern -
-- geloescht werden kann nichts.
--
-- Fuer eine oeffentliche Version ist das der naechste sinnvolle
-- Schritt: Gebote in einer Datenbank-Funktion oder Edge Function
-- pruefen und den direkten Schreibzugriff entziehen.

drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select"
  on public.rooms for select
  using (true);

drop policy if exists "rooms_insert" on public.rooms;
create policy "rooms_insert"
  on public.rooms for insert
  with check (true);

drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_update"
  on public.rooms for update
  using (true)
  with check (true);

-- Aufraeumen: Raeume, die seit einem Tag niemand mehr angefasst
-- hat, koennen weg. Optional als geplante Aufgabe (pg_cron).
-- delete from public.rooms where updated_at < now() - interval '1 day';
