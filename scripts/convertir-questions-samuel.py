"""Convertit scripts/donnees/academie-questions-samuel.md (texte de Samuel, reçu le 27/10/2026) en
scripts/donnees/academie-questions-samuel.json, lu par generer-academie-questions.mjs.
Le texte des questions, des choix et des explications est repris tel quel. Seuls sont ajoutés : l'identifiant, le niveau
(celui de la partie du texte), la difficulté (1 pour les niveaux 1 à 3, 2 pour 4 à 6, 3 pour 7 à 10), le thème de
l'académie (catégorie du texte ; pour [Technique] et [Tactique], table THEMES_TT ci-dessous) et le statut.
Statut « brouillon » pour les questions dont un fait daté ou chiffré reste à confirmer par Samuel (A_CONFIRMER).
Lancer depuis la racine du site : python scripts/convertir-questions-samuel.py"""
import json, re, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
SOURCE = RACINE / 'scripts/donnees/academie-questions-samuel.md'
SORTIE = RACINE / 'scripts/donnees/academie-questions-samuel.json'

CATEGORIES = {'Règles': 'regles', 'Matériel': 'materiel', 'Culture padel': 'culture', 'Compétition': 'competition'}
# Thème de l'académie des questions [Technique] et [Tactique], par identifiant « niveau-numéro »
THEMES_TT = {
    '1-09': 'construction', '1-11': 'volee',
    '2-05': 'lob', '2-06': 'placement', '2-07': 'vitres',
    '3-05': 'transition', '3-06': 'transition', '3-07': 'transition', '3-08': 'defense', '3-09': 'bandeja', '3-10': 'communication',
    '4-06': 'vitres', '4-07': 'lob', '4-08': 'bandeja', '4-09': 'bandeja', '4-10': 'placement',
    '5-05': 'vibora', '5-06': 'vitres', '5-07': 'communication', '5-08': 'communication', '5-09': 'construction',
    '6-05': 'bandeja', '6-06': 'bandeja', '6-07': 'volee', '6-08': 'bandeja', '6-09': 'lob', '6-10': 'placement',
    '7-05': 'bandeja', '7-06': 'vitres', '7-07': 'construction', '7-08': 'placement', '7-09': 'vitres', '7-10': 'defense',
    '8-05': 'vibora', '8-06': 'lob', '8-07': 'bandeja', '8-08': 'transition', '8-09': 'construction', '8-10': 'placement',
    '9-05': 'construction', '9-06': 'lob', '9-07': 'defense', '9-08': 'bandeja',
    '10-06': 'placement', '10-07': 'lob',
}
# Faits datés ou chiffrés vérifiés le 28/10/2026 (source de chaque vérification) ; une question ajoutée ici sans
# vérification reste « brouillon » (mettre sa clé dans A_CONFIRMER)
A_CONFIRMER = {}
VERIFICATIONS = {
    '7-01': 'FIP et Premier Padel, communiqué du 18/12/2025 (Star Point, saison 2026)',
    '9-04': 'FIP et Premier Padel, communiqué du 18/12/2025 : deux avantages, puis le Star Point',
    '9-09': 'Règlement FFT 2026/2027 (bareme-donnees.js) : P1500 renommé P2000, ancien P2000 devenu P3000',
    '9-10': 'Barème FFT 2026/2027 (bareme.html) : finaliste de P100, 80 points de 4 à 8 paires, 85 de 17 à 20',
    '8-12': 'bareme.html, cuts : catégorie interdite aux joueurs classés dans ce top',
    '10-08': 'Ooredoo Qatar Major, Doha, 28/03 au 02/04/2022 : premier tournoi de Premier Padel',
    '10-09': 'FIP (fondée en 1991) : premier championnat du monde en 1992',
    '10-10': '35e assemblée générale de la FIP, Acapulco, novembre 2025 (règles applicables en 2026)',
    '10-11': 'FIP, LTA et Wikipédia : Enrique Corcuera, Acapulco, 1969',
}

texte = SOURCE.read_text(encoding='utf-8')
questions, niveau = [], None
blocs = re.split(r'\n(?=## Niveau |\d\d\. \[)', texte)
for b in blocs:
    m = re.match(r'## Niveau (\d+)', b)
    if m:
        niveau = int(m.group(1)); continue
    m = re.match(r'(\d\d)\. \[([^\]]+)\] (.+?)\s*\n\s*(.+?)\s*\n\s*↳ (.+?)\s*$', b, re.S)
    if not m:
        continue
    num, cat, question, ligne, explication = m.groups()
    cle = f'{niveau}-{num}'
    choix_bruts = [c.strip() for c in ligne.split(' · ')]
    bonnes = [i for i, c in enumerate(choix_bruts) if c.startswith('**') and c.endswith('**')]
    assert len(bonnes) == 1, cle
    choix = [c.strip('*') for c in choix_bruts]
    theme = CATEGORIES.get(cat) or THEMES_TT.get(cle)
    assert theme, f'{cle} [{cat}] sans thème'
    questions.append({
        'id': f'samuel-{niveau}-{num}', 'statut': 'brouillon' if cle in A_CONFIRMER else 'validee',
        'categorie': cat, 'theme': theme, 'niveaux': [niveau, niveau],
        'difficulte': 1 if niveau <= 3 else 2 if niveau <= 6 else 3,
        'question': question.strip(), 'choix': choix, 'bonne': bonnes[0], 'explication': explication.strip(),
        **({'a_confirmer': A_CONFIRMER[cle]} if cle in A_CONFIRMER else {}),
        **({'verification': VERIFICATIONS[cle]} if cle in VERIFICATIONS else {}),
    })
assert len(questions) == 120, len(questions)
assert not set(THEMES_TT) - {q['id'][7:] for q in questions}, 'THEMES_TT : identifiant inconnu'
SORTIE.write_text(json.dumps({
    '_note': "Questions de Samuel (scripts/donnees/academie-questions-samuel.md, 27/10/2026), texte repris tel quel. "
             "Généré par scripts/convertir-questions-samuel.py : ne pas modifier à la main. Statut « brouillon » : fait à confirmer (a_confirmer).",
    'questions': questions}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(questions), 'questions ;', sum(q['statut'] == 'brouillon' for q in questions), 'à confirmer')
