/* decision.js — la fabrique des décisions, et le seul chemin vers le dépôt.
 *
 * Huit gestes rendent une décision : la big idea retenue, la référence d'une
 * campagne, le verdict sur un document, l'idée tranchée à l'atelier, la piste
 * retenue (deux écrans), le livrable jugé, la pièce jugée en revue. Chacun
 * écrivait son objet et le posait par DEPOT.ajoute. La forme était commune par
 * habitude, le verdict n'était vérifié nulle part, et l'identifiant était tiré
 * au hasard sans regarder s'il existait déjà.
 *
 * Ici, une décision se construit, se vérifie, reçoit un identifiant unique
 * entre postes et rejoint le dépôt. Rien d'autre n'écrit dans `decisions` :
 * l'import d'une base y passe aussi (`admettre`), et le rapprochement de deux
 * bases (`departager`).
 *
 * La forme stockée ne change pas. Ce module ne renomme, ne réordonne et ne
 * convertit aucun champ : il recopie ceux du geste, dans l'ordre du geste. Le
 * bilan, la jurisprudence et les exports lisent cette forme ; c'est aussi
 * celle que Radar lit (SHK-0005, sens 1). Seul un identifiant déjà pris est
 * changé, et la décision le dit (`renommage`).
 *
 *   objet, type, projet, verdict, motif, quand, qui, titre   tous les gestes
 *   acteur, version, portee      verdict sur un document, référence de campagne
 *   campagne, contenuPiste, revisionSource, remplace         référence de campagne
 *   id                           tiré ici, après les champs du geste, sauf
 *                                quand le geste le demande d'avance
 *   cree_le                      posé par DEPOT.ajoute
 *   renommage                    { de, le, raison } : posé ici seulement quand
 *                                l'identifiant était déjà pris (voir plus bas)
 *
 * D'autres gestes de choix écrivaient leur objet sans décision. Ils passent
 * désormais par ici : écarter une piste depuis sa route ou une proposition de
 * big idea, écarter un concept de la réserve d'une marque, accepter ou
 * retourner un brief, écarter une case de la composition d'une campagne,
 * déclarer l'écart d'un projet à la référence commune, trancher une
 * adaptation hors de l'écart déclaré de son marché — corriger l'écart déclaré
 * (`ecart-marche`, une déviation de portée projet) ou corriger l'adaptation
 * (`hors-ecart`, un retour motivé sur le livrable) —, et écarter un écart du
 * relevé (`ecart`, verdict « hors », motif exigé) ou le reprendre (`ecart`,
 * verdict « approuve », `remplace` nommant la décision qui l'avait écarté ;
 * ecarts.js). Leur forme suit celle des huit premiers, avec `acteur`. Clore
 * le bilan d'une campagne en est un aussi : la décision `bilan-campagne`
 * désigne la version arrêtée (`objet`, l'identité du bilan ; `version` ;
 * `empreinte`). Une décision se rattache donc à un projet, à une campagne ou
 * à une marque ; `projet` n'est plus exigé seul :
 *
 *   projet       tous les gestes sur un dossier
 *   campagne     case de composition écartée (sans projet), écart à la
 *                référence commune (avec le projet qui s'écarte), bilan de
 *                campagne arrêté (sans projet)
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
 * poste titulaire de l'installation, `acteur` l'acteur du poste (acteur.js).
 * Servie derrière La Fusée, `acteur` est la personne connectée que La Fusée
 * déclare, et c'est La Fusée qui atteste : à l'enregistrement de la base, elle
 * pose sur chaque décision nouvelle le champ `attestation` (identité de la
 * session, date, empreinte du contenu, sceau), que le navigateur ne peut ni
 * forger, ni modifier, ni effacer. Ce module ne l'écrit jamais. Seule, sans La
 * Fusée, La Barre garde l'acteur déclaré sur le poste.
 * Il ne transmet rien à Radar lui-même. Depuis l'arbitrage 5.5 (11 novembre
 * 2026), Radar vient lire les décisions sur la route /radar/decisions de
 * servir.mjs, derrière un jeton machine, réduites aux champs qui les datent
 * et les attribuent : ni contenuPiste, ni attestation.
 *
 * L'identifiant, entre postes. Radar reconnaît une décision à l'instance La
 * Barre et à son identifiant ; plusieurs postes écrivent dans la même base
 * sans voir ce que les autres tirent. L'identifiant porte donc le code du
 * poste qui l'a tiré et douze caractères au hasard (DEC-k3f9-0a1b2c3d4e5f) ;
 * les anciens (DEC- et six caractères) restent tels quels. Si deux décisions
 * se rencontrent malgré tout sous le même identifiant, rien ne se perd en
 * silence :
 *
 *   rapprochement  la décision de ce poste est renommée (`departager`) ;
 *                  celle de la base de référence garde le sien
 *   import         une base importée passe par ici (`admettre`) : mêmes
 *                  gardes que le geste, même forme, aucune décision du
 *                  registre remplacée ni retirée
 *   écriture       servir.mjs refuse une base qui ferait porter un même
 *                  identifiant à deux décisions
 *
 * Un renommage se trace dans la décision (`renommage`) et dans le journal.
 * Une décision attestée, ou citée par une version de bilan arrêtée, ne se
 * renomme jamais : son sceau ou son empreinte ne tiendrait plus. Elle reste un
 * conflit à trancher, ou l'import est refusé.
 */

window.DECISION = (function () {
  /* Les quatre verdicts. L'écran les lit dans MAISON.verdicts, avec leurs
   * noms et leurs couleurs ; ici, c'est le contrat de la forme stockée. Un
   * test vérifie que les deux listes disent la même chose. */
  var VERDICTS = ["approuve", "reserve", "retour", "hors"];

  /* Le préfixe que DEPOT.ajoute donnait déjà : « decisions » → DEC. */
  var PREFIXE = "DEC";

  /* DEC, le code du poste, douze caractères : DEC-k3f9-0a1b2c3d4e5f. Le code
   * est tiré une fois et gardé dans ce navigateur ; les douze caractères
   * (36¹², environ 4,7 × 10¹⁸) le sont à chaque décision. Deux postes ne se
   * rencontrent que si leurs codes et leurs douze caractères tombent
   * ensemble. Les identifiants de l'ancienne forme, DEC et six caractères,
   * ne sont jamais réécrits : c'est sous eux que Radar les a reçus. */
  var CODE_POSTE = 4, ALEA = 12;
  var FORME = /^DEC-[0-9a-z]{4}-[0-9a-z]{12}$/;
  var CLE_POSTE = "la-barre-poste";

  /* Au-delà de ce nombre de tirages pris, quelque chose d'autre est cassé —
   * le hasard ou la base — et on refuse plutôt que d'écraser. */
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
    /* L'écart déclaré au cadrage pour un marché du projet, corrigé en revue
     * parce qu'une adaptation en sortait (ecarts-marche.js). */
    "ecart-marche": { quoi: "l'écart déclaré du marché", rattache: "projet" },
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

  /* Le code de ce poste : lu dans ce navigateur, sinon tiré une fois et
   * gardé. Deux onglets du même navigateur partagent le code ; leurs douze
   * caractères les séparent. La démonstration n'écrit rien dans le
   * navigateur : son code vit le temps de la page. */
  var codePoste = null;
  function demonstration() {
    return !!(window.DEPOT && typeof DEPOT.estDemonstration === "function" && DEPOT.estDemonstration());
  }
  function poste() {
    if (codePoste) return codePoste;
    var demo = demonstration(), lu = null;
    if (!demo) { try { lu = window.localStorage.getItem(CLE_POSTE); } catch (e) { lu = null; } }
    if (typeof lu === "string" && /^[0-9a-z]{4}$/.test(lu)) return (codePoste = lu);
    codePoste = O.aleatoire(CODE_POSTE);
    if (!demo) { try { window.localStorage.setItem(CLE_POSTE, codePoste); } catch (e) { /* gardé en mémoire */ } }
    return codePoste;
  }

  function tirer() { return PREFIXE + "-" + poste() + "-" + O.aleatoire(ALEA); }

  /* Un identifiant que la base locale ne porte pas encore — ni aucun de ceux
   * de `pris`, quand on départage deux bases. */
  function identifiant(pris) {
    for (var i = 0; i < TIRAGES; i++) {
      var id = tirer();
      if (!existe(id) && !(pris && pris.has(id))) return id;
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
   * une déviation sur un livrable ne vaut pas pour tout son projet.
   *
   * Deux temps. Ce que la déviation déclare d'elle-même se vérifie toujours ;
   * ce qu'elle affirme du dépôt — la référence existe, la portée est le
   * niveau de l'objet — se relit au moment du geste, dans la base où il est
   * fait. Une décision importée a été relue quand elle a été prise : le
   * livrable qu'elle visait peut avoir disparu depuis, sans qu'elle soit
   * fausse. */
  function formeDeviation(d) {
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
  }

  function relireDeviation(d) {
    var e = d.ecart;
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

  /* Ce que la décision dit d'elle-même : la garde de tout écrivain, import
   * compris. */
  function verifierForme(d) {
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
    if (d.ecart !== undefined) formeDeviation(d);
    return d;
  }

  /* La garde d'un geste : la forme, puis ce qu'une déviation affirme du dépôt. */
  function verifier(d) {
    verifierForme(d);
    if (d.ecart !== undefined) relireDeviation(d);
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

  /* L'acteur du geste, tel que la posent les écrivains récents : la personne
   * connectée derrière La Fusée, sinon le choix du poste. La preuve de
   * l'identité est l'attestation que La Fusée pose à l'enregistrement. */
  function acteur() { return window.ACTEUR ? ACTEUR.trace() : null; }

  /* Un écran rend le refus à la personne, et laisse passer le reste. */
  function estRefus(e) { return !!e && e.name === "DecisionRefusee"; }

  /* ————— Deux décisions sous un même identifiant —————
   *
   * Le contenu d'une décision, sans l'attestation que La Fusée y pose et sans
   * dépendre de l'ordre des clés : deux copies d'une même décision se
   * reconnaissent, deux décisions différentes non. */
  function objet(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function canonique(v) {
    if (Array.isArray(v)) return "[" + v.map(function (x) { return x === undefined ? "null" : canonique(x); }).join(",") + "]";
    if (objet(v)) {
      return "{" + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort()
        .map(function (k) { return JSON.stringify(k) + ":" + canonique(v[k]); }).join(",") + "}";
    }
    return JSON.stringify(v);
  }
  function contenu(d) {
    if (!objet(d)) return canonique(d);
    var sans = {};
    Object.keys(d).forEach(function (k) { if (k !== "attestation") sans[k] = d[k]; });
    return canonique(sans);
  }
  function decisionsDe(b) { return b && Array.isArray(b.decisions) ? b.decisions : []; }
  /* identifiant → contenus des décisions qui le portent */
  function parId(b) {
    var m = new Map();
    decisionsDe(b).forEach(function (d) {
      if (!objet(d) || !texte(d.id)) return;
      if (!m.has(d.id)) m.set(d.id, []);
      m.get(d.id).push(contenu(d));
    });
    return m;
  }
  function copie(v) { return JSON.parse(JSON.stringify(v)); }

  /* Les endroits scellés, où une citation ne se réécrit pas : une entrée
   * attestée par La Fusée, dont le sceau couvre le contenu, et les versions
   * arrêtées d'un bilan avec leurs accusés, que leur empreinte couvre. */
  var SCELLES = ["bilanVersions", "bilanRecus"];

  /* Où un identifiant est cité, mot pour mot, sous les entrées données
   * ({ conteneur, cle }). Seules les valeurs comptent : une clé d'objet n'est
   * pas une citation, et un texte qui contient l'identifiant non plus — ainsi
   * `revisionSource`, l'état relu au moment d'une désignation de référence,
   * qui date ce geste et ne se réécrit pas. */
  function citations(entrees, cible) {
    var libres = [], scellees = [];
    function marcher(v, scelle) {
      if (Array.isArray(v)) { v.forEach(function (x, i) { visiter(v, i, scelle); }); return; }
      if (objet(v)) Object.keys(v).forEach(function (k) { visiter(v, k, scelle || SCELLES.indexOf(k) !== -1); });
    }
    function visiter(conteneur, cle, scelle) {
      var x = conteneur[cle];
      if (x === cible) { (scelle ? scellees : libres).push({ conteneur: conteneur, cle: cle }); return; }
      if (x && typeof x === "object") marcher(x, scelle || (objet(x) && x.attestation != null));
    }
    entrees.forEach(function (e) { visiter(e.conteneur, e.cle, SCELLES.indexOf(e.cle) !== -1); });
    return { libres: libres, scellees: scellees };
  }
  function entreesDe(b, sauf) {
    return Object.keys(b).filter(function (k) { return k !== sauf; }).map(function (k) { return { conteneur: b, cle: k }; });
  }

  var RAISONS = {
    base: "identifiant déjà pris dans la base de référence par une autre décision",
    registre: "identifiant déjà pris au registre par une autre décision",
    fichier: "identifiant pris deux fois dans le fichier",
    absent: "sans identifiant",
  };
  var SCELLEE = "citée par une version de bilan arrêtée ou par une entrée attestée : la réécrire briserait son empreinte";

  /* Départager deux bases, avant de les rapprocher. `ici` est la base de ce
   * poste, `distant` celle qu'on vient de relire, `base` la dernière que ce
   * poste avait reçue. Une décision d'ici absente de `base`, dont
   * l'identifiant est pris là-bas par une autre décision, n'est pas une
   * modification concurrente : ce sont deux décisions. Celle de là-bas garde
   * son identifiant — elle est déjà dans la base commune, Radar a pu la lire.
   * Celle d'ici en reçoit un neuf, libre des trois côtés ; ce qui la cite ici
   * la suit, et elle garde la trace de l'ancien. Ce qui ne peut pas être
   * renommé est rendu dans `bloquees`, et reste un conflit à trancher.
   *
   * `ici` est modifiée sur place : c'est l'état du dépôt, que les écrans
   * ouverts tiennent. Rien n'est tracé ici ; le dépôt écrit le journal. */
  function departager(base, ici, distant) {
    var connues = parId(base), la = parId(distant), ailleurs = parId(ici);
    var renommees = [], bloquees = [], pris = null;
    decisionsDe(ici).forEach(function (d) {
      if (!objet(d) || !texte(d.id) || connues.has(d.id) || !la.has(d.id)) return;
      if (la.get(d.id).indexOf(contenu(d)) !== -1) return; // la même décision, revenue du serveur
      var ancien = d.id;
      if (d.attestation != null) {
        bloquees.push({ id: ancien, raison: "attestée par La Fusée : son sceau couvre son identifiant" }); return;
      }
      if (ailleurs.get(ancien).length > 1) {
        bloquees.push({ id: ancien, raison: "l'identifiant est déjà pris deux fois dans ce poste" }); return;
      }
      var cites = citations(entreesDe(ici), ancien);
      if (cites.scellees.length) { bloquees.push({ id: ancien, raison: SCELLEE }); return; }
      if (!pris) {
        pris = new Set();
        [base, ici, distant].forEach(function (b) { decisionsDe(b).forEach(function (x) { if (objet(x) && texte(x.id)) pris.add(x.id); }); });
      }
      var nouveau = identifiant(pris);
      pris.add(nouveau);
      cites.libres.forEach(function (c) { c.conteneur[c.cle] = nouveau; });
      d.renommage = { de: ancien, le: maintenant(), raison: RAISONS.base };
      renommees.push({ de: ancien, vers: nouveau, titre: texte(d.titre) ? d.titre : d.objet });
    });
    return { renommees: renommees, bloquees: bloquees };
  }

  /* Admettre les décisions d'une base importée dans le registre de `courant`.
   *
   * Importer remplace la base, sauf ce registre : une décision prise ne se
   * retire pas, et Radar la lit peut-être déjà. Chaque décision du fichier
   * passe la garde du geste (verifierForme) et garde sa forme, octet pour
   * octet ; celle que le registre porte déjà, à l'identique, n'est pas
   * ajoutée deux fois. Les autres sont ajoutées après le registre, dans
   * l'ordre du fichier. Un identifiant que le registre porte pour une autre
   * décision, pris deux fois dans le fichier, ou absent, se renomme et se
   * trace ; ce que le fichier citait de la décision renommée la suit, sauf
   * quand la citation est ambiguë (deux décisions du fichier sous le même
   * identifiant).
   *
   * Une seule faute refuse l'import entier, avant toute écriture : une
   * décision qui ne passe pas la garde, une décision attestée qu'il faudrait
   * renommer, une décision citée par une version de bilan arrêtée. `lu.decisions`
   * devient le registre admis. Retourne ce qui a été reçu, ajouté, retrouvé
   * et renommé. */
  function admettre(lu, courant) {
    if (!objet(lu)) throw refus("Une base importée est un objet.");
    var fichier = lu.decisions;
    if (fichier === undefined) fichier = [];
    if (!Array.isArray(fichier)) throw refus("La collection des décisions du fichier est illisible : rien n'est importé.");
    var registre = decisionsDe(courant), auRegistre = parId(courant);
    var compte = new Map();
    fichier.forEach(function (d) { if (objet(d) && texte(d.id)) compte.set(d.id, (compte.get(d.id) || 0) + 1); });
    var rapport = { recues: fichier.length, ajoutees: 0, deja: 0, doublons: 0, renommees: [] };
    var fautes = [], admises = [], prevus = [], vus = new Map();

    fichier.forEach(function (d, n) {
      var nom = "décision n° " + (n + 1) + (objet(d) && texte(d.id) ? " (" + d.id + ")" : "");
      try { verifierForme(d); }
      catch (e) { if (!estRefus(e)) throw e; fautes.push(nom + " : " + e.message); return; }
      var c = contenu(d);
      function renommer(raison, citee) {
        if (d.attestation != null) { fautes.push(nom + " : attestée par La Fusée, elle ne peut pas être renommée (" + raison + ")"); return; }
        prevus.push({ d: d, de: d.id === undefined ? null : d.id, raison: raison, citee: citee, nom: nom });
        admises.push(d);
      }
      if (d.id === undefined) { renommer(RAISONS.absent, false); return; }
      if (auRegistre.has(d.id)) {
        if (auRegistre.get(d.id).indexOf(c) !== -1) { rapport.deja++; return; }
        renommer(RAISONS.registre, compte.get(d.id) === 1); return;
      }
      if (vus.has(d.id)) {
        if (vus.get(d.id).indexOf(c) !== -1) { rapport.doublons++; return; }
        vus.get(d.id).push(c);
        renommer(RAISONS.fichier, false); return;
      }
      vus.set(d.id, [c]);
      admises.push(d);
    });

    /* Ce que le fichier cite d'une décision à renommer : hors du registre
     * courant, que l'import garde tel quel. */
    var entrees = entreesDe(lu, "decisions").concat(admises.map(function (d, i) { return { conteneur: admises, cle: i }; }));
    prevus.forEach(function (p) {
      if (!p.citee) return;
      p.citations = citations(entrees, p.de);
      if (p.citations.scellees.length) fautes.push(p.nom + " : " + SCELLEE + " (" + p.raison + ")");
    });
    if (fautes.length) {
      throw refus("le fichier porte " + fautes.length + " décision(s) que la fabrique refuse, rien n'est importé — "
        + fautes.slice(0, 5).join(" ; ") + (fautes.length > 5 ? " ; et " + (fautes.length - 5) + " autre(s)" : "") + ".");
    }

    var pris = new Set();
    registre.concat(fichier).forEach(function (x) { if (objet(x) && texte(x.id)) pris.add(x.id); });
    prevus.forEach(function (p) {
      var nouveau = identifiant(pris);
      pris.add(nouveau);
      if (p.citee) p.citations.libres.forEach(function (c) { c.conteneur[c.cle] = nouveau; });
      else p.d.id = nouveau;
      p.d.renommage = { de: p.de, le: maintenant(), raison: p.raison };
      rapport.renommees.push({ de: p.de, vers: nouveau, raison: p.raison });
    });
    rapport.ajoutees = admises.length;
    lu.decisions = copie(registre).concat(admises);
    return rapport;
  }

  return { VERDICTS: VERDICTS.slice(), PORTEES: PORTEES.slice(), FORME: FORME, identifiant: identifiant, poste: poste,
    verifier: verifier, verifierForme: verifierForme,
    construire: construire, ajouter: ajouter, poser: poser, acteur: acteur, estRefus: estRefus,
    departager: departager, admettre: admettre };
})();
