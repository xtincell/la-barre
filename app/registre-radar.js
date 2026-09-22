/* registre-radar.js — les 366 briefs du Radar Matanga, et lesquels ont un
 * dossier ici.
 *
 * Le corpus porte deux registres du même travail. Le document de campagnes
 * raconte cent quarante campagnes avec les rôles tenus ; le Radar enregistre
 * trois cent soixante-six briefs avec leurs identifiants, leurs dates et leurs
 * statuts. Ils n'ont aucune clé commune, et l'écart entre les deux n'est pas
 * du bruit : c'est l'information. Le corpus le dit lui-même — « c'est l'écart
 * entre les deux qui fait la valeur du dossier, pas la somme ».
 *
 * Ce registre ne duplique donc pas le Radar : il dit une seule chose, celle
 * que le Radar ne peut pas dire — pour chaque brief entré là-bas, y a-t-il ici
 * de quoi suivre ce qu'il a produit ?
 *
 * Il se relève, il ne se saisit pas. La date du relevé est écrite en tête : un
 * registre vieux d'un mois se lit autrement qu'un registre d'hier.
 *
 * Deux choses qu'il montre plutôt que de les corriger :
 *   — les neuf doublons que le Radar a lui-même marqués comme tels ;
 *   — les enregistrements malformés. « FRC-059.T2b » porte ses colonnes
 *     `entree` et `rattache` interverties. Le réparer en silence effacerait la
 *     seule trace du défaut, et la source resterait fausse.
 */

window.REGISTRE_RADAR = (function () {
  var el = O.el;

  function liste() { return DEPOT.liste("radar"); }

  /* Les statuts que le Radar emploie, et ce qu'ils disent du suivi. Un brief
   * bouclé n'appelle pas de dossier ici : il est fini. Un brief en cours sans
   * dossier, si — c'est du travail qui tourne sans être suivi. */
  var VIVANT = { "En cours": 1, "Reçu": 1, "Frozen": 1, "Bloqué": 1,
    "En attente client": 1, "Création KV": 1 };

  function etat(r) {
    if (r.malforme) {
      return { cle: "malforme", nom: "enregistrement malformé", ton: "alerte",
        quoi: "Ses colonnes « entrée » et « rattaché » sont interverties à la source. "
          + "Rien n'a été corrigé ici : c'est le Radar qu'il faut reprendre." };
    }
    if (r.entree === "Doublon") {
      return { cle: "doublon", nom: "doublon", ton: "terne",
        quoi: "Le Radar l'a marqué doublon" + (r.rattache ? " de " + r.rattache : "")
          + ". Non ingéré." };
    }
    if (r.projetId) {
      var p = DEPOT.trouve("projets", r.projetId);
      var n = p ? (p.livrables || []).filter(function (l) { return !l.annule; }).length : 0;
      return { cle: "suivi", nom: "suivi ici", ton: "vert",
        quoi: (p ? p.ref : r.projetId)
          + (n ? "  ·  " + n + (n > 1 ? " livrables" : " livrable") : "  ·  aucun livrable encore") };
    }
    if (!VIVANT[r.statut]) {
      return { cle: "hors", nom: r.statut || "sans statut", ton: "terne",
        quoi: "rien à suivre : le Radar le donne pour fini" };
    }
    return { cle: "aveugle", nom: "aucun dossier ici",
      ton: r.sienne ? "alerte" : "attente",
      quoi: (r.statut || "sans statut") + (r.recu ? "  ·  reçu le " + O.jourCourt(r.recu) : "")
        + (r.sienne ? "  ·  sous sa responsabilité directe" : "") };
  }

  function bilan() {
    var b = { total: 0, suivis: 0, aveugles: 0, hors: 0, doublons: 0, malformes: 0,
      siens: 0, siensAveugles: 0, maitres: 0, taches: 0 };
    liste().forEach(function (r) {
      b.total++;
      if (r.sienne) b.siens++;
      if (r.entree === "Maître") b.maitres++;
      if (r.entree === "Tâche") b.taches++;
      var e = etat(r);
      if (e.cle === "suivi") b.suivis++;
      else if (e.cle === "doublon") b.doublons++;
      else if (e.cle === "malforme") b.malformes++;
      else if (e.cle === "hors") b.hors++;
      else { b.aveugles++; if (r.sienne) b.siensAveugles++; }
    });
    return b;
  }

  /* Ce qui coûte le plus, une fois. */
  function pire() {
    var b = bilan();
    if (!b.total) {
      return { t: "Aucun relevé du Radar",
        q: "Sans lui, on ne sait pas ce qui est entré au registre de l'agence et "
          + "n'existe pas ici." };
    }
    if (b.siensAveugles) {
      return { t: b.siensAveugles + (b.siensAveugles > 1
          ? " briefs sous sa responsabilité tournent sans dossier ici"
          : " brief sous sa responsabilité tourne sans dossier ici"),
        q: "Ce sont ceux dont il répond directement. Leur exécution ne se voit nulle "
          + "part : rien n'y est relançable, et l'absence ne se signale pas d'elle-même." };
    }
    if (b.aveugles) {
      return { t: b.aveugles + (b.aveugles > 1 ? " briefs vivants sans dossier ici"
                                               : " brief vivant sans dossier ici"),
        q: "Du travail qui tourne au registre de l'agence et qu'aucun dossier ne suit." };
    }
    return { t: "Tout ce qui tourne est suivi",
      q: b.suivis + " briefs ont leur dossier ici ; les " + b.hors
        + " autres sont donnés pour finis au Radar." };
  }

  /* ————————————————————— L'écran ————————————————————— */

  /* La hiérarchie du Radar est réelle et profonde — FRC-059 → T1 → T1a — et
   * c'est elle qui porte le fait relevé par le titulaire : des briefs de
   * livrables spécifiques sous le brief d'une campagne. La rendre à plat en
   * ferait trois cent soixante-six lignes égales, et le rapport de dépendance
   * disparaîtrait. */
  function arbre() {
    var rs = liste();
    var parId = {};
    rs.forEach(function (r) { parId[r.ndeg] = r; });
    var enfants = {};
    rs.forEach(function (r) {
      if (!r.rattache || !parId[r.rattache]) return;
      (enfants[r.rattache] = enfants[r.rattache] || []).push(r);
    });
    var racines = rs.filter(function (r) { return !r.rattache || !parId[r.rattache]; });
    return { racines: racines, enfants: enfants };
  }

  function rendre(hote, rafraichir) {
    var b = bilan();
    O.vider(hote);

    if (!b.total) {
      hote.appendChild(el("p.rien", {},
        "Aucun relevé. Le registre se remplit par outils/ingerer-corpus.mjs."));
      return;
    }

    var releve = DEPOT.tout().radar_releve_le;
    var age = releve ? Math.round((new Date(O.jour()) - new Date(releve)) / 86400000) : null;
    var a = arbre();
    var vifs = a.racines.filter(function (r) { return appelleUnGeste(r, a.enfants); });
    var calmes = a.racines.filter(function (r) { return !appelleUnGeste(r, a.enfants); });

    hote.appendChild(el("div.reg", {},
      el("div.reg-t", {},
        el("span.regt-l", {}, "RADAR MATANGA"),
        el("span.regt-d", {}, age === null ? "date de relevé inconnue"
          : age <= 0 ? "relevé aujourd'hui"
          : "relevé il y a " + age + (age > 1 ? " jours" : " jour")
            + (age > 30 ? " — un registre de cet âge se lit comme une photo, pas comme un état" : ""))),

      el("div.reg-c", {},
        compte(String(b.suivis), "suivis ici", "leur dossier existe", "vert"),
        b.aveugles ? compte(String(b.aveugles), "vivants sans dossier",
          "rien ne les suit", b.siensAveugles ? "alerte" : "attente") : null,
        compte(String(b.hors), "donnés pour finis", "rien à suivre", "terne"),
        b.doublons ? compte(String(b.doublons), "doublons", "marqués par le Radar", "terne") : null,
        b.malformes ? compte(String(b.malformes), "malformés", "à reprendre à la source", "alerte") : null),

      el("div.reg-n", {},
        el("b", {}, "Ce que ce registre dit, et lui seul  :  "),
        b.total + " briefs au Radar, " + b.maitres + " maîtres et " + b.taches + " tâches, "
        + "contre " + DEPOT.liste("projets").filter(function (p) {
            return (p.releve || {}).source; }).length + " campagnes documentées. "
        + "L'écart n'est pas une erreur de comptage : un brief est une demande, "
        + "une campagne est un corps de travail. " + b.siens + " briefs étaient sous "
        + "sa responsabilité directe."),

      el("div.reg-l", {}, vifs.map(function (r) {
        return bloc(r, a.enfants, 0, rafraichir);
      })),

      /* Trois cent soixante-six lignes à plat font dix-sept mille pixels de
       * haut, et la question que cet écran pose — qu'est-ce qui tourne sans
       * être suivi — disparaît au trentième écran de défilement. Ce qui
       * n'appelle aucun geste se replie sous son compte. */
      calmes.length
        ? el("details.reg-plus", {},
            el("summary", {},
              el("b", {}, calmes.length + (calmes.length > 1 ? " grappes sans geste" : " grappe sans geste")),
              el("span.dl-clos-q", {}, "suivies ici, données pour finies, ou marquées doublon")),
            el("div.reg-l", {}, calmes.map(function (r) {
              return bloc(r, a.enfants, 0, rafraichir);
            })))
        : null
    ));
  }

  /* Une grappe appelle un geste dès qu'une seule de ses lignes en appelle un :
   * un maître bouclé dont une tâche traîne n'est pas une grappe calme. */
  function appelleUnGeste(r, enfants) {
    var e = etat(r);
    if (e.cle === "aveugle" || e.cle === "malforme") return true;
    return (enfants[r.ndeg] || []).some(function (f) { return appelleUnGeste(f, enfants); });
  }

  function compte(v, nom, quoi, ton) {
    return el("div.reg-cc" + (ton ? "." + ton : ""), {},
      el("span.regc-v", {}, v),
      el("span.regc-n", {}, nom),
      el("span.regc-q", {}, quoi));
  }

  function bloc(r, enfants, niveau, rafraichir) {
    var fils = enfants[r.ndeg] || [];
    var moi = ligne(r, niveau, fils.length, rafraichir);
    if (!fils.length) return moi;
    return el("div.rad-grappe", {}, moi,
      el("div.rad-fils", {}, fils.map(function (f) {
        return bloc(f, enfants, niveau + 1, rafraichir);
      })));
  }

  function ligne(r, niveau, nFils, rafraichir) {
    var e = etat(r);
    var p = r.projetId ? DEPOT.trouve("projets", r.projetId) : null;

    return el("div.reg-r." + e.cle, { style: niveau ? { "--rang": String(niveau) } : {} },
      el("span.regr-ref", {}, r.ndeg),
      el("span.regr-n", {}, r.projet || "(sans intitulé)",
        nFils ? el("span.rad-n", {}, nFils + (nFils > 1 ? " tâches" : " tâche")) : null),
      el("span.regr-s", {},
        el("span.regrs-e." + e.ton, {}, e.nom),
        r.sienne ? el("span.regrs-p", {}, "à lui") : null),
      el("span.regr-q", {}, e.quoi),
      el("span.regr-g", {}, p ? GESTE.bouton("projet", { p: p }, "Ouvrir " + p.ref, "b.nu") : null)
    );
  }

  return { liste: liste, etat: etat, bilan: bilan, pire: pire, rendre: rendre };
})();
