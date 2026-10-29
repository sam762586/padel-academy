-- Académie · 3/3 — Garde-fou commun (espace_limite_lignes, migration espace-02) : 300 lignes au plus par joueur.
-- APPLIQUÉ EN PRODUCTION LE 29/10/2026 (accord de Samuel), après espace-02 (fonction espace_limite_lignes).
drop trigger if exists academie_niveaux_limite on public.academie_niveaux;
create trigger academie_niveaux_limite before insert on public.academie_niveaux for each row execute function public.espace_limite_lignes();
drop trigger if exists academie_quiz_limite on public.academie_quiz;
create trigger academie_quiz_limite before insert on public.academie_quiz for each row execute function public.espace_limite_lignes();
