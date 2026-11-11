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
 * D'autres gestes de choix écrivaient leur objet sans décision. Ils passent
 * désormais par ici : écarter une piste depuis sa route ou une proposition de
 * big idea, écarter un concept de la réserve d'une marque, accepter ou
 * retourner un brief, écarter une case de la composition d'une campagne et
 * déclarer l'écart d'un projet à la référence commune. Leur forme suit celle
 * des huit premiers, avec `acteur`. Une décision se rattache donc à un projet,
 * à une campagne ou à une marque ; `projet` n'est plus exigé seul :
 *
 *   projet       tous les gestes sur un dossier
 *   campagne     case de composition écartée (sans projet), écart à la
 *                référence commune (avec le projet qui s'écarte)
 *   marque       concept écarté de la réserve (sans projet)
 *
 * Une déviation s'écarte d'une décision ou du plan. Elle le dit (`ecart`),
 * porte un motif et déclare sa portée — livrable, projet ou campagne —, qui
 * doit être le niveau de l'objet visé, relu dans le dépôt :
 *
 *   ecart        { de, ref } : ce dont on s'écarte, et sa référence
 *   portee       livrable, projet ou campagne pour une déviation ; une
 *                validation garde « document » ou « travail », la référence
 *                de campagne « campagne » : ce ne sont pas des déviations
 *
 * Ce que ce module ne fait pas. Il n'authentifie personne : `qui` reste le
 * poste titulaire de l'installation, `acteur` le choix fait sur le poste,
 * gardé dans le sessionStorage de l'onglet (acteur.js). Aucune identité
 * authentifiée n'atteint La Barre : servir.mjs n'en a pas, l'hôte qui la sert
 * derrière La Fusée authentifie la session sans la transmettre, et la base
 * s'écrit d'un bloc. Le README dit ce qui manque.
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

  /* Une décision se rattache à au moins un de ces objets du dépôt. Le projet
   * reste le rattachement ordinaire : c'est lui que nomme le message. */
  var RATTACHEMENTS = ["projet", "campagne", "marque"];

  /* La portée d'une déviation, dans le vocabulaire des objets du dépôt. */
  var PORTEES = ["livrable", "projet", "campagne"];

  /* Ce dont une déviation peut s'écarter, et ce qu'elle doit alors nommer. */
  var ECARTS = {
    "reference-campagne": { quoi: "la référence commune", rattache: "campagne" },
    composition: { quoi: "la composition de l'occasion", rattache: "campagne" },
    recevabilite: { quoi: "la recevabilité du brief", rattache: "projet" },
  };

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

  function nomme(v) { return v !== undefined && v !== null; }

  /* Ce qui manque au rattachement : un rattachement nommé doit être lisible,
   * et il en faut au moins un. */
  function rattachementManquant(d) {
    var illisibles = RATTACHEMENTS.filter(function (k) { return nomme(d[k]) && !texte(d[k]); });
    if (illisibles.length) return illisibles;
    return RATTACHEMENTS.some(function (k) { return texte(d[k]); }) ? [] : ["projet (ou campagne, ou marque)"];
  }

  /* Le niveau de l'objet visé, relu dans le dépôt : un livrable de son
   * projet, le projet lui-même ou ce qu'il porte, ou la campagne. */
  function niveau(d) {
    if (texte(d.projet)) {
      var p = DEPOT.trouve("projets", d.projet);
      if (!p) throw refus("Le projet visé est introuvable : " + d.projet + ".");
      if (texte(d.campagne) && p.campagneId !== d.campagne) {
        throw refus("Le projet " + d.projet + " n'appartient pas à la campagne " + d.campagne + ".");
      }
      var livrable = (p.livrables || []).some(function (l) { return l && l.id === d.objet; });
      return livrable ? "livrable" : "projet";
    }
    if (texte(d.campagne)) {
      if (!DEPOT.trouve("campagnes", d.campagne)) throw refus("La campagne visée est introuvable : " + d.campagne + ".");
      return "campagne";
    }
    return null;
  }

  /* Une déviation nomme ce dont elle s'écarte, le motive et déclare sa
   * portée. La portée est le niveau de l'objet visé : une déviation sur une
   * piste ne s'étend pas à la campagne — elle deviendrait une référence —, et
   * une déviation sur un livrable ne vaut pas pour tout son projet. */
  function verifierDeviation(d) {
    var e = d.ecart;
    if (!e || typeof e !== "object" || Array.isArray(e) || !texte(e.de)) {
      throw refus("Une déviation nomme ce dont elle s'écarte.");
    }
    var def = ECARTS[e.de];
    if (!def) throw refus("Écart inconnu : « " + e.de + " ». Une déviation s'écarte de " + Object.keys(ECARTS).join(", ") + ".");
    if (nomme(e.ref) && !texte(e.ref)) throw refus("La référence de l'écart est illisible.");
    if (!texte(d.motif)) throw refus("Une déviation exige un motif écrit : s'écarter sans dire pourquoi, c'est s'écarter par goût.");
    if (!nomme(d.portee) || (typeof d.portee === "string" && !d.portee.trim())) {
      throw refus("Une déviation déclare sa portée : " + PORTEES.join(", ").replace(/, ([^,]*)$/, " ou $1") + ".");
    }
    if (PORTEES.indexOf(d.portee) === -1) {
      throw refus("Portée inconnue : « " + d.portee + " ». Une déviation porte sur un livrable, un projet ou une campagne.");
    }
    if (!texte(d[def.rattache])) {
      throw refus("Un écart à " + def.quoi + " nomme sa " + def.rattache + ".");
    }
    if (e.de === "reference-campagne") {
      var r = texte(e.ref) ? DEPOT.trouve("decisions", e.ref) : null;
      if (!r || r.type !== "reference-campagne" || r.campagne !== d.campagne) {
        throw refus("Cet écart doit s'adosser à la décision de référence commune de la campagne " + d.campagne + ".");
      }
    }
    var n = niveau(d);
    if (d.portee !== n) {
      throw refus("La portée « " + d.portee + " » ne correspond pas à l'objet visé, qui relève " + (n ? "du niveau « " + n + " »" : "d'aucun livrable, projet ou campagne") + ".");
    }
  }

  function verifier(d) {
    if (!d || typeof d !== "object" || Array.isArray(d)) throw refus("Une décision est un objet.");
    /* Dans l'ordre de la forme : objet, type, rattachement, qui. */
    var manque = ["objet", "type"].filter(function (k) { return !texte(d[k]); })
      .concat(rattachementManquant(d), texte(d.qui) ? [] : ["qui"]);
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
    if (d.ecart !== undefined) verifierDeviation(d);
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

  /* L'attribution locale du geste, telle que la posent les écrivains récents.
   * Ce n'est pas une identité authentifiée : voir l'en-tête. */
  function acteur() { return window.ACTEUR ? ACTEUR.trace() : null; }

  /* Un écran rend le refus à la personne, et laisse passer le reste. */
  function estRefus(e) { return !!e && e.name === "DecisionRefusee"; }

  return { VERDICTS: VERDICTS.slice(), PORTEES: PORTEES.slice(), identifiant: identifiant, verifier: verifier,
    construire: construire, ajouter: ajouter, poser: poser, acteur: acteur, estRefus: estRefus };
})();
