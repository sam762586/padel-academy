-- Concours · annulation 7/7 (concours-24) — Annulation du concours « Ton pack Nox offert » (2026-11-pack-nox), décidée
-- par Samuel le 04/11/2026, motif : problème technique. Une seule ligne de public.concours modifiée (annule_le,
-- motif_annulation) ; aucune ligne supprimée : participations conservées (le joueur peut encore se retirer, concours-21),
-- purge habituelle 90 jours après la fin (concours-16). Relançable : une fois annulé, la ligne n'est plus touchée (la date
-- d'annulation reste celle de la première exécution). À exécuter EN DERNIER, depuis le SQL Editor (le site ne peut pas
-- annuler). Réponse attendue : « UPDATE 1 » (ou « Success. No rows returned ») au premier passage, 0 ligne ensuite.
update public.concours set annule_le = now(), motif_annulation = 'Problème technique' where id = '2026-11-pack-nox' and annule_le is null;
