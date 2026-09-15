/* depot.js — la persistance, et rien d'autre.
 *
 * Le dépôt de référence est un fichier JSON que tu gardes sur ton Drive :
 * import à l'ouverture, export à la fermeture. Le navigateur ne tient qu'un
 * cache de travail, pour ne rien perdre entre deux enregistrements.
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
  var VERSION_SCHEMA = 3;

  var etat = vide();
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

  function tracer(action, type, id, detail) {
    etat.journal.push({
      quand: new Date().toISOString(),
      qui: MAISON.titulaire,
      action: action,
      type: type,
      id: id,
      detail: String(detail || "").slice(0, 120),
    });
    if (etat.journal.length > 2000) etat.journal = etat.journal.slice(-1500);
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

  function ecrireSurDisque(quand) {
    var refus = peutEcrire();
    if (refus) {
      surDisque = false;
      if (quand) quand(false, refus);
      return;
    }
    var texte = JSON.stringify(etat, null, 1);
    fetch("depots/" + fichier, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: texte,
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok) throw new Error("refus");
        surDisque = true;
        if (disqueKO) {
          disqueKO = false;
          if (window.AVIS) AVIS.fait("L'écriture sur le fichier refonctionne.");
        }
        if (quand) quand(true);
      })
      .catch(function () {
        surDisque = false;
        if (!disqueKO) {
          disqueKO = true;
          if (window.AVIS) AVIS.grave("La base ne s'écrit plus dans son fichier — "
            + "seul ce navigateur garde la suite. Vérifie que le serveur tourne "
            + "(node servir.mjs), sinon exporte à la main.");
        }
        if (quand) quand(false);
      });
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
    try {
      window.localStorage.setItem(CLE, JSON.stringify(etat));
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
    fetch("depots/" + nom, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) {
        if (!t) { if (apres) { var f = apres; apres = null; f(false); } return; }
        referenceLue = true;
        surDisque = true;
        try {
          var lu = JSON.parse(t);
          var ici = (etat.projets || []).length;
          var la = (lu.projets || []).length;

          /* Trois raisons de reprendre le fichier, et une seule règle : le
           * fichier est la base, le navigateur n'en est qu'un cache.
           *
           * Le volume ne suffisait pas. Une collection ajoutée au fichier — un
           * relevé, un référentiel — n'ajoute aucun dossier : elle restait sur
           * le disque, invisible à l'écran, sans que rien ne le dise. Et un
           * dépôt migré ailleurs revenait dans son ancienne forme. */
          /* Une collection que le fichier porte et que ce navigateur n'a pas.
           * C'est le cas d'un relevé ajouté au fichier : ni dossier de plus,
           * ni schéma neuf, ni horodatage touché — et pourtant le navigateur
           * est en retard. Sans ça, la donnée dort sur le disque. */
          var absente = null;
          Object.keys(lu).forEach(function (k) {
            if (!Array.isArray(lu[k]) || !lu[k].length) return;
            if ((etat[k] || []).length === 0) absente = k;
          });

          var pourquoi = la > ici
              ? "il contenait " + la + " dossiers, ce navigateur " + ici
            : absente
              ? "il porte « " + absente + " » (" + lu[absente].length
                + " entrées) que ce navigateur n'a pas"
            : (lu.schema || 0) > (etat.schema || 0)
              ? "il a été migré au schéma " + lu.schema + ", ce navigateur en est au "
                + (etat.schema || 0)
            : lu.enregistre_le && etat.enregistre_le
              && new Date(lu.enregistre_le) > new Date(etat.enregistre_le)
              ? "il a été écrit après la copie de ce navigateur"
            : null;

          if (pourquoi && (lu.schema || 0) <= VERSION_SCHEMA) {
            importer(t); etat.reference = nom;
            if (window.AVIS) AVIS.fait("La base fait foi et vient d'être rechargée : " + pourquoi + ".");
          }
        } catch (e) { /* illisible : on ne touche à rien, et on n'écrit pas non plus */ referenceLue = false; }
        if (apres) { var g = apres; apres = null; g(true); }
      })
      .catch(function () { if (apres) { var h = apres; apres = null; h(false); } });
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

    fetch("depots/" + m.reference, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) {
        if (!t) { verdict(false, "le fichier n'a pas répondu"); return; }
        try {
          importer(t); etat.reference = m.reference; fichier = m.reference;
          referenceLue = true;            /* à partir d'ici, écrire est légitime */
          ecrire();                       /* le filet seulement : on vient de le lire du disque */
          surDisque = true;
        } catch (e) {
          verdict(false, e.message); return;
        }
        /* La lecture a réussi. Ce qui se passe ensuite — le rendu — peut
         * échouer sans que le dépôt soit en cause : on ne le confond pas. */
        verdict(true);
      })
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
    ecrireSurDisque: ecrireSurDisque,
  };
})();
