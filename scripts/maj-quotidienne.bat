@echo off
rem Mise a jour quotidienne des resultats pros : robot Premier Padel -> actus-pro.html -> commit local -> publication automatique.
rem Publication (git push origin HEAD:main) SEULEMENT si ce commit est le seul en avance sur origin/main, que rien n'est en retard
rem et que la mise a jour hebdomadaire des tournois ne tourne pas (scripts\maj-tournois.lock) : le push du lendemain rattrape.
rem Jamais de --force, jamais d'arguments au push. Planification : README.md, "Mise a jour quotidienne des actus pro".
rem Journal : scripts\logs\maj-quotidienne.log (non commite). Une seule execution a la fois (scripts\maj-pro.lock).
rem Fichier en ASCII et fins de ligne CRLF (voir .gitattributes) : cmd.exe lit mal l'UTF-8 et les fins de ligne Unix.
setlocal
cd /d "%~dp0.."
if not exist scripts\logs mkdir scripts\logs
set "JOURNAL=scripts\logs\maj-quotidienne.log"
set "VERROU=scripts\maj-pro.lock"
set "VERROU_HEBDO=scripts\maj-tournois.lock"

if exist "%VERROU%" (
  echo %date% %time% Mise a jour deja en cours [%VERROU%] : abandon. Supprime ce fichier si aucune ne tourne.>> "%JOURNAL%"
  exit /b 0
)
echo %date% %time%> "%VERROU%"
echo.>> "%JOURNAL%"
echo ===== %date% %time% : debut de la mise a jour des actus pro =====>> "%JOURNAL%"

rem 0. Etat du depot par rapport a origin/main
set "PUSH=oui"
set "RAISON="
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

rem 1. Collecte des resultats pros
node scripts\scrape-pro.js >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Collecte en echec : aucune page generee, aucun commit.>> "%JOURNAL%"
  goto fin
)

rem 2. Generation du contenu de actus-pro.html
node scripts\generer-pro.js >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Generation en echec : aucun commit.>> "%JOURNAL%"
  goto fin
)

rem 3. Commit des deux seuls fichiers (jamais les autres modifications en cours)
git add -- assets/data/pro.json actus-pro.html sitemap.xml >> "%JOURNAL%" 2>&1
git diff --cached --quiet -- assets/data/pro.json actus-pro.html sitemap.xml
if not errorlevel 1 (
  echo %date% %time% Aucun changement : rien a commiter.>> "%JOURNAL%"
  goto fin
)
git commit -q -m "Actus pro : mise a jour du %date%" -- assets/data/pro.json actus-pro.html sitemap.xml >> "%JOURNAL%" 2>&1
if errorlevel 1 (
  echo %date% %time% Commit impossible : voir le journal.>> "%JOURNAL%"
  goto fin
)
echo %date% %time% Commit cree.>> "%JOURNAL%"

rem 4. Publication : seulement si ce commit est le seul en avance, que rien n'est en retard et que la collecte du lundi ne tourne pas
if not "%PUSH%"=="oui" (
  echo %date% %time% Pas de push : %RAISON%. Publie avec "publie".>> "%JOURNAL%"
  goto fin
)
if exist "%VERROU_HEBDO%" (
  echo %date% %time% Pas de push : la mise a jour hebdomadaire des tournois est en cours [%VERROU_HEBDO%]. Le push du lendemain rattrapera.>> "%JOURNAL%"
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
