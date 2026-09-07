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

  return { ETATS: ETATS, de: de, bilan: bilan, tous: tous, dePersonne: dePersonne,
    phrase: phrase, banniere: banniere, pastille: pastille };
})();
