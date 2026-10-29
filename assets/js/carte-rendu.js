/* Ma carte de joueur : rendu image sur canvas (même dessin que l'aperçu HTML de assets/carte.css).
   Usage : await window.CARTE_RENDU.dessiner(canvas, donnees, options)
     donnees : { pseudo, poste ("Droite" | "Gauche" | "Polyvalent" | code de 3 lettres), globale (1-99), rang ("bronze" | "argent" | "or" | "elite"),
                attributs: [{cle: "VOL", note: 82}, … ×6], photo: HTMLImageElement | null, niveau: texte facultatif }
     options : { format: "carte" (2:3, 1200×1800 par défaut) | "story" (1080×1920), largeur: largeur de sortie du format carte }
   Rend une promesse du canvas. Polices (Big Shoulders Display, Manrope) chargées via document.fonts avant le dessin ;
   si une police manque, la pile de repli (Arial Narrow / Impact, Arial) prend le relais : le dessin reste lisible.
   Toutes les cotes sont en pixels sur une base de 600 × 900 (la carte est mise à l'échelle), comme les unités --u du CSS.
   Couleurs : lues dans les jetons du design system (style.css) quand il est chargé, sinon mêmes valeurs en repli. */
(function () {
  'use strict';
  const jeton = (nom, repli) => {
    try { const v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim(); return v || repli; } catch (e) { return repli; }
  };
  const C = {
    navy: jeton('--navy', '#101F35'), fg: jeton('--fg', '#F4F7FA'), muted: jeton('--muted', '#A5B3C7'), dim: jeton('--dim', '#8D9BB2'),
    turf: jeton('--turf', '#C8F14B'), turfHover: jeton('--turf-hover', '#DAF784'), turfDeep: jeton('--turf-deep', '#8FB52A'),
    sky: jeton('--sky', '#5CB2E3'), terrain: jeton('--terrain', '#1674A6'), sand: jeton('--sand', '#ffb547'), coral: jeton('--coral', '#ff6b57'),
    argent: '#B8C7DA' // propre à la carte (déclaré aussi dans carte.css)
  };
  const RANGS = {
    bronze: { nom: 'Bronze', couleur: C.coral },
    argent: { nom: 'Argent', couleur: C.argent },
    or: { nom: 'Or', couleur: C.sand },
    elite: { nom: 'Élite', couleur: C.turf }
  };
  const DISPLAY = '"Big Shoulders Display","Arial Narrow",Impact,sans-serif';
  const BODY = 'Manrope,"Segoe UI",Helvetica,Arial,sans-serif';

  // #rrggbb (ou rgb()) → "r,g,b"
  function rgb(couleur) {
    const m = /^#([0-9a-f]{6})$/i.exec(couleur.trim());
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).join(',');
    const n = couleur.match(/\d+/g); return n ? n.slice(0, 3).join(',') : '255,255,255';
  }
  const rgba = (couleur, a) => `rgba(${rgb(couleur)},${a})`;

  async function chargerPolices() {
    if (!document.fonts || !document.fonts.load) return false;
    try {
      await Promise.all(['900 100px "Big Shoulders Display"', '800 100px "Big Shoulders Display"', '700 20px Manrope', '800 20px Manrope'].map(f => document.fonts.load(f)));
      return document.fonts.check('900 100px "Big Shoulders Display"') && document.fonts.check('700 20px Manrope');
    } catch (e) { return false; }
  }

  // Code de 3 lettres du poste
  function codePoste(poste) {
    const p = String(poste || '').trim().toLowerCase();
    if (!p) return '';
    if (p.startsWith('droit')) return 'DRO';
    if (p.startsWith('gauch')) return 'GAU';
    if (p.startsWith('poly')) return 'POL';
    return p.slice(0, 3).toUpperCase();
  }
  function libellePoste(poste) {
    const p = String(poste || '').trim();
    return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
  }
  function initiales(pseudo) {
    const mots = String(pseudo || '').trim().split(/[\s-]+/).filter(Boolean);
    if (!mots.length) return '';
    return (mots.length > 1 ? mots[0][0] + mots[mots.length - 1][0] : mots[0].slice(0, 2)).toUpperCase();
  }

  function rect(ctx, x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y); ctx.lineTo(x + w - k, y); ctx.arcTo(x + w, y, x + w, y + k, k);
    ctx.lineTo(x + w, y + h - k); ctx.arcTo(x + w, y + h, x + w - k, y + h, k);
    ctx.lineTo(x + k, y + h); ctx.arcTo(x, y + h, x, y + h - k, k);
    ctx.lineTo(x, y + k); ctx.arcTo(x, y, x + k, y, k); ctx.closePath();
  }
  // Police réduite jusqu'à tenir dans maxW ; renvoie la taille retenue
  function ajuster(ctx, texte, poids, taille, famille, maxW, espacement) {
    let t = taille;
    for (let i = 0; i < 40; i++) {
      ctx.font = `${poids} ${t}px ${famille}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = (espacement || 0) * t + 'px';
      if (ctx.measureText(texte).width <= maxW || t <= 10) break;
      t = Math.round(t * 0.94);
    }
    return t;
  }
  function texte(ctx, s, x, y, o) {
    ctx.font = `${o.poids || 700} ${o.taille}px ${o.famille || BODY}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.espacement || 0) * o.taille + 'px';
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillStyle = o.couleur || C.fg;
    if (o.ombre) { ctx.shadowColor = rgba(C.navy, .9); ctx.shadowBlur = o.ombre; ctx.shadowOffsetY = 2; }
    ctx.fillText(s, x, y);
    const largeur = ctx.measureText(s).width; // mesurée avec l'interlettrage
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return largeur;
  }
  function trame(ctx, w, h, pas) {
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let y = pas / 2; y < h; y += pas) for (let x = pas / 2; x < w; x += pas) { ctx.beginPath(); ctx.arc(x, y, pas / 26, 0, Math.PI * 2); ctx.fill(); }
  }
  // Photo en cover (ancrée un peu au-dessus du centre : le visage est en haut)
  function photoCover(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) * 0.22, sw, sh, x, y, w, h);
  }

  /* Dessine la carte (600 × 900) à l'origine courante */
  function dessinerCarte(ctx, d) {
    const rang = RANGS[d.rang] || RANGS.or, R = rang.couleur, W = 600, H = 900, PH = 480;
    ctx.save();
    rect(ctx, 0, 0, W, H, 28); ctx.clip();
    ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H);
    trame(ctx, W, H, 24);

    // Zone photo
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PH); ctx.clip();
    if (d.photo) photoCover(ctx, d.photo, 0, 0, W, PH);
    else {
      let g = ctx.createRadialGradient(300, 192, 0, 300, 192, 340);
      g.addColorStop(0, rgba(C.terrain, .55)); g.addColorStop(1, rgba(C.terrain, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH);
      // Silhouette (tête, épaules)
      ctx.fillStyle = rgba(C.sky, .1);
      ctx.beginPath(); ctx.arc(300, 196, 70, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(150, 480); ctx.quadraticCurveTo(150, 300, 300, 290); ctx.quadraticCurveTo(450, 300, 450, 480); ctx.closePath(); ctx.fill();
      const ini = initiales(d.pseudo);
      if (ini) {
        ctx.font = `900 220px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
        ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillText(ini, 302, 318);
        ctx.lineWidth = 2; ctx.strokeStyle = rgba(R, .45); ctx.strokeText(ini, 302, 318);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      }
    }
    // Teinte du rang (haut droit) puis fondu vers le bleu nuit
    let g = ctx.createRadialGradient(528, 30, 0, 528, 30, 400);
    g.addColorStop(0, rgba(R, .26)); g.addColorStop(1, rgba(R, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH);
    g = ctx.createLinearGradient(0, 0, 0, PH);
    g.addColorStop(0, rgba(C.navy, 0)); g.addColorStop(230 / PH, rgba(C.navy, 0)); g.addColorStop(440 / PH, rgba(C.navy, .92)); g.addColorStop(1, C.navy);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH);
    ctx.restore();

    // Marque (point vert + APPRENDRE PADEL)
    ctx.shadowColor = rgba(C.turf, .9); ctx.shadowBlur = 12;
    ctx.fillStyle = C.turf; ctx.beginPath(); ctx.arc(37, 38, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    const wm = texte(ctx, 'APPRENDRE ', 50, 45, { poids: 900, taille: 20, famille: DISPLAY, espacement: .05, couleur: '#fff', ombre: 8 });
    texte(ctx, 'PADEL', 50 + wm, 45, { poids: 900, taille: 20, famille: DISPLAY, espacement: .05, couleur: C.turf, ombre: 8 });

    // Pastille de rang
    ctx.font = `800 13px ${BODY}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '2.08px';
    const nomRang = rang.nom.toUpperCase(), wr = ctx.measureText(nomRang).width + 26;
    ctx.shadowColor = rgba(R, .45); ctx.shadowBlur = 18;
    ctx.fillStyle = R; rect(ctx, 568 - wr, 26, wr, 28, 14); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    texte(ctx, nomRang, 568 - wr / 2 + 1, 40, { poids: 800, taille: 13, espacement: .16, couleur: C.navy, align: 'center', base: 'middle' });

    // Note globale et poste
    const globale = String(Math.max(1, Math.min(99, Math.round(Number(d.globale) || 0))) || '');
    const wg = texte(ctx, globale, 30, 472, { poids: 900, taille: 170, famille: DISPLAY, espacement: -.01, couleur: R, ombre: 30 });
    const code = codePoste(d.poste), lib = libellePoste(d.poste);
    if (code) {
      const x = 30 + wg + 16;
      texte(ctx, ('POSTE' + (lib ? ' · ' + lib : '')).toUpperCase(), x, 421, { poids: 700, taille: 12, espacement: .18, couleur: C.muted });
      texte(ctx, code, x, 472, { poids: 800, taille: 58, famille: DISPLAY, espacement: .02, couleur: '#fff', ombre: 20 });
    }

    // Filet : double ligne, mailles, balle
    ctx.fillStyle = R; ctx.fillRect(0, 492, W, 2);
    ctx.fillStyle = rgba(R, .55); ctx.fillRect(0, 500, W, 1);
    ctx.fillStyle = rgba(R, .35); for (let x = 0; x < W; x += 10) ctx.fillRect(x, 494, 1, 6);
    ctx.shadowColor = rgba(C.turf, .6); ctx.shadowBlur = 12;
    g = ctx.createRadialGradient(556, 494, 1, 558.5, 496.5, 8);
    g.addColorStop(0, C.turfHover); g.addColorStop(.55, C.turf); g.addColorStop(1, C.turfDeep);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(558.5, 496.5, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

    // Nom et niveau
    const nom = String(d.pseudo || 'Joueur').toUpperCase();
    const tn = ajuster(ctx, nom, 900, 56, DISPLAY, 536, .02);
    texte(ctx, nom, 300, 514 + tn * 0.98, { poids: 900, taille: tn, famille: DISPLAY, espacement: .02, couleur: '#fff', align: 'center' });
    if (d.niveau) {
      const niv = String(d.niveau).toUpperCase(), tl = ajuster(ctx, niv, 700, 13, BODY, 536, .2);
      texte(ctx, niv, 300, 587, { poids: 700, taille: tl, espacement: .2, couleur: C.muted, align: 'center' });
    }

    // Demi-piste : surface, cadre, ligne de service, ligne centrale
    const px = 32, py = 604, pw = 536, ph = 232, lig = rgba(C.sky, .45);
    ctx.fillStyle = rgba(C.terrain, .16); rect(ctx, px, py, pw, ph, 4); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = lig; rect(ctx, px + 1, py + 1, pw - 2, ph - 2, 4); ctx.stroke();
    ctx.fillStyle = lig; ctx.fillRect(px, py + ph - 44 - 2, pw, 2); ctx.fillRect(300 - 1, py, 2, ph - 44 - 2);

    // Attributs : 3 par carré de service, jauge sur 99
    const attrs = (d.attributs || []).slice(0, 6);
    attrs.forEach((a, i) => {
      const col = Math.floor(i / 3), row = i % 3, x0 = col ? 316 : 48, cw = 236, y0 = 612 + row * 60;
      texte(ctx, String(a.cle || '').toUpperCase().slice(0, 3), x0, y0 + 36, { poids: 800, taille: 16, espacement: .14, couleur: C.fg });
      const n = Math.max(0, Math.min(99, Math.round(Number(a.note) || 0)));
      texte(ctx, String(n), x0 + cw, y0 + 36, { poids: 900, taille: 44, famille: DISPLAY, couleur: R, align: 'right' });
      ctx.fillStyle = 'rgba(255,255,255,.12)'; rect(ctx, x0, y0 + 44, cw, 5, 2.5); ctx.fill();
      ctx.fillStyle = R; rect(ctx, x0, y0 + 44, Math.max(5, cw * n / 99), 5, 2.5); ctx.fill();
    });

    // Mention (zone de fond, entre ligne de service et vitre)
    texte(ctx, 'APPRENDRE-PADEL.FR', 300, 819, { poids: 700, taille: 12, espacement: .18, couleur: C.dim, align: 'center' });

    // Cadres : intérieur fin, extérieur
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(R, .35); rect(ctx, 10.5, 10.5, W - 21, H - 21, 22); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(R, .75); rect(ctx, 0, 0, W, H, 28); ctx.stroke();
    ctx.restore();
  }

  async function dessiner(canvas, donnees, options) {
    const o = Object.assign({ format: 'carte' }, options || {}), d = donnees || {};
    await chargerPolices();
    const story = o.format === 'story';
    const W = story ? 1080 : Math.max(300, Math.round(o.largeur || 1200)), H = story ? 1920 : Math.round(W * 1.5);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!story) {
      ctx.save(); ctx.scale(W / 600, W / 600); dessinerCarte(ctx, d); ctx.restore();
      return canvas;
    }
    // Story : fond nuit, halos (terrain en haut, rang en bas), trame, titre, carte au centre, mention
    const R = (RANGS[d.rang] || RANGS.or).couleur;
    ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(80, 120, 0, 80, 120, 900);
    g.addColorStop(0, rgba(C.terrain, .4)); g.addColorStop(1, rgba(C.terrain, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(1000, 1800, 0, 1000, 1800, 800);
    g.addColorStop(0, rgba(R, .22)); g.addColorStop(1, rgba(R, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    trame(ctx, W, H, 36);
    ctx.fillStyle = C.turf; ctx.beginPath(); ctx.arc(405, 136, 8, 0, Math.PI * 2); ctx.fill();
    texte(ctx, 'APPRENDRE PADEL', 428, 146, { poids: 700, taille: 24, espacement: .3, couleur: C.turf });
    texte(ctx, 'MA CARTE DE JOUEUR', 540, 250, { poids: 900, taille: 92, famille: DISPLAY, espacement: .02, couleur: '#fff', align: 'center' });
    const k = 920 / 600, cx = 80, cy = 310;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 30;
    ctx.fillStyle = C.navy; rect(ctx, cx, cy, 920, 1380, 28 * k); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); dessinerCarte(ctx, d); ctx.restore();
    texte(ctx, 'apprendre-padel.fr', 540, 1810, { poids: 700, taille: 30, espacement: .08, couleur: C.muted, align: 'center' });
    texte(ctx, 'FAIS TA CARTE · QUESTIONNAIRE GRATUIT', 540, 1856, { poids: 700, taille: 20, espacement: .2, couleur: C.dim, align: 'center' });
    return canvas;
  }

  window.CARTE_RENDU = { dessiner, chargerPolices, codePoste, libellePoste, initiales, RANGS };
})();
