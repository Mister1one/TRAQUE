-- Migration : introduction des "tableaux" (un espace de travail par recherche).
-- À coller dans Supabase > SQL Editor > New query > Run
-- (après schema.sql et migration_multiuser.sql)
--
-- Idée : aujourd'hui `prospects` est une table plate par utilisateur, sans
-- distinction entre deux recherches ("Plombiers Montpellier" vs
-- "Électriciens Montpellier"). Cette migration ajoute une table `tableaux`
-- (un par recherche) et rattache chaque prospect à son tableau.

create table if not exists tableaux (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null,           -- ex: "Plombiers Montpellier"
  activite text not null,      -- ex: "plombier" (query de la recherche)
  zone text not null,          -- ex: "Montpellier 34"
  created_at timestamptz default now()
);

create index if not exists idx_tableaux_user on tableaux(user_id);

alter table tableaux enable row level security;

drop policy if exists "tableaux_owner" on tableaux;
create policy "tableaux_owner" on tableaux
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rattacher chaque prospect à un tableau.
alter table prospects
  add column if not exists tableau_id uuid references tableaux(id) on delete cascade;

create index if not exists idx_prospects_tableau on prospects(tableau_id);

-- Rétro-compatibilité : regrouper les prospects déjà en base (créés avant
-- cette migration) en tableaux, un par combinaison (utilisateur, activité,
-- zone). Ne fait rien si aucun prospect n'a encore été scrapé.
insert into tableaux (user_id, nom, activite, zone, created_at)
select
  user_id,
  initcap(source_query) || ' ' || source_zone as nom,
  coalesce(source_query, 'Recherche'),
  coalesce(source_zone, 'Zone inconnue'),
  min(created_at)
from prospects
where tableau_id is null
group by user_id, source_query, source_zone;

update prospects p
set tableau_id = t.id
from tableaux t
where p.tableau_id is null
  and p.user_id = t.user_id
  and coalesce(p.source_query, 'Recherche') = t.activite
  and coalesce(p.source_zone, 'Zone inconnue') = t.zone;

-- Une fois toutes les lignes existantes rattachées, le champ devient
-- obligatoire pour toute nouvelle insertion.
alter table prospects
  alter column tableau_id set not null;
