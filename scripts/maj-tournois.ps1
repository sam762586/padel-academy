# Mise à jour hebdomadaire des tournois : collecte Ten'Up, puis commit et push des seules données.
# Lancé par le planificateur de tâches Windows (voir scripts/installer-maj-tournois.ps1).
# Journal : scripts/logs/maj-AAAA-MM-JJ.log (non commité).
#
# Garde-fous :
# - une seule exécution à la fois (fichier verrou) ;
# - si la collecte échoue (blocage Ten'Up, coupure), rien n'est commité : la reprise se fera la semaine suivante ;
# - seuls assets/data/ et scripts/cache/ sont commités, jamais tes autres modifications en cours ;
# - pas de push si la branche locale a d'autres commits non poussés ou si GitHub est en avance : le commit reste local.

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
$Logs = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force $Logs | Out-Null
$Log = Join-Path $Logs ("maj-" + (Get-Date -Format "yyyy-MM-dd") + ".log")
function Ecrire($msg) { $l = (Get-Date -Format "HH:mm:ss") + "  " + $msg; Add-Content -Path $Log -Value $l -Encoding utf8; Write-Output $l }

$Verrou = Join-Path $PSScriptRoot "maj-tournois.lock"
if (Test-Path $Verrou) {
  $age = (Get-Date) - (Get-Item $Verrou).LastWriteTime
  if ($age.TotalHours -lt 12) { Ecrire "Une mise à jour est déjà en cours (verrou de moins de 12 h) : abandon."; exit 0 }
  Ecrire "Verrou ancien ($([int]$age.TotalHours) h) ignoré."
}
New-Item -ItemType File -Force $Verrou | Out-Null

try {
  Set-Location $Repo
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { $node = "C:\Program Files\nodejs\node.exe" }

  Ecrire "Collecte Ten'Up…"
  Push-Location (Join-Path $Repo "scripts")
  # Sous PowerShell 5.1, la sortie d'erreur d'un exécutable redirigée devient une erreur : on la tolère ici
  $ErrorActionPreference = "Continue"
  & $node scrape-tenup.js --edge *>> $Log
  $code = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  Pop-Location
  if ($code -ne 0) { Ecrire "Collecte en échec (code $code) : aucun commit. Voir le journal ci-dessus."; exit 1 }

  # Les JSON publiés doivent être valides avant tout commit
  Get-ChildItem (Join-Path $Repo "assets\data") -Recurse -Filter *.json | ForEach-Object {
    try { Get-Content $_.FullName -Raw -Encoding utf8 | ConvertFrom-Json | Out-Null }
    catch { throw "JSON invalide : $($_.FullName)" }
  }

  git add -- assets/data scripts/cache
  git diff --cached --quiet -- assets/data scripts/cache
  if ($LASTEXITCODE -eq 0) { Ecrire "Aucun changement de données."; exit 0 }

  $avantCommit = [int](git rev-list --count origin/main..HEAD)
  git commit -q -m "Tournois : mise à jour hebdomadaire du $(Get-Date -Format 'dd/MM/yyyy')" -- assets/data scripts/cache
  Ecrire "Commit des données créé."

  git fetch -q origin
  $retard = [int](git rev-list --count HEAD..origin/main)
  if ($avantCommit -gt 0) { Ecrire "Pas de push : $avantCommit autre(s) commit(s) local(aux) non poussé(s). Pousse toi-même après vérification."; exit 0 }
  if ($retard -gt 0) { Ecrire "Pas de push : GitHub a $retard commit(s) d'avance. Fais un git pull puis pousse."; exit 0 }
  git push -q origin main
  Ecrire "Publié sur GitHub (le site se met à jour en ~1 min)."
}
catch {
  Ecrire ("Erreur : " + $_.Exception.Message)
  exit 1
}
finally {
  Remove-Item $Verrou -Force -ErrorAction SilentlyContinue
}
