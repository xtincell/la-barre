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

  /* Poser une inférence : la valeur va dans la section comme n'importe quelle
   * autre, et le registre garde qu'elle est inférée et pourquoi. */
  function poser(p, section, champ, valeur, motif) {
    if (!p.inferences) p.inferences = {};
    if (!p.sections[section]) p.sections[section] = {};
    p.sections[section][champ] = valeur;
    p.inferences[cle(section, champ)] = {
      pourquoi: motif, quand: new Date().toISOString(), par: MAISON.titulaire,
    };
  }

  /* Contresigner : la valeur devient reçue. C'est le seul geste qui la rend
   * opposable, et il ne se fait pas tout seul. */
  function contresigner(p, section, champ, qui) {
    if (!p.inferences) return;
    var i = p.inferences[cle(section, champ)];
    if (!i) return;
    delete p.inferences[cle(section, champ)];
    if (!p.contreseings) p.contreseings = [];
    p.contreseings.push({ champ: cle(section, champ), qui: qui || null,
      quand: new Date().toISOString(), motifInitial: i.pourquoi });
    DEPOT.tracer("contreseing", "inference", p.id, cle(section, champ));
  }

  function rejeter(p, section, champ) {
    if (!p.inferences) return;
    delete p.inferences[cle(section, champ)];
    if (p.sections[section]) p.sections[section][champ] = Array.isArray(p.sections[section][champ]) ? [] : "";
    DEPOT.tracer("inférence rejetée", "inference", p.id, cle(section, champ));
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
        };
      });
  }

  /* ————————————————————— L'étiquette, partout où la valeur s'affiche ————————————————————— */

  function marque(motif) {
    return el("span.inf", { title: motif || "inféré, non contresigné" }, "inféré");
  }

  /* ————————————————————— Le bandeau des contreseings ————————————————————— */

  function bande(p, rafraichir, section) {
    var l = liste(p, section);
    if (!l.length) return null;
    var critiques = l.filter(function (x) { return x.critique; }).length;
    var ailleurs = section ? liste(p).length - l.length : 0;

    var texte = l.length === 1
      ? "Un champ de cette section tient sur une inférence"
      : l.length + " champs de cette section tiennent sur une inférence";
    if (critiques && critiques < l.length) texte += ", dont " + critiques + " critique" + (critiques > 1 ? "s" : "");
    else if (critiques === l.length) texte += (l.length > 1 ? ", tous critiques" : ", critique");
    texte += l.length > 1 ? " — utilisables pour travailler, pas opposables au client."
      : " — utilisable pour travailler, pas opposable au client.";
    if (ailleurs) texte += "  " + ailleurs + " autre" + (ailleurs > 1 ? "s" : "") + " ailleurs dans le dossier.";

    return UI.banniere("", texte,
      { nom: "Faire contresigner", quand: function () { panneau(p, rafraichir, section); } });
  }

  function panneau(p, rafraichir, section) {
    var boite = el("div");

    function dessiner() {
      O.vider(boite);
      var restantes = liste(p, section);
      if (!restantes.length) {
        boite.appendChild(UI.banniere("vert", "Plus rien ne tient sur une inférence. Tout est reçu."));
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
              INFERENCE.contresigner(p, x.section, x.champ, null);
              DEPOT.enregistrer(); dessiner(); if (rafraichir) rafraichir();
            } }, "Contresigné"),
            el("button.b", { type: "button", onclick: function () {
              PANNEAU.fermer();
              RENVOI.ouvrir({ quoi: x.nom + " — " + p.ref, projet: p.ref, projetId: p.id, objet: x.section,
                motif: "J'ai inféré : « " + (Array.isArray(x.valeur) ? x.valeur.join(" · ") : x.valeur)
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

    PANNEAU.ouvrir("Ce qui tient sur une inférence",
      p.ref + (section ? " · " + section : ""), el("div", {},
      UI.banniere("", "J'ai raisonné à partir du dossier. Tant que le propriétaire n'a pas contresigné, ces valeurs font travailler l'équipe mais ne s'opposent à personne."),
      boite));
  }

  return { poser: poser, contresigner: contresigner, rejeter: rejeter,
    est: est, pourquoi: pourquoi, compte: compte, liste: liste,
    marque: marque, bande: bande, panneau: panneau };
})();
