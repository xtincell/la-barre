/* L'acteur du poste de travail.
 *
 * Deux régimes, et l'écran dit toujours lequel s'applique :
 *
 *   authentifié  La Barre est servie derrière La Fusée, et son contexte
 *                (contexte.json) déclare `actorAttestation: "SESSION_V1"` et
 *                la personne connectée. Elle est imposée : le choix de
 *                l'onglet est verrouillé, et La Fusée atteste à chaque
 *                enregistrement les décisions et lignes de journal nouvelles
 *                (champ `attestation`, que le navigateur ne peut ni forger ni
 *                effacer). Ses postes restent ceux de l'installation : aucune
 *                casquette ne lui est prêtée.
 *   déclaré      Sans La Fusée, la personne se choisit parmi celles du dépôt ;
 *                le choix vit dans le sessionStorage de l'onglet et attribue
 *                les gestes, sans rien prouver ni ouvrir aucun droit.
 */
window.ACTEUR = (function () {
  function cle() {
    var p = DEPOT.poids();
    return "la-barre-acteur:" + (p.fichier || DEPOT.tout().reference || MAISON.nom);
  }
  /* La personne connectée, telle que La Fusée la déclare. */
  function authentifie() {
    var s = window.VAULT && VAULT.statutContexte ? VAULT.statutContexte() : null;
    var a = s && s.acteur;
    return a && typeof a.id === "string" && a.id ? { userId: a.id, nom: typeof a.nom === "string" && a.nom.trim() ? a.nom.trim() : null } : null;
  }
  function mode() { return authentifie() ? "authentifie" : "declare"; }
  function personne() {
    if (authentifie()) return null;
    var id = null;
    try { id = sessionStorage.getItem(cle()); } catch (e) { /* navigation privée */ }
    var p = id ? DEPOT.trouve("personnes", id) : null;
    return p && !p.archive ? p : null;
  }
  function choisir(id) {
    if (authentifie()) return false;
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
    var a = authentifie();
    if (a) return { personneId: null, nom: a.nom, poste: MAISON.titulaire, postes: [MAISON.titulaire] };
    var p = personne();
    return { personneId: p ? p.id : null, nom: p ? p.nom : null,
      poste: p ? p.poste : MAISON.titulaire, postes: postes() };
  }
  function nom() {
    var a = authentifie();
    if (a) return a.nom || "Personne connectée";
    var p = personne(); return p ? p.nom : "Poste " + O.poste(MAISON.titulaire).court;
  }
  function mention() { return authentifie() ? "authentifié par La Fusée" : "déclaré sur ce poste"; }

  /* Qui a fait une décision, une ligne de journal ou une version de bilan. Une
   * attestation est l'identité enregistrée par La Fusée ; La Barre ne peut pas
   * vérifier son sceau, La Fusée le vérifie à la réception d'un bilan. */
  function attribution(entree) {
    var e = entree || {};
    var a = e.attestation;
    if (a && typeof a === "object" && a.par === "la-fusee" && typeof a.userId === "string") {
      var n = typeof a.nom === "string" && a.nom.trim() ? a.nom.trim() : "personne connectée";
      return { mode: "authentifie", nom: n, quand: a.at || null, texte: n + " · authentifié par La Fusée" };
    }
    var d = e.acteur && typeof e.acteur === "object" ? e.acteur : null;
    var poste = (d && d.poste) || e.qui || MAISON.titulaire;
    var declare = d && d.nom ? d.nom : O.poste(poste).nom;
    return { mode: "declare", nom: declare, quand: null, texte: declare + " · déclaré sur ce poste" };
  }

  return { personne: personne, choisir: choisir, postes: postes, exerce: exerce, trace: trace, nom: nom,
    authentifie: authentifie, mode: mode, mention: mention, attribution: attribution };
})();
