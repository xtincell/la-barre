/* inference.js — ce qui n'est pas déductible est inférable.
 *
 * Un champ vide arrête la chaîne. Un champ inventé la fausse. Entre les deux il
 * y a l'inférence : une valeur raisonnée, son motif écrit, et un statut qui dit
 * qu'elle n'a pas encore été contresignée par celui à qui elle appartient.
 *
 * Trois états, jamais deux :
 *   — reçu      : le propriétaire l'a écrit ou contresigné. Opposable.
 *   — inféré    : j'ai raisonné à partir du dossier. Utilisable, pas opposable.
 *   — manquant  : ni l'un ni l'autre. La chaîne s'arrête là.
 */

window.INFERENCE = (function () {
  var el = O.el;

  function cle(section, champ) { return section + "." + champ; }

  function toutes(p) { return p.inferences || {}; }

  function est(p, section, champ) {
    return !!toutes(p)[cle(section, champ)];
  }

  function pourquoi(p, section, champ) {
    var i = toutes(p)[cle(section, champ)];
    return i ? i.pourquoi : null;
  }

  function libelle(p, section, champ) {
    var i = toutes(p)[cle(section, champ)];
    return i && i.nature === "declaration" ? "à confirmer" : "inféré";
  }

  /* Une saisie conserve le contenu et sa provenance. Elle ne vaut jamais
   * confirmation par le client ou par le responsable d'un autre poste. */
  function corriger(p, section, changements) {
    if (!p.sections[section]) p.sections[section] = {};
    var objet = p.sections[section];
    var def = CHAMPS.section(section);
    var autorises = (def ? def.champs : []).map(function (c) { return c.cle; });
    var champs = Object.keys(changements).filter(function (c) {
      return autorises.indexOf(c) !== -1
        && JSON.stringify(objet[c]) !== JSON.stringify(changements[c]);
    });
    if (!champs.length) return false;
    if (objet.validation && (objet.validation.version || 1) === VERSION.num(objet)) {
      VERSION.ouvrir(objet, "interne", "Correction manuelle : " + champs.map(function (c) {
        return def.champs.filter(function (x) { return x.cle === c; })[0].nom;
      }).join(", "), MAISON.titulaire, { complet: true });
    }
    if (!p.inferences) p.inferences = {};
    champs.forEach(function (c) {
      var k = cle(section, c), avant = p.inferences[k];
      var valeur = changements[c];
      objet[c] = valeur === undefined ? "" : JSON.parse(JSON.stringify(valeur));
      var rempli = Array.isArray(objet[c]) ? objet[c].length : objet[c] !== null && String(objet[c]).trim() !== "";
      if (!rempli) { delete p.inferences[k]; return; }
      p.inferences[k] = { nature: "declaration", pourquoi: "Saisie manuelle, confirmation non consignée.",
        motifInitial: avant ? (avant.motifInitial || avant.pourquoi) : null,
        quand: new Date().toISOString(), par: MAISON.titulaire,
        acteur: window.ACTEUR ? ACTEUR.trace() : null };
    });
    return true;
  }

  /* Poser une inférence : la valeur va dans la section comme n'importe quelle
   * autre, et le registre garde qu'elle est inférée et pourquoi. */
  function poser(p, section, champ, valeur, motif) {
    var changement = {}; changement[champ] = valeur;
    corriger(p, section, changement);
    if (!p.inferences) p.inferences = {};
    if (!p.sections[section]) p.sections[section] = {};
    p.sections[section][champ] = valeur;
    p.inferences[cle(section, champ)] = {
      pourquoi: motif, quand: new Date().toISOString(), par: MAISON.titulaire,
      acteur: window.ACTEUR ? ACTEUR.trace() : null,
    };
  }

  /* Contresigner : la valeur devient reçue. C'est le seul geste qui la rend
   * opposable, et il ne se fait pas tout seul. */
  function contresigner(p, section, champ, qui, preuve) {
    if (!p.inferences || !String(qui || "").trim() || !preuve || !String(preuve.reference || "").trim()) return false;
    var i = p.inferences[cle(section, champ)];
    if (!i) return false;
    var valeur = (p.sections[section] || {})[champ];
    if (Object.prototype.hasOwnProperty.call(preuve, "attendu")
        && JSON.stringify(preuve.attendu) !== JSON.stringify(valeur)) return false;
    delete p.inferences[cle(section, champ)];
    if (!p.contreseings) p.contreseings = [];
    p.contreseings.push({ champ: cle(section, champ), qui: String(qui).trim(),
      reference: String(preuve.reference).trim(), valeur: JSON.parse(JSON.stringify(valeur)),
      version: VERSION.num(p.sections[section]), acteur: window.ACTEUR ? ACTEUR.trace() : null,
      quand: new Date().toISOString(), motifInitial: i.motifInitial || i.pourquoi });
    DEPOT.tracer("contreseing", "inference", p.id, cle(section, champ));
    return true;
  }

  function confirmer(p, section, champ, apres) {
    var attendu = JSON.parse(JSON.stringify((p.sections[section] || {})[champ]));
    var qui = el("input", { type: "text", "aria-label": "Confirmé par", placeholder: "Personne ayant confirmé la valeur" });
    var reference = el("textarea", { rows: 2, "aria-label": "Référence de la confirmation",
      placeholder: "Document, message ou décision datée permettant de retrouver cette confirmation" });
    PANNEAU.sur("Consigner une confirmation", p.ref, el("div", {},
      el("p", {}, "La saisie d’une proposition et sa confirmation sont deux gestes distincts. Indiquez qui a confirmé cette valeur et où retrouver son accord."),
      el("blockquote", {}, Array.isArray(attendu) ? attendu.join(" · ") : String(attendu || "")),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Confirmé par"), qui),
        el("div.champ", {}, el("label", {}, "Référence de la confirmation"), reference)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!qui.value.trim() || !reference.value.trim()) {
            AVIS.refus("La personne et la référence sont nécessaires pour consigner cette confirmation."); return;
          }
          if (!contresigner(p, section, champ, qui.value, { reference: reference.value, attendu: attendu })) {
            AVIS.refus("La valeur a changé depuis l’ouverture. Relisez-la avant de la confirmer."); return;
          }
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
        } }, "Consigner la confirmation"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  function rejeter(p, section, champ) {
    if (!p.inferences) return;
    var changement = {};
    changement[champ] = Array.isArray((p.sections[section] || {})[champ]) ? [] : "";
    corriger(p, section, changement);
    delete p.inferences[cle(section, champ)];
    DEPOT.tracer("inférence rejetée", "inference", p.id, cle(section, champ));
  }

  function confirmation(p, section, champ) {
    var v = (p.sections[section] || {})[champ];
    if (est(p, section, champ)) return null;
    return (p.contreseings || []).slice().reverse().filter(function (c) {
      return c.champ === cle(section, champ) && c.qui && c.reference
        && Object.prototype.hasOwnProperty.call(c, "valeur") && JSON.stringify(c.valeur) === JSON.stringify(v);
    })[0] || null;
  }

  /* Combien de champs de ce projet tiennent sur une inférence. */
  function compte(p, section) {
    return Object.keys(toutes(p)).filter(function (k) {
      return !section || k.indexOf(section + ".") === 0;
    }).length;
  }

  function liste(p, section) {
    return Object.keys(toutes(p))
      .filter(function (k) { return !section || k.indexOf(section + ".") === 0; })
      .map(function (k) {
        var m = k.split(".");
        var def = CHAMPS.section(m[0]);
        var champ = def ? (def.champs.filter(function (c) { return c.cle === m[1]; })[0] || null) : null;
        return {
          section: m[0], champ: m[1], cle: k,
          nom: champ ? champ.nom : m[1],
          critique: champ ? !!(champ.critique || champ.requis) : false,
          poste: def ? (champ && champ.poste ? champ.poste : def.poste) : null,
          valeur: (p.sections[m[0]] || {})[m[1]],
          pourquoi: toutes(p)[k].pourquoi,
          nature: toutes(p)[k].nature || "inference",
        };
      });
  }

  /* ————————————————————— L'étiquette, partout où la valeur s'affiche ————————————————————— */

  function marque(motif, label) {
    return el("span.inf", { title: motif || "Confirmation non consignée" }, label || "inféré");
  }

  /* ————————————————————— Le bandeau des contreseings ————————————————————— */

  function bande(p, rafraichir, section) {
    var l = liste(p, section);
    if (!l.length) return null;
    var critiques = l.filter(function (x) { return x.critique; }).length;
    var ailleurs = section ? liste(p).length - l.length : 0;

    var texte = l.length === 1
      ? "Un champ de cette section reste à confirmer"
      : l.length + " champs de cette section restent à confirmer";
    if (critiques && critiques < l.length) texte += ", dont " + critiques + " critique" + (critiques > 1 ? "s" : "");
    else if (critiques === l.length) texte += (l.length > 1 ? ", tous critiques" : ", critique");
    texte += l.length > 1 ? " — utilisables pour travailler, pas opposables au client."
      : " — utilisable pour travailler, pas opposable au client.";
    if (ailleurs) texte += "  " + ailleurs + " autre" + (ailleurs > 1 ? "s" : "") + " ailleurs dans le dossier.";

    return UI.banniere("", texte,
      { nom: "Examiner les confirmations", quand: function () { panneau(p, rafraichir, section); } });
  }

  function panneau(p, rafraichir, section) {
    var boite = el("div");

    function dessiner() {
      O.vider(boite);
      var restantes = liste(p, section);
      if (!restantes.length) {
        boite.appendChild(UI.banniere("vert", "Aucune proposition en attente de confirmation dans cette section."));
        return;
      }
      restantes.forEach(function (x) {
        boite.appendChild(el("div.inf-l" + (x.critique ? ".critique" : ""), {},
          el("div.infl-tete", {},
            el("span.infl-nom", {}, x.nom),
            x.critique ? UI.eti("critique", "alerte") : null,
            el("span.infl-poste", {}, O.poste(x.poste).court)
          ),
          el("div.infl-v", {}, Array.isArray(x.valeur) ? x.valeur.join(" · ") : String(x.valeur || "")),
          el("div.infl-p", {}, "Pourquoi : " + x.pourquoi),
          el("div.infl-g", {},
            el("button.b.or", { type: "button", onclick: function () {
              confirmer(p, x.section, x.champ, function () { dessiner(); if (rafraichir) rafraichir(); });
            } }, "Consigner une confirmation"),
            el("button.b", { type: "button", onclick: function () {
              PANNEAU.fermer();
              RENVOI.ouvrir({ quoi: x.nom + " — " + p.ref, projet: p.ref, projetId: p.id, objet: x.section,
                motif: "À confirmer : « " + (Array.isArray(x.valeur) ? x.valeur.join(" · ") : x.valeur)
                  + " ». " + x.pourquoi + " Merci de confirmer ou de corriger." });
            } }, "Demander à " + O.poste(x.poste).court),
            el("button.b.nu", { type: "button", onclick: function () {
              INFERENCE.rejeter(p, x.section, x.champ);
              DEPOT.enregistrer(); dessiner(); if (rafraichir) rafraichir();
            } }, "Faux — vider"))
        ));
      });
    }
    dessiner();

    PANNEAU.ouvrir("Les confirmations en attente",
      p.ref + (section ? " · " + section : ""), el("div", {},
      UI.banniere("", "Ces valeurs permettent de travailler. Leur saisie ne prouve pas un accord : consignez la personne et la référence de chaque confirmation reçue."),
      boite));
  }

  return { poser: poser, corriger: corriger, contresigner: contresigner, confirmer: confirmer, confirmation: confirmation, rejeter: rejeter, libelle: libelle,
    est: est, pourquoi: pourquoi, compte: compte, liste: liste,
    marque: marque, bande: bande, panneau: panneau };
})();
