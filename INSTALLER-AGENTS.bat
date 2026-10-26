@echo off
REM Copie les agents dans .claude\agents (dossier protege en ecriture a distance)
cd /d "%~dp0"
if not exist ".claude\agents" mkdir ".claude\agents"
copy /Y "agents-a-installer\*.md" ".claude\agents\" >nul
echo Agents installes dans .claude\agents :
dir /b ".claude\agents"
echo.
echo Ouvre maintenant un terminal ici et tape :  claude
pause
