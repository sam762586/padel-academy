@echo off
rem Mise a jour hebdomadaire : robot Ten'Up -> generation des pages tournois -> commit local -> publication automatique.
rem Publication (git push origin HEAD:main) SEULEMENT si le commit des tournois est le seul en avance sur origin/main
rem et que rien n'est en retard. Sinon (commits locaux en attente, retard) : pas de push, Samuel publie avec "publie".
rem Jamais de --force. Planification : README.md, "Mise a jour chaque lundi".
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

rem 0. Etat du depot par rapport a origin/main : le push automatique n'est permis que si rien d'autre n'attend
set "PUSH=oui"
set "RAISON="
rem Un essai avec des arguments, par exemple --departements 76,27, ne couvre pas toute la France : jamais publie
if not "%~1"=="" (
  set "PUSH=non"
  set "RAISON=essai avec arguments %*"
)
git fetch origin >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  set "PUSH=non"
  set "RAISON=git fetch origin impossible"
)
if "%PUSH%"=="oui" call :comparer
if "%PUSH%"=="oui" if not "%AVANT%"=="0" (
  set "PUSH=non"
  set "RAISON=%AVANT% commits locaux pas encore publies"
)
if "%PUSH%"=="oui" if not "%RETARD%"=="0" (
  set "PUSH=non"
  set "RAISON=HEAD en retard de %RETARD% commits sur origin/main"
)
if "%PUSH%"=="oui" (
  echo %date% %time% HEAD est exactement origin/main : publication automatique possible apres le commit.>> "%JOURNAL%"
) else (
  echo %date% %time% Pas de publication automatique : %RAISON%. Collecte et commit local seulement ; Samuel publiera avec "publie".>> "%JOURNAL%"
)

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

rem 4. Commit des seules donnees et pages generees (jamais les autres modifications en cours)
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
echo %date% %time% Commit cree.>> "%JOURNAL%"

rem 5. Publication : seulement si le commit des tournois est le seul en avance et que rien n'est en retard
if not "%PUSH%"=="oui" (
  echo %date% %time% Pas de push : %RAISON%. Publie avec "publie".>> "%JOURNAL%"
  goto fin
)
git fetch origin >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Pas de push : git fetch origin impossible. Publie avec "publie".>> "%JOURNAL%"
  goto fin
)
call :comparer
if not "%AVANT%"=="1" goto nopush
if not "%RETARD%"=="0" goto nopush
git push origin HEAD:main >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Push en echec ^(rien force^) : publie avec "publie".>> "%JOURNAL%"
) else (
  echo %date% %time% Publie sur origin/main : le site se met a jour.>> "%JOURNAL%"
)
goto fin

:nopush
echo %date% %time% Pas de push : avance %AVANT% ^(attendu 1^), retard %RETARD% ^(attendu 0^) sur origin/main. Publie avec "publie".>> "%JOURNAL%"

:fin
del "%VERROU%" >nul 2>&1
endlocal
exit /b 0

:comparer
set "AVANT=?"
set "RETARD=?"
for /f %%i in ('git rev-list --count origin/main..HEAD 2^>nul') do set "AVANT=%%i"
for /f %%i in ('git rev-list --count HEAD..origin/main 2^>nul') do set "RETARD=%%i"
exit /b 0
