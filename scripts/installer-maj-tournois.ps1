# Installe (ou réinstalle) la tâche planifiée « Padel Academy - Tournois » :
# chaque lundi à 4 h, ou dès que le PC est allumé si l'heure a été manquée.
# La tâche tourne sous ta session Windows (pas de mot de passe stocké) ; le PC doit être allumé.
# Désinstaller : Unregister-ScheduledTask -TaskName "Padel Academy - Tournois" -Confirm:$false

$Nom = "Padel Academy - Tournois"
$Script = Join-Path $PSScriptRoot "maj-tournois.ps1"
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`"" `
  -WorkingDirectory $PSScriptRoot
$Declencheur = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 4am
$Reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Nom -Action $Action -Trigger $Declencheur -Settings $Reglages `
  -Description "Collecte hebdomadaire des tournois de padel Ten'Up et publication sur apprendre-padel.fr" -Force | Out-Null
Get-ScheduledTask -TaskName $Nom | Select-Object TaskName, State, @{n="Prochaine exécution";e={(Get-ScheduledTaskInfo $_).NextRunTime}}
