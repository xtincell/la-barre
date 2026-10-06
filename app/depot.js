/* depot.js — la persistance, et rien d'autre.
 *
 * Le fichier servi fait foi. Le navigateur conserve le travail non reçu et
 * rapproche les modifications concurrentes. Sans serveur, l'import/export
 * reste le mode de sauvegarde manuel.
 *
 * C'est aussi le pont vers Matanga People le jour de l'intégration : le même
 * JSON, lu par autre chose.
 */

window.DEPOT = (function () {
  var CLE = "la-barre";
  /* 2 — septembre 2026. Deux changements sur le livrable et un au dépôt :
   *   l.axes → l.points   les dix points de recevabilité ; « axe » est rendu
   *                       à l'axe créatif, qui est autre chose
   *   p.axesDA → champsDA les champs de direction artistique d'un KV
   *   people              le relevé de Matanga People
   * Sans incrément, le cache du navigateur ne relit jamais le fichier : la
   * collection neuve serait sur le disque et invisible à l'écran. */
  var VERSION_SCHEMA = 5;

  var etat = vide();
  var ancienCache = null;
  var ecouteurs = [];

  function vide() {
    return {
      schema: VERSION_SCHEMA,
      maison: MAISON.nom,
      machine: "",
      enregistre_le: null,
      /* Une collection absente d'ici est silencieusement perdue au chargement :
       * le fichier peut la porter, l'état ne la verra jamais. Elle est donc la
       * liste de ce que le produit connaît, et rien d'autre.
       *
       * contacts, feedbacks et sku y figuraient jusqu'à sept fois — résidu
       * d'une reconstruction. Sans effet sur le résultat, mais on ne lit pas
       * une liste qui bégaie. */
      personnes: [],
      clients: [],
      marques: [],
      marches: [],
      supports: [],
      contacts: [],
      feedbacks: [],
      sku: [],
      /* Le relevé de Matanga People : ce qui existe là-bas, et dont on veut
       * savoir s'il existe ici. Il se relève, il ne se saisit pas. */
      people: [],
      /* Le relevé du Radar Matanga : les briefs entrés au registre de l'agence.
       * Même nature que People — relevé, jamais saisi — et même usage : dire
       * pour chacun s'il y a ici de quoi suivre ce qu'il a produit. La date du
       * relevé vit à côté, parce qu'un registre sans date ment sur sa
       * fraîcheur. */
      radar: [],
      radar_releve_le: null,
      /* L'étage entre la marque et le projet. Une marque est toujours en
       * campagne : un cycle qui tourne, et des temps forts. */
      campagnes: [],
      /* Ce qui n'a pas encore de place : une ligne d'index sans marque au
       * dépôt, un fichier trouvé hors de tout dossier. On ne le jette pas —
       * on le range ici, avec sa source, jusqu'à ce qu'il trouve sa place. */
      inclassables: [],
      /* Matanga, UPgraders, Friends Studio, le nom propre : sous quelle structure
       * chaque opération a été faite. Et les pièces de facturation retrouvées —
       * référence, date, client, objet ; jamais de montant ni de coordonnée. */
      structures: [],
      factures: [],
      critiques: [],
      engagementsTenus: [],
      criteresAjoutes: {},
      assets: [],
      projets: [],
      attentes: [],
      blocages: [],
      captures: [],
      decisions: [],
      lectures: [],
      journal: [],
    };
  }

  /* ————— Lecture et écriture ————— */

  function tout() { return etat; }

  function liste(type) { return etat[type] || []; }

  function trouve(type, id) {
    var r = null;
    liste(type).forEach(function (x) { if (x.id === id) r = x; });
    return r;
  }

  function ajoute(type, objet) {
    if (!objet.id) objet.id = O.id(type.slice(0, 3).toUpperCase());
    objet.cree_le = objet.cree_le || new Date().toISOString();
    etat[type].push(objet);
    tracer("création", type, objet.id, objet.nom || objet.quoi || objet.titre || "");
    enregistrer();
    return objet;
  }

  function modifie(type, id, champs, quoi) {
    var o = trouve(type, id);
    if (!o) return null;
    Object.keys(champs).forEach(function (c) { o[c] = champs[c]; });
    tracer("modification", type, id, quoi || Object.keys(champs).join(", "));
    enregistrer();
    return o;
  }

  function retire(type, id) {
    etat[type] = liste(type).filter(function (x) { return x.id !== id; });
    tracer("suppression", type, id, "");
    enregistrer();
  }

  /* ————— Le journal — dans le lot 1, pas plus tard ————— */

  /* Le journal est un log d'outil, sauf pour ce qui touche une marque — et là
   * c'est un dossier de vie. Deux différences, et elles tiennent en trois
   * lignes :
   *
   *   `marques` nomme les marques concernées. Sans lui, les écritures de socle
   *   partaient avec un id nul et l'histoire d'une marque n'était pas
   *   retrouvable — elle était tracée et illisible, ce qui est pire que rien.
   *
   *   Ce qui porte une marque ne se tronque pas. Le reste continue de tourner
   *   à 1 500 entrées : un dossier médical qui efface ses vieilles pages n'est
   *   pas un dossier médical. */
  function tracer(action, type, id, detail, marques) {
    etat.journal.push({
      quand: new Date().toISOString(),
      qui: MAISON.titulaire,
      action: action,
      type: type,
      id: id,
      detail: String(detail || "").slice(0, 120),
      marques: marques && marques.length ? marques.slice() : undefined,
    });
    if (etat.journal.length > 2000) {
      var vivants = [], anciens = [];
      etat.journal.forEach(function (e) {
        (e.marques && e.marques.length ? vivants : anciens).push(e); });
      etat.journal = vivants.concat(anciens.slice(-(1500 - Math.min(vivants.length, 1200))));
      etat.journal.sort(function (a, b) { return (a.quand || "") < (b.quand || "") ? -1 : 1; });
    }
  }

  function journal(filtre) {
    var j = etat.journal.slice().reverse();
    if (!filtre) return j;
    return j.filter(function (l) { return l.id === filtre || l.type === filtre; });
  }

  /* ————— Trace de lecture ————— */

  function lu(type, id) {
    etat.lectures.push({ type: type, id: id, qui: MAISON.titulaire, quand: new Date().toISOString() });
    if (etat.lectures.length > 3000) etat.lectures = etat.lectures.slice(-2000);
    enregistrerDoucement();
  }

  function lectures(id) {
    return etat.lectures.filter(function (l) { return l.id === id; });
  }

  /* ————— Où le dépôt vit vraiment —————
   *
   * Il vit dans un FICHIER, servi par l'application. Deux navigateurs sur la
   * même machine lisaient chacun leur localStorage et montraient deux dossiers
   * différents pour la même adresse ; le stockage du navigateur n'est donc plus
   * la source de vérité, seulement un filet.
   *
   * Ordre des choses : on écrit sur disque ; le cache navigateur suit, pour le
   * cas où le serveur n'est pas là — ouverture par double-clic, hébergement
   * statique. Et si le disque refuse, on le DIT : un échec d'écriture
   * silencieux, c'est une séance de travail perdue sans le savoir. */

  var minuteur = null;
  var minuteurDisque = null;
  var surDisque = null;      /* null = pas encore su · true/false = tranché */
  var disqueKO = false;
  var fichier = null;        /* le nom du dépôt servi, une fois connu */
  var referenceLue = false;  /* le fichier a-t-il été lu au moins une fois ici */

  /* Le jeu de démonstration s'affiche pendant que le vrai dépôt arrive. Il ne
   * doit jamais prendre sa place sur le disque : il l'a fait une fois, et un
   * dossier de 161 livrables a été remplacé par l'exemple. Deux verrous, et ils
   * sont volontairement stricts — on écrase un fichier, on ne le récupère pas.
   *
   *   1. l'exemple n'écrit pas ;
   *   2. rien n'écrit tant qu'on n'a pas lu le fichier au moins une fois.
   *
   * Sans le second, un démarrage à moitié fait — dépôt local périmé, référence
   * pas encore arrivée — pousse son état sur un fichier plus récent que lui. */
  function peutEcrire() {
    if (!fichier || location.protocol === "file:" || !window.fetch) return "pas de fichier";
    if (etat.exemple === true) return "l'exemple ne s'écrit pas sur la base de référence";
    if (!referenceLue) return "le fichier n'a pas encore été lu dans cette session";
    return null;
  }

  /* La version de la base telle que ce navigateur l'a lue ou écrite en
   * dernier. Elle part avec chaque écriture : le serveur refuse si le fichier a
   * changé depuis. */
  var baseServeur = null, revisionServeur = null, baseContenu = null;
  var conflitEnCours = null, sauvegardeEnCours = false, suiteDemandee = false;
  var rappels = [], reprisesAutres = [], reprisesAdoptees = [], repriseKO = false;

  function avertirReprise(e) {
    if (!repriseKO && window.AVIS) AVIS.grave("La copie de reprise n’a pas pu être conservée dans ce navigateur. Gardez cet onglet ouvert jusqu’à réception de la sauvegarde.");
    repriseKO = true;
  }
  function garderReprise() {
    if (!fichier || !baseContenu) return Promise.resolve();
    return REPRISES.garder(fichier, { base: baseContenu, etat: etat, revision: revisionServeur, adoptees: reprisesAdoptees })
      .catch(avertirReprise);
  }
  function poserBase(lu, version) {
    baseContenu = RECONCILIATION.copie(lu);
    baseServeur = lu.enregistre_le || null;
    revisionServeur = version || null;
  }
  function poserEtat(lu) {
    if (!lu || typeof lu !== "object" || Array.isArray(lu) || lu.schema > VERSION_SCHEMA) throw new Error("Version de base incompatible");
    var nouveau = vide();
    Object.keys(lu).forEach(function (k) {
      Object.defineProperty(nouveau, k, { value: RECONCILIATION.copie(lu[k]), writable: true, configurable: true, enumerable: true });
    });
    migrer(nouveau); if (fichier) nouveau.reference = fichier;
    etat = RECONCILIATION.actualiser(etat, nouveau);
    ecrire();
  }
  function notifier() { ecouteurs.forEach(function (f) { f(); }); }
  function conflits() {
    return conflitEnCours ? RECONCILIATION.reconcilier(conflitEnCours.base, etat, conflitEnCours.distant).conflits : [];
  }
  function rapprocher(lu, version) {
    var resultat = RECONCILIATION.reconcilier(baseContenu, etat, lu);
    if (resultat.conflits.length) {
      conflitEnCours = { base: RECONCILIATION.copie(baseContenu), distant: lu, revision: version };
      surDisque = false;
      garderReprise();
      if (window.AVIS) AVIS.grave("Deux valeurs différentes ont été proposées pour " + resultat.conflits.length
        + " champ(s). Vos gestes sont conservés. Ouvrez Réglages → Rapprocher les modifications.");
      notifier(); return false;
    }
    poserBase(lu, version); poserEtat(resultat.valeur);
    conflitEnCours = null; surDisque = false;
    garderReprise(); suiteDemandee = true; notifier(); return true;
  }
  function resoudre(choix) {
    if (!conflitEnCours) return false;
    var r = RECONCILIATION.reconcilier(conflitEnCours.base, etat, conflitEnCours.distant, choix);
    if (r.conflits.length) return false;
    poserBase(conflitEnCours.distant, conflitEnCours.revision);
    poserEtat(r.valeur); conflitEnCours = null;
    tracer("rapprochement", "depot", fichier, "Choix explicites des versions à conserver");
    enregistrer(); return true;
  }
  function lireServeur() {
    return fetch("depots/" + fichier, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("La base ne peut pas être relue");
      return r.json().then(function (data) { return { valeur: data, revision: r.headers.get("ETag") }; });
    });
  }
  function finirRappels(ok, pourquoi) {
    var a = rappels; rappels = [];
    a.forEach(function (f) { f(ok, pourquoi); });
  }
  function ecrireSurDisque(quand) {
    if (quand) rappels.push(quand);
    var refus = peutEcrire();
    if (refus || conflitEnCours) {
      surDisque = false; finirRappels(false, refus || "conflit à rapprocher"); return;
    }
    if (sauvegardeEnCours) { suiteDemandee = true; return; }
    sauvegardeEnCours = true; suiteDemandee = false;
    var envoye = RECONCILIATION.copie(etat);
    var texte = JSON.stringify(envoye, null, 1);
    var entetes = { "Content-Type": "application/json" };
    if (revisionServeur) entetes["If-Match"] = revisionServeur;
    if (baseServeur) entetes["X-Base"] = baseServeur;
    garderReprise().then(function () {
      return fetch("depots/" + fichier, { method: "PUT", headers: entetes, body: texte });
    }).then(function (r) {
      if (r.status === 409 || r.status === 428) {
        return r.json().then(function (erreur) {
          if (erreur.code === "BASE_ILLISIBLE") throw new Error(erreur.quoi);
          return lireServeur().then(function (lu) {
            rapprocher(lu.valeur, lu.revision); return null;
          });
        });
      }
      if (!r.ok) throw new Error("La sauvegarde n’a pas été reçue (" + r.status + ")");
      return r.json();
    }).then(function (j) {
      if (!j) { if (conflitEnCours) finirRappels(false, "conflit à rapprocher"); return; }
      if (!j.ok) throw new Error("La sauvegarde n’a pas été reçue");
      // Le reçu porte le document envoyé, jamais celui qui a pu changer
      // pendant le réseau. Le geste suivant utilise cette nouvelle base.
      poserBase(envoye, j.revision);
      baseServeur = j.enregistre_le || envoye.enregistre_le || null;
      surDisque = JSON.stringify(etat) === JSON.stringify(envoye);
      if (surDisque) {
        var recues = reprisesAdoptees; reprisesAdoptees = [];
        Promise.all(recues.map(function (r) { return REPRISES.accuser(r); }))
          .then(function () { return REPRISES.lister(fichier); })
          .then(function (rows) { reprisesAutres = rows; notifier(); }).catch(avertirReprise);
        REPRISES.retirer(fichier).catch(avertirReprise);
        finirRappels(true);
      } else { suiteDemandee = true; garderReprise(); }
      if (disqueKO && window.AVIS) AVIS.fait("La sauvegarde fonctionne à nouveau.");
      disqueKO = false; notifier();
    }).catch(function (e) {
      surDisque = false; suiteDemandee = false;
      if (!disqueKO && window.AVIS) AVIS.grave((e && e.message ? e.message + ". " : "")
        + "Vos gestes restent dans ce navigateur. Réessayez depuis les réglages.");
      disqueKO = true; garderReprise(); finirRappels(false, e && e.message); notifier();
    }).finally(function () {
      sauvegardeEnCours = false;
      if (suiteDemandee && !conflitEnCours) planifierDisque();
    });
  }

  function chargerDepuisServeur(lu, version) {
    // Une ancienne version ne connaissait pas le reçu associé à son cache.
    // On le conserve séparément avant de le remplacer, sans le pousser d'office.
    var protection = ancienCache && JSON.stringify(ancienCache) !== JSON.stringify(lu)
      ? REPRISES.archiverAncien(fichier, ancienCache) : Promise.resolve();
    return protection.catch(function (e) { avertirReprise(e); throw e; }).then(function () {
      ancienCache = null;
      return REPRISES.lire(fichier).catch(function () { return null; });
    }).then(function (reprise) {
      if (reprise && reprise.base && reprise.etat) {
        reprisesAdoptees = reprise.adoptees || [];
        poserBase(reprise.base, reprise.revision); poserEtat(reprise.etat);
        rapprocher(lu, version);
        if (!conflitEnCours) planifierDisque();
      } else {
        poserBase(lu, version); poserEtat(lu); surDisque = true;
      }
      referenceLue = true;
      return REPRISES.lister(fichier).then(function (rows) { reprisesAutres = rows; }).catch(function () {});
    });
  }
  function reprendre(cle) {
    if (surDisque !== true || conflitEnCours) {
      if (window.AVIS) AVIS.refus("Recevez d’abord la sauvegarde du travail ouvert avant de reprendre un autre brouillon.");
      return;
    }
    var r = reprisesAutres.find(function (x) { return x.cle === cle; });
    if (!r) return;
    lireServeur().then(function (lu) {
      reprisesAdoptees.push({ cle: r.cle, quand: r.quand });
      poserBase(r.base, r.revision); poserEtat(r.etat);
      rapprocher(lu.valeur, lu.revision); if (!conflitEnCours) planifierDisque();
    }).catch(function (e) { if (window.AVIS) AVIS.grave(e.message); });
  }

  /* On n'écrit pas à chaque frappe : le dépôt fait plusieurs mégaoctets. */
  function planifierDisque() {
    if (minuteurDisque) clearTimeout(minuteurDisque);
    minuteurDisque = setTimeout(function () { ecrireSurDisque(null); }, 900);
  }

  /* Le cache navigateur a une limite, et il ne prévient pas : il refuse
   * l'écriture et rend la main comme si de rien n'était. Un échec silencieux
   * ici, c'est une séance de travail perdue sans qu'on le sache. */
  var ecritureKO = false;

  function ecrire() {
    if (ancienCache && fichier) return false; // Le filet ancien attend sa copie de reprise.
    try {
      window.localStorage.setItem(CLE, JSON.stringify(etat));
      if (baseContenu) window.localStorage.setItem("la-barre-reprise-version", "1");
      if (ecritureKO) {
        ecritureKO = false;
        if (window.AVIS) AVIS.fait("L'enregistrement local refonctionne.");
      }
      return true;
    } catch (e) {
      /* Le cache du navigateur est plein. Ce que ça coûte dépend entièrement de
       * l'endroit où le dépôt vit vraiment : quand il s'écrit dans un fichier,
       * localStorage n'est qu'un filet — le perdre ne perd rien. Crier à la
       * perte dans ce cas, c'est apprendre au titulaire à ignorer les alarmes. */
      if (!ecritureKO) {
        ecritureKO = true;
        if (window.AVIS) {
          if (surDisque === true) {
            AVIS.fait("Le cache du navigateur est plein — sans conséquence : la base "
              + "s'écrit dans " + fichier + ", et c'est lui qui fait foi. Le cache ne "
              + "servait qu'à rouvrir plus vite.");
          } else {
            AVIS.grave("Le cache du navigateur est plein : plus rien ne s'enregistre. "
              + "Aucun fichier de base n'est servie à côté de l'application, donc ce "
              + "cache était le seul endroit. Exporte maintenant (Réglages → Exporter).");
          }
        }
      }
      return false;
    }
  }

  function enregistrer() {
    etat.enregistre_le = new Date().toISOString();
    surDisque = false; garderReprise();
    planifierDisque();   /* la source de vérité */
    ecrire();            /* le filet, pour le double-clic et la coupure */
    ecouteurs.forEach(function (f) { f(); });
  }

  /* Où est la vérité, en ce moment, dans ce navigateur. */
  function stockage() {
    if (location.protocol === "file:") return { cle: "fichier-impossible",
      nom: "ce navigateur seul",
      quoi: "ouvert par double-clic : le navigateur interdit d'écrire dans le fichier. "
        + "Lance le serveur (node servir.mjs) pour que tous les navigateurs partagent la base." };
    if (surDisque === true) return { cle: "disque", nom: fichier,
      quoi: "écrit dans son fichier — tous les navigateurs voient la même chose" };
    if (surDisque === false) return { cle: "navigateur", nom: "ce navigateur seul",
      quoi: "le fichier n'est pas accessible en écriture : ce qui est fait ici n'existe qu'ici" };
    return { cle: "attente", nom: "à confirmer", quoi: "première écriture pas encore faite" };
  }

  function enregistrerDoucement() {
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(ecrire, 400);
  }

  /* Ce que pèse le dépôt, et ce qu'il reste avant le mur. */
  function poids() {
    var o = JSON.stringify(etat).length;
    /* Les navigateurs plafonnent autour de cinq mégaoctets par origine. */
    var plafond = 5 * 1024 * 1024;
    return { octets: o, ko: Math.round(o / 1024), mo: Math.round(o / 1048576 * 10) / 10,
      part: Math.min(100, Math.round((o / plafond) * 100)),
      serre: o > plafond * 0.7, ko_reste: Math.max(0, Math.round((plafond - o) / 1024)),
      echec: ecritureKO,
      /* Un cache plein ne fait perdre quelque chose que s'il était le seul
       * endroit. Avec un fichier servi, c'est une information, pas une alarme. */
      grave: ecritureKO && surDisque !== true,
      surDisque: surDisque === true, fichier: fichier };
  }

  function charger() {
    try {
      var brut = window.localStorage.getItem(CLE);
      if (brut) {
        var lu = JSON.parse(brut);
        /* Un schéma antérieur se migre, il ne se jette pas : le cache peut
         * porter une séance de travail que le fichier n'a pas encore. */
        if (lu && lu.schema <= VERSION_SCHEMA) {
          if (lu.exemple !== true && window.localStorage.getItem("la-barre-reprise-version") !== "1") ancienCache = RECONCILIATION.copie(lu);
          etat = Object.assign(vide(), lu); migrer(etat); return true;
        }
      }
    } catch (e) {}
    return false;
  }

  /* ————— Le dépôt de référence, servi à côté de l'application —————
   *
   * localStorage est propre à un navigateur. Ouvrir la même adresse dans un
   * second navigateur donnait donc un autre contenu — et comme l'exemple
   * d'amorce se posait par défaut, ce second navigateur montrait MT-0020 quand
   * le premier montrait le vrai dossier. Deux vérités pour un même lien.
   *
   * La règle est renversée : s'il existe un dépôt de référence à côté de
   * l'application, il l'emporte sur l'exemple. L'exemple ne sert plus que
   * lorsqu'il n'y a rien d'autre — première installation, ou ouverture par
   * double-clic où le navigateur interdit la lecture de fichiers voisins. */

  /* Même quand le navigateur a déjà un dépôt, il faut savoir dans quel fichier
   * l'écrire — sinon on retomberait sur le stockage navigateur sans le dire. */
  function rattacherAuFichier(apres) {
    referenceDisponible(function (m) {
      /* Se rattacher au fichier ne suffit pas à autoriser l'écriture : il faut
       * l'avoir lu. Un dépôt local qui se rattache sans lire écraserait un
       * fichier que quelqu'un d'autre vient de mettre à jour. */
      if (m) {
        fichier = m.reference;
        if (!etat.reference) etat.reference = m.reference;
        relire(m.reference, function () { if (apres) apres(true); });
        return;
      }
      if (apres) apres(false);
    });
  }

  function referenceDisponible(apres) {
    if (!window.fetch || location.protocol === "file:") { apres(null); return; }
    fetch("depots/manifeste.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) { apres(m && m.reference ? m : null); })
      .catch(function () { apres(null); });
  }

  /* Lire le fichier sans rien écraser : c'est ce qui arme l'écriture, et c'est
   * aussi ce qui permet de dire au titulaire que le fichier a bougé ailleurs. */
  function relire(nom, apres) {
    fichier = nom;
    lireServeur().then(function (lu) {
      // Une relecture dans une session ouverte ne remplace pas les gestes en attente.
      if (baseContenu && surDisque !== true) {
        rapprocher(lu.valeur, lu.revision); if (!conflitEnCours) planifierDisque();
        return;
      }
      return chargerDepuisServeur(lu.valeur, lu.revision);
    }).then(function () { if (apres) apres(true); })
      .catch(function () { if (apres) apres(false); });
  }

  /* `.then(f).catch(g)` attrape aussi ce que jette `f` — donc ce que jette le
   * rendu appelé par le callback. Le chargement passait alors pour un échec,
   * l'appelant reposait l'exemple par-dessus le dépôt qui venait d'arriver, et
   * l'écran montrait MT-0020 sur une installation qui a quatre dossiers.
   * Le verdict se rend une fois, et il ne porte que sur la lecture. */
  function chargerReference(m, apres) {
    var rendu = false;
    function verdict(ok, pourquoi) {
      if (rendu) return; rendu = true;
      if (!ok && pourquoi && window.AVIS) {
        AVIS.refus("La base de référence n'a pas pu être lue : " + pourquoi
          + ". Ce que vous voyez est le jeu de démonstration, pas votre base.");
      }
      if (apres) apres(ok);
    }

    fichier = m.reference;
    lireServeur().then(function (lu) { return chargerDepuisServeur(lu.valeur, lu.revision); })
      .then(function () { verdict(true); })
      .catch(function (e) { verdict(false, e && e.message); });
  }

  /* Ce que ce navigateur détient, et d'où ça vient. Sans cette phrase, une
   * divergence entre deux navigateurs reste invisible jusqu'à ce qu'elle
   * coûte quelque chose. */
  function provenance() {
    if (etat.exemple === true) return { cle: "exemple", nom: "l'exemple d'amorce",
      quoi: "aucune base de référence n'a été trouvé — ce que vous voyez est le jeu de démonstration" };
    if (etat.reference) return { cle: "reference", nom: etat.reference,
      quoi: "chargé depuis la base de référence servi avec l'application" };
    return { cle: "local", nom: "ce navigateur",
      quoi: "modifié ici ; exportez pour que les autres navigateurs le voient" };
  }

  /* ————— Le fichier de référence ————— */

  function exporter() {
    etat.enregistre_le = new Date().toISOString();
    etat.machine = navigator.platform || "";
    var texte = JSON.stringify(etat, null, 2);
    var nom = "la-barre_" + O.jour(new Date()) + "_" + O.jolieHeure(new Date()).replace(":", "h") + ".json";
    var lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([texte], { type: "application/json" }));
    lien.download = nom;
    lien.click();
    URL.revokeObjectURL(lien.href);
    return nom;
  }

  function importer(texte) {
    var lu = JSON.parse(texte);
    if (!lu || typeof lu !== "object") throw new Error("Fichier illisible.");
    /* Un fichier plus ancien s'importe et se migre ; un fichier plus récent
     * ne s'invente pas — on refuse plutôt que de perdre ce qu'on ne sait pas
     * lire. */
    if (lu.schema > VERSION_SCHEMA) {
      throw new Error("Ce fichier vient d'une version plus récente du schéma (" + lu.schema
        + " contre " + VERSION_SCHEMA + ") : cette version de LA BARRE ne sait pas le lire "
        + "sans risquer d'en perdre une partie.");
    }
    etat = Object.assign(vide(), lu);
    migrer(etat);
    enregistrer();
    return etat;
  }

  /* Les dépôts d'avant le modèle à trois niveaux n'ont pas de `niveau` sur
   * leurs livrables. On le déduit une fois, à l'import, plutôt que de le
   * recalculer à chaque lecture. */
  /* La migration monte un dépôt d'une version de schéma à la suivante, sur
   * place et sans rien perdre. Elle est idempotente : la relancer sur un dépôt
   * déjà à jour ne fait rien. */
  /* Le calendrier de la maison, lu sur le nom d'un projet. On ne cherche pas
   * à comprendre : on reconnaît un mot. Ce qui n'est pas reconnu reste sans
   * campagne, et le dit. */
  function occasionDuNom(nom) {
    /* Les tirets se lisent comme des espaces : « Back-To-School » passait à
     * côté de « back to school », et le dossier vivant de la rentrée 2026
     * restait hors de sa campagne. */
    var t = O.normalise(nom || "").replace(/[-_]+/g, " ");
    var table = [
      ["noel", /\bnoel\b|fin d annee|xmas|christmas/],
      ["ramadan", /ramadan|\baid\b|carem[e]? musulman/],
      ["paques", /paques|careme/],
      ["rentree", /back to school|rentree|\bbts\b|cahiers/],
      ["fete", /fete des meres|fete des peres|journee mondiale|saint valentin/],
      ["promo", /promo|destockage|black friday|liquidation|soldes/],
      ["jeu", /jeu concours|jeu-concours|activation|monopoly|tombola|la roue/],
      ["evenement", /seminaire|festival|salon|evenement|cowlab|jpo/],
      ["lancement", /lancement|nouveau look|rebranding|creation de marque|mvp/],
      ["institutionnel", /institutionnel|communique|prise de parole|rapport annuel|plan marketing/],
    ];
    for (var i = 0; i < table.length; i++) if (table[i][1].test(t)) return table[i][0];
    return null;
  }

  function rattacherAuxCampagnes(d) {
    var par = {};
    (d.campagnes || []).forEach(function (c) { if (c.cleMigration) par[c.cleMigration] = c; });

    (d.projets || []).forEach(function (p) {
      if (p.campagneId) return;
      var occ = occasionDuNom(p.nom);
      if (!occ) return;

      var ident = (p.sections || {}).identite || {};
      var mq = (ident.marqueIds || [])[0] || ident.clientId || "sans-marque";
      var an = String(((ident.echeance || p.cree_le || "") + "")).slice(0, 4) || "sans-annee";
      var cle = mq + "|" + occ + "|" + an;

      var c = par[cle];
      if (!c) {
        var nomOcc = occ;
        (MAISON.occasions || []).forEach(function (o) { if (o.cle === occ) nomOcc = o.nom; });
        var nomMq = mq;
        (d.marques || []).forEach(function (m) { if (m.id === mq) nomMq = m.nom; });
        c = {
          id: "CMP-" + O.normalise(cle).replace(/[^a-z0-9]+/g, "-").slice(0, 40),
          nom: nomMq + " — " + nomOcc + (an !== "sans-annee" ? " " + an : ""),
          clientId: ident.clientId || null,
          marqueIds: (ident.marqueIds || []).slice(),
          regime: occ === "continu" ? "always-on" : "ponctuelle",
          occasion: occ,
          fenetre: { debut: null, fin: ident.echeance || null },
          marches: (ident.marches || []).slice(),
          bilan: "", ecartes: {},
          cree_le: new Date().toISOString(),
          cleMigration: cle,
          infere: { pourquoi: "Déduite du nom du projet, qui porte « " + occ
            + " » au calendrier de la maison. Les projets de la même marque et de "
            + "la même année s'y rangent ensemble.", quand: new Date().toISOString() },
        };
        par[cle] = c;
        d.campagnes.push(c);
      } else {
        (ident.marqueIds || []).forEach(function (m) {
          if (c.marqueIds.indexOf(m) === -1) c.marqueIds.push(m); });
        (ident.marches || []).forEach(function (m) {
          if (c.marches.indexOf(m) === -1) c.marches.push(m); });
      }
      p.campagneId = c.id;
    });
  }

  function migrer(d) {
    (d.projets || []).forEach(function (p) {
      /* 1 → le niveau d'un livrable se déduisait de sa forme. */
      (p.livrables || []).forEach(function (l) {
        if (!l.niveau) l.niveau = l.kv ? (l.maitre ? "adaptation" : "maitre") : "declinaison";
        /* 2 → les dix axes de complétude sont devenus les points de
         * recevabilité. L'ancienne clé se recopie et disparaît. */
        if (l.axes && !l.points) l.points = l.axes;
        if (l.axes) delete l.axes;
      });
      if (p.axesDA && !p.champsDA) p.champsDA = p.axesDA;
      if (p.axesDA) delete p.axesDA;

      /* 3 → l'insight et le territoire cessent d'être des paragraphes.
       *
       * Ils deviennent des objets à identifiant, parce que c'est la seule
       * façon qu'une piste remonte à sa racine — et que le dossier dise si
       * ses axes en partagent une. Le texte d'origine n'est pas jeté : il
       * devient la phrase de l'insight, et le reste s'affiche comme ce qu'il
       * est, non renseigné. Un insight migré dira « couche non nommée », ce
       * qui est vrai : personne ne l'a nommée.
       *
       * Les anciens champs restent au dépôt. On archive, on ne supprime pas :
       * le jour où la migration s'est trompée, le texte est encore là. */
      var st = (p.sections || {}).strategie || {};
      if (!p.insights) {
        p.insights = [];
        if ((st.insight || "").trim()) {
          p.insights.push({
            id: "IN-" + p.id.replace(/^PRJ-/, "").toLowerCase(),
            couche: null, auteur: null, ecrit_le: p.cree_le || null,
            passes: { longue: "",
              temps: { situation: "", tension: (st.tension || ""), empeche: "" },
              phrase: st.insight },
            sources: [], test: { contredit: null, gene: null, ouvre: null },
            migre: true,
          });
        }
      }
      if (!p.territoires) {
        p.territoires = [];
        if ((st.territoire || "").trim()) {
          p.territoires.push({
            id: "TR-" + p.id.replace(/^PRJ-/, "").toLowerCase(),
            nom: "", quoi: st.territoire,
            insightId: p.insights.length ? p.insights[0].id : null,
            ecole: null, convention: null, reduction: null, migre: true,
          });
        }
      }

      /* Une piste sans territoire se rattache au seul qui existe. S'il y en a
       * plusieurs, on ne devine pas : le contrôle « piste hors territoire » le
       * dira, et c'est une question qui se tranche à l'œil. */
      var seul = p.territoires.length === 1 ? p.territoires[0].id : null;
      ((p.sections || {}).pistes || []).forEach(function (pi) {
        if (!pi.territoireId && seul) pi.territoireId = seul;
        /* Le sacrifice rejoint le prix à payer, qui a deux moitiés. L'ancienne
         * clé reste : soixante modules la lisent encore. */
        if (!pi.prix) pi.prix = { privilegie: "", sacrifie: pi.sacrifice || "" };
      });
    });
    /* 4 → la clôture existe.
     *
     * Un dossier clos porte sa date de fin, son bilan et d'où vient la preuve
     * qu'il est fini. Tant qu'il ne la porte pas, il est ouvert — et la
     * migration n'en ferme AUCUN.
     *
     * C'est délibéré et ça se paie : les huit dossiers d'origine restent
     * ouverts après migration, y compris ceux dont la fenêtre est échue. Une
     * fenêtre passée n'est pas une preuve de fin ; fermer sur cette base
     * écrirait une date de clôture que personne n'a décidée, et le produit
     * porterait un mensonge daté. La clôture se relève ou se pose à la main. */

    /* 5 → l'arbre prend son étage manquant, et perd deux concepts.
     *
     * Trois choses, et la troisième est la seule qui infère :
     *
     *   Le gabarit devient la nature. Les quatre anciennes valeurs sont
     *   toutes des natures valides — campagne, cycle, demande, pitch — donc
     *   la conversion est une copie. L'ancienne clé reste au dépôt : on
     *   archive, on ne supprime pas.
     *
     *   Les volets fusionnent dans le périmètre. Un volet n'était pas un
     *   niveau, c'était la promesse de ce qu'on produirait : l'union de ses
     *   supports et de ses marchés dit la même chose sans un étage de plus.
     *   Les volets restent au dépôt, et les livrables gardent leur voletId —
     *   la matrice sait encore les grouper.
     *
     *   La campagne se déduit du nom, et seulement quand un mot du calendrier
     *   de la maison s'y trouve. « Bonnet Rouge — Ramadan » et « Peak —
     *   Ramadan 2026 » de la même marque et de la même année se rangent sous
     *   la même campagne. Un projet dont le nom ne dit rien reste sans
     *   campagne — ce n'est pas un orphelin, c'est un projet dont personne
     *   n'a encore dit à quel moment de la vie de la marque il appartient.
     *   Aucune campagne n'est fabriquée pour faire joli. */

    var naturesConnues = {};
    (MAISON.natures || []).forEach(function (n) { naturesConnues[n.cle] = 1; });

    (d.projets || []).forEach(function (p) {
      /* Une valeur que la table ne connaît pas ne se garde pas : deux dossiers
       * portaient « piece », une option fantôme d'un sélecteur. Elle retombe
       * sur l'ancien gabarit, qui lui était valide. */
      if (!p.nature || !naturesConnues[p.nature]) p.nature = p.gabarit || "campagne";

      if (!p.perimetre) {
        var sup = {}, mar = {};
        (p.volets || []).forEach(function (v) {
          (v.supports || []).forEach(function (x) { sup[x] = 1; });
          (v.marches || []).forEach(function (x) { mar[x] = 1; });
        });
        p.perimetre = { supports: Object.keys(sup), marches: Object.keys(mar) };
      }
    });

    if (!d.campagnes) d.campagnes = [];
    if (d.schema < 5) rattacherAuxCampagnes(d);
    /* Une seconde lecture, une seule fois, avec les tirets reconnus. Idempotente :
     * un projet déjà rattaché n'est jamais déplacé. */
    if (!d.rattachement2) { rattacherAuxCampagnes(d); d.rattachement2 = true; }

    if (!d.people) d.people = [];
    d.schema = VERSION_SCHEMA;
  }

  function reinitialiser() {
    etat = vide();
    enregistrer();
  }

  function surChangement(f) { ecouteurs.push(f); }

  /* Âge de la dernière sauvegarde sur fichier, pour le rappel d'export. */
  function ageSauvegarde() {
    return etat.exporte_le ? O.depuis(etat.exporte_le) : null;
  }

  function noterExport() {
    etat.exporte_le = new Date().toISOString();
    enregistrer();
  }

  return {
    tout: tout, liste: liste, trouve: trouve, ajoute: ajoute, modifie: modifie, retire: retire,
    tracer: tracer, journal: journal, lu: lu, lectures: lectures,
    charger: charger, enregistrer: enregistrer, exporter: exporter, importer: importer,
    reinitialiser: reinitialiser, surChangement: surChangement,
    ageSauvegarde: ageSauvegarde, noterExport: noterExport, vide: vide, poids: poids,
    referenceDisponible: referenceDisponible, chargerReference: chargerReference,
    relire: relire, peutEcrire: peutEcrire,
    provenance: provenance, stockage: stockage, rattacherAuFichier: rattacherAuFichier,
    ecrireSurDisque: ecrireSurDisque, conflits: conflits, resoudre: resoudre,
    reprisesDisponibles: function () { return reprisesAutres.map(function (r) { return { cle: r.cle, quand: r.quand, ancien: !!r.ancien }; }); },
    reprendre: reprendre,
  };
})();
