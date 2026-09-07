/* verdict-cout.js — ce qu'un verdict coûte, avant de le rendre.
 *
 * Un retour n'est pas gratuit : il consomme un aller-retour, il repousse de la
 * production, et parfois il fait sauter une échéance. Une approbation n'est pas
 * neutre non plus : elle libère de la charge et démarre des adaptations.
 *
 * Personne ne calcule ça au moment de décider. C'est pour ça qu'on décide mal.
 */

window.COUT = (function () {

  /* Le temps qu'une reprise consomme : la moitié de l'estimation d'origine.
   * Refaire coûte moins que faire, jamais rien. */
  var PART_REPRISE = 0.5;

  function verdict(piece, cleVerdict) {
    return piece.type === "piste"
      ? coutPiste(piece, cleVerdict)
      : coutLivrable(piece, cleVerdict);
  }

  /* ————————————————————— Un livrable ————————————————————— */

  function coutLivrable(piece, cle) {
    var l = piece.objet, p = piece.projet;
    var faits = (l.versions || []).filter(function (v) { return v.verdict && v.verdict !== "approuve"; }).length;
    var vendus = l.toursVendus || 0;
    var estime = Number(l.estime) || 0;

    var out = { verbe: cle, effets: [], alertes: [], gagne: [], jours: 0, tours: faits, vendus: vendus };

    if (cle === "approuve") {
      out.gagne.push("La validation centrale passe à prêt");
      var adapt = REGLES.adaptations(p, l.id);
      if (adapt.length) {
        out.gagne.push(adapt.length + (adapt.length > 1 ? " adaptations peuvent partir" : " adaptation peut partir"));
      }
      var reste = REGLES.coince(l).filter(function (a) { return a.cle !== "central"; });
      if (reste.length) {
        out.effets.push("Il restera " + reste.length + " points en attente : "
          + reste.map(function (a) { return a.axe.toLowerCase(); }).join(", "));
      }
      return out;
    }

    if (cle === "hors") {
      out.alertes.push("Hors périmètre : c'est un nouveau brief, donc un chiffrage et un calendrier revus");
      if (estime) out.gagne.push(estime + " j rendus à l'équipe si le travail s'arrête");
      return out;
    }

    /* Retour, et retour sous réserve */
    var toursApres = faits + 1;
    var jours = Math.max(0.5, Math.round(estime * PART_REPRISE * 2) / 2);
    out.tours = toursApres;
    out.jours = jours;

    out.effets.push("Aller-retour " + toursApres + (vendus ? " sur " + vendus + " vendus" : ""));
    if (estime) out.effets.push("Environ " + jours + " j de reprise pour " + porteur(l));
    else out.effets.push("Charge inconnue : impossible de dire ce que la reprise coûte");

    if (vendus && toursApres > vendus) {
      out.alertes.push("Au-delà des " + vendus + " allers-retours vendus — cet aller-retour se comptabilise en reprise");
    }

    var d = PLATEAU.echeanceDe(p, l);
    if (d && jours) {
      var nouvelle = new Date(new Date(d).getTime() + Math.ceil(jours / 5 * 7) * 86400000);
      var limite = (p.sections.identite || {}).echeance;
      out.effets.push("Livraison repoussée vers le " + O.joli(nouvelle));
      if (limite && nouvelle > new Date(limite)) {
        out.alertes.push("Passerait après l'échéance client du " + O.joli(limite));
      }
    }

    if (l.responsable && jours) {
      var c = PLATEAU.chargeDe(l.responsable, piece.semaine || PLATEAU.semaineDe(d));
      var apres = c.jours + jours;
      if (apres > c.capacite) {
        var pers = DEPOT.trouve("personnes", l.responsable);
        out.alertes.push((pers ? pers.nom : "le responsable") + " passerait à "
          + Math.round((apres / c.capacite) * 100) + " % cette semaine-là");
      }
    }

    if (cle === "reserve") {
      out.gagne.push("L'étage suivant s'engage quand même — les réserves se traitent dedans");
    }

    return out;
  }

  function porteur(l) {
    var p = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
    return p ? p.nom : "un responsable non nommé";
  }

  /* ————————————————————— Une piste ————————————————————— */

  function coutPiste(piece, cle) {
    var pi = piece.objet, p = piece.projet;
    var out = { verbe: cle, effets: [], alertes: [], gagne: [], jours: 0 };
    var autres = (p.sections.pistes || []).filter(function (x) { return x.id !== pi.id && x.statut === "proposee"; });
    var rattaches = (p.livrables || []).filter(function (l) { return l.pisteId === pi.id; });
    var orphelins = (p.livrables || []).filter(function (l) { return !l.pisteId; });

    if (cle === "approuve") {
      out.gagne.push("Cette piste fait autorité — l'équipe sait sur quoi travailler");
      if (autres.length) out.effets.push(autres.length + (autres.length > 1 ? " autres pistes sont écartées" : " autre piste est écartée"));
      if (orphelins.length) out.effets.push(orphelins.length + " livrables sans piste s'y rattachent");
      var a = pi.auteurDA ? DEPOT.trouve("personnes", pi.auteurDA) : null;
      if (a && a.seniorite === "junior") {
        out.gagne.push("Idée retenue d'un junior : ton objectif avance de un");
      }
      if (!pi.auteurDA) out.alertes.push("Aucun auteur nommé — l'idée ne pourra être attribuée à personne");
      if (!pi.sacrifice || !pi.argument) {
        out.alertes.push("Retenir une piste sans son sacrifice ni son argument, c'est retenir sans critère");
      }
      return out;
    }

    if (cle === "hors") {
      out.effets.push("Route écartée");
      if (rattaches.length) out.alertes.push(rattaches.length + " livrables perdent leur base");
      if (!autres.length) out.alertes.push("Plus aucune piste en lice : la production s'arrête tant qu'il n'y en a pas");
      return out;
    }

    out.effets.push("La piste repart chez son auteur");
    var jrs = 2;
    out.jours = jrs;
    out.effets.push("Environ " + jrs + " j avant qu'elle revienne");
    if (autres.length === 0) out.alertes.push("Aucune autre piste en lice pendant ce temps");
    return out;
  }

  /* ————————————————————— Ce que la file coûte, tant qu'on ne juge pas ————————————————————— */

  function fileBloquee(pieces) {
    var jours = 0, plusVieux = 0;
    pieces.forEach(function (x) {
      var j = O.depuis(x.depuis || x.date);
      plusVieux = Math.max(plusVieux, j);
      var estime = Number(x.objet.estime) || 0;
      jours += estime;
    });
    return { jours: jours, plusVieux: plusVieux, n: pieces.length };
  }

  return { verdict: verdict, fileBloquee: fileBloquee };
})();
