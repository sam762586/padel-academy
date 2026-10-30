/* Ma carte de joueur : rendu sur canvas, 4 modèles au choix (seule source de vérité : l'aperçu de la page et l'image exportée sont le même dessin).
   Usage : await window.CARTE_RENDU.dessiner(canvas, donnees, options)
     donnees : { pseudo, poste ("Droite" | "Gauche" | "Polyvalent" | code de 3 lettres), globale (1-99), rang ("bronze" | "argent" | "or" | "elite"),
                attributs: [{cle: "VOL", note: 82}, … ×6], photo: HTMLImageElement | HTMLCanvasElement | null, niveau: texte facultatif,
                detoure: true si la photo est un PNG détouré (alpha respecté, pas de duotone),
                club: texte facultatif (30 caractères, nettoyé par nettoyerClub) dessiné en capitales sous le pseudo sur les 4 modèles,
                taille réduite s'il est long ; rien si vide (le dessin est alors identique à celui d'avant le club) }
     options : { modele: "neon" (défaut) | "blason" | "stade" | "vignette", format: "carte" (2:3, 1200×1800 par défaut) | "story" (1080×1920),
                 largeur: largeur de sortie du format carte (120 px mini : aperçus du sélecteur), phase: 0..1 position du reflet de la bordure
                 Élite (Néon), export: true pour l'image téléchargée (grain réduit à 2 px) }
   Rend une promesse du canvas. window.CARTE_RENDU.MODELES = [{cle, nom, description}] : la liste à proposer au visiteur.
   window.CARTE_RENDU.animer(canvas, donnees, options) : même dessin à l'écran ; seul Néon Élite est animé (bordure qui tourne : fond
   statique mis en cache hors écran, seule la bordure est redessinée), sauf prefers-reduced-motion ou story. Renvoie une fonction d'arrêt
   (vide pour les modèles sans animation).
   Polices (Big Shoulders Display, Manrope) chargées via document.fonts avant le dessin ; si une police manque, la pile de repli
   (Arial Narrow / Impact, Arial) prend le relais : le dessin reste lisible. Cotes en unités sur une base de 600 × 900.

   MODÈLES (le rang donne la couleur dominante de chacun : corail bronze, argent froid, sable or, vert énergie élite)
   - Néon : carte très sombre (bleu nuit assombri de 40 %), grille de terrain en perspective, photo en duotone (nuit → bleu terrain →
     couleur du rang), note globale dans un anneau de progression, pseudo en lettres néon, 6 attributs en anneaux, équerres vertes,
     contour néon (Élite : reflet tournant). Sans photo : monogramme des initiales dans un anneau néon.
   - Blason : carte métallisée découpée en blason (coins coupés, haut creusé, pointe en ogive), perforations de raquette et reflets,
     note géante et poste en haut à gauche, raquette stylisée, photo en couleurs qui déborde du filet, attributs « 82 VOL » en deux
     colonnes. Métal clair + encre bleu nuit (Élite : métal noir, vert énergie, étincelles). Posé sur un écrin nuit (format carte).
   - Stade : deux grands biseaux, projecteurs, fumée, filigrane du terrain, bande diagonale métal, note géante en relief, jauges
     segmentées. Sans photo : initiales en filigrane lumineux.
   - Vignette : vignette d'album rétro, papier crème, bordure de la couleur du rang, photo en couleurs dans un cadre tramé, note dans
     une pastille, ruban du nom et capsule du poste, attributs en petits chiffres ; texte bleu nuit sur clair (Élite : reflets irisés).
   Couleurs : jetons du design system (style.css) lus à l'exécution, mêmes valeurs en repli ; les nuances (métal clair / foncé, papier
   crème = sable + blanc froid, encres) sont calculées par mélange des jetons, jamais en dur. Contrastes : voir carte.css. */
(function () {
  'use strict';
  const jeton = (nom, repli) => {
    try { const v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim(); return v || repli; } catch (e) { return repli; }
  };
  const C = {
    navy: jeton('--navy', '#101F35'), fg: jeton('--fg', '#F4F7FA'), muted: jeton('--muted', '#A5B3C7'), dim: jeton('--dim', '#8D9BB2'),
    turf: jeton('--turf', '#C8F14B'), sky: jeton('--sky', '#5CB2E3'), terrain: jeton('--terrain', '#1674A6'),
    sand: jeton('--sand', '#ffb547'), coral: jeton('--coral', '#ff6b57'),
    argent: jeton('--cj-argent', '#B8C7DA') // propre à la carte (déclaré dans carte.css)
  };
  const DISPLAY = '"Big Shoulders Display","Arial Narrow",Impact,sans-serif';
  const BODY = 'Manrope,"Segoe UI",Helvetica,Arial,sans-serif';
  const W = 600, H = 900, RAYON = 26;

  // #rrggbb ou rgb() → [r, g, b] ; mélange de deux couleurs ; rgba()
  function rgbTab(couleur) {
    const m = /^#([0-9a-f]{6})$/i.exec(String(couleur).trim());
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const n = String(couleur).match(/\d+/g); return n ? n.slice(0, 3).map(Number) : [255, 255, 255];
  }
  const mix = (a, b, t) => '#' + rgbTab(a).map((v, i) => Math.round(v + (rgbTab(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const rgba = (couleur, a) => `rgba(${rgbTab(couleur).join(',')},${a})`;
  const NOIR = '#000000';
  const FOND = mix(C.navy, NOIR, .4); // bleu nuit assombri de 40 % : fond propre à la carte
  const rang = (nom, couleur) => ({ nom, couleur, clair: mix(couleur, C.fg, .55), fonce: mix(couleur, NOIR, .35) });
  const RANGS = { bronze: rang('Bronze', C.coral), argent: rang('Argent', C.argent), or: rang('Or', C.sand), elite: rang('Élite', C.turf) };

  async function chargerPolices() {
    if (!document.fonts || !document.fonts.load) return false;
    try {
      await Promise.all(['900 100px "Big Shoulders Display"', '800 100px "Big Shoulders Display"', '700 20px Manrope', '800 20px Manrope'].map(f => document.fonts.load(f)));
      return document.fonts.check('900 100px "Big Shoulders Display"') && document.fonts.check('700 20px Manrope');
    } catch (e) { return false; }
  }

  // Générateur pseudo-aléatoire déterministe (mulberry32) : même grain à chaque rendu, export identique à l'aperçu
  function alea(graine) {
    let a = graine >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function codePoste(poste) {
    const p = String(poste || '').trim().toLowerCase();
    if (!p) return '';
    if (p.startsWith('droit')) return 'DRO';
    if (p.startsWith('gauch')) return 'GAU';
    if (p.startsWith('poly')) return 'POL';
    return p.slice(0, 3).toUpperCase();
  }
  function libellePoste(poste) { const p = String(poste || '').trim(); return p ? p.charAt(0).toUpperCase() + p.slice(1) : ''; }
  function initiales(pseudo) {
    const mots = String(pseudo || '').trim().split(/[\s-]+/).filter(Boolean);
    if (!mots.length) return '';
    return (mots.length > 1 ? mots[0][0] + mots[mots.length - 1][0] : mots[0].slice(0, 2)).toUpperCase();
  }
  const borner = n => Math.max(0, Math.min(99, Math.round(Number(n) || 0)));

  function rect(ctx, x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y); ctx.lineTo(x + w - k, y); ctx.arcTo(x + w, y, x + w, y + k, k);
    ctx.lineTo(x + w, y + h - k); ctx.arcTo(x + w, y + h, x + w - k, y + h, k);
    ctx.lineTo(x + k, y + h); ctx.arcTo(x, y + h, x, y + h - k, k);
    ctx.lineTo(x, y + k); ctx.arcTo(x, y, x + k, y, k); ctx.closePath();
  }
  function police(ctx, poids, taille, famille, espacement) {
    ctx.font = `${poids} ${taille}px ${famille || BODY}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (espacement || 0) * taille + 'px';
  }
  // Réduit la taille jusqu'à ce que le texte tienne dans maxW ; renvoie la taille retenue
  function ajuster(ctx, s, poids, taille, famille, maxW, espacement) {
    let t = taille;
    for (let i = 0; i < 40; i++) {
      police(ctx, poids, t, famille, espacement);
      if (ctx.measureText(s).width <= maxW || t <= 10) break;
      t = Math.round(t * 0.94);
    }
    return t;
  }
  /* Texte avec options : couleur, align, base, espacement, relief {couleur, dx, dy}, lueur {couleur, flou, passes}, contour {couleur, largeur}, ombre (flou) */
  function texte(ctx, s, x, y, o) {
    police(ctx, o.poids || 700, o.taille, o.famille, o.espacement);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.lineJoin = 'round';
    if (o.relief) { ctx.fillStyle = o.relief.couleur; ctx.fillText(s, x + (o.relief.dx || 0), y + (o.relief.dy || 0)); }
    if (o.lueur) {
      ctx.save();
      ctx.shadowColor = o.lueur.couleur; ctx.shadowBlur = o.lueur.flou;
      ctx.fillStyle = o.couleur || C.fg;
      for (let i = 0; i < (o.lueur.passes || 1); i++) ctx.fillText(s, x, y);
      ctx.restore();
    }
    if (o.contour) { ctx.lineWidth = o.contour.largeur; ctx.strokeStyle = o.contour.couleur; ctx.strokeText(s, x, y); }
    if (o.ombre) { ctx.shadowColor = rgba(C.navy, .9); ctx.shadowBlur = o.ombre; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = o.couleur || C.fg; ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return w;
  }
  /* Club du joueur (facultatif, 30 caractères) : caractères de contrôle et marques de direction retirés, espaces réduits.
     Aussi utilisé par carte.js (window.CARTE_RENDU.nettoyerClub) : une seule règle pour la saisie et le dessin. */
  const CLUB_MAX = 30;
  function nettoyerClub(s) {
    const t = String(typeof s === 'string' ? s : '').replace(/\p{Cc}/gu, ' ').replace(/[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    return Array.from(t).slice(0, CLUB_MAX).join('').trim();
  }
  /* Ligne du club, en capitales, sous le pseudo : taille réduite (measureText, via ajuster) jusqu'à tenir dans maxW, de o.taille
     à o.mini ; si le texte déborde encore à la taille mini, il est coupé avec des points de suspension. Rien si le club est vide.
     Renvoie la largeur dessinée (0 si rien). */
  function ligneClub(ctx, club, x, y, maxW, o) {
    let s = nettoyerClub(club).toUpperCase();
    if (!s) return 0;
    const poids = o.poids || 800, esp = o.espacement || 0, mini = o.mini || 10;
    let t = o.taille;
    for (let i = 0; i < 40; i++) {
      police(ctx, poids, t, o.famille, esp);
      if (ctx.measureText(s).width <= maxW || t <= mini) break;
      t = Math.max(mini, t - 1);
    }
    if (ctx.measureText(s).width > maxW) {
      const lettres = Array.from(s);
      while (lettres.length > 1 && ctx.measureText(lettres.join('').trimEnd() + '…').width > maxW) lettres.pop();
      s = lettres.join('').trimEnd() + '…';
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return texte(ctx, s, x, y, Object.assign({}, o, { taille: t }));
  }
  // Photo en cover, ancrée au-dessus du centre (visage en haut) ; alpha respecté
  function photoCover(ctx, img, x, y, w, h, ancre) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) * (ancre == null ? 0.22 : ancre), sw, sh, x, y, w, h);
  }

  /* Grain procédural : bruit blanc fondu en « screen ». À l'écran : à la résolution du canvas ; à l'export : cellules de 2 px
     (l'image JPEG / WebP reste légère). Le bruit est mis en cache par taille. */
  const cacheGrain = new Map();
  function grain(ctx, w, h, alpha, graine, cellule) {
    const k = (ctx.getTransform().a || 1) / (cellule || 1), pw = Math.ceil(w * k), ph = Math.ceil(h * k), cle = pw + 'x' + ph + ':' + graine;
    let c = cacheGrain.get(cle);
    if (!c) {
      c = document.createElement('canvas'); c.width = pw; c.height = ph;
      const cx = c.getContext('2d'), im = cx.createImageData(pw, ph), p = im.data, r = alea(graine || 7);
      for (let i = 0; i < p.length; i += 4) { const v = (r() * 255) | 0; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
      cx.putImageData(im, 0, 0);
      if (cacheGrain.size > 6) cacheGrain.clear();
      cacheGrain.set(cle, c);
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'screen';
    ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, pw, ph, 0, 0, w, h); ctx.restore();
  }
  /* Duotone : photo → luminance → dégradé (ombres, milieu, lumières), alpha conservé. Renvoie un canvas w × h.
     getImageData exige une image de même origine (la photo vient d'un dataURL local : c'est le cas) ; en cas d'exception
     (canvas « tainted »), renvoie null et l'appelant se replie sur un lavis multiply. Résultat mis en cache (photo, taille, rang). */
  let cacheDuo = null;
  function duotone(img, w, h, ombres, milieu, lumieres, ancre, pivot) {
    const cle = [w, h, ombres, milieu, lumieres].join('|');
    if (cacheDuo && cacheDuo.img === img && cacheDuo.cle === cle) return cacheDuo.c;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d');
    photoCover(cx, img, 0, 0, w, h, ancre);
    let im; try { im = cx.getImageData(0, 0, w, h); } catch (e) { return null; }
    const A = rgbTab(ombres), B = rgbTab(milieu), D = rgbTab(lumieres), lut = new Uint8ClampedArray(256 * 3), pv = pivot == null ? .5 : pivot;
    for (let v = 0; v < 256; v++) {
      const t = v / 255, bas = t < pv, s = bas ? t / pv : (t - pv) / (1 - pv), P = bas ? A : B, Q = bas ? B : D;
      const e = s * s * (3 - 2 * s); // courbe en S légère : plus de contraste
      for (let j = 0; j < 3; j++) lut[v * 3 + j] = P[j] + (Q[j] - P[j]) * e;
    }
    const p = im.data;
    for (let i = 0; i < p.length; i += 4) {
      const l = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) | 0;
      p[i] = lut[l * 3]; p[i + 1] = lut[l * 3 + 1]; p[i + 2] = lut[l * 3 + 2];
    }
    cx.putImageData(im, 0, 0);
    cacheDuo = { img, cle, c };
    return c;
  }

  // Grille de terrain en perspective : point de fuite (fx, fy), sol de yH (horizon) à yB (bas) ; lignes bleu ciel avec lueur
  function grille(ctx, fx, fy, yH, yB, largeurBas, alpha) {
    ctx.save();
    ctx.lineWidth = 1.5; ctx.shadowColor = rgba(C.sky, .9); ctx.shadowBlur = 10;
    const xs = [-0.5, -0.33, 0, 0.33, 0.5, -0.9, 0.9].map(k => fx + k * largeurBas);
    xs.forEach((xb, i) => {
      const g = ctx.createLinearGradient(0, yH, 0, yB);
      g.addColorStop(0, rgba(C.sky, 0)); g.addColorStop(.35, rgba(C.sky, alpha * (i === 2 ? 1 : .7))); g.addColorStop(1, rgba(C.sky, alpha * .25));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(xb, yB + (yB - fy) * 0.3); ctx.stroke();
    });
    // Lignes horizontales : espacement en 1/z (plus serré vers l'horizon) ; ligne de service plus marquée
    for (let i = 0; i < 14; i++) {
      const z = 1 - i / 14, y = fy + (yB - fy) / (1 + 5 * z * z);
      if (y < yH) continue;
      const t = (y - yH) / (yB - yH), a = alpha * (0.25 + t * .75) * (i === 9 ? 1.6 : .7);
      ctx.strokeStyle = rgba(C.sky, Math.min(1, a)); ctx.lineWidth = i === 9 ? 2.5 : 1.2;
      ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(W + 40, y); ctx.stroke();
    }
    // Filet lumineux à l'horizon
    const g = ctx.createLinearGradient(0, yH - 22, 0, yH + 22);
    g.addColorStop(0, rgba(C.terrain, 0)); g.addColorStop(.5, rgba(C.terrain, alpha * .8)); g.addColorStop(1, rgba(C.terrain, 0));
    ctx.fillStyle = g; ctx.fillRect(0, yH - 22, W, 44);
    ctx.restore();
  }
  // Anneau de progression néon : piste, arc (lueur double), point lumineux au bout
  function anneau(ctx, cx, cy, r, ep, n, R, alphaPiste) {
    const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.max(.02, n / 99);
    ctx.save(); ctx.lineCap = 'round';
    ctx.lineWidth = ep; ctx.strokeStyle = rgba(C.fg, alphaPiste || .1); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowColor = rgba(R.couleur, .95); ctx.shadowBlur = ep * 3;
    ctx.strokeStyle = R.couleur; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    ctx.shadowBlur = ep; ctx.lineWidth = ep * .45; ctx.strokeStyle = R.clair; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    ctx.shadowBlur = ep * 2; ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, ep * .55, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Équerre néon (coin)
  function equerre(ctx, x, y, dx, dy, l, couleur) {
    ctx.save(); ctx.strokeStyle = couleur; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.shadowColor = rgba(couleur, .9); ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(x + dx * l, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * l); ctx.stroke(); ctx.restore();
  }
  // Bordure Élite : reflet tournant (dégradé linéaire orienté par la phase), tracé sur le cadre arrondi
  function bordureElite(ctx, R, phase) {
    const a = (phase || 0) * Math.PI * 2, x0 = 300 + Math.cos(a) * 520, y0 = 450 + Math.sin(a) * 520, x1 = 300 - Math.cos(a) * 520, y1 = 450 - Math.sin(a) * 520;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, R.couleur); g.addColorStop(.2, R.clair); g.addColorStop(.35, C.sky); g.addColorStop(.5, R.couleur); g.addColorStop(.7, R.fonce); g.addColorStop(.85, C.fg); g.addColorStop(1, R.couleur);
    ctx.save();
    ctx.shadowColor = rgba(R.couleur, .9); ctx.shadowBlur = 26;
    ctx.lineWidth = 7; ctx.strokeStyle = g; rect(ctx, 3.5, 3.5, W - 7, H - 7, RAYON - 3); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.fg, .6); rect(ctx, 9.5, 9.5, W - 19, H - 19, RAYON - 9); ctx.stroke();
    ctx.restore();
  }
  // Contour des autres rangs : double contour néon dans la couleur du rang
  function bordure(ctx, R) {
    ctx.save(); ctx.shadowColor = rgba(R.couleur, .8); ctx.shadowBlur = 18; ctx.lineWidth = 4; ctx.strokeStyle = R.couleur; rect(ctx, 2, 2, W - 4, H - 4, RAYON - 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeStyle = rgba(R.couleur, .4); rect(ctx, 10.5, 10.5, W - 21, H - 21, RAYON - 10); ctx.stroke(); ctx.restore();
  }

  /* Zone photo (24 → 576 × 24 → 580) : duotone + scanlines, fondue par effacement de l'alpha (les halos du fond restent visibles) */
  function dessinerPhoto(ctx, d, R, px, py, pw, ph) {
    const k = ctx.getTransform().a || 1, tw = Math.round(pw * k), th = Math.round(ph * k);
    let source = d.detoure ? null : duotone(d.photo, tw, th, FOND, C.terrain, R.couleur, .18, .42);
    const calque = document.createElement('canvas'); calque.width = tw; calque.height = th;
    const cc = calque.getContext('2d');
    if (source) cc.drawImage(source, 0, 0);
    else {
      // Repli (détouré ou getImageData refusé) : photo telle quelle, lavis multiply dans la couleur du rang
      if (d.detoure) { const iw = d.photo.naturalWidth || d.photo.width, ih = d.photo.naturalHeight || d.photo.height, s = Math.min(tw * .92 / iw, th * .92 / ih); cc.drawImage(d.photo, (tw - iw * s) / 2, th * .03, iw * s, ih * s); }
      else photoCover(cc, d.photo, 0, 0, tw, th, .18);
      cc.globalCompositeOperation = 'multiply'; cc.fillStyle = rgba(R.couleur, .45); cc.fillRect(0, 0, tw, th);
      cc.globalCompositeOperation = 'source-over';
    }
    cc.fillStyle = 'rgba(0,0,0,.18)';
    for (let y = 0; y < th; y += 4 * k) cc.fillRect(0, y, tw, 1.2 * k);
    cc.globalCompositeOperation = 'destination-out';
    const ge = cc.createLinearGradient(0, 0, 0, th);
    ge.addColorStop(0, 'rgba(0,0,0,.35)'); ge.addColorStop(.15, 'rgba(0,0,0,0)'); ge.addColorStop(.62, 'rgba(0,0,0,0)'); ge.addColorStop(.9, 'rgba(0,0,0,.96)'); ge.addColorStop(1, 'rgba(0,0,0,1)');
    cc.fillStyle = ge; cc.fillRect(0, 0, tw, th);
    ctx.save(); rect(ctx, px, py, pw, ph, 14); ctx.clip();
    ctx.drawImage(calque, px, py, pw, ph);
    ctx.restore();
  }
  /* Sans photo : monogramme des initiales dans un anneau néon, épaules en silhouette fondues vers la grille */
  function dessinerMonogramme(ctx, d, R) {
    const ini = initiales(d.pseudo) || '?';
    ctx.save();
    // Épaules : silhouette bleu terrain, contour néon du rang, fondue en bas
    const g = ctx.createLinearGradient(0, 330, 0, 560);
    g.addColorStop(0, rgba(C.terrain, .5)); g.addColorStop(1, rgba(C.terrain, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(110, 560); ctx.quadraticCurveTo(120, 370, 300, 340); ctx.quadraticCurveTo(480, 370, 490, 560); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(R.couleur, .6); ctx.lineWidth = 2; ctx.shadowColor = rgba(R.couleur, .9); ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(135, 470); ctx.quadraticCurveTo(150, 365, 300, 340); ctx.quadraticCurveTo(450, 365, 465, 470); ctx.stroke();
    // Anneau néon pointillé autour du monogramme
    ctx.setLineDash([3, 7]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(R.couleur, .75); ctx.beginPath(); ctx.arc(300, 218, 118, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 3; ctx.strokeStyle = R.couleur; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(300, 218, 104, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rgba(FOND, .6); ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(300, 218, 102, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const t = ajuster(ctx, ini, 900, 150, DISPLAY, 170, .04);
    texte(ctx, ini, 300, 218 + t * .36, { poids: 900, taille: t, famille: DISPLAY, espacement: .04, couleur: C.fg, align: 'center', lueur: { couleur: rgba(R.couleur, .95), flou: 30, passes: 2 }, contour: { couleur: R.couleur, largeur: 2.5 } });
  }

  /* Dessine la carte (600 × 900) à l'origine courante. o.sansBordure : la bordure est laissée à l'appelant (animation) */
  function carteNeon(ctx, d, o) {
    const R = RANGS[d.rang] || RANGS.or, elite = d.rang === 'elite', exp = !!o.export;
    ctx.save(); rect(ctx, 0, 0, W, H, RAYON); ctx.clip();
    ctx.fillStyle = FOND; ctx.fillRect(0, 0, W, H);

    // Fond : halo bleu terrain au centre, halo du rang en haut
    let g = ctx.createRadialGradient(300, 470, 0, 300, 470, 560);
    g.addColorStop(0, rgba(C.terrain, .35)); g.addColorStop(1, rgba(C.terrain, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(300, 180, 0, 300, 180, 420);
    g.addColorStop(0, rgba(R.couleur, .5)); g.addColorStop(.55, rgba(R.couleur, .14)); g.addColorStop(1, rgba(R.couleur, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 620);

    // Photo ou monogramme, puis la grille par-dessus le bas fondu (le joueur est posé sur le terrain)
    const px = 24, py = 24, pw = 552, ph = 556;
    if (d.photo) dessinerPhoto(ctx, d, R, px, py, pw, ph); else dessinerMonogramme(ctx, d, R);
    grille(ctx, 300, 320, 500, 900, 560, .55);
    // Cadre néon de la photo (haut et côtés, qui s'éteignent vers le bas)
    ctx.save(); ctx.lineWidth = 2; ctx.shadowColor = rgba(R.couleur, .9); ctx.shadowBlur = 14;
    g = ctx.createLinearGradient(0, py, 0, py + 516); g.addColorStop(0, R.couleur); g.addColorStop(.7, rgba(R.couleur, .5)); g.addColorStop(1, rgba(R.couleur, 0));
    ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(px, py + 516); ctx.lineTo(px, py + 14); ctx.arcTo(px, py, px + 14, py, 14); ctx.lineTo(px + pw - 14, py); ctx.arcTo(px + pw, py, px + pw, py + 14, 14); ctx.lineTo(px + pw, py + 516); ctx.stroke();
    ctx.restore();

    // Marque (haut gauche) et rang en capsule néon (haut droit)
    ctx.shadowColor = rgba(C.turf, .9); ctx.shadowBlur = 12; ctx.fillStyle = C.turf; ctx.beginPath(); ctx.arc(52, 56, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    const wm = texte(ctx, 'APPRENDRE ', 66, 63, { poids: 900, taille: 21, famille: DISPLAY, espacement: .06, couleur: C.fg, ombre: 10 });
    texte(ctx, 'PADEL', 66 + wm, 63, { poids: 900, taille: 21, famille: DISPLAY, espacement: .06, couleur: C.turf, ombre: 10 });
    police(ctx, 800, 13, BODY, .2); const nomRang = R.nom.toUpperCase(), wr = ctx.measureText(nomRang).width + 30;
    ctx.save(); ctx.fillStyle = rgba(FOND, .75); rect(ctx, 552 - wr, 40, wr, 32, 16); ctx.fill();
    ctx.shadowColor = rgba(R.couleur, .9); ctx.shadowBlur = 14; ctx.lineWidth = 2; ctx.strokeStyle = R.couleur; rect(ctx, 552 - wr, 40, wr, 32, 16); ctx.stroke(); ctx.restore();
    texte(ctx, nomRang, 552 - wr / 2 + 1, 57, { poids: 800, taille: 13, espacement: .2, couleur: R.couleur, align: 'center', base: 'middle', lueur: { couleur: rgba(R.couleur, .7), flou: 8 } });

    // Note globale : disque sombre, anneau de progression, chiffre blanc à lueur du rang, étiquette ; anneau fin pointillé vert
    const gx = 118, gy = 470, gr = 78, globale = borner(d.globale);
    ctx.save(); ctx.fillStyle = rgba(FOND, .88); ctx.beginPath(); ctx.arc(gx, gy, gr + 16, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    anneau(ctx, gx, gy, gr, 10, globale, R, .12);
    ctx.save(); ctx.setLineDash([2, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.turf, .55); ctx.shadowColor = rgba(C.turf, .8); ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(gx, gy, gr + 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    texte(ctx, String(globale || ''), gx, gy + 28, { poids: 900, taille: 92, famille: DISPLAY, espacement: -.02, couleur: C.fg, align: 'center', lueur: { couleur: rgba(R.couleur, .9), flou: 24, passes: 2 }, contour: { couleur: rgba(R.couleur, .9), largeur: 2 } });
    texte(ctx, 'GLOBALE', gx, gy + 51, { poids: 800, taille: 11, espacement: .3, couleur: C.muted, align: 'center' });

    // Poste, à droite de l'anneau ; repère de niveau facultatif dessous
    const code = codePoste(d.poste), lib = libellePoste(d.poste);
    if (code) {
      texte(ctx, 'POSTE', 236, 442, { poids: 800, taille: 12, espacement: .34, couleur: C.muted, ombre: 8 });
      texte(ctx, code, 234, 502, { poids: 800, taille: 68, famille: DISPLAY, espacement: .02, couleur: C.fg, lueur: { couleur: rgba(C.sky, .8), flou: 18 }, contour: { couleur: rgba(C.sky, .7), largeur: 1.5 } });
      if (lib) texte(ctx, lib.toUpperCase(), 236, 524, { poids: 700, taille: 12, espacement: .22, couleur: C.sky, ombre: 8 });
    }
    if (d.niveau) {
      const niv = String(d.niveau).toUpperCase(), tl = ajuster(ctx, niv, 700, 11, BODY, 330, .16);
      texte(ctx, niv, 236, 548, { poids: 700, taille: tl, espacement: .16, couleur: C.muted, ombre: 8 });
    }

    // Pseudo néon : blanc, contour du rang, double lueur ; trait néon vert dessous. Avec un club : pseudo un peu plus haut
    // et un peu plus petit, trait remonté, club en capitales entre le trait et les anneaux des attributs.
    const nom = String(d.pseudo || 'Joueur').toUpperCase(), club = nettoyerClub(d.club);
    const tn = ajuster(ctx, nom, 900, club ? 84 : 92, DISPLAY, 520, .05), yNom = club ? 620 : 632, yTrait = club ? 639 : 652;
    texte(ctx, nom, 300, yNom, {
      poids: 900, taille: tn, famille: DISPLAY, espacement: .05, couleur: C.fg, align: 'center',
      lueur: { couleur: rgba(R.couleur, .95), flou: 34, passes: 2 }, contour: { couleur: R.couleur, largeur: 2.5 }
    });
    ctx.save(); g = ctx.createLinearGradient(60, 0, 540, 0); g.addColorStop(0, rgba(C.turf, 0)); g.addColorStop(.5, C.turf); g.addColorStop(1, rgba(C.turf, 0));
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.shadowColor = rgba(C.turf, .9); ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(60, yTrait); ctx.lineTo(540, yTrait); ctx.stroke(); ctx.restore();
    if (club) ligneClub(ctx, club, 300, 661, 420, { poids: 800, taille: 17, mini: 12, espacement: .14, couleur: C.fg, align: 'center', ombre: 8 });

    // 6 attributs en anneaux : 3 colonnes × 2 lignes, chiffre et étiquette dans l'anneau
    const attrs = (d.attributs || []).slice(0, 6);
    attrs.forEach((a, i) => {
      const cx = 110 + (i % 3) * 190, cy = 718 + Math.floor(i / 3) * 106, n = borner(a.note);
      ctx.save(); ctx.fillStyle = rgba(FOND, .7); ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      anneau(ctx, cx, cy, 44, 7, n, R, .12);
      texte(ctx, String(n), cx, cy + 10, { poids: 900, taille: 40, famille: DISPLAY, couleur: C.fg, align: 'center', lueur: { couleur: rgba(R.couleur, .7), flou: 12 } });
      texte(ctx, String(a.cle || '').toUpperCase().slice(0, 3), cx, cy + 29, { poids: 800, taille: 11, espacement: .26, couleur: C.muted, align: 'center' });
    });
    texte(ctx, 'APPRENDRE-PADEL.FR', 300, 886, { poids: 700, taille: 11, espacement: .3, couleur: C.dim, align: 'center' });

    // Équerres aux 4 coins (Élite : blanches, la bordure est déjà verte), grain léger
    const ce = elite ? C.fg : C.turf;
    equerre(ctx, 18, 18, 1, 1, 30, ce); equerre(ctx, W - 18, 18, -1, 1, 30, ce); equerre(ctx, 18, H - 18, 1, -1, 30, ce); equerre(ctx, W - 18, H - 18, -1, -1, 30, ce);
    grain(ctx, W, H, exp ? .05 : .06, 77, exp ? 2 : 1);

    // Contour : Élite = reflet tournant (statique à l'export, animé par animer()) ; autres = double contour néon
    if (!o.sansBordure) { if (elite) bordureElite(ctx, R, o.phase); else bordure(ctx, R); }
    ctx.restore();
  }

  /* =====================================================================================================================
     MODÈLE « STADE » (port de la maquette A) : carte à deux grands biseaux opposés, lumière de stade (projecteurs, fumée,
     filigrane du terrain), bande diagonale métal dans la couleur du rang, note géante en relief, jauges segmentées lumineuses.
     ===================================================================================================================== */
  const BS = 46, bs = 12; // biseaux : grand (haut droit, bas gauche) et petit (haut gauche, bas droit)
  function formeStade(ctx, m) {
    m = m || 0;
    ctx.beginPath();
    ctx.moveTo(m + bs, m); ctx.lineTo(W - BS - m * .4, m); ctx.lineTo(W - m, BS + m * .4);
    ctx.lineTo(W - m, H - bs - m); ctx.lineTo(W - bs - m, H - m); ctx.lineTo(BS + m * .4, H - m);
    ctx.lineTo(m, H - BS - m * .4); ctx.lineTo(m, bs + m); ctx.closePath();
  }
  // Fumée : nappes douces (dégradés radiaux) tirées au hasard (graine fixe : même rendu à chaque fois)
  function fumee(ctx, x, y, w, h, n, couleur, alphaMax, graine) {
    const r = alea(graine || 3);
    for (let i = 0; i < n; i++) {
      const cx = x + r() * w, cy = y + r() * h, rad = 50 + r() * 130, a = alphaMax * (0.4 + r() * 0.6);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, rgba(couleur, a)); g.addColorStop(1, rgba(couleur, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  }
  // Terrain vu de dessus en filigrane (lignes blanc froid très faibles)
  function filigraneTerrain(ctx, x, y, w, h, alpha) {
    ctx.save(); ctx.strokeStyle = rgba(C.fg, alpha); ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x, y + h * .17); ctx.lineTo(x + w, y + h * .17); ctx.moveTo(x, y + h * .83); ctx.lineTo(x + w, y + h * .83);
    ctx.moveTo(x + w / 2, y + h * .17); ctx.lineTo(x + w / 2, y + h * .83); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    ctx.restore();
  }
  // Projecteur : disque lumineux + cône de lumière à bords doux (6 cônes emboîtés, composite « lighter »)
  function projecteur(ctx, x, y, angle, ouverture, longueur, couleur, alpha) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(x, y, 0, x, y, 160);
    g.addColorStop(0, rgba(couleur, alpha * 1.8)); g.addColorStop(.3, rgba(couleur, alpha * .5)); g.addColorStop(1, rgba(couleur, 0));
    ctx.fillStyle = g; ctx.fillRect(x - 160, y - 160, 320, 320);
    g = ctx.createRadialGradient(x, y, 0, x, y, longueur);
    g.addColorStop(0, rgba(couleur, alpha * .3)); g.addColorStop(.45, rgba(couleur, alpha * .12)); g.addColorStop(1, rgba(couleur, 0));
    ctx.fillStyle = g;
    for (let i = 6; i >= 1; i--) {
      const ouv = ouverture * i / 6, a1 = angle - ouv / 2, a2 = angle + ouv / 2;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a1) * longueur, y + Math.sin(a1) * longueur);
      ctx.lineTo(x + Math.cos(a2) * longueur, y + Math.sin(a2) * longueur); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // Étincelle : étoile à 4 branches blanc froid, avec lueur
  function etincelle(ctx, x, y, r, couleur) {
    ctx.save(); ctx.shadowColor = couleur; ctx.shadowBlur = r; ctx.fillStyle = C.fg;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, k = i % 2 ? r * .18 : r; ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // Bande diagonale métal (parallélogramme y = y0 + pente·x, épaisseur e), texte bleu nuit répété le long de la bande
  function bandeStade(ctx, y0, pente, e, R) {
    const yA = y0 - pente * 40, yB = y0 + pente * (W + 40);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-40, yA); ctx.lineTo(W + 40, yB); ctx.lineTo(W + 40, yB + e); ctx.lineTo(-40, yA + e); ctx.closePath();
    ctx.shadowColor = rgba(R.couleur, .55); ctx.shadowBlur = 40;
    const g = ctx.createLinearGradient(0, 0, W, 0);
    // Métal de la bande : jamais plus sombre que la couleur du rang assombrie de 10 % (texte bleu nuit ≥ 4,9:1, bronze compris)
    const ombre = mix(R.couleur, NOIR, .1);
    g.addColorStop(0, ombre); g.addColorStop(.22, R.couleur); g.addColorStop(.42, R.clair); g.addColorStop(.55, R.couleur); g.addColorStop(.8, ombre); g.addColorStop(1, R.couleur);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.clip();
    ctx.fillStyle = rgba(C.fg, .35); ctx.beginPath(); ctx.moveTo(-40, yA); ctx.lineTo(W + 40, yB); ctx.lineTo(W + 40, yB + 3); ctx.lineTo(-40, yA + 3); ctx.fill();
    ctx.fillStyle = rgba(C.navy, .45); ctx.beginPath(); ctx.moveTo(-40, yA + e - 4); ctx.lineTo(W + 40, yB + e - 4); ctx.lineTo(W + 40, yB + e); ctx.lineTo(-40, yA + e); ctx.fill();
    ctx.translate(0, y0 + e / 2); ctx.rotate(Math.atan2(pente * W, W));
    const s = `${R.nom.toUpperCase()}  ·  CARTE DE JOUEUR  ·  APPRENDRE PADEL  ·  `;
    police(ctx, 900, 30, DISPLAY, .1);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = C.navy;
    const lw = ctx.measureText(s).width;
    for (let x = -lw * .35; x < W * 1.3; x += lw) ctx.fillText(s, x, 1);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
    ctx.save(); ctx.strokeStyle = rgba(R.couleur, .7); ctx.lineWidth = 2; ctx.shadowColor = rgba(R.couleur, .8); ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(-40, yA + e + 14); ctx.lineTo(W + 40, yB + e + 14); ctx.stroke(); ctx.restore();
  }
  // Jauge lumineuse segmentée : piste, remplissage avec lueur, 10 segments, pointe blanche
  function jauge(ctx, x, y, w, h, n, R) {
    ctx.save();
    ctx.fillStyle = rgba(C.fg, .09); rect(ctx, x, y, w, h, 2); ctx.fill();
    const fw = Math.max(h, w * n / 99);
    ctx.shadowColor = rgba(R.couleur, .9); ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, R.fonce); g.addColorStop(.6, R.couleur); g.addColorStop(1, R.clair);
    ctx.fillStyle = g; rect(ctx, x, y, fw, h, 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillStyle = rgba(C.navy, .85);
    for (let i = 1; i < 10; i++) ctx.fillRect(x + w * i / 10 - 1, y - 1, 2, h + 2);
    ctx.fillStyle = rgba(C.fg, .95); ctx.fillRect(x + fw - 2, y - 1, 2, h + 2);
    ctx.restore();
  }
  function carteStade(ctx, d, o) {
    const R = RANGS[d.rang] || RANGS.or, elite = d.rang === 'elite', exp = !!o.export, PH = 560;
    ctx.save(); formeStade(ctx, 0); ctx.clip();
    ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H);

    // Lumière de stade : lavis bleu terrain, filigrane du terrain, deux projecteurs ; halo du rang derrière le joueur
    let g = ctx.createRadialGradient(300, 330, 0, 300, 330, 520);
    g.addColorStop(0, rgba(C.terrain, .42)); g.addColorStop(1, rgba(C.terrain, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    filigraneTerrain(ctx, 60, 90, 480, 720, .07);
    projecteur(ctx, 40, -30, Math.PI * .42, Math.PI * .28, 760, C.fg, .16);
    projecteur(ctx, 560, -30, Math.PI * .58, Math.PI * .28, 760, C.sky, .16);
    g = ctx.createRadialGradient(300, 250, 0, 300, 250, 330);
    g.addColorStop(0, rgba(R.couleur, .55)); g.addColorStop(.6, rgba(R.couleur, .18)); g.addColorStop(1, rgba(R.couleur, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH + 60);

    if (d.photo) {
      // Photo en couleurs, fond refroidi (multiply bleu terrain qui épargne le centre), lumière du rang, fondu vers le bleu nuit
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PH + 40); ctx.clip();
      if (d.detoure) ctx.drawImage(d.photo, 40, 20, 520, 520); else photoCover(ctx, d.photo, 0, 0, W, PH + 40, .18);
      ctx.globalCompositeOperation = 'multiply';
      g = ctx.createRadialGradient(300, 230, 120, 300, 230, 420);
      g.addColorStop(0, rgba(C.terrain, 0)); g.addColorStop(.45, rgba(C.terrain, .5)); g.addColorStop(1, rgba(C.navy, .95));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH + 40);
      ctx.globalCompositeOperation = 'screen';
      g = ctx.createRadialGradient(560, 20, 0, 560, 20, 360); g.addColorStop(0, rgba(R.couleur, .38)); g.addColorStop(1, rgba(R.couleur, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH + 40);
      ctx.globalCompositeOperation = 'source-over';
      projecteur(ctx, 40, -30, Math.PI * .42, Math.PI * .22, 700, C.fg, .07);
      projecteur(ctx, 560, -30, Math.PI * .58, Math.PI * .22, 700, C.sky, .09);
      g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, rgba(C.navy, .55)); g.addColorStop(.25, rgba(C.navy, 0)); g.addColorStop(.75, rgba(C.navy, 0)); g.addColorStop(1, rgba(C.navy, .55));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH + 40);
      g = ctx.createLinearGradient(0, 0, 0, PH + 40);
      g.addColorStop(0, rgba(C.navy, .5)); g.addColorStop(.18, rgba(C.navy, 0)); g.addColorStop(.62, rgba(C.navy, 0)); g.addColorStop(.86, rgba(C.navy, .9)); g.addColorStop(1, C.navy);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH + 40);
      ctx.restore();
    } else {
      // Sans photo : initiales géantes en filigrane (contour du rang), épaules en silhouette dans le faisceau
      ctx.save();
      g = ctx.createLinearGradient(0, 300, 0, 560); g.addColorStop(0, rgba(C.fg, .1)); g.addColorStop(1, rgba(C.fg, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(170, 560); ctx.quadraticCurveTo(190, 330, 380, 310); ctx.quadraticCurveTo(560, 330, 580, 560); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(378, 210, 82, 0, Math.PI * 2); ctx.fillStyle = rgba(C.fg, .1); ctx.fill();
      ctx.restore();
      const ini = initiales(d.pseudo) || '?', t = ajuster(ctx, ini, 900, 120, DISPLAY, 130, .02);
      texte(ctx, ini, 378, 210 + t * .36, { poids: 900, taille: t, famille: DISPLAY, espacement: .02, couleur: C.fg, align: 'center', lueur: { couleur: rgba(R.couleur, .8), flou: 26 }, contour: { couleur: R.couleur, largeur: 3 } });
    }
    fumee(ctx, 0, 380, W, 300, 16, C.fg, .07, 11);
    fumee(ctx, 0, 300, W, 200, 6, C.sky, .08, 5);

    // Marque, haut gauche
    ctx.shadowColor = rgba(C.turf, .9); ctx.shadowBlur = 12; ctx.fillStyle = C.turf; ctx.beginPath(); ctx.arc(39, 40, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    const wm = texte(ctx, 'APPRENDRE ', 52, 47, { poids: 900, taille: 21, famille: DISPLAY, espacement: .06, couleur: C.fg, ombre: 10 });
    texte(ctx, 'PADEL', 52 + wm, 47, { poids: 900, taille: 21, famille: DISPLAY, espacement: .06, couleur: C.turf, ombre: 10 });

    // Biseaux métal (haut droit, bas gauche) ; nom du rang en bleu nuit sur le biseau haut droit, tourné à 45°
    const LB = 34;
    ctx.save();
    g = ctx.createLinearGradient(W - BS, 0, W, BS); g.addColorStop(0, R.fonce); g.addColorStop(.5, R.clair); g.addColorStop(1, R.couleur);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W - BS - LB, 0); ctx.lineTo(W - BS, 0); ctx.lineTo(W, BS); ctx.lineTo(W, BS + LB); ctx.closePath(); ctx.fill();
    g = ctx.createLinearGradient(0, H - BS, BS, H); g.addColorStop(0, R.couleur); g.addColorStop(.5, R.clair); g.addColorStop(1, R.fonce);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H - BS - LB); ctx.lineTo(0, H - BS); ctx.lineTo(BS, H); ctx.lineTo(BS + LB, H); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(W - BS / 2 - LB / 2 + 2, BS / 2 - LB / 2 + 2); ctx.rotate(Math.PI / 4);
    texte(ctx, R.nom.toUpperCase(), 0, 0, { poids: 800, taille: 12, espacement: .22, couleur: C.navy, align: 'center', base: 'middle' });
    ctx.restore();

    // Écran sombre local derrière la note (lisibilité sur la photo), note géante en relief, poste à sa droite
    g = ctx.createRadialGradient(150, 440, 0, 150, 440, 260);
    g.addColorStop(0, rgba(C.navy, .8)); g.addColorStop(.6, rgba(C.navy, .45)); g.addColorStop(1, rgba(C.navy, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 180, 460, 420);
    const wg = texte(ctx, String(borner(d.globale) || ''), 24, 506, {
      poids: 900, taille: 236, famille: DISPLAY, espacement: -.02, couleur: C.fg,
      relief: { couleur: R.fonce, dx: 6, dy: 8 }, lueur: { couleur: rgba(R.couleur, .95), flou: 36, passes: 2 }, contour: { couleur: R.couleur, largeur: 6 }
    });
    texte(ctx, 'GLOBALE', 34, 314, { poids: 800, taille: 12, espacement: .34, couleur: C.fg, ombre: 10 });
    const code = codePoste(d.poste), lib = libellePoste(d.poste);
    if (code) {
      const x = 24 + wg + 20, tp = ajuster(ctx, ('POSTE' + (lib ? ' · ' + lib : '')).toUpperCase(), 800, 12, BODY, W - x - 30, .3);
      texte(ctx, ('POSTE' + (lib ? ' · ' + lib : '')).toUpperCase(), x, 396, { poids: 800, taille: tp, espacement: .3, couleur: C.fg, ombre: 10 });
      texte(ctx, code, x, 462, { poids: 800, taille: 72, famille: DISPLAY, espacement: .02, couleur: C.fg, lueur: { couleur: rgba(C.navy, 1), flou: 18 }, contour: { couleur: rgba(R.couleur, .7), largeur: 2 } });
    }
    if (d.niveau) { // repère de niveau facultatif, au-dessus du poste (la bande coupe le dessous)
      const x = 24 + wg + 20, niv = String(d.niveau).toUpperCase(), tl = ajuster(ctx, niv, 700, 11, BODY, W - x - 30, .18);
      texte(ctx, niv, x, code ? 374 : 462, { poids: 700, taille: tl, espacement: .18, couleur: C.muted, ombre: 10 });
    }

    bandeStade(ctx, 556, -.21, 70, R);
    if (d.detoure && d.photo) ctx.drawImage(d.photo, 40, 20, 520, 520); // détouré : le joueur passe devant la bande

    // Pseudo massif, puis 6 attributs en 2 colonnes : étiquette, chiffre, jauge segmentée
    // Avec un club : pseudo remonté et un peu plus petit, club en capitales dessous, au-dessus des attributs
    const nom = String(d.pseudo || 'Joueur').toUpperCase(), club = nettoyerClub(d.club), tn = ajuster(ctx, nom, 900, club ? 80 : 92, DISPLAY, 536, .03);
    texte(ctx, nom, 300, club ? 690 : 708, {
      poids: 900, taille: tn, famille: DISPLAY, espacement: .03, couleur: C.fg, align: 'center',
      relief: { couleur: rgba(C.navy, .9), dx: 0, dy: 6 }, lueur: { couleur: rgba(R.couleur, .8), flou: 30 }, contour: { couleur: R.couleur, largeur: 3 }
    });
    if (club) ligneClub(ctx, club, 300, 717, 420, { poids: 800, taille: 16, mini: 12, espacement: .16, couleur: C.fg, align: 'center', ombre: 10 });
    (d.attributs || []).slice(0, 6).forEach((a, i) => {
      const col = Math.floor(i / 3), row = i % 3, x0 = col ? 318 : 30, cw = 252, y0 = 726 + row * 46, n = borner(a.note);
      texte(ctx, String(a.cle || '').toUpperCase().slice(0, 3), x0, y0 + 28, { poids: 800, taille: 15, espacement: .32, couleur: C.fg });
      texte(ctx, String(n), x0 + cw, y0 + 30, { poids: 900, taille: 42, famille: DISPLAY, couleur: R.couleur, align: 'right', lueur: { couleur: rgba(R.couleur, .6), flou: 14 } });
      jauge(ctx, x0, y0 + 34, cw, 6, n, R);
    });
    texte(ctx, 'APPRENDRE-PADEL.FR', 300, 888, { poids: 700, taille: 11, espacement: .3, couleur: C.dim, align: 'center' });
    grain(ctx, W, H, exp ? .07 : .085, 42, exp ? 2 : 1);
    ctx.restore();

    // Cadres : Élite = double cadre métal + étincelles sur les biseaux ; autres = cadre simple dans la couleur du rang
    ctx.save(); formeStade(ctx, 0); ctx.clip();
    if (elite) {
      g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, R.clair); g.addColorStop(.3, R.couleur); g.addColorStop(.5, R.clair); g.addColorStop(.7, R.fonce); g.addColorStop(1, R.clair);
      ctx.lineWidth = 10; ctx.strokeStyle = g; formeStade(ctx, 0); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.fg, .55); formeStade(ctx, 9); ctx.stroke();
      ctx.shadowColor = rgba(R.couleur, .9); ctx.shadowBlur = 14; ctx.lineWidth = 1.5; ctx.strokeStyle = R.couleur; formeStade(ctx, 14); ctx.stroke();
      ctx.shadowColor = 'transparent';
      etincelle(ctx, W - BS - 14, 16, 16, R.couleur); etincelle(ctx, BS + 14, H - 16, 12, R.couleur);
    } else {
      ctx.lineWidth = 6; ctx.strokeStyle = rgba(R.couleur, .85); formeStade(ctx, 0); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(R.couleur, .35); formeStade(ctx, 11); ctx.stroke();
    }
    ctx.restore();
  }

  /* =====================================================================================================================
     PICTOGRAMMES COMMUNS (Blason, Vignette) : raquette de padel (tête pleine percée, cœur ouvert, manche) et balle à couture.
     ===================================================================================================================== */
  function raquette(ctx, x, y, s, couleur, trou, angle) {
    const rw = s * .4, rh = s * .5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle == null ? -.5 : angle);
    ctx.fillStyle = couleur;
    ctx.beginPath(); ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
    // Cœur ouvert (le triangle typique du padel) puis manche à bout arrondi
    ctx.beginPath(); ctx.moveTo(-rw * .62, rh * .74); ctx.lineTo(-s * .07, rh * 1.38); ctx.lineTo(s * .07, rh * 1.38); ctx.lineTo(rw * .62, rh * .74);
    ctx.lineTo(rw * .3, rh * .86); ctx.lineTo(0, rh * 1.16); ctx.lineTo(-rw * .3, rh * .86); ctx.closePath(); ctx.fill();
    rect(ctx, -s * .075, rh * 1.34, s * .15, s * .46, s * .05); ctx.fill();
    // Perforations de la tête, en quinconce
    ctx.fillStyle = trou;
    const p = s * .11, r = s * .028;
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      const px = i * p + (j % 2 ? p / 2 : 0), py = j * p * .9;
      if ((px * px) / (rw * rw * .62) + (py * py) / (rh * rh * .62) <= 1) { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  function balle(ctx, x, y, r, couleur, couture) {
    ctx.save(); ctx.fillStyle = couleur; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.clip(); ctx.strokeStyle = couture; ctx.lineWidth = Math.max(1, r * .16);
    ctx.beginPath(); ctx.arc(x - r * 1.25, y, r * .95, -.9, .9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 1.25, y, r * .95, Math.PI - .9, Math.PI + .9); ctx.stroke();
    ctx.restore();
  }
  // Perforations en quinconce sur une zone (texture « tamis de raquette »), alpha dégressif vers le bas si fondu
  function perforations(ctx, x, y, w, h, pas, r, couleur, alpha, fondu) {
    ctx.save(); ctx.fillStyle = couleur;
    for (let j = 0, py = y; py < y + h; j++, py += pas * .87) {
      ctx.globalAlpha = fondu ? alpha * Math.max(0, 1 - (py - y) / h) : alpha;
      for (let px = x + (j % 2 ? pas / 2 : 0); px < x + w; px += pas) { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  /* Photo en couleurs fondue sur ses bords (alpha) : f = {gauche, droite, haut, bas} en fractions de la zone.
     Détourée : contenue et posée en bas de la zone. Calque à la résolution réelle du canvas. */
  function photoFondue(ctx, img, x, y, w, h, detoure, f, ancre) {
    const k = ctx.getTransform().a || 1, tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k));
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    const cc = c.getContext('2d');
    if (detoure) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.min(tw / iw, th / ih);
      cc.drawImage(img, (tw - iw * s) / 2, th - ih * s, iw * s, ih * s);
    } else photoCover(cc, img, 0, 0, tw, th, ancre == null ? .15 : ancre);
    const plein = 'rgba(0,0,0,1)', vide = 'rgba(0,0,0,0)';
    cc.globalCompositeOperation = 'destination-in';
    let g = cc.createLinearGradient(0, 0, tw, 0);
    g.addColorStop(0, f.gauche ? vide : plein); g.addColorStop(Math.max(.001, f.gauche || 0), plein); g.addColorStop(Math.min(.999, 1 - (f.droite || 0)), plein); g.addColorStop(1, f.droite ? vide : plein);
    cc.fillStyle = g; cc.fillRect(0, 0, tw, th);
    g = cc.createLinearGradient(0, 0, 0, th);
    g.addColorStop(0, f.haut ? vide : plein); g.addColorStop(Math.max(.001, f.haut || 0), plein); g.addColorStop(Math.min(.999, 1 - (f.bas || 0)), plein); g.addColorStop(1, f.bas ? vide : plein);
    cc.fillStyle = g; cc.fillRect(0, 0, tw, th);
    ctx.drawImage(c, x, y, w, h);
  }

  /* =====================================================================================================================
     MODÈLE « BLASON » (inspiré des cartes de joueurs des jeux de foot, dessin original) : carte métallisée découpée en blason
     (coins coupés, haut légèrement creusé, pointe en ogive), fond texturé en perforations de raquette et reflets, note géante
     et poste en haut à gauche, raquette stylisée et rang dessous, photo en couleurs à droite qui déborde du filet intérieur,
     pseudo en capitales, filet, 6 attributs en deux colonnes « 82 VOL », marque près de la pointe.
     Bronze / Argent / Or : métal clair, encre bleu nuit foncée. Élite : métal noir, vert énergie et reflets.
     ===================================================================================================================== */
  const ENCRE = mix(C.navy, NOIR, .25); // bleu nuit approfondi : texte sur le métal clair
  function formeBlason(ctx, m) {
    m = m || 0; const c = 56;
    ctx.beginPath();
    ctx.moveTo(m, c + m * .4); ctx.lineTo(c + m * .4, m);
    ctx.quadraticCurveTo(300, 40 + m, W - c - m * .4, m);
    ctx.lineTo(W - m, c + m * .4); ctx.lineTo(W - m, 690);
    ctx.bezierCurveTo(W - m, 790 - m * .3, 380 - m * .2, 830 - m * .6, 300, 900 - m * 1.5);
    ctx.bezierCurveTo(220 + m * .2, 830 - m * .6, m, 790 - m * .3, m, 690);
    ctx.closePath();
  }
  function paletteBlason(R, elite) {
    return elite
      ? { fond: [mix(C.navy, NOIR, .62), mix(C.navy, NOIR, .86), mix(C.navy, NOIR, .7)], encre: C.fg, chiffre: C.turf, label: C.muted, filet: rgba(C.turf, .55), trou: C.turf, reflet: C.turf }
      : { fond: [R.clair, R.couleur, mix(R.couleur, R.clair, .35)], encre: ENCRE, chiffre: ENCRE, label: ENCRE, filet: rgba(ENCRE, .4), trou: ENCRE, reflet: C.fg };
  }
  function carteBlason(ctx, d, o) {
    const R = RANGS[d.rang] || RANGS.or, elite = d.rang === 'elite', exp = !!o.export, P = paletteBlason(R, elite);
    let g;
    // Écrin (hors story) : fond nuit autour du blason, pour que l'image exportée reste un rectangle propre (JPEG compris)
    if (!o.sansEcrin) {
      ctx.save(); rect(ctx, 0, 0, W, H, RAYON); ctx.clip(); ctx.fillStyle = FOND; ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(300, 820, 0, 300, 820, 420); g.addColorStop(0, rgba(R.couleur, .35)); g.addColorStop(1, rgba(R.couleur, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    ctx.save(); formeBlason(ctx, 0); ctx.clip();
    // Métal : dégradé diagonal (jamais plus sombre que la couleur du rang là où il y a du texte), reflets en biais
    g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, P.fond[0]); g.addColorStop(.38, P.fond[1]); g.addColorStop(.55, P.fond[2]); g.addColorStop(.72, P.fond[1]); g.addColorStop(1, P.fond[elite ? 1 : 0]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = elite ? 'lighter' : 'screen';
    [[-120, 110, .16], [180, 46, .12], [330, 18, .2]].forEach(([x0, l, a]) => {
      const gg = ctx.createLinearGradient(x0, 0, x0 + l + 260, 0);
      gg.addColorStop(0, rgba(P.reflet, 0)); gg.addColorStop(.5, rgba(P.reflet, elite ? a * .55 : a)); gg.addColorStop(1, rgba(P.reflet, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + l, 0); ctx.lineTo(x0 + l + 260, H); ctx.lineTo(x0 + 260, H); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
    // Texture : fines rayures diagonales (métal brossé) et perforations de raquette, plus marquées en haut
    ctx.save(); ctx.strokeStyle = rgba(P.trou, elite ? .05 : .045); ctx.lineWidth = 1;
    for (let x = -H; x < W; x += 7) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * .6, H); ctx.stroke(); }
    ctx.restore();
    perforations(ctx, 180, 26, 420, 520, 20, 2.6, P.trou, elite ? .14 : .1, true);
    if (elite) { // lueur verte sous la photo
      g = ctx.createRadialGradient(400, 260, 0, 400, 260, 320); g.addColorStop(0, rgba(C.turf, .26)); g.addColorStop(1, rgba(C.turf, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // Filet intérieur, puis la photo qui passe par-dessus en haut (elle « déborde » du cadre)
    ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.filet; formeBlason(ctx, 20); ctx.stroke(); ctx.restore();
    const px = 186, py = 6, pw = 404, ph = 512;
    if (d.photo) {
      photoFondue(ctx, d.photo, px, py, pw, ph, d.detoure, { gauche: .3, droite: .06, haut: 0, bas: .24 }, .12);
    } else {
      // Sans photo : buste stylisé (épaules), tête en disque sombre avec les initiales en métal clair
      ctx.save();
      g = ctx.createLinearGradient(0, 300, 0, 520); g.addColorStop(0, rgba(P.encre, .22)); g.addColorStop(1, rgba(P.encre, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(220, 520); ctx.quadraticCurveTo(232, 330, 392, 304); ctx.quadraticCurveTo(552, 330, 564, 520); ctx.closePath(); ctx.fill();
      ctx.fillStyle = elite ? mix(C.navy, NOIR, .9) : ENCRE; ctx.strokeStyle = elite ? C.turf : R.clair; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(392, 196, 96, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      const ini = initiales(d.pseudo) || '?', t = ajuster(ctx, ini, 900, 104, DISPLAY, 140, .02);
      texte(ctx, ini, 392, 196 + t * .36, { poids: 900, taille: t, famille: DISPLAY, espacement: .02, couleur: elite ? C.turf : R.clair, align: 'center' });
    }

    // Colonne de gauche : note géante, poste, raquette stylisée entre deux filets, rang
    const cx = 104, globale = String(borner(d.globale) || '');
    const tg = ajuster(ctx, globale, 900, 128, DISPLAY, 140, -.02);
    texte(ctx, globale, cx, 178, { poids: 900, taille: tg, famille: DISPLAY, espacement: -.02, couleur: P.chiffre, align: 'center',
      relief: elite ? null : { couleur: rgba(C.fg, .55), dx: 0, dy: 3 }, lueur: elite ? { couleur: rgba(C.turf, .55), flou: 22 } : null });
    const code = codePoste(d.poste);
    if (code) texte(ctx, code, cx, 230, { poids: 800, taille: 46, famille: DISPLAY, espacement: .04, couleur: P.encre, align: 'center' });
    ctx.save(); ctx.strokeStyle = P.filet; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 40, 254); ctx.lineTo(cx + 40, 254); ctx.moveTo(cx - 40, 352); ctx.lineTo(cx + 40, 352); ctx.stroke(); ctx.restore();
    raquette(ctx, cx - 4, 290, 60, elite ? C.turf : ENCRE, elite ? mix(C.navy, NOIR, .7) : R.couleur, -.55);
    balle(ctx, cx - 30, 334, 9, elite ? C.fg : ENCRE, elite ? C.turf : R.clair);
    texte(ctx, R.nom.toUpperCase(), cx, 382, { poids: 800, taille: 15, espacement: .24, couleur: P.encre, align: 'center' });

    // Pseudo, club et niveau facultatifs (une ligne chacun, sous le pseudo), filet orné d'une balle
    const nom = String(d.pseudo || 'Joueur').toUpperCase(), club = nettoyerClub(d.club);
    const tn = ajuster(ctx, nom, 900, club && d.niveau ? 64 : 76, DISPLAY, 480, .03);
    const yNom = club && d.niveau ? 546 : (club || d.niveau) ? 562 : 574;
    if (club) ligneClub(ctx, club, 300, d.niveau ? 570 : 591, 420, { poids: 800, taille: 16, mini: 12, espacement: .16, couleur: P.encre, align: 'center' });
    texte(ctx, nom, 300, yNom, { poids: 900, taille: tn, famille: DISPLAY, espacement: .03, couleur: P.encre, align: 'center',
      relief: elite ? null : { couleur: rgba(C.fg, .5), dx: 0, dy: 2 }, lueur: elite ? { couleur: rgba(C.turf, .45), flou: 20 } : null });
    if (d.niveau) {
      const niv = String(d.niveau).toUpperCase(), tl = ajuster(ctx, niv, 800, 12, BODY, 440, .18);
      texte(ctx, niv, 300, 588, { poids: 800, taille: tl, espacement: .18, couleur: P.label, align: 'center' });
    }
    ctx.save(); ctx.strokeStyle = P.filet; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(84, 608); ctx.lineTo(282, 608); ctx.moveTo(318, 608); ctx.lineTo(516, 608); ctx.stroke(); ctx.restore();
    balle(ctx, 300, 608, 8, elite ? C.turf : ENCRE, elite ? mix(C.navy, NOIR, .7) : R.clair);

    // 6 attributs : deux colonnes (VOL AER DEF | LOB SER TAC), « 82 VOL », séparées par un filet vertical
    (d.attributs || []).slice(0, 6).forEach((a, i) => {
      const col = Math.floor(i / 3), row = i % 3, y = 666 + row * 50, xN = col ? 404 : 196;
      texte(ctx, String(borner(a.note)), xN, y, { poids: 900, taille: 46, famille: DISPLAY, couleur: P.chiffre, align: 'right' });
      texte(ctx, String(a.cle || '').toUpperCase().slice(0, 3), xN + 12, y - 2, { poids: 800, taille: 21, espacement: .08, couleur: P.encre });
    });
    ctx.save(); ctx.strokeStyle = P.filet; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(300, 628); ctx.lineTo(300, 760); ctx.stroke(); ctx.restore();
    // Marque près de la pointe
    texte(ctx, 'APPRENDRE PADEL', 300, 806, { poids: 800, taille: 17, famille: DISPLAY, espacement: .16, couleur: P.encre, align: 'center' });
    raquette(ctx, 300, 838, 24, elite ? C.turf : ENCRE, elite ? mix(C.navy, NOIR, .7) : R.couleur, 0);
    grain(ctx, W, H, exp ? .045 : .055, 31, exp ? 2 : 1);
    ctx.restore();

    // Liseré métal du blason (reflets), filet clair intérieur ; Élite : étincelles
    ctx.save(); formeBlason(ctx, 0); ctx.clip();
    g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, R.clair); g.addColorStop(.25, R.fonce); g.addColorStop(.45, R.clair); g.addColorStop(.6, R.couleur); g.addColorStop(.8, R.fonce); g.addColorStop(1, R.clair);
    ctx.lineWidth = 16; ctx.strokeStyle = g; formeBlason(ctx, 0); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.fg, .6); formeBlason(ctx, 9); ctx.stroke();
    if (elite) { ctx.shadowColor = rgba(C.turf, .9); ctx.shadowBlur = 12; ctx.lineWidth = 1.5; ctx.strokeStyle = C.turf; formeBlason(ctx, 13); ctx.stroke(); ctx.shadowColor = 'transparent'; }
    ctx.restore();
    if (elite) { etincelle(ctx, 62, 12, 16, C.turf); etincelle(ctx, W - 22, 300, 12, C.turf); etincelle(ctx, 300, 893, 10, C.turf); }
  }

  /* =====================================================================================================================
     MODÈLE « VIGNETTE » (album d'autocollants rétro) : papier crème, vignette blanche arrondie à bordure dans la couleur du rang,
     photo en couleurs dans un cadre tramé, note globale dans une pastille, bandeau (ruban) du nom avec le poste, attributs en
     petits chiffres. Texte bleu nuit sur clair partout (AA). Élite : vignette « brillante » (reflets irisés vert / ciel).
     ===================================================================================================================== */
  const PAPIER = mix(C.sand, C.fg, .82), PAPIER_2 = mix(C.sand, C.fg, .7), ENCRE_DOUCE = mix(C.navy, C.fg, .3);
  // Fibres du papier : petits traits clairs et foncés au hasard (graine fixe)
  function fibres(ctx, w, h, n, graine) {
    const r = alea(graine); ctx.save(); ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, l = 4 + r() * 14, a = r() * Math.PI;
      ctx.strokeStyle = rgba(i % 2 ? C.navy : C.fg, i % 2 ? .05 : .5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    ctx.restore();
  }
  // Reflets irisés (Élite) : bandes diagonales vert énergie / ciel / blanc froid en « screen »
  function irise(ctx, x, y, w, h, alpha) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(x, y, x + w, y + h), cs = [C.turf, C.sky, C.fg, C.turf, C.sky];
    cs.forEach((c, i) => { g.addColorStop(i / (cs.length - 1), rgba(c, alpha)); g.addColorStop(Math.min(1, i / (cs.length - 1) + .1), rgba(c, 0)); });
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  function carteVignette(ctx, d, o) {
    const R = RANGS[d.rang] || RANGS.or, elite = d.rang === 'elite', exp = !!o.export;
    let g;
    ctx.save(); rect(ctx, 0, 0, W, H, RAYON); ctx.clip();
    // Papier crème (légère vignette sur les bords), fibres
    ctx.fillStyle = PAPIER; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(300, 450, 200, 300, 450, 620); g.addColorStop(0, rgba(PAPIER_2, 0)); g.addColorStop(1, rgba(PAPIER_2, .9));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    fibres(ctx, W, H, 520, 5);
    // La vignette : blanche, arrondie, ombre portée, bordure épaisse dans la couleur du rang (Élite : métal vert irisé)
    ctx.save(); ctx.shadowColor = rgba(C.navy, .3); ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillStyle = C.fg; rect(ctx, 18, 18, 564, 864, 30); ctx.fill(); ctx.restore();
    if (elite) { g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, R.clair); g.addColorStop(.3, R.couleur); g.addColorStop(.5, C.sky); g.addColorStop(.7, R.couleur); g.addColorStop(1, R.clair); }
    ctx.lineWidth = 10; ctx.strokeStyle = elite ? g : R.couleur; rect(ctx, 33, 33, 534, 834, 22); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.navy, .25); rect(ctx, 44, 44, 512, 812, 14); ctx.stroke();

    // En-tête : marque (bleu nuit) et rang en capsule (fond couleur du rang, texte bleu nuit)
    const wm = texte(ctx, 'APPRENDRE ', 186, 90, { poids: 900, taille: 26, famille: DISPLAY, espacement: .06, couleur: C.navy });
    texte(ctx, 'PADEL', 186 + wm, 90, { poids: 900, taille: 26, famille: DISPLAY, espacement: .06, couleur: C.navy });
    police(ctx, 800, 14, BODY, .2); const nomRang = R.nom.toUpperCase(), wr = ctx.measureText(nomRang).width + 30;
    ctx.fillStyle = elite ? g : R.couleur; rect(ctx, 544 - wr, 64, wr, 34, 17); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.navy, .35); rect(ctx, 544 - wr, 64, wr, 34, 17); ctx.stroke();
    texte(ctx, nomRang, 544 - wr / 2 + 1, 82, { poids: 800, taille: 14, espacement: .2, couleur: C.navy, align: 'center', base: 'middle' });

    // Cadre photo : fond couleur du rang tramé (points bleu nuit), photo en couleurs avec liseré blanc
    const fx = 56, fy = 114, fw = 488, fh = 404;
    ctx.fillStyle = R.couleur; rect(ctx, fx, fy, fw, fh, 12); ctx.fill();
    ctx.save(); rect(ctx, fx, fy, fw, fh, 12); ctx.clip();
    perforations(ctx, fx, fy, fw, fh, 11, 2.2, C.navy, .14, false);
    if (elite) irise(ctx, fx, fy, fw, fh, .55);
    ctx.restore();
    const ix = fx + 12, iy = fy + 12, iw = fw - 24, ih = fh - 24;
    if (d.photo) {
      ctx.save(); rect(ctx, ix, iy, iw, ih, 6); ctx.clip();
      if (d.detoure) photoFondue(ctx, d.photo, ix, iy, iw, ih, true, {}, .15);
      else photoCover(ctx, d.photo, ix, iy, iw, ih, .15);
      if (elite) irise(ctx, ix, iy, iw, ih, .12); // vignette brillante : léger reflet sur la photo aussi
      ctx.restore();
      ctx.lineWidth = 5; ctx.strokeStyle = C.fg; rect(ctx, ix, iy, iw, ih, 6); ctx.stroke();
    } else {
      // Sans photo : silhouette (épaules), tête en disque blanc avec les initiales bleu nuit
      ctx.save(); rect(ctx, fx, fy, fw, fh, 12); ctx.clip();
      ctx.fillStyle = rgba(C.navy, .22); ctx.beginPath(); ctx.moveTo(130, 520); ctx.quadraticCurveTo(140, 380, 300, 360); ctx.quadraticCurveTo(460, 380, 470, 520); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.fg; ctx.strokeStyle = C.navy; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(300, 262, 94, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      const ini = initiales(d.pseudo) || '?', t = ajuster(ctx, ini, 900, 108, DISPLAY, 140, .02);
      texte(ctx, ini, 300, 262 + t * .36, { poids: 900, taille: t, famille: DISPLAY, espacement: .02, couleur: C.navy, align: 'center' });
    }

    // Pastille de la note globale, à cheval sur le coin du cadre : anneau blanc, disque du rang, chiffre bleu nuit
    const gx = 110, gy = 112, globale = String(borner(d.globale) || '');
    ctx.save(); ctx.shadowColor = rgba(C.navy, .35); ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(gx, gy, 66, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = elite ? g : R.couleur; ctx.beginPath(); ctx.arc(gx, gy, 57, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.navy; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(gx, gy, 50, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    texte(ctx, globale, gx, gy + 20, { poids: 900, taille: ajuster(ctx, globale, 900, 64, DISPLAY, 84), famille: DISPLAY, couleur: C.navy, align: 'center' });
    texte(ctx, 'GLOBALE', gx, gy + 37, { poids: 800, taille: 10, espacement: .22, couleur: C.navy, align: 'center' });

    // Ruban du nom (couleur du rang, bouts repliés plus foncés), poste dans une capsule bleu nuit à droite
    const by = 536, bh = 74;
    ctx.fillStyle = R.fonce;
    ctx.beginPath(); ctx.moveTo(30, by + 12); ctx.lineTo(56, by + 12); ctx.lineTo(56, by + bh + 12); ctx.lineTo(30, by + bh + 12); ctx.lineTo(42, by + 12 + bh / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(570, by + 12); ctx.lineTo(544, by + 12); ctx.lineTo(544, by + bh + 12); ctx.lineTo(570, by + bh + 12); ctx.lineTo(558, by + 12 + bh / 2); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.shadowColor = rgba(C.navy, .25); ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = elite ? g : R.couleur; ctx.fillRect(44, by, 512, bh); ctx.restore();
    ctx.fillStyle = rgba(C.fg, .35); ctx.fillRect(44, by + 4, 512, 3);
    const code = codePoste(d.poste), wp = code ? 100 : 0;
    const nom = String(d.pseudo || 'Joueur').toUpperCase(), tn = ajuster(ctx, nom, 900, 58, DISPLAY, 470 - wp, .03);
    texte(ctx, nom, 64, by + bh / 2 + tn * .36, { poids: 900, taille: tn, famille: DISPLAY, espacement: .03, couleur: C.navy });
    if (code) {
      ctx.fillStyle = C.navy; rect(ctx, 544 - wp + 6, by + 12, wp - 18, bh - 24, 10); ctx.fill();
      texte(ctx, code, 544 - wp / 2 - 3, by + bh / 2 + 13, { poids: 800, taille: 36, famille: DISPLAY, espacement: .04, couleur: elite ? C.turf : PAPIER, align: 'center' });
    }
    // Ligne d'infos : poste en toutes lettres et niveau facultatif
    const infos = [libellePoste(d.poste) && ('Poste ' + libellePoste(d.poste).toLowerCase()), d.niveau].filter(Boolean).join('  ·  ').toUpperCase();
    // Club facultatif : sous le ruban du nom, au-dessus de la ligne d'infos (qui descend un peu)
    const club = nettoyerClub(d.club);
    if (club) ligneClub(ctx, club, 300, 639, 470, { poids: 800, taille: 16, mini: 12, espacement: .14, couleur: C.navy, align: 'center' });
    if (infos) texte(ctx, infos, 300, club ? 658 : 646, { poids: 800, taille: ajuster(ctx, infos, 800, 13, BODY, 480, .16), espacement: .16, couleur: ENCRE_DOUCE, align: 'center' });

    // Attributs : 6 cases crème (2 × 3), trait de la couleur du rang à gauche, petit chiffre et étiquette
    (d.attributs || []).slice(0, 6).forEach((a, i) => {
      const x = 56 + (i % 3) * 166, y = 668 + Math.floor(i / 3) * 76, w = 156, h = 64;
      ctx.fillStyle = PAPIER; rect(ctx, x, y, w, h, 10); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.navy, .2); rect(ctx, x, y, w, h, 10); ctx.stroke();
      ctx.fillStyle = elite ? R.couleur : R.couleur; rect(ctx, x + 8, y + 10, 6, h - 20, 3); ctx.fill();
      texte(ctx, String(borner(a.note)), x + 28, y + 47, { poids: 900, taille: 40, famille: DISPLAY, couleur: C.navy });
      texte(ctx, String(a.cle || '').toUpperCase().slice(0, 3), x + w - 14, y + 44, { poids: 800, taille: 15, espacement: .14, couleur: ENCRE_DOUCE, align: 'right' });
    });
    // Pied : balle et adresse
    balle(ctx, 184, 829, 8, R.couleur, C.navy);
    texte(ctx, 'APPRENDRE-PADEL.FR', 306, 834, { poids: 800, taille: 12, espacement: .26, couleur: ENCRE_DOUCE, align: 'center' });
    grain(ctx, W, H, exp ? .035 : .045, 19, exp ? 2 : 1);
    ctx.restore();
  }

  /* =====================================================================================================================
     REGISTRE DES MODÈLES et format story commun (1080 × 1920) : décor propre au modèle, titre, carte au centre, mentions.
     ===================================================================================================================== */
  const DEFS = {
    neon: {
      nom: 'Néon', description: 'Carte nuit, grille de terrain en perspective, photo en duotone et notes en anneaux lumineux.',
      carte: carteNeon, forme: ctx => rect(ctx, 0, 0, W, H, RAYON), anime: true,
      decor(ctx, R) {
        ctx.fillStyle = FOND; ctx.fillRect(0, 0, 1080, 1920);
        ctx.save(); ctx.scale(1.8, 1.8);
        let g = ctx.createRadialGradient(300, 560, 0, 300, 560, 700); g.addColorStop(0, rgba(C.terrain, .3)); g.addColorStop(1, rgba(C.terrain, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 1100);
        grille(ctx, 300, 120, 160, 1067, 900, .45);
        g = ctx.createRadialGradient(300, 160, 0, 300, 160, 500); g.addColorStop(0, rgba(R.couleur, .35)); g.addColorStop(1, rgba(R.couleur, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 700);
        ctx.restore();
      },
      titre: R => ({ espacement: .05, couleur: C.fg, lueur: { couleur: rgba(R.couleur, .9), flou: 36, passes: 2 }, contour: { couleur: R.couleur, largeur: 2 } }),
      ombre: R => ({ couleur: rgba(R.couleur, .45), flou: 70, dy: 0 })
    },
    blason: {
      nom: 'Blason', description: 'Carte métallisée en blason : note géante et poste en haut à gauche, photo en couleurs, attributs en deux colonnes.',
      carte: carteBlason, forme: ctx => formeBlason(ctx, 0),
      decor(ctx, R) {
        ctx.fillStyle = FOND; ctx.fillRect(0, 0, 1080, 1920);
        ctx.save(); ctx.scale(1.8, 1.8);
        let g = ctx.createRadialGradient(300, 520, 0, 300, 520, 640); g.addColorStop(0, rgba(R.couleur, .3)); g.addColorStop(1, rgba(R.couleur, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 1067);
        perforations(ctx, 0, 0, 600, 1067, 24, 2.4, C.fg, .05, false);
        ctx.restore();
      },
      titre: R => ({ espacement: .04, couleur: C.fg, lueur: { couleur: rgba(R.couleur, .6), flou: 28 }, contour: { couleur: R.couleur, largeur: 2 } }),
      ombre: R => ({ couleur: rgba(R.couleur, .4), flou: 60, dy: 10 })
    },
    stade: {
      nom: 'Stade', description: 'Lumière de stade, bande métal en diagonale, note géante et jauges lumineuses segmentées.',
      carte: carteStade, forme: ctx => formeStade(ctx, 0),
      decor(ctx, R) {
        ctx.fillStyle = C.navy; ctx.fillRect(0, 0, 1080, 1920);
        ctx.save(); ctx.scale(1.8, 1.8);
        projecteur(ctx, 30, -40, Math.PI * .45, Math.PI * .3, 1100, C.fg, .13);
        projecteur(ctx, 570, -40, Math.PI * .55, Math.PI * .3, 1100, C.sky, .13);
        const g = ctx.createRadialGradient(300, 1000, 0, 300, 1000, 700); g.addColorStop(0, rgba(R.couleur, .28)); g.addColorStop(1, rgba(R.couleur, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 1100);
        fumee(ctx, 0, 700, 600, 400, 18, C.fg, .07, 21);
        ctx.restore();
      },
      titre: R => ({ espacement: .03, couleur: C.fg, lueur: { couleur: rgba(R.couleur, .6), flou: 30 } }),
      ombre: () => ({ couleur: 'rgba(0,0,0,.6)', flou: 60, dy: 24 })
    },
    vignette: {
      nom: 'Vignette', description: "Vignette d'album rétro sur papier crème : photo encadrée, bandeau du nom, note dans une pastille.",
      carte: carteVignette, forme: ctx => rect(ctx, 0, 0, W, H, RAYON), clair: true,
      decor(ctx, R) {
        ctx.fillStyle = PAPIER_2; ctx.fillRect(0, 0, 1080, 1920);
        fibres(ctx, 1080, 1920, 1400, 9);
        // Page d'album : emplacements vides en pointillés dans les marges, coin tramé de la couleur du rang
        ctx.save(); ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.navy, .16);
        [[-120, 330], [1000, 330], [-120, 1080], [1000, 1080]].forEach(([x, y]) => { rect(ctx, x, y, 200, 300, 24); ctx.stroke(); });
        ctx.restore();
        perforations(ctx, 0, 1700, 1080, 220, 18, 3, R.couleur, .5, false);
      },
      titre: R => ({ espacement: .04, couleur: C.navy, relief: { couleur: R.couleur, dx: 5, dy: 5 } }),
      ombre: () => ({ couleur: rgba(C.navy, .3), flou: 40, dy: 14 })
    }
  };
  const MODELES = Object.keys(DEFS).map(cle => ({ cle, nom: DEFS[cle].nom, description: DEFS[cle].description }));
  const modeleDe = o => DEFS[o && o.modele] || DEFS.neon;

  function story(ctx, d, o, M) {
    const R = RANGS[d.rang] || RANGS.or, clair = !!M.clair;
    M.decor(ctx, R);
    texte(ctx, 'APPRENDRE PADEL', 540, 150, { poids: 800, taille: 22, espacement: .34, couleur: clair ? C.navy : C.turf, align: 'center' });
    texte(ctx, 'MA CARTE DE JOUEUR', 540, 252, Object.assign({ poids: 900, taille: 96, famille: DISPLAY, align: 'center' }, M.titre(R)));
    const k = 920 / W, om = M.ombre(R);
    ctx.save(); ctx.translate(80, 310); ctx.scale(k, k);
    ctx.shadowColor = om.couleur; ctx.shadowBlur = om.flou; ctx.shadowOffsetY = om.dy; ctx.fillStyle = clair ? C.fg : FOND; M.forme(ctx); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    M.carte(ctx, d, Object.assign({}, o, { sansBordure: false, sansEcrin: true })); ctx.restore();
    grain(ctx, 1080, 1920, .04, 13, o.export ? 2 : 1);
    texte(ctx, 'apprendre-padel.fr', 540, 1812, { poids: 700, taille: 30, espacement: .08, couleur: clair ? C.navy : C.muted, align: 'center' });
    texte(ctx, 'FAIS TA CARTE GRATUITEMENT', 540, 1858, { poids: 700, taille: 20, espacement: .2, couleur: clair ? ENCRE_DOUCE : C.dim, align: 'center' });
  }

  async function dessiner(canvas, donnees, options) {
    const o = Object.assign({ format: 'carte', phase: 0.12 }, options || {}), d = donnees || {}, M = modeleDe(o);
    await chargerPolices();
    const est = o.format === 'story';
    const Wc = est ? 1080 : Math.max(120, Math.round(o.largeur || 1200)), Hc = est ? 1920 : Math.round(Wc * 1.5);
    canvas.width = Wc; canvas.height = Hc;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, Wc, Hc);
    if (!est) { ctx.save(); ctx.scale(Wc / W, Wc / W); M.carte(ctx, d, o); ctx.restore(); return canvas; }
    story(ctx, d, o, M);
    return canvas;
  }

  /* Aperçu à l'écran. Néon Élite (hors story, et sauf prefers-reduced-motion) : le fond est dessiné une fois hors écran,
     puis chaque image ne redessine que la bordure dont le reflet tourne (≈ 6 s par tour). Renvoie une fonction d'arrêt.
     Les autres modèles n'ont pas d'animation : dessin unique, fonction d'arrêt vide. */
  function animer(canvas, donnees, options) {
    const o = Object.assign({}, options || {}), d = donnees || {};
    if (!modeleDe(o).anime) { dessiner(canvas, d, o); return () => {}; }
    let actif = true, raf = 0;
    const reduit = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    (async () => {
      if (d.rang !== 'elite' || o.format === 'story' || reduit || typeof requestAnimationFrame !== 'function') { await dessiner(canvas, d, o); return; }
      const fond = document.createElement('canvas');
      await dessiner(fond, d, Object.assign({}, o, { sansBordure: true }));
      if (!actif) return;
      canvas.width = fond.width; canvas.height = fond.height;
      const ctx = canvas.getContext('2d'), k = fond.width / W, R = RANGS.elite, t0 = performance.now();
      const image = t => {
        if (!actif) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(fond, 0, 0);
        ctx.save(); ctx.scale(k, k); rect(ctx, 0, 0, W, H, RAYON); ctx.clip(); bordureElite(ctx, R, ((t - t0) / 6000) % 1); ctx.restore();
        raf = requestAnimationFrame(image);
      };
      image(t0);
    })();
    return () => { actif = false; if (raf) cancelAnimationFrame(raf); };
  }

  window.CARTE_RENDU = { dessiner, animer, chargerPolices, codePoste, libellePoste, initiales, nettoyerClub, RANGS, FOND, MODELES };
})();
