/* ACCUEIL « VITRE » (index.html seulement, différé) : ce que le CSS ne sait pas faire seul.
   1. Appareil modeste (économie de données, peu de mémoire ou de cœurs) : classe .vitre-sobre sur <html>, le verre dépoli
      et le flou de la scène sont remplacés par des fonds opaques (style.css, bloc ACCUEIL VITRE).
   2. Tableau de score : chiffres lus dans assets/data/stats.json (généré par scripts/generer-pages.js). Repli silencieux :
      sans fichier, hors connexion ou ouvert en double-cliquant, le tiret reste (aucun chiffre inventé).
   3. « Joueurs en ce moment » : le nombre de la pastille de présence (presence.js, #pa-presence) recopié en grand ;
      tiret tant que personne n'est compté. La phrase complète reste annoncée par la zone aria-live de presence.js.
   4. Choix du parcours : les trois liens-cartes deviennent des onglets (flèches, Début, Fin, Entrée, Espace) ; un panneau
      à la fois, transition native si possible. Sans JavaScript : trois liens vers les trois parcours, tous affichés.
   5. Cartes de joueur dessinées par carte-rendu.js (CARTE_RENDU), chargé seulement quand la section approche ; son adresse
      versionnée est lue dans <template id="vitre-rendu"> (empreinte posée par scripts/appliquer-gabarit.js).
   6. Inclinaison des cartes au pointeur : souris seulement, jamais en mouvement réduit. */
(function () {
  'use strict';
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Appareil modeste */
  try {
    const n = navigator, c = n.connection;
    if ((c && c.saveData) || (n.deviceMemory && n.deviceMemory < 4) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2))
      document.documentElement.classList.add('vitre-sobre');
  } catch (e) { /* rien : verre par défaut */ }

  /* 2. Tableau de score */
  const chiffre = n => n.toLocaleString('fr-FR');
  const cases = document.querySelectorAll('[data-vitre-stat]');
  if (cases.length && typeof fetch === 'function') {
    fetch('assets/data/stats.json').then(r => (r.ok ? r.json() : null)).then(s => {
      if (!s) return;
      cases.forEach(el => {
        const v = s[el.dataset.vitreStat];
        if (Number.isInteger(v) && v >= 0) el.textContent = chiffre(v);
      });
    }).catch(() => {});
  }

  /* 3. Joueurs en ce moment */
  const phrase = document.querySelector('#pa-presence [data-presence-texte]'), joueurs = document.querySelector('[data-vitre-joueurs]');
  if (phrase && joueurs) {
    const recopier = () => {
      const m = /^(\d+)\s/.exec(phrase.textContent.trim() + ' ');
      joueurs.textContent = m && +m[1] > 0 ? chiffre(+m[1]) : '—';
    };
    new MutationObserver(recopier).observe(phrase, { childList: true, characterData: true, subtree: true });
    recopier();
  }

  /* 4. Choix du parcours en onglets */
  const liste = document.querySelector('.vitre-choix');
  if (!liste) return;
  const cartes = [...liste.querySelectorAll('.vitre-carte')];
  const panneaux = cartes.map(c => document.getElementById(c.getAttribute('href').slice(1)));
  if (!cartes.length || panneaux.some(p => !p)) return;
  liste.setAttribute('role', 'tablist');
  liste.setAttribute('aria-label', 'Choisis ton parcours');
  cartes.forEach((c, i) => {
    c.setAttribute('role', 'tab');
    c.setAttribute('aria-controls', panneaux[i].id);
    panneaux[i].setAttribute('role', 'tabpanel');
  });
  // Départ vers une autre page pendant l'animation du panneau : on la termine, sinon la transition entre pages est annulée
  let enCours = null;
  const finir = () => { if (enCours) { try { enCours.skipTransition(); } catch (e) { /* déjà finie */ } enCours = null; } };
  addEventListener('pageswap', finir);
  addEventListener('pagehide', finir);
  const choisir = (i, anim) => {
    const faire = () => cartes.forEach((c, j) => {
      const oui = i === j;
      c.setAttribute('aria-selected', String(oui));
      c.tabIndex = oui ? 0 : -1;
      c.querySelector('.vc-etat').textContent = oui ? 'Ton parcours' : '';
      panneaux[j].hidden = !oui;
    });
    if (anim && !reduit && typeof document.startViewTransition === 'function') {
      // Un nouveau choix (flèches rapides) interrompt la transition en cours : promesses rejetées, sans conséquence
      const t = document.startViewTransition(faire);
      [t.ready, t.finished, t.updateCallbackDone].forEach(p => p && p.catch(() => {}));
      enCours = t;
      t.finished.then(() => { if (enCours === t) enCours = null; }, () => { if (enCours === t) enCours = null; });
    } else faire();
  };
  cartes.forEach((c, i) => {
    c.addEventListener('click', e => { e.preventDefault(); choisir(i, true); });
    c.addEventListener('keydown', e => {
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % cartes.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + cartes.length) % cartes.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = cartes.length - 1;
      else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); choisir(i, true); return; }
      if (j === null) return;
      e.preventDefault();
      choisir(j, true);
      cartes[j].focus();
    });
  });
  // Arrivée par une adresse #v-panneau-… : ce parcours est choisi
  const cible = panneaux.findIndex(p => '#' + p.id === location.hash);
  choisir(cible >= 0 ? cible : 0, false);

  /* 5. Cartes de joueur (données d'exemple, un modèle par parcours) */
  const DONNEES = {
    debutant: { modele: 'vignette', photo: 'assets/img/photos/c-niveau-540.webp',
      d: { pseudo: 'Débutant', poste: 'Polyvalent', globale: 38, rang: 'bronze', attributs: [['VOL', 40], ['AER', 31], ['DEF', 42], ['LOB', 45], ['SER', 36], ['TAC', 34]] } },
    intermediaire: { modele: 'stade', photo: 'assets/img/photos/c-entrainement-540.webp',
      d: { pseudo: 'Je progresse', poste: 'Droite', globale: 72, rang: 'or', attributs: [['VOL', 76], ['AER', 64], ['DEF', 73], ['LOB', 75], ['SER', 70], ['TAC', 74]] } },
    competiteur: { modele: 'blason', photo: 'assets/img/photos/c-competition-540.webp',
      d: { pseudo: 'Compétiteur', poste: 'Gauche', globale: 88, rang: 'elite', attributs: [['VOL', 86], ['AER', 93], ['DEF', 84], ['LOB', 85], ['SER', 82], ['TAC', 90]] } }
  };
  const chargerRendu = () => new Promise((ok, ko) => {
    if (window.CARTE_RENDU) { ok(); return; }
    const modele = document.getElementById('vitre-rendu'), s0 = modele && modele.content && modele.content.querySelector('script');
    if (!s0) { ko(); return; }
    const s = document.createElement('script');
    s.src = s0.getAttribute('src'); s.async = true; s.onload = ok; s.onerror = ko;
    document.head.appendChild(s);
  });
  const dessinerTout = () => chargerRendu().then(() => {
    if (!window.CARTE_RENDU) return;
    cartes.forEach(c => {
      const def = DONNEES[c.dataset.profil], cv = c.querySelector('canvas');
      if (!def || !cv) return;
      const largeur = Math.min(720, Math.max(200, Math.round(cv.getBoundingClientRect().width * (window.devicePixelRatio || 1))));
      const img = new Image();
      img.onload = img.onerror = () => {
        Promise.resolve(window.CARTE_RENDU.dessiner(cv, Object.assign({}, def.d, {
          attributs: def.d.attributs.map(([cle, note]) => ({ cle, note })), photo: img.naturalWidth ? img : null
        }), { modele: def.modele, largeur })).catch(() => {});
      };
      img.src = def.photo;
    });
  }).catch(() => { /* sans dessin : la carte garde son fond de couleur, le nom et le texte restent */ });
  if ('IntersectionObserver' in window) {
    const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { o.disconnect(); dessinerTout(); } }, { rootMargin: '200px 0px' });
    o.observe(liste);
  } else dessinerTout();

  /* 6. Inclinaison au pointeur */
  if (!reduit && window.matchMedia('(hover: hover) and (pointer: fine)').matches) cartes.forEach(c => {
    const z = c.querySelector('.vc-img');
    c.addEventListener('pointermove', e => {
      const r = z.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      z.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(1) + 'deg');
      z.style.setProperty('--ry', ((x - 0.5) * 20).toFixed(1) + 'deg');
    });
    c.addEventListener('pointerleave', () => { z.style.removeProperty('--rx'); z.style.removeProperty('--ry'); });
  });
})();
