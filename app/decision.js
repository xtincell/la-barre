/* decision.js — la fabrique des décisions, et le seul chemin vers le dépôt.
 *
 * Huit gestes rendent une décision : la big idea retenue, la référence d'une
 * campagne, le verdict sur un document, l'idée tranchée à l'atelier, la piste
 * retenue (deux écrans), le livrable jugé, la pièce jugée en revue. Chacun
 * écrivait son objet et le posait par DEPOT.ajoute. La forme était commune par
 * habitude, le verdict n'était vérifié nulle part, et l'identifiant était tiré
 * au hasard sans regarder s'il existait déjà.
 *
 * Ici, une décision se construit, se vérifie, reçoit un identifiant libre dans
 * la base locale et rejoint le dépôt. Rien d'autre n'écrit dans `decisions`.
 *
 * La forme stockée ne change pas. Ce module ne renomme, ne réordonne et ne
 * convertit aucun champ : il recopie ceux du geste, dans l'ordre du geste. Le
 * bilan, la jurisprudence et les exports lisent cette forme ; c'est aussi
 * celle que SHK-0005 propose de transmettre à Radar.
 *
 *   objet, type, projet, verdict, motif, quand, qui, titre   tous les gestes
 *   acteur, version, portee      verdict sur un document, référence de campagne
 *   campagne, contenuPiste, revisionSource, remplace         référence de campagne
 *   id                           tiré ici, après les champs du geste, sauf
 *                                quand le geste le demande d'avance
 *   cree_le                      posé par DEPOT.ajoute
 *
 * Ce que ce module ne fait pas. Il n'authentifie personne : `qui` reste le
 * poste titulaire de l'installation, `acteur` le choix fait sur le poste.
 * Il ne transmet rien à Radar. Ces deux sujets attendent leurs arbitrages.
 * L'unicité vaut pour la base locale : deux postes hors ligne peuvent encore
 * tirer le même identifiant, la réconciliation le voit, ce module non.
 */

window.DECISION = (function () {
  /* Les quatre verdicts. L'écran les lit dans MAISON.verdicts, avec leurs
   * noms et leurs couleurs ; ici, c'est le contrat de la forme stockée. Un
   * test vérifie que les deux listes disent la même chose. */
  var VERDICTS = ["approuve", "reserve", "retour", "hors"];

  /* Le préfixe que DEPOT.ajoute donnait déjà : « decisions » → DEC. */
  var PREFIXE = "DEC";

  /* Six caractères en base 36 : une collision est rare, mais une base vit
   * des années. Au-delà de ce nombre de tirages pris, quelque chose d'autre
   * est cassé — le hasard ou la base — et on refuse plutôt que d'écraser. */
  var TIRAGES = 64;

  var REQUIS = ["objet", "type", "projet", "qui"];

  function refus(message) {
    var e = new Error(message);
    e.name = "DecisionRefusee";
    return e;
  }

  function texte(v) { return typeof v === "string" && v.trim() !== ""; }

  /* Une date telle que toISOString la donne : c'est ce que les huit gestes
   * écrivent, et ce qu'un relevé peut comparer sans deviner le fuseau. */
  function dateIso(v) {
    if (typeof v !== "string") return false;
    var t = new Date(v);
    return !isNaN(t.getTime()) && t.toISOString() === v;
  }

  function maintenant() { return new Date().toISOString(); }

  function existe(id) {
    return DEPOT.liste("decisions").some(function (d) { return d && d.id === id; });
  }

  /* Un identifiant que la base locale ne porte pas encore. */
  function identifiant() {
    for (var i = 0; i < TIRAGES; i++) {
      var id = O.id(PREFIXE);
      if (!existe(id)) return id;
    }
    throw refus("Aucun identifiant de décision libre après " + TIRAGES + " tirages.");
  }

  function verifier(d) {
    if (!d || typeof d !== "object" || Array.isArray(d)) throw refus("Une décision est un objet.");
    var manque = REQUIS.filter(function (k) { return !texte(d[k]); });
    if (manque.length) throw refus("Décision incomplète : " + manque.join(", ") + ".");
    if (VERDICTS.indexOf(d.verdict) === -1) {
      throw refus("Verdict inconnu : « " + d.verdict + " ». Il en existe quatre : " + VERDICTS.join(", ") + ".");
    }
    if (!dateIso(d.quand)) throw refus("La décision n'est pas datée : « " + d.quand + " ».");
    if (d.motif !== null && typeof d.motif !== "string") throw refus("Le motif est un texte, ou rien.");
    /* Les trois verdicts qui ne sont pas un accord exigent un motif écrit :
     * chaque écran le demande déjà, la fabrique ne laisse pas passer l'oubli. */
    if (d.verdict !== "approuve" && !texte(d.motif)) {
      throw refus("Le verdict « " + d.verdict + " » exige un motif écrit.");
    }
    if (d.id !== undefined && !texte(d.id)) throw refus("Identifiant de décision illisible.");
    return d;
  }

  /* Construire : recopier les champs du geste dans leur ordre, dater si le
   * geste ne l'a pas fait, vérifier, puis tirer l'identifiant. La décision
   * construite n'est pas encore dans la base. */
  function construire(champs) {
    if (!champs || typeof champs !== "object" || Array.isArray(champs)) throw refus("Une décision est un objet.");
    var d = {};
    Object.keys(champs).forEach(function (k) { d[k] = champs[k]; });
    if (d.quand === undefined || d.quand === null) d.quand = maintenant();
    verifier(d);
    if (d.id === undefined) d.id = identifiant();
    else if (existe(d.id)) throw refus("Identifiant de décision déjà pris : " + d.id + ".");
    return d;
  }

  /* Ajouter : le seul passage vers la collection. La décision est vérifiée
   * de nouveau — elle a pu être construite plus tôt dans le geste. */
  function ajouter(d) {
    verifier(d);
    if (!texte(d.id)) throw refus("Une décision s'ajoute avec son identifiant.");
    if (existe(d.id)) throw refus("Identifiant de décision déjà pris : " + d.id + ".");
    return DEPOT.ajoute("decisions", d);
  }

  function poser(champs) { return ajouter(construire(champs)); }

  return { VERDICTS: VERDICTS.slice(), identifiant: identifiant, verifier: verifier,
    construire: construire, ajouter: ajouter, poser: poser };
})();
