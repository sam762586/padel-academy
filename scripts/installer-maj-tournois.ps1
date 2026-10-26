# Installe (ou réinstalle) la tâche planifiée « Apprendre Padel - Tournois » :
# chaque lundi à 6 h (ou dès que le PC est allumé si l'heure a été manquée), lance scripts\maj-hebdo.bat
# (robot Ten'Up -> génération des pages -> commit local, sans push).
# La tâche tourne sous ta session Windows (pas de mot de passe stocké) ; le PC doit être allumé.
# Lancer : clic droit > « Exécuter avec PowerShell », ou : powershell -ExecutionPolicy Bypass -File scripts\installer-maj-tournois.ps1
# Désinstaller : Unregister-ScheduledTask -TaskName "Apprendre Padel - Tournois" -Confirm:$false

$Nom = "Apprendre Padel - Tournois"
# L'ancienne tâche (lundi 4 h, avec push automatique) est remplacée
Unregister-ScheduledTask -TaskName "Padel Academy - Tournois" -Confirm:$false -ErrorAction SilentlyContinue

$Bat = Join-Path $PSScriptRoot "maj-hebdo.bat"
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$Bat`"" -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$Declencheur = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6am
$Reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Nom -Action $Action -Trigger $Declencheur -Settings $Reglages `
  -Description "Collecte hebdomadaire des tournois Ten'Up, génération des pages et commit local (apprendre-padel.fr)" -Force | Out-Null
Get-ScheduledTask -TaskName $Nom | Select-Object TaskName, State, @{n="Prochaine exécution";e={(Get-ScheduledTaskInfo $_).NextRunTime}}
