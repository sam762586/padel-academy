/* SERVICE WORKER de Apprendre Padel.
   - Shell (pages HTML, CSS, JS, icônes) : mis en cache à l'installation, servi en « stale-while-revalidate ».
   - Données des tournois (assets/data/tournois.json) et fiches (assets/data/fiches/*.json) et « près de chez toi » (assets/data/prochains/*.json) : « network-first »
     avec repli sur le cache. Les fiches ne sont mises en cache qu'une fois consultées.
   - Simulateur 3D (assets/3d/ : moteur, modèle, scénarios, environ 1,5 Mo) : jamais précaché, « network-first »
     à la demande ; la page simulateur-3d.html elle-même n'est pas dans le shell.
   - supabase-js est hébergé sur le site (assets/vendor/) et précaché comme le reste du shell.
   - Pages (navigation) : clé de cache SANS la query (une seule entrée par page, pas une par ?suite=…). Si la query porte
     un retour de connexion (code, error*, access_token, token_hash…), la page est servie du réseau sans aucune mise en cache.
   - Tout ce qui vient d'un autre domaine (Supabase, IGN...) n'est JAMAIS intercepté ni mis en cache.
   - Style et scripts sont appelés avec « ?v=<empreinte> » (scripts/gabarit.js) : une nouvelle version a une autre adresse,
     donc une page neuve n'est jamais servie avec un ancien style. Les anciennes versions sont retirées du cache ;
     hors connexion, à défaut de la bonne version, on sert la dernière connue.
   Pour publier une nouvelle version du shell : changer CACHE (ex. "pa-v2"), les anciens caches sont supprimés à l'activation. */
const CACHE = "pa-v42-carte-joueur";

// Shell précaché. Une ressource absente (page pas encore créée) ne bloque pas l'installation.
const SHELL = [
  "./",
  "index.html", "technique.html", "tactique.html", "tutos.html", "niveau.html", "entrainement.html", "videos.html",
  "regles.html", "conseils.html", "materiel.html", "competition.html", "bareme.html", "tournois.html", "lexique.html",
  "premier-tournoi.html", "academie.html", "compte.html", "confidentialite.html", "mentions-legales.html", "espace.html", "connexion.html", "score.html", "partenaires.html", "carte.html", "hors-ligne.html",
  "manifest.webmanifest", "favicon.png", "apple-touch-icon.png",
  "assets/style.css", "assets/carte.css", "assets/fonts/manrope-latin.woff2", "assets/fonts/big-shoulders-display-latin.woff2",
  "assets/vendor/supabase-2.45.4.js", // supabase-js hébergé sur le site (jamais de CDN)
  "assets/js/bareme.js", "assets/js/carte-france.js", "assets/js/compte-page.js", "assets/js/compte.js", "assets/js/coups.js",
  "assets/js/lexique.js", "assets/js/nav.js", "assets/js/placement.js", "assets/js/quiz-tactique-donnees.js", "assets/js/quiz-tactique.js", "assets/js/tableau-tactique.js", "assets/js/diagnostic-paire.js", "assets/js/defis.js", "assets/js/academie.js", "assets/js/academie-questions.js", "assets/js/academie-quiz.js", "assets/js/academie-contenus.js", "assets/js/academie-parcours.js", "assets/js/academie-sync.js", "assets/js/carnet-outils.js", "assets/js/plan.js", "assets/js/mon-plan.js", "assets/js/pwa.js",
  "assets/js/quiz-niveau.js", "assets/js/carte-donnees.js", "assets/js/carte-rendu.js", "assets/js/carte.js", "assets/js/raquettes.js", "assets/js/schemas-coups.js", "assets/js/supabase-config.js",
  "assets/js/tournois.js", "assets/js/tuto-couple.js", "assets/js/tuto-lob.js", "assets/js/tuto-monter.js", "assets/js/videos.js",
  "assets/js/partenaires.js", "assets/js/score.js", "assets/js/bareme-donnees.js", "assets/js/mon-padel.js", "assets/js/favoris.js", "assets/js/joueur-sync.js", "assets/js/espace.js", "assets/js/journal.js", "assets/js/exercices-donnees.js", "assets/js/exercices.js", "assets/js/progression.js", "assets/js/diagnostic.js", "assets/js/accueil-tournois.js", "assets/js/connexion.js", "assets/js/anti-cadre.js", "assets/js/communaute-tournoi.js", "assets/js/mesure-audience.js", "assets/data/pages-tournois.js",
  "assets/img/icons/icon-192.png", "assets/img/icons/icon-512.png", "assets/img/icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // cache: "reload" : toujours la version du serveur, jamais une copie déjà périmée du cache HTTP du navigateur
      Promise.all(SHELL.map(url => cache.add(new Request(url, { cache: "reload" })).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

// Nettoyage des anciennes versions du cache
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(nom => nom.startsWith("pa-") && nom !== CACHE).map(nom => caches.delete(nom))))
      .then(() => self.clients.claim())
  );
});

// Données : index des tournois, fiches détaillées et tournois proches par département
const estDonnee = chemin => chemin.endsWith("/assets/data/tournois.json") || /\/assets\/data\/(fiches|prochains)\/[0-9AB]{2,3}\.json$/.test(chemin);

// Réponse du cache, marquée pour que la page sache qu'elle est hors connexion
function marquerDepuisCache(reponse) {
  const entetes = new Headers(reponse.headers);
  entetes.set("X-Depuis-Cache", "1");
  return reponse.blob().then(corps => new Response(corps, { status: reponse.status, statusText: reponse.statusText, headers: entetes }));
}

async function reseauDabord(requete) {
  const cache = await caches.open(CACHE);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) await cache.put(requete, reponse.clone());
    return reponse;
  } catch (erreur) {
    const copie = await cache.match(requete);
    if (copie) return marquerDepuisCache(copie);
    throw erreur;
  }
}

// Garde une seule version de chaque fichier versionné (style.css?v=…, nav.js?v=…)
async function retirerAnciennesVersions(cache, adresse) {
  const cible = new URL(adresse);
  for (const cle of await cache.keys()) {
    const u = new URL(cle.url);
    if (u.pathname === cible.pathname && u.search !== cible.search) await cache.delete(cle);
  }
}

// Paramètres d'un retour de connexion : jamais gardés dans Cache Storage
const PARAMS_SENSIBLES = ["code", "error", "error_code", "error_description", "access_token", "refresh_token", "token_hash", "type"];
const estSensible = url => PARAMS_SENSIBLES.some(p => url.searchParams.has(p));
const sansQuery = adresse => { const u = new URL(adresse); u.search = ""; u.hash = ""; return u.href; };

async function navigationSensible(requete) {
  try {
    return await fetch(requete);
  } catch (erreur) {
    const cache = await caches.open(CACHE);
    const copie = await cache.match(requete, { ignoreSearch: true }) || await cache.match("hors-ligne.html");
    if (copie) return copie;
    throw erreur;
  }
}

async function perimeEtRevalide(requete, estNavigation) {
  const cache = await caches.open(CACHE);
  // Une page est gardée sous son adresse sans query (une seule entrée par page)
  const cle = estNavigation ? sansQuery(requete.url) : requete;
  // Les pages sont retrouvées sans leur paramètre (ex. partenaires.html?tournoi=12)
  const copie = await cache.match(cle, { ignoreSearch: estNavigation });
  const versionne = new URL(requete.url).searchParams.has("v");
  const miseAJour = fetch(requete).then(reponse => {
    if (reponse.ok && reponse.type === "basic") {
      cache.put(cle, reponse.clone());
      if (versionne) retirerAnciennesVersions(cache, requete.url);
    }
    return reponse;
  });
  if (copie) {
    miseAJour.catch(() => null); // rafraîchissement silencieux
    return copie;
  }
  try {
    return await miseAJour;
  } catch (erreur) {
    // Hors connexion : dernière version connue du style ou du script
    if (versionne) {
      const ancienne = await cache.match(requete, { ignoreSearch: true });
      if (ancienne) return ancienne;
    }
    if (estNavigation) {
      const horsLigne = await cache.match("hors-ligne.html");
      if (horsLigne) return horsLigne;
    }
    throw erreur;
  }
}

self.addEventListener("fetch", event => {
  const requete = event.request;
  if (requete.method !== "GET" || requete.headers.has("range")) return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // autre domaine : on ne touche à rien
  if (estDonnee(url.pathname) || url.pathname.includes("/assets/3d/")) {
    event.respondWith(reseauDabord(requete));
    return;
  }
  if (url.pathname.includes("/assets/data/")) return; // copies .js et .json hors liste : pas de cache
  const navigation = requete.mode === "navigate";
  if (navigation && estSensible(url)) {
    event.respondWith(navigationSensible(requete));
    return;
  }
  event.respondWith(perimeEtRevalide(requete, navigation));
});
