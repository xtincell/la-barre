import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app/formulaire.js',import.meta.url),'utf8');
function moteur(){
  const elements=[];
  function el(tag,props={},...children){
    const events={};
    const n={tag,value:'',children:children.flat(Infinity),...props,
      appendChild(x){this.children.push(x);},setAttribute(k,v){this[k]=v;},
      addEventListener(k,f){events[k]=f;},dispatchEvent(e){events[e.type]?.();}};
    elements.push(n);return n;
  }
  const sb={O:{el,vider(){},poste:p=>({nom:p})},ACTEUR:{exerce:()=>false},
    REGLES:{vocabulaire:()=>[]},Event,console};sb.window=sb;
  vm.runInContext(source,vm.createContext(sb));return {form:sb.FORM,elements};
}
test('les champs d’un autre poste restent saisissables dans tous les types de formulaire',()=>{
  const m=moteur();
  const champs=[{cle:'texte',nom:'Texte',type:'long',poste:'clientele'},
    {cle:'choix',nom:'Choix',type:'choix',poste:'clientele',options:['a','b']},
    {cle:'date',nom:'Date',type:'date',poste:'clientele'}];
  const f=m.form.rendre(champs,{},{frontiere:true});
  const input=m.elements.filter(x=>['textarea','select','input'].includes(x.tag));
  assert.equal(input.length,3);for(const x of input){assert.ok(!x.readonly);assert.ok(!x.disabled);}
  input[0].value='Proposition';input[0].dispatchEvent(new Event('input'));
  assert.equal(f.changements().texte,'Proposition');
});
test('choisir plusieurs objets ne modifie pas le dossier avant enregistrement',()=>{
  const m=moteur(),dossier={marques:['A']};
  const f=m.form.rendre([{cle:'marques',nom:'Marques',type:'objets',source:()=>[{id:'A',nom:'A'},{id:'B',nom:'B'}]}],dossier,{});
  m.elements.find(x=>x.tag.startsWith('button')&&x.children.includes('B')).onclick();
  assert.deepEqual(dossier,{marques:['A']});
  assert.deepEqual(Array.from(f.changements().marques),['A','B']);
});
