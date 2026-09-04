/* etats.js — une étiquette d'état ne vaut que par ce qu'elle annonce.
 *
 * « en lice », « brouillon », « junior », « en cumul » n'apprennent rien : ils
 * nomment une case de base de données. Ce qu'il me faut savoir, c'est ce que
 * cet état produit ou empêche — « en lice — 18 pièces se fabriquent sans savoir
 * laquelle fait autorité » se lit et se décide.
 *
 * Un seul endroit les écrit, sinon chaque écran réinvente son vocabulaire et
 * rien n'est comparable d'un mois sur l'autre.
 *
 * Chaque fonction rend { nom, quoi, ton } : le nom court pour la pastille, la
 * conséquence pour la lire, le ton pour la voir.
 */

window.ETAT = (function () {
  var el = O.el;

  /* ————————————————————— Une route ————————————————————— */

  function piste(p, pi) {
    if (!pi) return { nom: "hors route", ton: "alerte",
      quoi: "rattachée à aucune route : cette pièce ne relève d'aucune décision" };

    var pieces = (p.livrables || []).filter(function (l) {
      return !l.annule && l.pisteId === pi.id; }).length;

    if (pi.statut === "retenue") {
      return { nom: "retenue", ton: "vert",
        quoi: "elle fait autorité — la production s'ouvre sur elle" };
    }
    if (pi.statut === "ecartee") {
      return { nom: "écartée", ton: "terne",
        quoi: pi.motif ? "le motif est écrit — elle ne consomme plus de ressource"
          : "sans motif écrit — refusée par goût, donc indéfendable au §8" };
    }

    var autre = (p.sections.pistes || []).filter(function (x) {
      return x.statut === "retenue"; })[0];
    if (autre) {
      return { nom: "en lice", ton: "terne",
        quoi: "une autre fait déjà autorité — la trancher ou l'écarter, "
          + "sinon elle consomme sans produire" };
    }
    return { nom: "en lice", ton: "attente",
      quoi: pieces
        ? pieces + (pieces > 1 ? " pièces se fabriquent" : " pièce se fabrique")
          + " sans savoir laquelle fait autorité"
        : "rien ne se produit tant qu'aucune ne l'emporte" };
  }

  /* ————————————————————— Une idée d'atelier ————————————————————— */

  function idee(p, i) {
    var route = i.pisteId && p
      ? (p.sections.pistes || []).filter(function (x) { return x.id === i.pisteId; })[0]
      : null;

    if (i.statut === "retenue") {
      return route
        ? { nom: "retenue", ton: "vert", quoi: "elle porte la route « " + route.titre + " »" }
        : { nom: "retenue", ton: "attente",
            quoi: "reprise dans aucune route — son auteur n'est crédité nulle part, "
              + "et l'indicateur « idées retenues » ne bouge pas" };
    }
    if (i.statut === "ecartee") {
      return { nom: "écartée", ton: "terne",
        quoi: i.motif ? "le motif est écrit — son auteur sait pourquoi"
          : "sans motif écrit — son auteur ne sait pas pourquoi, et ne progressera pas" };
    }
    return { nom: "en lice", ton: "attente",
      quoi: "non arbitrée — elle ne compte dans aucun indicateur, ni pour elle ni pour moi" };
  }

  /* ————————————————————— Une demande de proposition ————————————————————— */

  function demande(d) {
    if (!d) return null;
    if (d.etat === "brouillon") {
      return { nom: "brouillon", ton: "terne",
        quoi: "le DA ne l'a pas reçue — rien ne part, et rien ne court" };
    }
    if (d.etat === "emise") {
      var j = d.emise_le ? O.depuis(d.emise_le) : null;
      return { nom: "émise", ton: "attente",
        quoi: "l'horloge du DA court" + (j !== null ? " depuis " + j + (j > 1 ? " jours" : " jour") : "") };
    }
    if (d.etat === "recue") {
      return { nom: "proposition reçue", ton: "vert",
        quoi: "l'horloge est passée de son côté au mien — elle attend mon verdict" };
    }
    return { nom: "close", ton: "terne", quoi: "close — elle ne demande plus rien" };
  }

  /* ————————————————————— Une personne ————————————————————— */

  function seniorite(pe) {
    if (!pe || pe.seniorite !== "junior") return null;
    return { nom: "junior", ton: "or",
      quoi: "chaque idée retenue de sa part fait bouger un indicateur de ma fiche" };
  }

  function cumul(pe) {
    if (!pe || !(pe.casquettes || []).length) return null;
    var sansPart = (pe.casquettes || []).filter(function (c) { return !c.part; }).length;
    var part = (pe.casquettes || []).reduce(function (t, c) { return t + (c.part || 0); }, 0);
    if (sansPart) {
      return { nom: "en cumul", ton: "alerte",
        quoi: "une casquette sans part déclarée — sa charge est fausse, "
          + "et tout ce qu'on lui donne l'est aussi" };
    }
    var echue = (pe.casquettes || []).filter(function (c) {
      return c.revue_le && new Date(c.revue_le) < new Date(O.jour()); }).length;
    if (echue) {
      return { nom: "cumul échu", ton: "alerte",
        quoi: "à prolonger, transformer en poste, ou rendre — un cumul reconduit "
          + "sans décision est un poste que l'agence occupe sans l'avoir écrit" };
    }
    var sansDate = (pe.casquettes || []).filter(function (c) { return !c.revue_le; }).length;
    if (sansDate) {
      return { nom: "en cumul", ton: "attente",
        quoi: "sans date de revue — il deviendra un poste non écrit par simple durée" };
    }
    return { nom: "en cumul", ton: "terne",
      quoi: "sa capacité est réduite de " + part + " %" };
  }

  /* ————————————————————— Une phase de rétroplanning ————————————————————— */

  function phase(x, faite, ici, passee, apres) {
    if (faite) return { nom: "faite", ton: "vert", quoi: "faite" };
    if (passee) {
      return { nom: "en retard", ton: "alerte",
        quoi: apres
          ? "en retard — les " + apres + (apres > 1 ? " phases suivantes glissent" : " phase suivante glisse") + " d'autant"
          : "en retard — c'est la date de remise qui bouge" };
    }
    if (ici) return { nom: "en cours", ton: "attente", quoi: "en cours" };
    return { nom: "à venir", ton: "terne", quoi: "à venir" };
  }

  /* ————————————————————— Les deux rendus ————————————————————— */

  /* Serrée : la pastille, avec la conséquence au survol. À n'utiliser que là
   * où la place manque réellement — une case de matrice, une ligne dense. */
  function pastille(e) {
    if (!e) return null;
    var s = UI.eti(e.nom, e.ton);
    s.title = e.quoi;
    return s;
  }

  /* Lisible : l'état et sa conséquence, en toutes lettres. C'est le rendu par
   * défaut ; la pastille est l'exception. */
  function ligne(e, classe) {
    if (!e) return null;
    return el("span." + (classe || "etat-l") + "." + e.ton, {},
      el("b", {}, e.nom), el("span", {}, e.quoi));
  }

  return { piste: piste, idee: idee, demande: demande,
    seniorite: seniorite, cumul: cumul, phase: phase,
    pastille: pastille, ligne: ligne };
})();
