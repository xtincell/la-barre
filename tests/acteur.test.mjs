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
