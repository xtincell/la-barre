/* L'acteur du poste de travail utilise les personnes et casquettes du dépôt.
 * Ce choix local attribue les gestes ; les accès serveur restent distincts. */
window.ACTEUR = (function () {
  function cle() {
    var p = DEPOT.poids();
    return "la-barre-acteur:" + (p.fichier || DEPOT.tout().reference || MAISON.nom);
  }
  function personne() {
    var id = null;
    try { id = sessionStorage.getItem(cle()); } catch (e) { /* navigation privée */ }
    var p = id ? DEPOT.trouve("personnes", id) : null;
    return p && !p.archive ? p : null;
  }
  function choisir(id) {
    var p = id ? DEPOT.trouve("personnes", id) : null;
    if (id && (!p || p.archive)) return false;
    try { if (id) sessionStorage.setItem(cle(), id); else sessionStorage.removeItem(cle()); }
    catch (e) { return false; }
    return true;
  }
  function postes() {
    var p = personne();
    return p ? [p.poste].concat((p.casquettes || []).map(function (c) { return c.poste; }))
      .filter(function (x, i, a) { return x && a.indexOf(x) === i; }) : [MAISON.titulaire];
  }
  function exerce(poste) { return !poste || postes().indexOf(poste) !== -1; }
  function trace() {
    var p = personne();
    return { personneId: p ? p.id : null, nom: p ? p.nom : null,
      poste: p ? p.poste : MAISON.titulaire, postes: postes() };
  }
  function nom() { var p = personne(); return p ? p.nom : "Poste " + O.poste(MAISON.titulaire).court; }
  return { personne: personne, choisir: choisir, postes: postes, exerce: exerce, trace: trace, nom: nom };
})();
