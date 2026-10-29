@echo off
rem Mise a jour hebdomadaire : robot Ten'Up -> generation des pages tournois -> commit local (pas de push).
rem Samuel verifie puis publie lui-meme (git push). Planification : README.md, "Mise a jour chaque lundi".
rem Arguments transmis au robot et au generateur, par exemple pour un essai :  maj-hebdo.bat --departements 76,27
rem Journal : scripts\logs\maj-hebdo.log (non commite). Une seule execution a la fois (scripts\maj-tournois.lock).
rem Fichier en ASCII et fins de ligne CRLF (voir .gitattributes) : cmd.exe lit mal l'UTF-8 et les fins de ligne Unix.
setlocal
cd /d "%~dp0.."
if not exist scripts\logs mkdir scripts\logs
set "JOURNAL=scripts\logs\maj-hebdo.log"
set "VERROU=scripts\maj-tournois.lock"

if exist "%VERROU%" (
  echo %date% %time% Mise a jour deja en cours [%VERROU%] : abandon. Supprime ce fichier si aucune ne tourne.>> "%JOURNAL%"
  exit /b 0
)
echo %date% %time%> "%VERROU%"
echo.>> "%JOURNAL%"
echo ===== %date% %time% : debut de la mise a jour %* =====>> "%JOURNAL%"

rem 1. Collecte Ten'Up (1 requete par seconde ; reprend ou elle s'est arretee en cas de coupure)
node scripts\scrape-tenup.js --edge %* >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Collecte en echec : aucune page generee, aucun commit.>> "%JOURNAL%"
  goto fin
)

rem 2. Les JSON produits doivent etre valides avant d'aller plus loin
node scripts\verifier-json.js >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% JSON invalide dans assets\data : aucun commit.>> "%JOURNAL%"
  goto fin
)

rem 3. Generation des pages (tournoi/, tournois/, sitemap.xml, assets/data/prochains/)
node scripts\generer-pages.js %* >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Generation des pages en echec : aucun commit.>> "%JOURNAL%"
  goto fin
)

rem 3 bis. Fichiers SQL de la table Supabase tournois_ref (supabase\donnees\, ignore par git) : generation seulement, aucun envoi.
rem     Samuel les colle ensuite dans le SQL Editor (supabase\LISEZMOI.md, Stabilisation S2). Un echec ici n'empeche pas le commit.
node scripts\generer-tournois-ref.js >> "%JOURNAL%" 2>&1
if errorlevel 1 echo %date% %time% Fichiers tournois_ref en echec : voir le journal.>> "%JOURNAL%"

rem 4. Commit des seules donnees et pages generees (jamais les autres modifications en cours), sans push
git add -- assets/data scripts/cache tournoi tournois sitemap.xml >> "%JOURNAL%" 2>&1
git diff --cached --quiet -- assets/data scripts/cache tournoi tournois sitemap.xml
if not errorlevel 1 (
  echo %date% %time% Aucun changement : rien a commiter.>> "%JOURNAL%"
  goto fin
)
git commit -q -m "Tournois : mise a jour hebdomadaire du %date%" -- assets/data scripts/cache tournoi tournois sitemap.xml >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Commit impossible : voir le journal.>> "%JOURNAL%"
  goto fin
)
echo %date% %time% Commit cree. Verifie puis publie avec : git push>> "%JOURNAL%"

:fin
del "%VERROU%" >nul 2>&1
endlocal
