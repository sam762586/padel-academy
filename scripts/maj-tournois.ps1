# Ancien point d'entrée de la mise à jour hebdomadaire, gardé pour les tâches planifiées déjà installées.
# Tout est désormais fait par scripts\maj-hebdo.bat : robot Ten'Up -> génération des pages -> commit local.
# Il n'y a plus de push automatique : Samuel vérifie puis publie lui-même (feuille de route v2).
& (Join-Path $PSScriptRoot "maj-hebdo.bat") @args
exit $LASTEXITCODE
