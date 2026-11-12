/* trace.js — distinguer « pas fait » de « pas tracé ».
 *
 * C'est la distinction qui protège de l'impair le plus coûteux qu'un
 * directeur de la création puisse commettre : relancer quelqu'un sur un
 * travail qu'il a rendu.
 *
 * Le cas s'est produit ici, et il vient de l'outil. Le geste qui rattache un
 * fichier à un livrable — « Poser un fichier » — plantait à chaque appel :
 * zéro livrable sur 225 porte un fichier posé, une seule version a été
 * soumise. Pendant ce temps le disque contient 265 fichiers de production et
 * de revue. Le travail existe ; c'est l'instrument qui ne l'enregistrait pas.
 *
 * Un écran qui affiche « 175 livrables · 0 soumis » sans le dire accuse une
 * personne d'un défaut d'outil. Ce module lui interdit de le faire.
 *
 * Trois états, et un seul appelle une relance :
 *
 *   tracé      une version soumise, ou un fichier posé — la chaîne a mordu
 *   vu         un visuel de revue existe, rien n'est déposé — le travail se
 *              voit, la trace manque. Ce n'est pas un retard, c'est un trou
 *              d'instrumentation : le geste à poser est le mien, pas le sien
 *   muet       rien du tout — et c'est là seulement qu'une question se pose
 *
 * Et une condition qui prime sur les trois : sans responsable ni date de
 * remise, un livrable n'est pas relançable. On ne relance pas « bientôt »
 * chez « quelqu'un » : c'est ainsi qu'on se trompe de personne.
 */

window.TRACE = (function () {
  var el = O.el;

  var ETATS = {
    trace: { nom: "tracé", ton: "vert",
      quoi: "une version ou un fichier est au dossier" },
    vu: { nom: "vu, non déposé", ton: "attente",
      quoi: "un visuel existe, rien n'est déposé — la trace manque, pas le travail" },
    muet: { nom: "muet", ton: "alerte",
      quoi: "aucune version, aucun fichier, aucun visuel" },
  };

  function de(l) {
    var versions = (l.versions || []).length;
    var fichiers = (l.fichiers || []).length;
    var visuel = !!(l.review || l.vignette || l.production);
    var cle = versions || fichiers ? "trace" : visuel ? "vu" : "muet";
    return {
      cle: cle, nom: ETATS[cle].nom, ton: ETATS[cle].ton, quoi: ETATS[cle].quoi,
      versions: versions, fichiers: fichiers, visuel: visuel,
      /* Relançable : quelqu'un le porte, et une date le rend exigible. */
      relancable: !!(l.responsable && l.remise),
      sansQui: !l.responsable, sansDate: !l.remise,
    };
  }

  /* ————————————————————— Ce qu'on attend à la place de l'image ————————————————————— */

  /* « aucun visuel » est vrai et ne sert à rien.
   *
   * Il dit qu'il manque quelque chose sans dire quoi, ni sous quel nom la
   * chose arrivera. Six livrables sans visuel donnent alors six cartes
   * identiques — et un mur de vides indiscernables ne se réclame pas : on ne
   * sait pas lequel demander, ni à quoi on le reconnaîtra quand il arrivera.
   *
   * Or les deux moitiés de la réponse sont là. Le nom est souvent connu — le
   * tableau du client l'annonce — et ce qui manque l'est toujours. Le vide
   * porte donc le fichier attendu, et le geste qui n'a pas eu lieu. */
  function attendu(l) {
    if (!l) return null;
    /* Un pack, une marque, une personne n'attendent pas un livrable : le vide
     * leur va. Seul ce qui se produit se réclame. */
    if (!(l.conformite || l.releve || l.versions || l.support)) return null;

    var r = l.releve || {};
    var c = l.conformite || null;
    var quoi;

    if (c) {
      var manque = [];
      if (c.exe !== "fait") manque.push("l'exé");
      if (c.codebarre !== "fait") manque.push("le code-barres");
      if (c.qr !== "fait") manque.push("le QR");

      /* L'écart prime sur le décompte : « annoncé fait » et « rien au
       * dossier » ne se disent pas comme un simple manque. C'est la ligne du
       * tableau qui est fausse, et c'est elle qu'on va opposer. */
      if (r.ecart === "annonce-sans-fichier") {
        quoi = "annoncé fait au tableau — l'artwork n'est pas au dossier";
      } else if (r.ecart === "fichier-sans-annonce") {
        quoi = "l'artwork existe au dossier, le tableau ne l'annonce pas";
      } else if (!manque.length) {
        quoi = "conforme au tableau — le visuel reste à poser";
      } else {
        quoi = "attendu : " + manque.join(", ");
      }
    } else {
      var t = de(l);
      quoi = t.cle === "vu" ? "un visuel existe, aucun fichier déposé"
        : t.cle === "trace" ? "déposé, jamais regardé"
        : "aucun fichier, aucune version";
    }

    return { fichier: r.fichier || null, nomme: !!r.fichier,
      quoi: quoi, ecart: r.ecart || null,
      formats: (r.formats || []).slice() };
  }

  /* ————————————————————— Ce qui souffre ————————————————————— */

  /* Un livrable en souffrance : quelque chose est dû, et rien n'est arrivé.
   * Le mot est celui du transport, et il est juste — le colis est parti, il
   * n'est pas au bout, et personne ne sait où il dort.
   *
   * Quatre degrés, du plus coûteux au moins. L'ordre compte : c'est celui
   * dans lequel on traite une pile un lundi matin, et il place en tête ce qui
   * est FAUX plutôt que ce qui est seulement en retard — une ligne de tableau
   * qui ment coûte plus cher qu'une date dépassée qu'on voit. */
  var DEGRES = {
    dement: { rang: 0, nom: "le tableau ment", ton: "alerte",
      quoi: "une livraison est annoncée faite, rien n'est au dossier" },
    depasse: { rang: 1, nom: "date dépassée", ton: "alerte",
      quoi: "la remise est passée, rien n'est arrivé" },
    sansTrace: { rang: 2, nom: "sans trace", ton: "attente",
      quoi: "aucune version, aucun fichier, aucun visuel" },
    aTracer: { rang: 3, nom: "à tracer", ton: "attente",
      quoi: "le travail se voit, la trace manque — le geste est le mien" },
  };

  /* Ce qui n'est pas en souffrance rend null. Un livrable tracé va bien ; un
   * livrable sans date n'est en retard de rien, et le dire serait l'impair. */
  function souffrance(l, aujourdhui) {
    if (!l || l.annule) return null;
    var t = de(l);
    var r = l.releve || {};

    if (r.ecart === "annonce-sans-fichier") return degre("dement", l, t, null);

    if (t.cle === "trace") return null;

    var jours = null;
    if (l.remise) {
      var d = new Date(l.remise);
      var maintenant = aujourdhui || new Date();
      if (!isNaN(d)) jours = Math.floor((maintenant - d) / 86400000);
    }
    if (jours !== null && jours > 0) return degre("depasse", l, t, jours);
    if (t.cle === "vu") return degre("aTracer", l, t, jours);
    return degre("sansTrace", l, t, jours);
  }

  function degre(cle, l, t, jours) {
    var d = DEGRES[cle];
    return { cle: cle, rang: d.rang, nom: d.nom, ton: d.ton, quoi: d.quoi,
      jours: jours, trace: t, relancable: t.relancable,
      sansQui: t.sansQui, sansDate: t.sansDate };
  }

  /* Toutes les souffrances du produit, tous projets confondus, triées comme on
   * les traite : le plus coûteux d'abord, puis le plus vieux. */
  function enSouffrance(filtre) {
    var out = [];
    var maintenant = new Date();
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        var s = souffrance(l, maintenant);
        if (!s) return;
        if (filtre && !filtre(p, l, s)) return;
        out.push({ projet: p, l: l, s: s, attendu: attendu(l) });
      });
    });
    out.sort(function (a, b) {
      if (a.s.rang !== b.s.rang) return a.s.rang - b.s.rang;
      var ja = a.s.jours === null ? -1 : a.s.jours;
      var jb = b.s.jours === null ? -1 : b.s.jours;
      return jb - ja;
    });
    return out;
  }

  /* ————————————————————— Le bilan d'un ensemble ————————————————————— */

  function bilan(livrables) {
    var b = { total: 0, trace: 0, vu: 0, muet: 0,
      relancables: 0, sansQui: 0, sansDate: 0 };
    (livrables || []).forEach(function (l) {
      if (l.annule) return;
      var t = de(l);
      b.total++; b[t.cle]++;
      if (t.relancable) b.relancables++;
      if (t.sansQui) b.sansQui++;
      if (t.sansDate) b.sansDate++;
    });
    b.part = b.total ? Math.round((b.relancables / b.total) * 100) : null;
    return b;
  }

  function tous() {
    var ls = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) { if (!l.annule) ls.push(l); });
    });
    return bilan(ls);
  }

  function dePersonne(id) {
    var ls = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (!l.annule && l.responsable === id) ls.push(l);
      });
    });
    return bilan(ls);
  }

  /* ————————————————————— Ce qu'on a le droit d'en dire ————————————————————— */

  /* La phrase honnête sur un ensemble. Elle sort dans cet ordre parce que
   * c'est l'ordre du coût : ce qui n'est relançable par personne d'abord, ce
   * qui est vu sans être déposé ensuite, et seulement à la fin ce qui est
   * réellement muet et appelle une question. */
  function phrase(b, qui) {
    var chez = qui ? " chez " + qui : "";
    if (!b.total) return { t: "Rien à suivre" + chez, ton: "", q: "Aucun livrable affecté." };

    if (b.sansDate === b.total && b.total > 1) {
      return { t: "Aucun de ces " + b.total + " livrables n'est relançable", ton: "attente",
        q: "Aucun ne porte de date de remise : rien n'est exigible, donc rien n'est en "
          + "retard. Poser les dates est mon geste, pas le sien." };
    }
    if (b.muet === 0 && b.vu) {
      return { t: b.vu + (b.vu > 1 ? " livrables sont faits, non déposés" : " livrable est fait, non déposé"),
        ton: "attente",
        q: "Le visuel existe, la version ne l'accompagne pas. C'est la trace qui "
          + "manque, pas le travail — relancer là-dessus serait un impair." };
    }
    if (b.vu && b.muet) {
      return { t: b.muet + (b.muet > 1 ? " livrables sans aucune trace" : " livrable sans aucune trace"),
        ton: "alerte",
        q: b.vu + (b.vu > 1 ? " autres sont faits mais non déposés" : " autre est fait mais non déposé")
          + " : ne pas les confondre. Seuls les " + b.muet + " premiers appellent une question." };
    }
    if (b.muet) {
      return { t: b.muet + (b.muet > 1 ? " livrables sans aucune trace" : " livrable sans aucune trace"),
        ton: "alerte",
        q: b.relancables + " sur " + b.total + " portent un responsable et une date : "
          + "ce sont les seuls sur lesquels une relance est un constat." };
    }
    return { t: "Tout est tracé" + chez, ton: "vert",
      q: b.total + (b.total > 1 ? " livrables portent" : " livrable porte")
        + " une version ou un fichier au dossier." };
  }

  /* ————————————————————— La bannière ————————————————————— */

  /* Elle ne s'affiche que si le silence est majoritaire : à partir de la
   * moitié, ce n'est plus l'équipe qu'on regarde, c'est l'instrument. */
  function banniere(b, qui) {
    if (!b.total) return null;
    var muets = b.vu + b.muet;
    if (muets * 2 < b.total) return null;

    var p = phrase(b, qui);
    return UI.banniere(p.ton === "alerte" ? "" : "",
      p.t + " — " + p.q
      + (b.vu ? "  Le geste « Poser un fichier » a longtemps échoué sans le dire : "
        + "ce que l'équipe a rendu avant sa réparation n'a pas pu être enregistré." : ""));
  }

  /* Une pastille sur un livrable, dans une liste. */
  function pastille(l) {
    var t = de(l);
    if (t.cle === "trace") return null;
    return el("span.trc." + t.ton, { title: t.quoi }, t.nom);
  }

  return { ETATS: ETATS, DEGRES: DEGRES, de: de, bilan: bilan, tous: tous,
    dePersonne: dePersonne, attendu: attendu,
    souffrance: souffrance, enSouffrance: enSouffrance,
    phrase: phrase, banniere: banniere, pastille: pastille };
})();
