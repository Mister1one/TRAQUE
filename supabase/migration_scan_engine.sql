-- Moteur de découverte incrémentale : mémoire des entreprises déjà vues
-- (pour ne jamais re-proposer deux fois la même fiche) + suivi en direct
-- d'un scan en cours, pour une vraie barre de progression.
--
-- Volontairement séparé de toute notion de "tableau"/"liste" de travail —
-- ici c'est juste la mémoire brute de ce qui a été découvert.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  google_maps_url text not null,
  name text not null,
  category text,
  address text,
  city text,
  postal_code text,
  phone text,
  website text,
  rating numeric,
  reviews_count integer,
  activite text not null,   -- terme de recherche utilisé ("plombier")
  zone text not null,       -- zone recherchée ("Montpellier")
  created_at timestamptz default now(),
  unique (user_id, google_maps_url)
);

create index if not exists idx_companies_user on companies(user_id);
create index if not exists idx_companies_activite_zone on companies(user_id, activite, zone);

alter table companies enable row level security;

drop policy if exists "companies_owner" on companies;
create policy "companies_owner" on companies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activite text not null,
  zone text not null,
  target integer not null default 100,
  seen_count integer not null default 0,      -- fiches Maps consultées (nouvelles + déjà connues)
  new_count integer not null default 0,       -- nouvelles entreprises réellement ajoutées
  status text not null default 'en_cours',    -- en_cours | termine | zone_epuisee | erreur
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_scans_user on scans(user_id);

alter table scans enable row level security;

drop policy if exists "scans_owner" on scans;
create policy "scans_owner" on scans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
