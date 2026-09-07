/* validation.js — le verdict, sur un document et pas seulement sur un livrable.
 *
 * Le brief se valide, la plateforme se valide, la stratégie, l'idée, les
 * pistes. Le processus le suppose partout et ne l'outillait nulle part : on ne
 * pouvait rendre un verdict que sur un livrable.
 *
 * Quatre verdicts, motif obligatoire pour trois d'entre eux, et le motif se
 * choisit d'abord dans les critères écrits.
 */

window.VALIDATION = (function () {
  var el = O.el;

  /* Ce qu'on peut valider, et par quels critères on le refuse. */
  var OBJETS = {
    brief: { nom: "le brief", criteres: "brief", poste: "clientele",
      apres: "Le travail créatif peut commencer." },
    socle: { nom: "la plateforme de marque", criteres: null, poste: "creation",
      apres: "Les campagnes pourront s'y rattacher." },
    strategie: { nom: "la stratégie", criteres: null, poste: "planning",
      apres: "Le territoire devient opposable au DA." },
    bigidea: { nom: "la big idea", criteres: "bigidea", poste: "creation",
      apres: "La demande de proposition peut partir." },
    piste: { nom: "la piste créative", criteres: "proposition", poste: "da",
      apres: "La production peut s'ouvrir sur cette piste." },
    /* Un calendrier mensuel se valide avant le 5, et cette validation est ce
     * qui rend chaque publication opposable. Sans elle, chacune peut être
     * rediscutée le jour de sa parution — et un cycle ne se rattrape pas. */
    calendrier: { nom: "le calendrier du mois", criteres: null, poste: "clientele",
      apres: "Les publications du mois deviennent opposables : on ne rediscute plus un livrable validé au calendrier." },
  };

  function etat(objet) {
    var d = objet && objet.validation;
    if (!d) return { cle: "aucun", nom: "non validé", ton: "attente" };
    var v = MAISON.verdicts.filter(function (x) { return x.cle === d.verdict; })[0];
    return { cle: d.verdict, nom: v ? v.nom : d.verdict,
      ton: d.verdict === "approuve" ? "vert" : d.verdict === "reserve" ? "attente" : "alerte",
      quand: d.quand, motif: d.motif, par: d.par, version: d.version };
  }

  /* Un verdict rendu sur une version antérieure ne vaut plus. */
  function perime(objet) {
    var d = objet && objet.validation;
    if (!d) return false;
    return (d.version || 1) < VERSION.num(objet);
  }

  function valide(objet) {
    var d = objet && objet.validation;
    return !!d && d.verdict === "approuve" && !perime(objet);
  }

  /* ————————————————————— L'étiquette ————————————————————— */

  function marque(objet) {
    var e = etat(objet);
    if (e.cle === "aucun") return UI.eti("non validé", "attente");
    if (perime(objet)) return UI.eti(e.nom + " sur V" + e.version, "alerte");
    return UI.eti(e.nom, e.ton);
  }

  /* ————————————————————— La bande de validation ————————————————————— */

  function bande(p, cle, objet, rafraichir) {
    var def = OBJETS[cle];
    if (!def) return null;
    var e = etat(objet);
    var vieux = perime(objet);
    var infs = window.INFERENCE ? INFERENCE.compte(p, cle) : 0;

    var lignes = [];
    if (e.cle === "aucun") {
      lignes.push(UI.banniere("", "Personne n'a rendu de verdict sur " + def.nom
        + ". Tant qu'il n'y en a pas, l'aval travaille sans savoir si l'amont tient."));
    } else if (vieux) {
      lignes.push(UI.banniere("rouge", e.nom + " — mais sur la V" + e.version
        + ", et on en est à la V" + VERSION.num(objet)
        + ". Le verdict ne couvre plus ce qui est écrit."));
    } else {
      lignes.push(UI.banniere(e.ton === "vert" ? "vert" : "",
        e.nom + " le " + O.joli(e.quand) + (e.motif ? " — " + e.motif : "")
        + (e.ton === "vert" ? ".  " + def.apres : "")));
    }

    if (infs) {
      lignes.push(UI.banniere("", infs + (infs > 1 ? " champs de cette section tiennent" : " champ de cette section tient")
        + " sur une inférence : un verdict rendu dessus ne s'oppose à personne."));
    }

    return el("div.vd", {},
      lignes,
      el("div.vd-gestes", {},
        el("span.vd-v", {}, "V" + VERSION.num(objet)),
        MAISON.verdicts.map(function (v) {
          return el("button.b" + (v.cle === "approuve" ? ".vert" : ""), { type: "button",
            title: v.nom, onclick: function () { rendre(p, cle, objet, v, rafraichir); } },
            v.signe + "  " + v.nom);
        }),
        el("button.b.nu", { type: "button", onclick: function () {
          VERSION.nouvelle(objet, def.nom, rafraichir, {
            quand: function () { if (objet.validation) objet.validation.perime = true; },
          });
        } }, "Nouvelle version"),
        VERSION.historique(objet).length
          ? el("button.b.nu", { type: "button", onclick: function () {
              PANNEAU.ouvrir("Versions — " + def.nom, p.ref, VERSION.fil(objet));
            } }, VERSION.historique(objet).length + " versions")
          : null
      ));
  }

  /* ————————————————————— Rendre le verdict ————————————————————— */

  function rendre(p, cle, objet, verdict, rafraichir) {
    var def = OBJETS[cle];
    var criteres = def.criteres ? MAISON.criteresDe(def.criteres) : [];
    var choisi = null;
    var libre = el("textarea", { rows: 2, placeholder: "En une phrase" });

    var liste = el("div.motifs");
    criteres.forEach(function (c) {
      var b = el("button.motif", { type: "button", onclick: function () {
        choisi = c;
        [].forEach.call(liste.children, function (x) { x.className = "motif"; });
        b.className = "motif actif";
      } }, c);
      liste.appendChild(b);
    });

    var suite = aval(p, cle, verdict);

    PANNEAU.sur(verdict.nom + " — " + def.nom, "V" + VERSION.num(objet), el("div", {},
      suite.length
        ? el("div.stats", {}, suite.map(function (s) {
            return UI.stat(s.t, s.v, s.s, s.ton || "");
          }))
        : null,

      verdict.motifRequis
        ? el("div", {},
            criteres.length
              ? el("div.sousbloc", {}, el("h3", {}, "LE MOTIF, D'ABORD DANS LES CRITÈRES ÉCRITS"), liste)
              : UI.banniere("", "Aucun critère écrit pour ce document : le refus ne pourra s'appuyer que sur du texte libre. C'est exactement la dérive que le §8 nomme."),
            el("div.form", {}, el("div.champ", {},
              el("label", {}, criteres.length ? "Ou en toutes lettres" : "Le motif"), libre)))
        : UI.banniere("vert", def.apres),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var motif = choisi || libre.value.trim();
          if (verdict.motifRequis && !motif) {
            AVIS.refus("Ce verdict exige un motif. Refuser sans critère, c'est refuser par goût.");
            return;
          }
          objet.validation = { verdict: verdict.cle, motif: motif || null,
            quand: new Date().toISOString(), par: MAISON.titulaire,
            version: VERSION.num(objet) };
          DEPOT.ajoute("decisions", { objet: cle, type: cle, projet: p.id,
            verdict: verdict.cle, motif: motif || null, quand: objet.validation.quand,
            qui: MAISON.titulaire, titre: def.nom });
          DEPOT.tracer("verdict", cle, p.id, verdict.nom + (motif ? " — " + motif : ""));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (rafraichir) rafraichir();
        } }, verdict.nom),
        verdict.cle !== "approuve"
          ? el("button.b", { type: "button", onclick: function () {
              PANNEAU.fermerSur(); PANNEAU.fermer();
              RENVOI.ouvrir({ quoi: def.nom + " — " + p.ref, projet: p.ref, projetId: p.id,
                objet: cle, motif: choisi || libre.value.trim() });
            } }, "Et le renvoyer à " + O.poste(def.poste).court)
          : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* Ce que le verdict ouvre ou ferme en aval. */
  function aval(p, cle, verdict) {
    var out = [];
    if (cle === "piste") {
      var n = (p.livrables || []).length;
      out.push({ t: "EN AVAL", v: String(n), s: n > 1 ? "livrables attendent cette piste" : "livrable attend cette piste",
        ton: verdict.cle === "approuve" ? "" : "alerte" });
    }
    if (cle === "bigidea") {
      var pistes = (p.sections.pistes || []).length;
      out.push({ t: "EN AVAL", v: String(pistes), s: pistes > 1 ? "pistes en dépendent" : "piste en dépend",
        ton: verdict.cle === "approuve" ? "" : "alerte" });
    }
    if (cle === "brief" && verdict.cle !== "approuve") {
      out.push({ t: "L'HORLOGE", v: "s'arrête", s: "et celle de la Clientèle démarre", ton: "" });
    }
    if (cle === "socle") {
      var n2 = DEPOT.liste("projets").filter(function (x) {
        return (x.sections.identite || {}).marque === (p.sections.identite || {}).marque;
      }).length;
      out.push({ t: "PORTÉE", v: String(n2), s: n2 > 1 ? "dossiers sur cette marque" : "dossier sur cette marque", ton: "" });
    }
    return out;
  }

  return { OBJETS: OBJETS, etat: etat, perime: perime, valide: valide,
    marque: marque, bande: bande, rendre: rendre };
})();
