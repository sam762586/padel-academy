/* Vérification de la banque de questions de Mon académie (assets/js/academie-questions.js, généré par
   scripts/generer-academie-questions.mjs) : à jour ; chaque question complète (identifiant unique, niveaux 1 à 10,
   thème, difficulté, situation, choix, bonne réponse, explication, article, exercice, scène 3D, prérequis, statut) ;
   questions des scénarios identiques à leur source ; questions rédigées reliées à la phrase du site dont elles viennent ;
   liens existants ; prérequis sans boucle ; au moins 6 questions validées posables à chaque niveau.
   Lancer depuis la racine du site : node scripts/verifier-academie-questions.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const lienValide=l=>{const [page,ancre]=l.split('#');if(!/^[a-z0-9-]+\.html$/.test(page)||!fs.existsSync(path.join(racine,page)))return false;return !ancre||lire(page).includes('id="'+ancre+'"');};
const SAMUEL=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'donnees/academie-questions-samuel.json'),'utf8')).questions;
const THEMES=['placement','defense','vitres','bandeja','vibora','volee','lob','transition','communication','construction','regles','materiel','competition','culture'];

execFileSync(process.execPath,[path.join(__dirname,'generer-academie-questions.mjs'),'--verifier'],{cwd:racine,stdio:'pipe'});
const ctx={};vm.createContext(ctx);
vm.runInContext(lire('assets/js/academie-questions.js')+';'+lire('assets/js/exercices-donnees.js')+';this.Q=ACADEMIE_QUESTIONS;this.T=ACADEMIE_THEMES;this.EX=EXERCICES;',ctx);
const Q=ctx.Q,T=ctx.T,EX=ctx.EX;
assert.deepEqual(Object.keys(T).sort(),[...THEMES].sort(),'les 14 thèmes (11 demandés, 3 des questions de Samuel)');
Object.values(T).forEach(t=>assert.ok(t.nom&&lienValide(t.article),t.nom));
assert.equal(new Set(Q.map(q=>q.id)).size,Q.length,'identifiants uniques');
const parId=Object.fromEntries(Q.map(q=>[q.id,q]));
for(const q of Q){
 const m=q.id+' : ';
 assert.match(q.id,/^[a-z0-9-]+$/,m+'identifiant');
 assert.ok(['validee','brouillon'].includes(q.statut),m+'statut');
 assert.ok(THEMES.includes(q.theme),m+'thème');
 assert.ok(Number.isInteger(q.niveauMin)&&Number.isInteger(q.niveauMax)&&1<=q.niveauMin&&q.niveauMin<=q.niveauMax&&q.niveauMax<=10,m+'niveaux 1 à 10');
 assert.ok([1,2,3].includes(q.difficulte),m+'difficulté');
 (q.origine==='samuel'?['question','explication']:['situation','question','explication']).forEach(k=>assert.ok(typeof q[k]==='string'&&q[k].trim().length>5,m+k));
 assert.ok(Array.isArray(q.choix)&&q.choix.length>=2&&q.choix.length<=4&&new Set(q.choix).size===q.choix.length,m+'choix');
 assert.ok(Number.isInteger(q.bonne)&&q.bonne>=0&&q.bonne<q.choix.length,m+'bonne réponse');
 assert.ok(lienValide(q.article),m+'article '+q.article);
 if(q.exercice!==null||!['materiel','culture'].includes(q.theme)){const ex=EX.find(e=>e.id===q.exercice);assert.ok(ex,m+'exercice '+q.exercice);}
 if(q.scenario)assert.ok(fs.existsSync(path.join(racine,'simulateur-3d-'+q.scenario+'.html')),m+'scène '+q.scenario);
 assert.ok(Array.isArray(q.prerequis),m+'prérequis');
 q.prerequis.forEach(p=>{assert.ok(parId[p],m+'prérequis inconnu '+p);assert.ok(parId[p].niveauMin<=q.niveauMax,m+'prérequis d’un niveau trop élevé');});
 if(q.origine==='scenario'){
  // Texte identique à la scène 3D (déjà relue et publiée)
  const [sc,num]=[q.id.replace(/-\d+$/,''),+q.id.match(/-(\d+)$/)[1]];
  const s=JSON.parse(lire('assets/3d/scenarios/'+sc+'.json')),src=s.questions[num-1];
  assert.equal(q.statut,'validee');
  assert.deepEqual([q.question,[...q.choix],q.bonne,q.explication,q.situation],[src.question,src.choix,src.bonne,src.explication,s.situation],m+'identique au scénario');
 }else if(q.origine==='samuel'){
  // Texte de Samuel repris tel quel ; brouillon seulement si un fait reste à confirmer
  const src=SAMUEL.find(x=>x.id===q.id);
  assert.deepEqual([q.question,[...q.choix],q.bonne,q.explication],[src.question,src.choix,src.bonne,src.explication],m+'identique au texte de Samuel');
  assert.equal(q.statut,src.a_confirmer?'brouillon':'validee',m+'statut');
 }else{
  assert.equal(q.origine,'redaction',m+'origine');
  assert.ok(lienValide(q.source),m+'source '+q.source);
 }
}
// Prérequis sans boucle
const vu=new Set(),enCours=new Set();
const visiter=id=>{if(vu.has(id))return;assert.ok(!enCours.has(id),'boucle de prérequis : '+id);enCours.add(id);parId[id].prerequis.forEach(visiter);enCours.delete(id);vu.add(id);};
Q.forEach(q=>visiter(q.id));
ok(Q.length+' questions complètes (11 thèmes, niveaux 1 à 10, difficulté, situation, article, exercice, scène 3D, prérequis sans boucle) ; questions des scénarios identiques à leur source');
// Couverture
THEMES.forEach(t=>assert.ok(Q.filter(q=>q.theme===t).length>=3,t+' : 3 questions au moins'));
const cov=[];
for(let n=1;n<=10;n++){const v=Q.filter(q=>q.statut==='validee'&&q.niveauMin<=n&&n<=q.niveauMax).length;cov.push(n+':'+v);assert.ok(v>=6,'niveau '+n+' : '+v+' question(s) validée(s), 6 au moins');}
const br=Q.filter(q=>q.statut==='brouillon').length;
ok('couverture : chaque thème a 3 questions au moins ; validées posables par niveau '+cov.join(' ')+' ; '+br+' brouillon(s) en attente de relecture');
console.log(nb+' vérifications réussies.');
