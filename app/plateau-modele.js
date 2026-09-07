/* plateau-modele.js — la charge dans le temps.
 *
 * Le reste de l'outil décrit des objets. Ici on ne décrit rien : on calcule où
 * la pression s'accumule, qui la porte, et ce qu'un geste déplacerait.
 *
 * C'est la seule couche qui raisonne en semaines plutôt qu'en dossiers.
 */

window.PLATEAU = (function () {
  var CAPACITE = 5;        /* jours ouvrés par personne et par semaine */
  var HORIZON = 8;         /* semaines montrées */

  /* ————————————————————— Le calendrier ————————————————————— */

  function lundiDe(d) {
    var x = new Date(d instanceof Date ? d.getTime() : new Date(d).getTime());
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  function semaines() {
    var debut = lundiDe(new Date());
    var out = [];
    for (var i = 0; i < HORIZON; i++) {
      var d = new Date(debut.getTime() + i * 7 * 86400000);
      out.push({ cle: O.jour(d), debut: d, n: O.semaine(d), rang: i });
    }
    return out;
  }

  function semaineDe(date) {
    if (!date) return null;
    return O.jour(lundiDe(date));
  }

  /* La date qui compte pour un livrable : ce qui arrive en premier. */
  function echeanceDe(projet, l) {
    return l.remise || l.publication || l.echeance
      || (projet.sections.identite || {}).echeance || null;
  }

  /* ————————————————————— Les pièces en vol ————————————————————— */

  function pieces() {
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        var d = echeanceDe(p, l);
        var v = (l.versions || [])[l.versions.length - 1];
        out.push({
          id: l.id, objet: l, projet: p,
          nom: l.nom,
          date: d,
          semaine: semaineDe(d),
          responsable: l.responsable || null,
          charge: l.estime === null || l.estime === undefined ? null : Number(l.estime),
          etat: etat(p, l, v),
          attendMoi: !!(v && !v.verdict),
          retard: d ? Math.max(0, O.depuis(d)) : 0,
        });
      });
    });
    return out;
  }

  function etat(p, l, v) {
    if (REGLES.maitrePerime(p, l)) return "perime";
    if (v && !v.verdict) return "attente";
    if (REGLES.pretSur(l).part === 100) return "pret";
    if (!l.responsable || REGLES.droitsInsuffisants(l)) return "bloque";
    if ((l.versions || []).length) return "encours";
    return "pasdemarre";
  }

  /* ————————————————————— La pression, semaine par semaine ————————————————————— */

  function pression() {
    var sems = semaines();
    var ps = pieces();
    var gens = personnes();
    var capaciteTotale = gens.length * CAPACITE;
    var lundi = lundiDe(new Date());

    /* Ce qui est déjà en retard pèse avant tout le reste : on le met en tête,
     * sinon la masse la plus lourde est celle qu'on ne voit pas. */
    var enRetard = ps.filter(function (x) { return x.date && new Date(x.date) < lundi; });
    var chargeRetard = enRetard.filter(function (x) { return x.charge !== null; })
      .reduce(function (t, x) { return t + x.charge; }, 0);

    var bandes = [{
      cle: "retard", n: "!", debut: null, rang: -1, retard: true,
      pieces: enRetard, charge: chargeRetard,
      inconnue: enRetard.filter(function (x) { return x.charge === null; }).length,
      capacite: capaciteTotale,
      part: capaciteTotale ? Math.round((chargeRetard / capaciteTotale) * 100) : 0,
      ton: enRetard.length ? "retard" : "vide",
    }];

    return bandes.concat(sems.map(function (s) {
      var dedans = ps.filter(function (x) { return x.semaine === s.cle; });
      var connue = dedans.filter(function (x) { return x.charge !== null; });
      var inconnue = dedans.length - connue.length;
      var charge = connue.reduce(function (t, x) { return t + x.charge; }, 0);
      var part = capaciteTotale ? Math.round((charge / capaciteTotale) * 100) : 0;
      return {
        cle: s.cle, n: s.n, debut: s.debut, rang: s.rang,
        pieces: dedans, charge: charge, inconnue: inconnue,
        capacite: capaciteTotale, part: part,
        ton: inconnue && !charge ? "inconnue" : part > 100 ? "mur" : part > 80 ? "tendu" : part > 0 ? "tenable" : "vide",
      };
    }));
  }

  /* Ce qui n'a pas de date : hors du temps, donc invisible — c'est le pire cas. */
  function horsTemps() {
    return pieces().filter(function (x) { return !x.date; });
  }

  /* ————————————————————— Les gens ————————————————————— */

  /* Toute la chaîne créative, pas seulement le premier rang.
   *
   * Le filtre ne gardait que les postes rattachés DIRECTEMENT au titulaire.
   * Sur le plateau réel, ceux qui font le travail — graphic, motion, motion 3D,
   * web — sont rattachés au Directeur Artistique, donc au deuxième rang : ils
   * disparaissaient de la charge. On affectait des pièces à des gens que la vue
   * de capacité ne montrait pas. */
  function sousLeTitulaire(cle, garde) {
    if (!cle || (garde || 0) > 6) return false;
    if (cle === MAISON.titulaire) return true;
    var p = O.poste(cle);
    return p && p.rattache ? sousLeTitulaire(p.rattache, (garde || 0) + 1) : false;
  }

  function personnes() {
    return DEPOT.liste("personnes").filter(function (p) {
      if (p.archive) return false;
      return sousLeTitulaire(p.poste) || (p.casquettes || []).length > 0;
    });
  }

  function chargeDe(personneId, semaineCle) {
    var ps = pieces().filter(function (x) {
      return x.responsable === personneId && (!semaineCle || x.semaine === semaineCle);
    });
    var connue = ps.filter(function (x) { return x.charge !== null; });
    var jours = connue.reduce(function (t, x) { return t + x.charge; }, 0);
    var p = DEPOT.trouve("personnes", personneId);
    var cumul = (p && (p.casquettes || []).length)
      ? (p.casquettes || []).reduce(function (t, c) { return t + (c.part || 0); }, 0) : 0;
    var capacite = CAPACITE * (1 - Math.min(0.8, cumul / 100));
    return {
      jours: jours, pieces: ps.length, inconnues: ps.length - connue.length,
      capacite: Math.round(capacite * 10) / 10,
      part: capacite ? Math.round((jours / capacite) * 100) : 0,
      cumul: cumul,
    };
  }

  /* Qui a de l'air, cette semaine-là. */
  function disponibles(semaineCle) {
    return personnes().map(function (p) {
      var c = chargeDe(p.id, semaineCle);
      return { personne: p, charge: c, air: Math.max(0, c.capacite - c.jours) };
    }).sort(function (a, b) { return b.air - a.air; });
  }

  /* ————————————————————— Les quatre gestes, et leur onde de choc ————————————————————— */

  /* Aucun geste ne s'applique sans que sa conséquence ait été montrée. */

  function simulerDecaler(ids, semainesDe) {
    var avant = pression();
    var touches = [];
    var casse = [];

    ids.forEach(function (id) {
      var pc = trouverPiece(id);
      if (!pc) return;
      var nouvelle = pc.date
        ? new Date(new Date(pc.date).getTime() + semainesDe * 7 * 86400000)
        : null;
      touches.push({ piece: pc, de: pc.date, vers: nouvelle ? O.jour(nouvelle) : null });

      var limite = (pc.projet.sections.identite || {}).echeance;
      if (nouvelle && limite && nouvelle > new Date(limite)) {
        casse.push(pc.nom + " passerait après l'échéance client du " + O.joli(limite));
      }
      var maitre = pc.objet.maitre ? (pc.projet.livrables || []).filter(function (x) { return x.id === pc.objet.maitre; })[0] : null;
      if (maitre) {
        var dm = echeanceDe(pc.projet, maitre);
        if (nouvelle && dm && nouvelle < new Date(dm)) {
          casse.push(pc.nom + " passerait avant son maître");
        }
      }
    });

    var apres = simulerPression(touches);
    return { avant: avant, apres: apres, touches: touches, casse: casse, verbe: "décaler" };
  }

  function simulerVentiler(ids) {
    var repartition = [];
    var casse = [];
    ids.forEach(function (id) {
      var pc = trouverPiece(id);
      if (!pc) return;
      var libres = disponibles(pc.semaine).filter(function (d) {
        return d.personne.id !== pc.responsable && d.air > 0;
      });
      var vers = libres[0] || null;
      repartition.push({ piece: pc, de: pc.responsable, vers: vers ? vers.personne : null, air: vers ? vers.air : 0 });
      if (!vers) casse.push(pc.nom + " : personne n'a d'air cette semaine-là");
    });
    return { repartition: repartition, casse: casse, verbe: "ventiler" };
  }

  function simulerAnnuler(ids) {
    var libere = 0, hors = [], touches = [];
    ids.forEach(function (id) {
      var pc = trouverPiece(id);
      if (!pc) return;
      touches.push(pc);
      if (pc.charge) libere += pc.charge;
      if (pc.objet.origine === "prevu") {
        hors.push(pc.nom + " était prévu par la proposition validée — l'annuler sort du périmètre vendu");
      }
      var adapt = REGLES.adaptations(pc.projet, pc.id);
      if (adapt.length) hors.push(pc.nom + " porte " + adapt.length + " adaptations qui perdraient leur maître");
    });
    return { touches: touches, libere: libere, consequences: hors, verbe: "annuler" };
  }

  function simulerPropulser(ids) {
    var touches = [], repousses = [];
    ids.forEach(function (id) {
      var pc = trouverPiece(id);
      if (!pc) return;
      touches.push(pc);
      if (!pc.responsable || !pc.semaine) return;
      var meme = pieces().filter(function (x) {
        return x.responsable === pc.responsable && x.semaine === pc.semaine
          && x.id !== pc.id && x.charge !== null;
      });
      var c = chargeDe(pc.responsable, pc.semaine);
      if (c.part > 100 && meme.length) {
        meme.slice(0, 2).forEach(function (m) {
          repousses.push(m.nom + " (" + (DEPOT.trouve("personnes", pc.responsable) || {}).nom + ")");
        });
      }
    });
    return { touches: touches, repousses: repousses, verbe: "propulser" };
  }

  function estEnRetard(piece) {
    return piece.date && new Date(piece.date) < lundiDe(new Date());
  }

  function simulerPression(touches) {
    var deplacements = {};
    touches.forEach(function (t) { deplacements[t.piece.id] = t.vers; });
    var sems = semaines();
    var ps = pieces().map(function (x) {
      if (deplacements[x.id] !== undefined) {
        var d = deplacements[x.id];
        return Object.assign({}, x, { date: d, semaine: semaineDe(d) });
      }
      return x;
    });
    var cap = personnes().length * CAPACITE;
    return sems.map(function (s) {
      var dedans = ps.filter(function (x) { return x.semaine === s.cle; });
      var charge = dedans.filter(function (x) { return x.charge !== null; })
        .reduce(function (t, x) { return t + x.charge; }, 0);
      var part = cap ? Math.round((charge / cap) * 100) : 0;
      return { cle: s.cle, n: s.n, rang: s.rang, charge: charge, part: part,
        ton: part > 100 ? "mur" : part > 80 ? "tendu" : part > 0 ? "tenable" : "vide" };
    });
  }

  function trouverPiece(id) {
    var t = null;
    pieces().forEach(function (x) { if (x.id === id) t = x; });
    return t;
  }

  /* ————————————————————— Appliquer ————————————————————— */

  function appliquer(simulation) {
    var v = simulation.verbe;

    if (v === "décaler") {
      simulation.touches.forEach(function (t) {
        var l = t.piece.objet;
        if (!t.vers) return;
        if (l.remise) l.remise = t.vers;
        else if (l.publication) l.publication = t.vers;
        else l.echeance = t.vers;
        DEPOT.tracer("décalage", "livrables", t.piece.projet.id, l.nom + " → " + O.joli(t.vers));
      });
    }

    if (v === "ventiler") {
      simulation.repartition.forEach(function (r) {
        if (!r.vers) return;
        r.piece.objet.responsable = r.vers.id;
        DEPOT.tracer("ventilation", "livrables", r.piece.projet.id, r.piece.nom + " → " + r.vers.nom);
      });
    }

    if (v === "annuler") {
      simulation.touches.forEach(function (t) {
        t.objet = t.objet || t.piece;
        var l = t.objet || t.piece.objet;
        (t.piece ? t.piece.objet : t.objet).annule = new Date().toISOString();
        DEPOT.tracer("annulation", "livrables", (t.projet || t.piece.projet).id, (t.nom || t.piece.nom));
      });
    }

    if (v === "propulser") {
      simulation.touches.forEach(function (t) {
        var pc = t.piece || t;
        pc.objet.priorite = true;
        var d = pc.date ? new Date(new Date(pc.date).getTime() - 7 * 86400000) : null;
        if (d) {
          if (pc.objet.remise) pc.objet.remise = O.jour(d);
          else if (pc.objet.publication) pc.objet.publication = O.jour(d);
          else pc.objet.echeance = O.jour(d);
        }
        DEPOT.tracer("propulsion", "livrables", pc.projet.id, pc.nom);
      });
    }

    DEPOT.enregistrer();
  }

  return {
    CAPACITE: CAPACITE,
    semaines: semaines, semaineDe: semaineDe, echeanceDe: echeanceDe,
    pieces: pieces, pression: pression, horsTemps: horsTemps, estEnRetard: estEnRetard,
    personnes: personnes, chargeDe: chargeDe, disponibles: disponibles,
    simulerDecaler: simulerDecaler, simulerVentiler: simulerVentiler,
    simulerAnnuler: simulerAnnuler, simulerPropulser: simulerPropulser,
    appliquer: appliquer, trouverPiece: trouverPiece,
  };
})();
