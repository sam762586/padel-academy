-- S2 bis · 26/42 — Pseudo public valide (recopié dans annonces, réponses, présences et avis) : une seule définition, utilisée
-- par la contrainte des profils (s2-27) et par les déclencheurs (s2-29 à s2-31 : erreur PSEUDO_REQUIS sinon).
-- 2 à 30 caractères parmi lettres (accents compris), chiffres, espace, _ . ' ’ -, au moins une lettre ou un chiffre,
-- AUCUN chiffre non latin (٣, ३… : refusés plutôt que convertis, pour que le pseudo affiché soit celui qui a été contrôlé),
-- et sans coordonnées (message_sans_contact, s2-25).
create or replace function public.pseudo_valide(p_pseudo text)
returns boolean
language sql
immutable
set search_path = public
as $fn$
  select p_pseudo is not null and p_pseudo ~ '^[[:alnum:]À-ÖØ-öø-ÿ _.''’-]{2,30}$' and p_pseudo ~ '[[:alnum:]]' and public.chiffres_ascii(p_pseudo) = p_pseudo and public.message_sans_contact(p_pseudo);
$fn$;
revoke all on function public.pseudo_valide(text) from public, anon;
grant execute on function public.pseudo_valide(text) to authenticated;
