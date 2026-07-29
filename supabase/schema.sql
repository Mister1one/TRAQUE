-- Schéma TRAQUE — à exécuter dans l'éditeur SQL de Supabase
-- (Project > SQL Editor > New query > coller > Run)

create extension if not exists "pgcrypto";

-- Prospects sourcés (scrapés depuis Google Maps)
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  address text,
  city text,
  postal_code text,
  phone text,
  google_maps_url text unique,
  website text,
  has_website boolean default false,
  rating numeric,
  reviews_count integer,
  source_zone text,          -- ex: "Montpellier 34"
  source_query text,         -- ex: "plombier"
  score integer,             -- 0-100, calculé au sourçage
  score_reasons jsonb,       -- détail du calcul, pour audit/tuning
  pitch text,                -- angle/pitch généré à la demande
  pitch_generated_at timestamptz,
  status text not null default 'a_contacter',
  -- statuts possibles: a_contacter, appele, relance_prevue, rdv, gagne, perdu
  next_relance_date date,
  relance_stage integer default 0, -- 0 = pas encore appelé, 1 = J+1 passé, 2 = J+3, 3 = J+5...
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_prospects_status on prospects(status);
create index if not exists idx_prospects_next_relance on prospects(next_relance_date);
create index if not exists idx_prospects_score on prospects(score desc);

-- Historique des appels / actions sur un prospect
create table if not exists call_log (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade,
  outcome text not null, -- ex: injoignable, pas_interesse, a_rappeler, rdv_pris, vendu
  note text,
  created_at timestamptz default now()
);

-- Points de gamification
create table if not exists points_log (
  id uuid primary key default gen_random_uuid(),
  action_type text not null, -- ex: prospect_source, appel_logue, rdv_obtenu, vente
  points integer not null,
  prospect_id uuid references prospects(id) on delete set null,
  created_at timestamptz default now()
);

-- RLS désactivée pour la V1 solo (pas d'auth). À réactiver avant tout usage
-- multi-utilisateurs ou toute exposition publique de l'anon key.
alter table prospects enable row level security;
alter table call_log enable row level security;
alter table points_log enable row level security;

create policy "solo_full_access_prospects" on prospects for all using (true) with check (true);
create policy "solo_full_access_call_log" on call_log for all using (true) with check (true);
create policy "solo_full_access_points_log" on points_log for all using (true) with check (true);
