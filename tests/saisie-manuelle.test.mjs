import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const clone = v => JSON.parse(JSON.stringify(v));
async function poste() {
  let panneau, form;
  const journal = [];
  function el(tag, props = {}, ...children) { return { tag, value:'', ...props, children:children.flat(Infinity).filter(Boolean) }; }
  const def = { cle:'brief', nom:'Brief', poste:'clientele', champs:[
    { cle:'objectif_business', nom:'Objectif business', poste:'clientele', critique:true },
    { cle:'cible', nom:'Cible', poste:'planning', critique:true },
  ] };
  const sb = { console, Date, Set, Map,
    MAISON:{ titulaire:'creation', criteresDe:()=>[], verdicts:[{cle:'approuve',nom:'Approuvé'}], postes:[{cle:'creation'},{cle:'clientele'},{cle:'planning'}] },
    O:{ el, poste:p => ({ nom:p, court:p }) },
    UI:{ banniere:(...x)=>el('div',{},...x), eti:(...x)=>el('span',{},...x) },
    AVIS:{ refus:message => { sb.erreur = message; } },
    CHAMPS:{ section:()=>def },
    DEPOT:{ tracer:(...args)=>journal.push(args), enregistrer(){}, liste:()=>[], ajoute(){} },
    FORM:{ rendre:(champs, valeurs)=>{
      const base=clone(valeurs), v=clone(valeurs);
      form={ noeud:el('form'), champs, valeurs:()=>v, base:()=>base,
        changements:()=>Object.fromEntries(champs.filter(c=>JSON.stringify(v[c.cle])!==JSON.stringify(base[c.cle])).map(c=>[c.cle,v[c.cle]])) };
      return form;
    } },
    PANNEAU:{ ouvrir:(titre,sous,body)=>{panneau=body;}, fermer(){}, sur:(titre,sous,body)=>{panneau=body;}, fermerSur(){} },
  };
  sb.window=sb;
  const ctx=vm.createContext(sb);
  const rendre=sb.FORM.rendre;
  for (const name of ['reconciliation','formulaire','inference','version','validation','vue-projets']) {
    vm.runInContext(await readFile(new URL('../app/'+name+'.js',import.meta.url),'utf8'),ctx);
  }
  ctx.FORM.rendre=rendre;
  function find(node, label) {
    if (!node || typeof node!=='object') return;
    if (node.tag.startsWith('button') && node.children.includes(label)) return node;
    for(const child of node.children||[]) { const found=find(child,label); if(found)return found; }
  }
  return { ctx, journal, get panel(){return panneau;}, get form(){return form;}, click(label){
    const b=find(panneau,label);assert.ok(b,'bouton '+label);b.onclick();
  } };
}
function projet() { return { id:'P-recette', ref:'REC-001', sections:{ brief:{
  objectif_business:'Hypothèse de départ', cible:'Cible reçue', validation:{verdict:'approuve',version:1,quand:'hier'},
  extensionMetier:{a:1},
} }, inferences:{'brief.objectif_business':{pourquoi:'Hypothèse à confirmer',quand:'avant',par:'creation'}} }; }

test('modifier un champ inféré conserve le texte saisi et ne fabrique aucun contreseing', async()=>{
  const s=await poste(),p=projet();
  s.ctx.VUE_PROJETS.editerChamp(p,'brief','objectif_business',()=>{});
  s.form.valeurs().objectif_business='Proposition corrigée';
  s.click('Enregistrer');
  assert.equal(p.sections.brief.objectif_business,'Proposition corrigée');
  assert.equal(s.ctx.INFERENCE.est(p,'brief','objectif_business'),true);
  assert.equal((p.contreseings||[]).length,0);
});

test('deux modifications du même champ attendent un choix et préservent les deux valeurs',async()=>{
  const s=await poste(),p=projet();
  s.ctx.VUE_PROJETS.editerChamp(p,'brief','objectif_business',()=>{});
  s.form.valeurs().objectif_business='Ma proposition';
  p.sections.brief.objectif_business='Autre proposition reçue';
  s.click('Enregistrer');
  assert.equal(p.sections.brief.objectif_business,'Autre proposition reçue');
  const tree=JSON.stringify(s.panel);
  assert.ok(tree.includes('Ma proposition'));assert.ok(tree.includes('Autre proposition reçue'));
  function select(n){if(n?.tag==='select')return n; for(const c of n?.children||[]){const r=select(c);if(r)return r;}}
  const choice=select(s.panel);choice.value='ici';choice.onchange();s.click('Conserver ces choix');
  assert.equal(p.sections.brief.objectif_business,'Ma proposition');
});

test('confirmer exige une personne et une référence puis conserve la valeur réellement confirmée',async()=>{
  const s=await poste(),p=projet();
  assert.equal(s.ctx.INFERENCE.contresigner(p,'brief','objectif_business',null),false);
  assert.equal(s.ctx.INFERENCE.contresigner(p,'brief','objectif_business','Responsable'),false);
  assert.equal(s.ctx.INFERENCE.est(p,'brief','objectif_business'),true);
  assert.equal(s.ctx.INFERENCE.contresigner(p,'brief','objectif_business','Responsable',{reference:'Compte rendu de recette',attendu:'Ancienne valeur'}),false);
  assert.equal(s.ctx.INFERENCE.contresigner(p,'brief','objectif_business','Responsable',{reference:'Compte rendu de recette',attendu:p.sections.brief.objectif_business}),true);
  assert.equal(p.contreseings[0].valeur,'Hypothèse de départ');
  assert.equal(p.contreseings[0].reference,'Compte rendu de recette');
  assert.equal(s.ctx.INFERENCE.est(p,'brief','objectif_business'),false);
  s.ctx.INFERENCE.corriger(p,'brief',{objectif_business:'Nouvelle proposition'});
  assert.equal(s.ctx.INFERENCE.est(p,'brief','objectif_business'),true);
  assert.equal(s.ctx.INFERENCE.confirmation(p,'brief','objectif_business'),null);
  assert.equal(p.contreseings[0].valeur,'Hypothèse de départ');
});

test('enregistrer sans modifier ne change ni statut ni version ni journal',async()=>{
  const s=await poste(),p=projet(),avant=clone(p);
  s.ctx.VUE_PROJETS.editerSection(p,'brief',()=>{});s.click('Enregistrer');
  assert.deepEqual(p,avant);assert.equal(s.journal.length,0);
});

test('une approbation pour travail ne transforme pas les propositions en accord',async()=>{
  const s=await poste(),p=projet();
  const v={cle:'approuve',nom:'Approuvé',motifRequis:false};
  s.ctx.VALIDATION.rendre(p,'brief',p.sections.brief,v,()=>{});s.click('Approuvé');
  assert.equal(p.sections.brief.validation.portee,'travail');
  assert.equal(s.ctx.VALIDATION.valide(p.sections.brief),false);
  assert.ok(s.ctx.VALIDATION.etat(p.sections.brief).nom.includes('pour travail'));
  assert.equal(s.ctx.INFERENCE.est(p,'brief','objectif_business'),true);
});

test('un verdict refuse de couvrir un document modifié après sa lecture',async()=>{
  const s=await poste(),p=projet(),avant=clone(p.sections.brief.validation);
  s.ctx.VALIDATION.rendre(p,'brief',p.sections.brief,{cle:'approuve',nom:'Approuvé'},()=>{});
  p.sections.brief.cible='Modification concurrente';s.click('Approuvé');
  assert.deepEqual(p.sections.brief.validation,avant);
  assert.match(s.ctx.erreur,/document a changé/);
});

test('un formulaire n’écrase pas un champ resté intact dans la saisie ni les métadonnées',async()=>{
  const s=await poste(),p=projet();
  s.ctx.VUE_PROJETS.editerSection(p,'brief',()=>{});
  s.form.valeurs().objectif_business='Objectif modifié';
  p.sections.brief.cible='Cible reçue pendant la saisie';
  p.sections.brief.extensionMetier={a:2};
  s.click('Enregistrer');
  assert.equal(p.sections.brief.cible,'Cible reçue pendant la saisie');
  assert.deepEqual(p.sections.brief.extensionMetier,{a:2});
});

test('une correction d’un contenu approuvé rend le verdict antérieur périmé et conserve son contenu',async()=>{
  const s=await poste(),p=projet();
  s.ctx.VUE_PROJETS.editerChamp(p,'brief','cible',()=>{});
  s.form.valeurs().cible='Autre cible';s.click('Enregistrer');
  assert.equal(s.ctx.VALIDATION.perime(p.sections.brief),true);
  assert.equal(p.sections.brief.versions.at(-1).etat.cible,'Cible reçue');
  assert.equal(p.sections.brief.versions.at(-1).etat.objectif_business,'Hypothèse de départ');
});
