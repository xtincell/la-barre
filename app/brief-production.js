/* brief-production.js — tout ce qu'il faut pour fabriquer UNE livrable.
 *
 * Le §9.3 du processus dit la règle : quinze minutes à l'oral, puis une page
 * écrite pour faire démarrer quelqu'un. Cette page-là n'existait pas. Un
 * exécutant recevait le nom de son livrable et allait chercher le reste — le
 * gabarit dans le référentiel, la langue dans le marché, le claim dans la
 * plateforme, les mentions dans un mail. Quatre endroits, et un oubli par
 * livrable en moyenne.
 *
 * Ici, un clic. Tout ce que le modèle sait déjà sur ce livrable, rassemblé
 * dans l'ordre où on le lit pour fabriquer : ce qu'on fait, ce que ça doit
 * dire, ce qu'on ne dit jamais, les contraintes techniques, les droits, et
 * ce qui décide que c'est fini.
 *
 * Et une règle qui vaut plus que tout le reste : CE QUI MANQUE EST NOMMÉ.
 * Un brief compilé qui comble les trous en silence est pire que pas de brief,
 * parce qu'on lui fait confiance. Chaque absence porte donc son coût, et la
 * bande de recevabilité dit d'entrée si la page suffit à démarrer.
 */

window.BRIEF_PRODUCTION = (function () {
  var el = O.el;

  /* ————————————————————— Ce qu'on sait du livrable ————————————————————— */

  function contexte(p, l) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var mq = l.marqueId ? DEPOT.trouve("marques", l.marqueId) : null;
    var maitre = l.maitre ? (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0] : null;
    var piste = l.pisteId ? (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0] : null;
    var resp = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
    var gab = (s && m && s.gabarits) ? s.gabarits[m.id] : null;
    var vault = mq && window.VAULT ? (VAULT.de(mq.id) || {}) : {};
    var packs = window.VAULT ? VAULT.packsDe(l) : [];
    return { s: s, m: m, mq: mq, maitre: maitre, piste: piste, resp: resp,
      gab: gab, vault: vault, packs: packs, b: l.brief || {} };
  }

  /* ————————————————————— Est-ce que ça suffit pour démarrer ? ————————————————————— */

  /* Les six conditions, dans l'ordre de ce que leur absence coûte. Un fichier
   * refusé la veille du départ coûte plus qu'un ton mal tenu. */
  function controles(p, l) {
    var c = contexte(p, l);
    var cs = [];

    cs.push({ quoi: "Ce qu'on fabrique est nommé", ok: !!(c.s && c.b.concept || c.b.quoi), poids: 5,
      cout: "ni concept ni description : l'exécutant invente, et ce qu'il invente "
        + "n'est refusable que par le goût" });

    cs.push({ quoi: "Le texte est arrêté", ok: !!(c.b.texteVisuel || c.b.textePublication || c.b.signature), poids: 5,
      cout: "aucun texte fourni : il s'écrira au moment de la maquette, par "
        + "quelqu'un dont ce n'est pas la fiche" });

    cs.push({ quoi: "Le gabarit technique existe", ok: !!c.gab, poids: 4,
      cout: c.s && c.m
        ? "aucun gabarit pour « " + c.s.nom + " » sur " + c.m.nom + " : le fichier "
          + "partira sans qu'on ait vérifié sa taille"
        : "support ou marché non renseigné : rien ne peut être vérifié" });

    cs.push({ quoi: "Les mentions du marché sont écrites", ok: !!(c.m && (c.m.mentions || []).length), poids: 4,
      cout: c.m
        ? "aucune mention obligatoire renseignée sur " + c.m.nom + " : un livrable "
          + "diffusée ici peut être non conforme sans que rien ne le dise"
        : "marché non renseigné" });

    cs.push({ quoi: "Quelqu'un en répond", ok: !!c.resp, poids: 4,
      cout: "sans responsable nommé, ce livrable n'apparaît dans la semaine de "
        + "personne — et personne n'est en défaut si elle ne sort pas" });

    cs.push({ quoi: "Une date de remise", ok: !!(l.remise || l.echeance || l.publication), poids: 3,
      cout: "aucune date : l'horloge ne court contre personne" });

    return cs;
  }

  /* ————————————————————— La page ————————————————————— */

  function compiler(p, l) {
    var c = contexte(p, l);
    var b = c.b;
    var blocs = [];

    /* 1 — Ce qu'on fabrique. */
    blocs.push({ t: "CE QU'ON FABRIQUE", fort: true,
      corps: b.concept || b.quoi || null,
      siVide: "ni concept ni description — l'exécutant inventera",
      lignes: [
        { q: "Support", v: c.s ? c.s.nom : null },
        { q: "Marché", v: c.m ? c.m.nom + (c.m.langues ? "  ·  " + c.m.langues.map(O.langue).join(", ") : "") : null },
        { q: "Marque", v: c.mq ? c.mq.nom : null },
        { q: "Type", v: b.type || null },
        { q: "Sa place", v: KV.NIVEAUX[l.niveau] ? KV.NIVEAUX[l.niveau].nom : l.niveau },
        c.maitre ? { q: "Découle de", v: c.maitre.nom + " · V" + (c.maitre.version || 1) } : null,
      ].filter(Boolean) });

    /* 2 — L'idée qu'elle sert. Sans elle on exécute sans savoir pourquoi. */
    if (c.piste) {
      blocs.push({ t: "L'IDÉE QU'ELLE SERT", source: c.piste.titre,
        corps: c.piste.idee || null,
        siVide: "la piste est retenue mais son idée n'est pas écrite : rien ne "
          + "permet de dire si ce livrable la sert ou la trahit",
        lignes: [
          { q: "Ce qu'elle sacrifie", v: c.piste.sacrifice || null },
          { q: "Ce qui la défend", v: c.piste.argument || null },
        ] });
    }

    /* 3 — Ce que le livrable doit dire, mot pour mot. */
    blocs.push({ t: "CE QU'ELLE DOIT DIRE", fort: true,
      siVide: "aucun texte arrêté — il s'écrira à la maquette",
      lignes: [
        { q: "Sur le visuel", v: b.texteVisuel || null },
        { q: "En publication", v: b.textePublication || null },
        { q: "Appel à l'action", v: b.cta || null },
        { q: "Signature", v: b.signature || c.vault.signature || null },
        { q: "Mots-dièse", v: b.hashtags || null },
        { q: "Objectif", v: b.objectif || null },
      ].filter(function (x) { return x.v; }) });

    /* 4 — Le déroulé, quand le livrable est un film. Une animatique sans son
     * découpage n'est pas un brief, c'est une intention. */
    if ((b.scenes || []).length) {
      blocs.push({ t: "LE DÉROULÉ", source: b.scenes.length + " scènes",
        activites: b.scenes.map(function (s) {
          return { canal: s.n, nom: s.texteEcran, lieu: "", quoi: s.visuel,
            marches: s.voixOff };
        }) });
    }

    /* 5 — Ce qu'on ne dit jamais. Le seul bloc dont l'absence se paie en revue. */
    var interdits = [].concat(c.vault.jamais || []);
    blocs.push({ t: "CE QU'ON NE DIT JAMAIS", source: c.mq ? "bibliothèque de marque " + c.mq.nom : null,
      puces: interdits,
      siVide: c.mq
        ? "rien d'écrit à la bibliothèque de marque de " + c.mq.nom + " : le contrôle de vocabulaire "
          + "n'a rien à vérifier"
        : "aucune marque rattachée à ce livrable" });

    /* 6 — Les packs montrés, et où ils sont vendus. */
    if (c.packs.length || c.mq) {
      var hz = window.VAULT ? VAULT.packsHorsZone(l) : { hors: [], muets: [] };
      blocs.push({ t: "LES PACKS À MONTRER", source: c.packs.length ? c.packs.length + " déclarés" : null,
        puces: c.packs.map(function (s) {
          var d = (s.marches || []).length ? "vendu sur " + s.marches.length + " marchés" : "marchés non renseignés";
          return s.nom + (s.contenu ? "  ·  " + s.contenu : "") + "  —  " + d;
        }),
        siVide: "aucun pack déclaré sur ce livrable : on ne peut pas vérifier "
          + "qu'on montre un article vendu ici",
        corps: hz.hors.length
          ? "⚠ " + hz.hors.length + (hz.hors.length > 1 ? " packs montrés ne sont pas distribués" : " pack montré n'est pas distribué")
            + " sur ce marché — c'est l'erreur qui fait rappeler une campagne."
          : null });
    }

    /* 7 — Les contraintes techniques. C'est ce bloc qui évite le fichier
     * refusé la veille du départ. */
    blocs.push({ t: "CONTRAINTES TECHNIQUES",
      source: c.s && c.m ? c.s.nom + " × " + c.m.code : null,
      lignes: c.gab ? [
        { q: "Dimensions", v: c.gab.dimensions || null },
        { q: "Fond perdu", v: c.gab.fond_perdu || null },
        { q: "Résolution", v: c.gab.resolution || null },
        { q: "Profil", v: c.gab.profil || null },
        { q: "Fournisseur", v: c.gab.fournisseur || null },
        { q: "Remise fichier", v: c.gab.delai || null },
        { q: "Contraintes", v: c.gab.contraintes || null },
      ] : [],
      siVide: c.s && c.m
        ? "aucun gabarit pour « " + c.s.nom + " » sur " + c.m.nom + " — le fichier "
          + "partira sans qu'on ait vérifié sa taille"
        : "support ou marché non renseigné" });

    /* 8 — Les mentions obligatoires. */
    blocs.push({ t: "MENTIONS OBLIGATOIRES", source: c.m ? c.m.nom : null,
      puces: c.m ? (c.m.mentions || []) : [],
      siVide: c.m
        ? "non renseignées sur " + c.m.nom + " : un livrable diffusé ici peut être "
          + "non conforme sans que rien ne le dise"
        : "marché non renseigné" });

    /* 9 — Ce qui reste à vérifier avant de produire. */
    if ((b.aVerifier || []).length) {
      blocs.push({ t: "À VÉRIFIER AVANT DE PRODUIRE", fort: true, puces: b.aVerifier });
    }

    /* 10 — Qui, pour quand, et sur combien d'allers-retours. */
    var t = window.VERSION ? VERSION.tours(l, l.toursVendus) : null;
    blocs.push({ t: "QUI, POUR QUAND", lignes: [
      { q: "En répond", v: c.resp ? c.resp.nom + "  ·  " + O.poste(c.resp.poste).nom : null },
      { q: "Charge estimée", v: l.estime !== null && l.estime !== undefined ? O.decimal(l.estime) + " j" : null },
      { q: "Remise du fichier", v: l.remise ? O.joli(l.remise) : (l.echeance ? O.joli(l.echeance) : null) },
      { q: "Publication", v: l.publication ? O.joli(l.publication) : null },
      { q: "Tours", v: t ? t.faits + " consommés sur " + (l.toursVendus || 2) + " vendus" : null },
    ] });

    /* 11 — Ce qui décide que c'est fini. */
    var axes = l.axes || {};
    var restants = Object.keys(axes).filter(function (k) { return axes[k] !== "fait"; });
    blocs.push({ t: "CE QUI DÉCIDE QUE C'EST FINI",
      puces: restants.map(function (k) { return NOM_AXE[k] || k; }),
      siVide: "les dix axes sont au vert : le livrable est finie au sens de la définition.",
      videBon: true });

    return {
      titre: l.nom,
      sous: [p.ref, c.mq ? c.mq.nom : null, c.m ? c.m.nom : null].filter(Boolean).join("  ·  "),
      logo: null,
      blocs: blocs,
      inferences: [],
    };
  }

  var NOM_AXE = {
    concept: "le concept — rattaché à une piste retenue",
    copy: "le texte — définitif et verrouillé",
    asset: "les visuels sources — tous disponibles",
    design: "l'exécution — conforme au système graphique",
    technique: "le fichier — format, poids, profil conformes au gabarit",
    droits: "les droits — licence, territoire et durée couvrent l'usage",
    langue: "la langue — traduite et relue pour le marché",
    central: "la validation centrale — le master est approuvé",
    local: "la validation locale — l'adaptation est approuvée sur son marché",
    final: "le fini — exporté, validé, publié, sources archivées",
  };

  /* ————————————————————— Le texte, pour l'envoyer ————————————————————— */

  /* L'outil n'envoie rien : il écrit. On le porte par son canal. */
  function texte(p, l) {
    var d = compiler(p, l);
    var out = [d.titre, d.sous, ""];
    d.blocs.forEach(function (b) {
      var lignes = [];
      if (b.corps) lignes.push(b.corps);
      (b.lignes || []).forEach(function (x) { if (x.v) lignes.push(x.q + " : " + x.v); });
      (b.puces || []).forEach(function (x) { lignes.push("— " + x); });
      (b.activites || []).forEach(function (a) {
        lignes.push(a.canal + ". " + a.nom);
        if (a.quoi) lignes.push("   image : " + a.quoi);
        if (a.marches) lignes.push("   voix  : " + a.marches);
      });
      if (!lignes.length) lignes.push("[ " + (b.siVide || "non renseigné") + " ]");
      out.push(b.t, lignes.join("\n"), "");
    });
    return out.join("\n");
  }

  function copier(p, l) {
    var zone = el("textarea", { rows: 18 });
    zone.value = texte(p, l);
    PANNEAU.sur("Le brief en texte", l.nom, el("div", {},
      UI.banniere("", "À coller dans un ordre de fabrication, un message à l'exécutant, "
        + "ou un mail. L'outil n'envoie rien : il écrit."),
      el("div.form", {}, el("div.champ", {}, zone)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          zone.select();
          try { document.execCommand("copy"); } catch (e) { /* le presse-papier peut être fermé */ }
          PANNEAU.fermerSur();
        } }, "Sélectionner et copier"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Fermer"))
    ));
    setTimeout(function () { zone.focus(); zone.select(); }, 40);
  }

  /* ————————————————————— L'écran ————————————————————— */

  function ouvrir(p, l) {
    var cs = controles(p, l);
    var manques = cs.filter(function (c) { return !c.ok; });
    var d = compiler(p, l);

    PANNEAU.ouvrir("Brief de production", l.nom, el("div.co", {},
      UI.recevabilite(
        manques.length
          ? "Quelqu'un peut-il fabriquer ce livrable avec ça ?"
          : "Tout y est — ce livrable peut se fabriquer sans rien demander",
        cs, null,
        [
          { nom: "Imprimer", fort: !manques.length, quand: function () { window.print(); } },
          { nom: "Copier le texte", quand: function () { copier(p, l); } },
        ]),

      manques.length
        ? UI.banniere("rouge", manques.length
            + (manques.length > 1 ? " manques" : " manque")
            + " : ce qui n'est pas écrit ici sera décidé par l'exécutant, "
            + "et ne pourra pas lui être reproché.")
        : UI.banniere("vert", "Une page, et le travail démarre. Rien à aller chercher ailleurs."),

      COMPILATEUR.document(d)
    ));
  }

  /* Le bouton, là où le livrable se regarde. */
  function bouton(p, l) {
    var manques = controles(p, l).filter(function (c) { return !c.ok; }).length;
    return el("button.b" + (manques ? "" : ".or"), { type: "button",
      title: manques ? manques + " manques dans ce brief" : "tout y est",
      onclick: function () { ouvrir(p, l); } },
      "Brief de production" + (manques ? "  ·  " + manques + " manques" : ""));
  }

  return { controles: controles, compiler: compiler, texte: texte,
    ouvrir: ouvrir, bouton: bouton };
})();
