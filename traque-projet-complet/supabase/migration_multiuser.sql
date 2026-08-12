-- Migration : isolation des données par utilisateur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- (après avoir déjà exécuté supabase/schema.sql une première fois)

-- 0. Les prospects de test de la V1 solo n'ont pas de propriétaire
--    (ils ont été créés avant qu'il n'y ait des comptes) : on les efface
--    pour repartir propre. Rien à perdre, un nouveau scraping les
--    recréera en 2 minutes une fois connecté.
delete from points_log;
delete from call_log;
delete from prospects;

-- 1. Ajouter une colonne user_id, remplie automatiquement avec l'utilisateur
--    connecté au moment de l'insertion (grâce à auth.uid()).
alter table prospects
  add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

alter table call_log
  add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

alter table points_log
  add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

create index if not exists idx_prospects_user on prospects(user_id);
create index if not exists idx_call_log_user on call_log(user_id);
create index if not exists idx_points_log_user on points_log(user_id);

-- 1bis. L'unicité de google_maps_url était globale (un seul utilisateur au
--    total pouvait avoir cette fiche) : on la rend unique par utilisateur,
--    pour que deux testeurs puissent scraper la même zone sans se marcher
--    dessus.
alter table prospects drop constraint if exists prospects_google_maps_url_key;
create unique index if not exists idx_prospects_user_gmaps_url
  on prospects(user_id, google_maps_url);

-- 2. Supprimer les anciennes policies "tout ouvert" de la V1 solo.
drop policy if exists "solo_full_access_prospects" on prospects;
drop policy if exists "solo_full_access_call_log" on call_log;
drop policy if exists "solo_full_access_points_log" on points_log;

-- 3. Chacun ne voit / modifie / supprime que ses propres lignes.
--    (RLS est déjà activée sur les 3 tables depuis schema.sql)
create policy "prospects_owner" on prospects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "call_log_owner" on call_log
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "points_log_owner" on points_log
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
