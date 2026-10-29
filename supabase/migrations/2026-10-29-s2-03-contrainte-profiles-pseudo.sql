-- S2 · 3/23 — Pseudo public (recopié dans annonces, présences et avis) : 2 à 30 caractères parmi lettres (accents compris),
-- ATTENTION (S2 bis) : remplacé(e) par 2026-10-29-s2-27. Si tu relances ce fichier, relance ensuite s2-26 et s2-27 (sinon la faille corrigée revient).
-- chiffres, espace, _ . ' ’ -, et sans coordonnées (message_sans_contact, fichier s2-02).
-- NOT VALID : la table profiles contient déjà des comptes ; les pseudos existants ne sont ni relus ni modifiés.
-- La règle s'applique à toute nouvelle écriture d'une ligne : un joueur dont l'ancien pseudo ne passe pas devra le corriger
-- la prochaine fois qu'il enregistre son profil. Contrôle des anciennes lignes et validation : voir supabase/LISEZMOI.md.
alter table public.profiles drop constraint if exists profiles_pseudo_format;
alter table public.profiles add constraint profiles_pseudo_format check (pseudo is null or (pseudo ~ '^[[:alnum:]À-ÖØ-öø-ÿ _.''’-]{2,30}$' and public.message_sans_contact(pseudo))) not valid;
