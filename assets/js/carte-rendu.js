/* Ma carte de joueur : rendu « Néon » sur canvas (seule source de vérité : l'aperçu de la page et l'image exportée sont le même dessin).
   Usage : await window.CARTE_RENDU.dessiner(canvas, donnees, options)
     donnees : { pseudo, poste ("Droite" | "Gauche" | "Polyvalent" | code de 3 lettres), globale (1-99), rang ("bronze" | "argent" | "or" | "elite"),
                attributs: [{cle: "VOL", note: 82}, … ×6], photo: HTMLImageElement | HTMLCanvasElement | null, niveau: texte facultatif,
                detoure: true si la photo est un PNG détouré (alpha respecté, pas de duotone) }
     options : { format: "carte" (2:3, 1200×1800 par défaut) | "story" (1080×1920), largeur: largeur de sortie du format carte,
                 phase: 0..1 position du reflet de la bordure Élite, export: true pour l'image téléchargée (grain réduit à 2 px) }
   Rend une promesse du canvas. window.CARTE_RENDU.animer(canvas, donnees, options) : même dessin à l'écran, avec la bordure Élite
   qui tourne (fond statique mis en cache hors écran, seule la bordure est redessinée) ; renvoie une fonction d'arrêt.
   Sans mouvement si prefers-reduced-motion est demandé, si le rang n'est pas Élite ou au format story.
   Polices (Big Shoulders Display, Manrope) chargées via document.fonts avant le dessin ; si une police manque, la pile de repli
   (Arial Narrow / Impact, Arial) prend le relais : le dessin reste lisible. Cotes en unités sur une base de 600 × 900.

   DESSIN (direction B « Néon ») : carte très sombre (bleu nuit assombri de 40 %), grille de terrain en perspective au fond,
   photo en duotone (nuit → bleu terrain → couleur du rang) fondue sur la grille, note globale dans un anneau de progression,
   poste à sa droite, pseudo en lettres néon, 6 attributs en anneaux, équerres vertes aux coins, contour néon dans la couleur du rang
   (Élite : reflet tournant). Sans photo : monogramme des initiales dans un anneau néon, épaules en silhouette.
   Couleurs : jetons du design system (style.css) lus à l'exécution, mêmes valeurs en repli ; les nuances « métal » (clair / foncé)
   sont calculées à partir de la couleur du rang (mélange avec le blanc froid et le noir), jamais en dur. */
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
  /* Texte avec options : couleur, align, base, espacement, lueur {couleur, flou, passes}, contour {couleur, largeur}, ombre (flou) */
  function texte(ctx, s, x, y, o) {
    police(ctx, o.poids || 700, o.taille, o.famille, o.espacement);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.lineJoin = 'round';
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
  function dessinerCarte(ctx, d, o) {
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

    // Pseudo néon : blanc, contour du rang, double lueur ; trait néon vert dessous
    const nom = String(d.pseudo || 'Joueur').toUpperCase();
    const tn = ajuster(ctx, nom, 900, 92, DISPLAY, 520, .05);
    texte(ctx, nom, 300, 632, {
      poids: 900, taille: tn, famille: DISPLAY, espacement: .05, couleur: C.fg, align: 'center',
      lueur: { couleur: rgba(R.couleur, .95), flou: 34, passes: 2 }, contour: { couleur: R.couleur, largeur: 2.5 }
    });
    ctx.save(); g = ctx.createLinearGradient(60, 0, 540, 0); g.addColorStop(0, rgba(C.turf, 0)); g.addColorStop(.5, C.turf); g.addColorStop(1, rgba(C.turf, 0));
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.shadowColor = rgba(C.turf, .9); ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(60, 652); ctx.lineTo(540, 652); ctx.stroke(); ctx.restore();

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

  async function dessiner(canvas, donnees, options) {
    const o = Object.assign({ format: 'carte', phase: 0.12 }, options || {}), d = donnees || {};
    await chargerPolices();
    const story = o.format === 'story';
    const Wc = story ? 1080 : Math.max(300, Math.round(o.largeur || 1200)), Hc = story ? 1920 : Math.round(Wc * 1.5);
    canvas.width = Wc; canvas.height = Hc;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, Wc, Hc);
    if (!story) { ctx.save(); ctx.scale(Wc / W, Wc / W); dessinerCarte(ctx, d, o); ctx.restore(); return canvas; }
    // Story : fond sombre, grille en perspective, halo du rang, titre, carte au centre, mention
    const R = RANGS[d.rang] || RANGS.or;
    ctx.fillStyle = FOND; ctx.fillRect(0, 0, Wc, Hc);
    ctx.save(); ctx.scale(1.8, 1.8);
    let g = ctx.createRadialGradient(300, 560, 0, 300, 560, 700); g.addColorStop(0, rgba(C.terrain, .3)); g.addColorStop(1, rgba(C.terrain, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 1100);
    grille(ctx, 300, 120, 160, 1067, 900, .45);
    g = ctx.createRadialGradient(300, 160, 0, 300, 160, 500); g.addColorStop(0, rgba(R.couleur, .35)); g.addColorStop(1, rgba(R.couleur, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 700);
    ctx.restore();
    texte(ctx, 'APPRENDRE PADEL', 540, 150, { poids: 800, taille: 22, espacement: .34, couleur: C.turf, align: 'center' });
    texte(ctx, 'MA CARTE DE JOUEUR', 540, 252, { poids: 900, taille: 96, famille: DISPLAY, espacement: .05, couleur: C.fg, align: 'center', lueur: { couleur: rgba(R.couleur, .9), flou: 36, passes: 2 }, contour: { couleur: R.couleur, largeur: 2 } });
    const k = 920 / W, cx = 80, cy = 310;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.shadowColor = rgba(R.couleur, .45); ctx.shadowBlur = 70; ctx.fillStyle = FOND; rect(ctx, 0, 0, W, H, RAYON); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    dessinerCarte(ctx, d, Object.assign({}, o, { sansBordure: false })); ctx.restore();
    grain(ctx, Wc, Hc, .04, 13, o.export ? 2 : 1);
    texte(ctx, 'apprendre-padel.fr', 540, 1812, { poids: 700, taille: 30, espacement: .08, couleur: C.muted, align: 'center' });
    texte(ctx, 'FAIS TA CARTE · QUESTIONNAIRE GRATUIT', 540, 1858, { poids: 700, taille: 20, espacement: .2, couleur: C.dim, align: 'center' });
    return canvas;
  }

  /* Aperçu à l'écran. Élite (hors story, et sauf prefers-reduced-motion) : le fond est dessiné une fois hors écran,
     puis chaque image ne redessine que la bordure dont le reflet tourne (≈ 6 s par tour). Renvoie une fonction d'arrêt. */
  function animer(canvas, donnees, options) {
    const o = Object.assign({}, options || {}), d = donnees || {};
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

  window.CARTE_RENDU = { dessiner, animer, chargerPolices, codePoste, libellePoste, initiales, RANGS, FOND };
})();
