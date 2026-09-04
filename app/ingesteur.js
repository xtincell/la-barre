/* ingesteur.js — recevoir un brief qui n'est pas au format.
 *
 * Dans la vraie vie le brief n'arrive jamais rempli : c'est un mail, un vocal
 * retranscrit, trois messages et une pièce jointe. Le mettre en forme moi-même
 * est le geste le plus fréquent du poste, et il n'existait nulle part.
 *
 * Deux règles le rendent sain plutôt que dangereux :
 *
 *   1 · Structurer n'est pas écrire. À gauche le reçu tel quel, à droite les
 *       champs. On DÉPLACE du contenu, on n'en invente pas. Chaque champ garde
 *       la citation d'où il vient. Ce qui n'existe pas à gauche reste vide à
 *       droite, et compté manquant.
 *
 *   2 · Rien n'entre sans contreseing. Le brief mis en forme repart à la
 *       Clientèle avec le message rédigé. Tant que le go final n'est pas là, il
 *       n'engage rien.
 */

window.INGESTEUR = (function () {
  var el = O.el;

  /* Les mots qui trahissent un champ. Ce n'est pas de la compréhension, c'est
   * du repérage : ça propose, je décide. */
  var INDICES = {
    probleme: ["problème", "difficulté", "enjeu", "on n'arrive pas", "on perd", "concurrence"],
    objectif_business: ["objectif", "vendre", "chiffre", "part de marché", "référencement", "croissance", "%"],
    objectif_com: ["notoriété", "faire connaître", "image", "perception", "communiquer", "visibilité"],
    cible: ["cible", "cibles", "audience", "consommateur", "ans", "urbain", "jeunes", "femmes", "hommes"],
    insight: ["insight", "ils pensent", "ils disent", "vérité", "ressenti"],
    promesse: ["promesse", "bénéfice", "on leur promet"],
    rtb: ["parce que", "preuve", "reason", "rtb", "car "],
    ton: ["ton", "tonalité", "registre", "surtout pas", "on ne veut pas", "éviter"],
    contraintes: ["contrainte", "budget", "délai", "avant le", "impression", "format", "technique"],
    mandatories: ["obligatoire", "impératif", "doit figurer", "mention", "logo"],
    livrables_attendus: ["livrable", "on veut", "il nous faut", "kv", "affiche", "film", "post", "plv"],
    kpis: ["mesur", "kpi", "indicateur", "objectif chiffré", "suivi"],
    verbatim: [],
  };

  /* ————————————————————— L'écran ————————————————————— */

  function ouvrir(p, rafraichir) {
    var def = window.CHAMPS.section("brief");
    var source = el("textarea.ing-src", { rows: 22,
      placeholder: "Colle ici le brief tel qu'il est arrivé — mail, message, retranscription. Ne le corrige pas : c'est la source, elle doit rester intacte." });
    if (p.briefSource) source.value = p.briefSource;

    var valeurs = Object.assign({}, p.sections.brief || {});
    var citations = Object.assign({}, p.briefCitations || {});
    var courant = null;

    var colD = el("div.ing-droite");
    var bande = el("div");
    var pied = el("div");

    /* La sélection dans la source : c'est elle qui alimente un champ. */
    function selection() {
      var d = source.selectionStart, f = source.selectionEnd;
      return d !== f ? source.value.slice(d, f).trim() : "";
    }

    function poser(cle) {
      var t = selection();
      if (!t) {
        AVIS.refus("Sélectionne d'abord le passage dans la source, à gauche.\n\nOn déplace du contenu — on n'en écrit pas.");
        return;
      }
      valeurs[cle] = estListe(cle) ? decouper(t) : t;
      citations[cle] = t;
      dessiner();
    }

    function vider(cle) { delete valeurs[cle]; delete citations[cle]; dessiner(); }

    function estListe(cle) {
      var c = def.champs.filter(function (x) { return x.cle === cle; })[0];
      return c && c.type === "puces";
    }
    function decouper(t) {
      return t.split(/\n|;|·/).map(function (x) { return x.replace(/^[-–•*\s]+/, "").trim(); })
        .filter(function (x) { return x; });
    }

    /* Ce que la source suggère pour un champ : les passages qui portent ses
     * indices. Une proposition, jamais un remplissage. */
    function pistes(cle) {
      var mots = INDICES[cle] || [];
      if (!mots.length || !source.value) return [];
      var phrases = source.value.split(/(?<=[.!?\n])\s+/).filter(function (x) { return x.trim().length > 12; });
      return phrases.filter(function (ph) {
        var n = O.normalise(ph);
        return mots.some(function (m) { return n.indexOf(O.normalise(m)) !== -1; });
      }).slice(0, 3);
    }

    function dessiner() {
      O.vider(colD);
      O.vider(bande);
      O.vider(pied);

      var e = window.CHAMPS.etat("brief", valeurs);
      var critiques = def.champs.filter(function (c) { return c.critique; });
      var vides = critiques.filter(function (c) {
        var v = valeurs[c.cle];
        return Array.isArray(v) ? !v.length : !String(v || "").trim();
      });

      bande.appendChild(UI.recevabilite(
        vides.length ? "Ce brief est-il complet ?" : "Le brief est complet",
        def.champs.filter(function (c) { return c.critique; }).map(function (c) {
          var v = valeurs[c.cle];
          var ok = Array.isArray(v) ? v.length > 0 : !!String(v || "").trim();
          return { quoi: c.nom, ok: ok, poids: 4,
            cout: "champ critique vide — motif de retour opposable au §8" };
        }), null, []));

      def.champs.forEach(function (c) {
        var v = valeurs[c.cle];
        var rempli = Array.isArray(v) ? v.length > 0 : !!String(v || "").trim();
        var mien = c.poste === MAISON.titulaire || !c.poste;
        var sugg = rempli ? [] : pistes(c.cle);

        colD.appendChild(el("div.ing-c" + (rempli ? ".rempli" : c.critique ? ".manque" : "") , {},
          el("div.ingc-t", {},
            el("span.ingc-n", {}, c.nom),
            c.critique ? UI.eti("critique", rempli ? "terne" : "alerte") : null,
            el("span.ingc-p", {}, O.poste(c.poste || def.poste).court)),

          rempli
            ? el("div", {},
                el("div.ingc-v", {}, Array.isArray(v) ? v.join("  ·  ") : v),
                citations[c.cle]
                  ? el("div.ingc-cit", {}, "d'après : « " + citations[c.cle].slice(0, 120)
                      + (citations[c.cle].length > 120 ? "…" : "") + " »")
                  : el("div.ingc-cit.sans", {}, "sans citation d'origine — saisi à la main"),
                el("button.b.nu", { type: "button", onclick: function () { vider(c.cle); } }, "retirer"))
            : el("div", {},
                el("button.b" + (c.critique ? ".or" : ""), { type: "button",
                  onclick: function () { poser(c.cle); } }, "← poser la sélection ici"),
                sugg.length
                  ? el("div.ingc-sugg", {}, sugg.map(function (ph) {
                      return el("button.ingcs", { type: "button", onclick: function () {
                        valeurs[c.cle] = estListe(c.cle) ? decouper(ph) : ph.trim();
                        citations[c.cle] = ph.trim(); dessiner();
                      } }, "« " + ph.trim().slice(0, 100) + (ph.length > 100 ? "…" : "") + " »");
                    }))
                  : null,
                !mien
                  ? el("div.ingc-f", {}, "ce champ appartient à " + O.poste(c.poste).nom
                      + " — je le déplace, je ne l'écris pas")
                  : null)
        ));
      });

      pied.appendChild(el("div.ing-pied", {},
        el("div.ingp-c", {}, e.fait + " sur " + e.total + " champs"
          + (vides.length ? "  ·  " + vides.length + " critiques vides" : "  ·  tous les critiques sont là")),
        el("div.form-actions", {},
          el("button.b.or", { type: "button", onclick: function () { demanderGo(); } },
            "Enregistrer et demander le go"),
          el("button.b", { type: "button", onclick: function () { enregistrer(); PANNEAU.fermer(); rafraichir(); } },
            "Enregistrer seulement"),
          el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))));
    }

    function enregistrer() {
      p.sections.brief = Object.assign(p.sections.brief || {}, valeurs);
      p.briefSource = source.value;
      p.briefCitations = citations;
      /* Ce que j'ai déplacé sans citation est une inférence, pas du reçu. */
      def.champs.forEach(function (c) {
        var v = valeurs[c.cle];
        var rempli = Array.isArray(v) ? v.length > 0 : !!String(v || "").trim();
        if (rempli && !citations[c.cle]) {
          INFERENCE.poser(p, "brief", c.cle, v,
            "Saisi à la mise en forme sans citation de la source : c'est une reconstitution, pas les mots du client.");
        }
      });
      DEPOT.tracer("brief mis en forme", "brief", p.id,
        window.CHAMPS.etat("brief", valeurs).fait + " champs");
      DEPOT.enregistrer();
    }

    /* Le go final : un objet, pas une politesse. */
    function demanderGo() {
      enregistrer();
      var e = window.CHAMPS.etat("brief", valeurs);
      var manque = e.manquants.map(function (c) { return c.nom; });

      var message = "Bonjour,\n\n"
        + "J'ai mis en forme le brief « " + p.nom + " » (" + p.ref + ") dans notre structure. "
        + "Je n'ai rien écrit de neuf : chaque champ vient d'un passage de ce que vous m'avez transmis.\n\n"
        + "Ce que j'ai rangé : " + e.fait + " champs sur " + e.total + ".\n"
        + (manque.length
            ? "Ce qui manque et que je ne peux pas inventer :\n"
              + manque.map(function (m) { return "  · " + m; }).join("\n") + "\n\n"
            : "Rien ne manque.\n\n")
        + "Merci de confirmer que c'est bien ce que vous avez voulu dire, ou de corriger. "
        + "Tant que je n'ai pas votre retour, le brief est en attente et n'engage la création sur rien.";

      var selQ = el("select", {});
      DEPOT.liste("personnes").filter(function (x) { return x.poste === "clientele"; })
        .forEach(function (x) { selQ.appendChild(el("option", { value: x.id }, x.nom)); });
      var zone = el("textarea", { rows: 10 });
      zone.value = message;

      PANNEAU.sur("Demander le go final", p.ref, el("div", {},
        UI.banniere("", "Le go final est un objet : qui, quand, sur quelle version. Tant qu'il n'est pas là, le brief est en attente et la création ne s'engage sur rien."),
        el("div.form", {},
          el("div.champ", {}, el("label", {}, "À qui"), selQ),
          el("div.champ", {}, el("label", {}, "Le message"),
            el("div.indice", {}, "L'outil n'envoie rien. Il écrit, tu portes."), zone)),
        el("div.form-actions", {},
          el("button.b.or", { type: "button", onclick: function () {
            p.goFinal = { demande_le: new Date().toISOString(), a: selQ.value,
              message: zone.value, version: VERSION.num(p.sections.brief), recu_le: null };
            DEPOT.ajoute("attentes", { id: O.id("AT"), quoi: "Go final sur le brief — " + p.ref,
              projet: p.id, projetId: p.id, destinataire: selQ.value,
              critere: "Un brief mis en forme par la Création n'engage rien sans contreseing de son propriétaire",
              attendu: "Confirmation ou correction du brief mis en forme",
              depuis: new Date().toISOString(), message: zone.value });
            DEPOT.tracer("go final demandé", "brief", p.id, "");
            DEPOT.enregistrer(); PANNEAU.fermerSur(); PANNEAU.fermer(); rafraichir();
          } }, "Enregistrer l'attente"),
          el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
      ));
    }

    source.addEventListener("input", dessiner);
    dessiner();

    PANNEAU.ouvrir("Mettre en forme le brief", p.ref, el("div.ing", {},
      UI.banniere("", "Structurer n'est pas écrire. Sélectionne un passage à gauche, pose-le dans un champ à droite. Ce qui n'existe pas dans la source reste vide — et c'est ça qu'on renvoie à la Clientèle."),
      bande,
      el("div.ing-corps", {},
        el("div.ing-gauche", {},
          el("div.ing-t", {}, "CE QUI EST ARRIVÉ", el("span", {}, "la source, intacte")),
          source),
        el("div", {},
          el("div.ing-t", {}, "LA STRUCTURE", el("span", {}, "un champ, une citation")),
          colD)),
      pied
    ));
  }

  /* ————————————————————— L'état du go final ————————————————————— */

  function go(p) { return p.goFinal || null; }

  function bande(p, rafraichir) {
    var g = go(p);
    if (!g) return null;
    var qui = DEPOT.trouve("personnes", g.a);
    if (g.recu_le) {
      return UI.banniere("vert", "Go final reçu de " + (qui ? qui.nom : "la Clientèle")
        + " le " + O.joli(g.recu_le) + " sur la V" + g.version
        + (VERSION.num(p.sections.brief) > g.version
            ? " — mais le brief est passé en V" + VERSION.num(p.sections.brief) + " depuis." : "."));
    }
    return UI.banniere("", "Go final demandé à " + (qui ? qui.nom : "la Clientèle")
      + " le " + O.joli(g.demande_le) + ", sans retour depuis "
      + O.depuis(g.demande_le) + " jours. Le brief n'engage la création sur rien.",
      { nom: "Marquer reçu", quand: function () {
        g.recu_le = new Date().toISOString();
        DEPOT.tracer("go final reçu", "brief", p.id, "");
        DEPOT.enregistrer(); if (rafraichir) rafraichir();
      } });
  }

  return { ouvrir: ouvrir, go: go, bande: bande };
})();
