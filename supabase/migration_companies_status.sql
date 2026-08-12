-- Ajoute le statut de traitement directement sur `companies`, la table
-- réellement alimentée par le scan Google Maps actuel (voir
-- migration_scan_engine.sql). L'ancien schéma `prospects` (tableaux,
-- scoring, pitch, relance — voir migration_tableaux.sql) n'est plus écrit
-- par aucun code du produit ; cette migration ne le touche pas et ne s'en
-- sert pas.
--
-- À coller dans Supabase > SQL Editor > New query > Run
-- (après migration_scan_engine.sql)

alter table companies
  add column if not exists status text not null default 'a_contacter';
  -- statuts : a_contacter, injoignable, a_rappeler, pas_interesse, rdv_pris

alter table companies
  add column if not exists notes text;

create index if not exists idx_companies_status on companies(user_id, status);
