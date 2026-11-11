import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app/acteur.js',import.meta.url),'utf8');
function poste(){
  const mem=new Map();let fichier='atelier-a.json';
  const personnes=[{id:'P1',nom:'Camille',poste:'direction-generale',casquettes:[{poste:'clientele'},{poste:'planning'}]},
    {id:'P2',nom:'Morgan',poste:'creation',casquettes:[]},
    {id:'P3',nom:'Personne archivée',poste:'creation',archive:{motif:'Dossier historique'}}];
  const sb={MAISON:{titulaire:'creation',nom:'Recette'},O:{poste:p=>({court:p})},
    sessionStorage:{getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)},
    DEPOT:{poids:()=>({fichier}),tout:()=>({}),trouve:(type,id)=>personnes.find(p=>p.id===id)}};
  sb.window=sb;vm.runInContext(source,vm.createContext(sb));
  return {acteur:sb.ACTEUR,fichier:f=>{fichier=f;}};
}
test('les casquettes du dirigeant sont reconnues sans lui attribuer tous les postes',()=>{
  const {acteur:a}=poste();assert.equal(a.personne(),null);assert.equal(a.nom(),'Poste creation');
  assert.equal(a.choisir('P1'),true);assert.equal(a.exerce('clientele'),true);assert.equal(a.exerce('planning'),true);
  assert.equal(a.exerce('creation'),false);assert.equal(a.trace().personneId,'P1');
  assert.equal(a.choisir('inconnu'),false);assert.equal(a.personne().id,'P1');
  assert.equal(a.choisir('P3'),false);assert.equal(a.personne().id,'P1');
});
test('deux onglets et deux dépôts gardent des acteurs distincts',()=>{
  const a=poste(),b=poste();a.acteur.choisir('P1');b.acteur.choisir('P2');
  assert.equal(a.acteur.personne().id,'P1');assert.equal(b.acteur.personne().id,'P2');
  a.fichier('atelier-b.json');assert.equal(a.acteur.personne(),null);
  a.fichier('atelier-a.json');assert.equal(a.acteur.personne().id,'P1');
});

/* Servie derrière La Fusée : la personne connectée est imposée (LB3). */
function posteAvecContexte() {
  const mem=new Map();let statut={etat:'independant',acteur:null};
  const personnes=[{id:'P1',nom:'Camille',poste:'direction-generale',casquettes:[{poste:'clientele'}]}];
  const sb={MAISON:{titulaire:'creation',nom:'Recette'},O:{poste:p=>({court:p,nom:'Poste '+p+' (nom long)'})},
    sessionStorage:{getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)},
    DEPOT:{poids:()=>({fichier:'atelier-a.json'}),tout:()=>({}),trouve:(type,id)=>personnes.find(p=>p.id===id)},
    VAULT:{statutContexte:()=>statut}};
  sb.window=sb;vm.runInContext(source,vm.createContext(sb));
  return {acteur:sb.ACTEUR,contexte:s=>{statut=s;}};
}
test('derrière La Fusée, la personne connectée est imposée et le choix du poste verrouillé',()=>{
  const {acteur:a,contexte}=posteAvecContexte();
  assert.equal(a.choisir('P1'),true);assert.equal(a.mode(),'declare');assert.equal(a.mention(),'déclaré sur ce poste');
  contexte({etat:'recu',acteur:{id:'user-alice',nom:'Alice Martin'}});
  assert.equal(a.mode(),'authentifie');assert.equal(a.mention(),'authentifié par La Fusée');
  assert.equal(a.personne(),null,'le choix local ne vaut plus');assert.equal(a.nom(),'Alice Martin');
  assert.equal(a.choisir('P1'),false);assert.equal(a.choisir(''),false);
  assert.deepEqual(JSON.parse(JSON.stringify(a.trace())),{personneId:null,nom:'Alice Martin',poste:'creation',postes:['creation']});
  /* Aucune casquette prêtée : les postes sont ceux de l'installation. */
  assert.equal(a.exerce('clientele'),false);assert.equal(a.exerce('creation'),true);
  contexte({etat:'recu',acteur:{id:'user-sans-nom',nom:null}});
  assert.equal(a.nom(),'Personne connectée');assert.equal(a.trace().nom,null);
  /* Sans La Fusée, le choix déclaré revient tel quel. */
  contexte({etat:'erreur',acteur:null});
  assert.equal(a.mode(),'declare');assert.equal(a.personne().id,'P1');assert.equal(a.exerce('clientele'),true);
});
test('l’attribution d’une entrée distingue l’identité attestée de l’acteur déclaré',()=>{
  const {acteur:a}=posteAvecContexte();
  const atteste={type:'piste',acteur:{personneId:'P1',nom:'Camille'},attestation:{par:'la-fusee',userId:'user-alice',nom:'Alice Martin',at:'2026-11-11T10:00:00.000Z',empreinte:'e'.repeat(64),sceau:'s'.repeat(64)}};
  assert.deepEqual(JSON.parse(JSON.stringify(a.attribution(atteste))),{mode:'authentifie',nom:'Alice Martin',quand:'2026-11-11T10:00:00.000Z',texte:'Alice Martin · authentifié par La Fusée'});
  assert.equal(a.attribution({acteur:{nom:'Camille'}}).texte,'Camille · déclaré sur ce poste');
  assert.equal(a.attribution({qui:'creation'}).texte,'Poste creation (nom long) · déclaré sur ce poste');
  /* Une attestation qui n'a pas la forme de La Fusée n'est pas lue comme telle. */
  assert.equal(a.attribution({acteur:{nom:'Camille'},attestation:{par:'navigateur',userId:'x'}}).mode,'declare');
  assert.equal(a.attribution({attestation:{par:'la-fusee',userId:'u',nom:null}}).nom,'personne connectée');
});
