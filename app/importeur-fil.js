/* importeur-fil.js — coller une conversation, en sortir des idées.
 *
 * Les idées ne naissent pas dans l'outil : elles naissent dans un fil WhatsApp,
 * un canal Slack, un échange de mails. Les ressaisir une par une, personne ne
 * le fait — donc l'atelier reste vide et l'indicateur « idées retenues émanant
 * de juniors » reste à zéro.
 *
 * Ici on colle le fil brut. L'outil le découpe en messages, reconnaît les
 * auteurs, propose ceux qui ressemblent à des idées — et je tranche. Il ne
 * décide rien : il évite la ressaisie.
 */

window.IMPORT_FIL = (function () {
  var el = O.el;

  /* Les formes qu'un fil prend selon d'où il vient. Aucune n'est devinée : on
   * les essaie dans l'ordre, la première qui rend plus d'un message gagne. */
  var FORMES = [
    { nom: "WhatsApp",
      re: /^\[?(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})[,\s]+(\d{1,2}:\d{2})(?::\d{2})?\]?\s*[-–]?\s*([^:]{1,40}):\s*/ ,
      lire: function (m) { return { date: m[1], heure: m[2], qui: m[3].trim() }; } },
    { nom: "Slack",
      re: /^([A-Za-zÀ-ÿ][\w .'’-]{1,38})\s{2,}(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*$/,
      seul: true,
      lire: function (m) { return { heure: m[2], qui: m[1].trim() }; } },
    { nom: "Mail",
      re: /^(?:De|From)\s*:\s*(.+?)(?:\s*<.*>)?\s*$/,
      seul: true,
      lire: function (m) { return { qui: m[1].trim() }; } },
    /* Un en-tête de mail ressemble à « Nom : » — d'où l'exclusion explicite,
     * sinon « Objet : » devient un interlocuteur. */
    { nom: "Simple",
      re: /^(?!(?:De|From|Envoy[ée]|Sent|[ÀA]|To|Objet|Subject|Cc|Cci|Date|Le)\b)([A-Za-zÀ-ÿ][\w .'’-]{1,30})\s*:\s+/,
      lire: function (m) { return { qui: m[1].trim() }; } },
  ];

  /* Les lignes d'en-tête, dans les deux langues. Elles ne sont jamais du message. */
  var ENTETES = /^(?:Envoy[ée]|Sent|[ÀA]|To|Objet|Subject|Cc|Cci|Date|Le)\s*:/i;

  /* Ce qui ressemble à une idée. Ce n'est pas de la compréhension : c'est du
   * repérage de tournures. Ça propose, je décide. */
  var AMORCES = [
    "et si on", "et si l'on", "on pourrait", "on peut", "l'idée c'est", "l'idée serait",
    "je propose", "imagine", "imaginons", "ce serait bien", "pourquoi pas",
    "ce qui serait fort", "je verrais bien", "j'aurais tendance", "on devrait",
    "il faudrait", "et pourquoi pas", "je pense qu'on", "ma proposition",
  ];

  function decouper(brut) {
    var lignes = brut.replace(/\r/g, "").split("\n");

    /* Un fil de mail se reconnaît en premier : dès qu'un « De : » apparaît en
     * tête de ligne, c'est lui qui découpe, quel que soit le nombre de lignes
     * qui ressemblent à autre chose. */
    var mail = FORMES.filter(function (f) { return f.nom === "Mail"; })[0];
    var nMail = lignes.filter(function (l) { return mail.re.test(l.trim()); }).length;

    var meilleur = null;
    if (nMail >= 1) {
      meilleur = { f: mail, n: nMail };
    } else {
      FORMES.forEach(function (f) {
        if (f.nom === "Mail") return;
        var n = lignes.filter(function (l) { return f.re.test(l.trim()); }).length;
        if (n > 1 && (!meilleur || n > meilleur.n)) meilleur = { f: f, n: n };
      });
    }

    if (!meilleur) {
      /* Pas de forme reconnue : chaque paragraphe est un message sans auteur. */
      return brut.split(/\n\s*\n/).map(function (t) { return t.trim(); })
        .filter(function (t) { return t; })
        .map(function (t) { return { qui: null, texte: t }; });
    }

    var f = meilleur.f;
    var msgs = [];
    var courant = null;
    lignes.forEach(function (ligne) {
      var l = ligne.trim();
      var m = f.re.exec(l);
      if (m) {
        if (courant) msgs.push(courant);
        var d = f.lire(m);
        courant = { qui: d.qui, date: d.date || null, heure: d.heure || null,
          texte: f.seul ? "" : l.slice(m[0].length).trim() };
        return;
      }
      if (!courant) { if (l) courant = { qui: null, texte: l }; return; }
      /* Les en-têtes de mail se sautent : ce n'est pas le message. */
      if (ENTETES.test(l)) return;
      if (l) courant.texte += (courant.texte ? "\n" : "") + l;
    });
    if (courant) msgs.push(courant);

    return msgs.filter(function (x) { return x.texte && x.texte.trim(); });
  }

  /* Rapprocher un nom du fil d'une personne du dépôt. Prénom suffit. */
  function reconnaitre(nom) {
    if (!nom) return null;
    var n = O.normalise(nom);
    var gens = DEPOT.liste("personnes");
    var exact = gens.filter(function (p) { return O.normalise(p.nom) === n; })[0];
    if (exact) return exact.id;
    var partiel = gens.filter(function (p) {
      var pn = O.normalise(p.nom);
      return pn.indexOf(n) === 0 || n.indexOf(pn.split(" ")[0]) === 0;
    })[0];
    return partiel ? partiel.id : null;
  }

  function ressembleAUneIdee(t) {
    var n = O.normalise(t);
    if (t.trim().length < 20) return false;
    return AMORCES.some(function (a) { return n.indexOf(O.normalise(a)) !== -1; });
  }

  /* ————————————————————— L'écran ————————————————————— */

  function ouvrir(p, rafraichir) {
    var brut = el("textarea.ing-src", { rows: 14,
      placeholder: "Colle le fil ici — WhatsApp, Slack, un échange de mails, ou juste du texte.\n\nExemple :\n[26/08/2026, 14:32] Serge : et si on filmait la file d'attente ?\n[26/08/2026, 14:35] Nadia : le rayon fait le spectacle, pas les gens" });
    var sujet = el("input", { type: "text", placeholder: "De quoi parle ce fil" });
    var zone = el("div");
    var msgs = [];
    var choix = {};

    function analyser() {
      msgs = decouper(brut.value).map(function (m) {
        return Object.assign({}, m, { id: O.id("M"),
          personne: reconnaitre(m.qui), idee: ressembleAUneIdee(m.texte) });
      });
      msgs.forEach(function (m) { if (m.idee) choix[m.id] = true; });
      dessiner();
    }

    function dessiner() {
      O.vider(zone);
      if (!msgs.length) {
        zone.appendChild(el("p.rien", {}, "Rien d'analysé. Colle le fil, puis relis ce que l'outil en a fait — il se trompe, c'est à toi de corriger."));
        return;
      }

      var inconnus = msgs.filter(function (m) { return m.qui && !m.personne; });
      var noms = {};
      inconnus.forEach(function (m) { noms[m.qui] = true; });
      var retenues = msgs.filter(function (m) { return choix[m.id]; }).length;

      zone.appendChild(el("div.stats", {},
        UI.stat("MESSAGES", String(msgs.length), "découpés du fil", ""),
        UI.stat("IDÉES REPÉRÉES", String(retenues), "à poser en atelier", retenues ? "vert" : ""),
        Object.keys(noms).length
          ? UI.stat("AUTEURS INCONNUS", String(Object.keys(noms).length),
              Object.keys(noms).join(", "), "attente")
          : null
      ));

      if (Object.keys(noms).length) {
        zone.appendChild(UI.banniere("", "Ces noms ne correspondent à personne du dépôt : leurs messages entreront sans auteur, et une idée sans auteur ne s'attribue pas. À rattacher ci-dessous."));
      }

      zone.appendChild(el("div.if-l", {}, msgs.map(function (m) {
        var pe = m.personne ? DEPOT.trouve("personnes", m.personne) : null;
        var sel = el("select", {});
        sel.appendChild(el("option", { value: "" }, "— sans auteur —"));
        DEPOT.liste("personnes").forEach(function (x) {
          var o = el("option", { value: x.id }, x.nom + " · " + O.poste(x.poste).court
            + (x.seniorite === "junior" ? " · junior" : ""));
          if (m.personne === x.id) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () { m.personne = sel.value || null; dessiner(); });

        return el("div.if-m" + (choix[m.id] ? ".idee" : ""), {},
          el("div.ifm-h", {},
            pe ? UI.avatar(pe, 22) : UI.avatar(null, 22),
            el("span.ifm-q", {}, m.qui || "sans auteur"),
            m.heure ? el("span.ifm-d", {}, (m.date ? m.date + " " : "") + m.heure) : null,
            sel),
          el("div.ifm-t", {}, m.texte),
          el("button.ifm-b" + (choix[m.id] ? ".actif" : ""), { type: "button",
            onclick: function () { choix[m.id] = !choix[m.id]; dessiner(); } },
            choix[m.id] ? "✓  posée comme idée" : "en faire une idée"));
      })));
    }

    brut.addEventListener("input", function () {
      if (brut.value.trim().length > 30) analyser();
    });

    PANNEAU.ouvrir("Importer un fil", p.ref, el("div.if", {},
      UI.banniere("", "Les idées ne naissent pas dans l'outil : elles naissent dans un fil. Colle-le, l'outil le découpe et propose ce qui ressemble à une idée. Il se trompe — c'est toi qui tranches."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Sujet du fil"), sujet),
        el("div.champ", {}, el("label", {}, "Le fil, tel quel"), brut)),
      zone,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!msgs.length) { AVIS.refus("Rien à importer."); return; }
          if (!p.fils) p.fils = [];
          if (!p.idees) p.idees = [];

          var fil = { id: O.id("FI"), sujet: sujet.value.trim() || "Fil importé",
            clos: false, ouvert_le: new Date().toISOString(), importe: true,
            messages: msgs.map(function (m) {
              return { qui: m.personne, auteurLibre: m.personne ? null : m.qui,
                texte: m.texte, quand: new Date().toISOString() };
            }) };
          p.fils.push(fil);

          var n = 0;
          msgs.forEach(function (m) {
            if (!choix[m.id]) return;
            p.idees.push({ id: O.id("ID"), texte: m.texte, auteur: m.personne || null,
              quand: new Date().toISOString(), statut: "proposee", filId: fil.id });
            n++;
          });

          DEPOT.tracer("fil importé", "atelier", p.id,
            msgs.length + " messages, " + n + " idées posées");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Importer"),
        el("button.b", { type: "button", onclick: analyser }, "Réanalyser"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* ————————————————————— Extraire d'un fil déjà là ————————————————————— */

  function extraire(p, f, rafraichir) {
    var choix = {};
    (f.messages || []).forEach(function (m, i) {
      if (ressembleAUneIdee(m.texte)) choix[i] = true;
    });
    var zone = el("div");

    function dessiner() {
      O.vider(zone);
      var n = Object.keys(choix).filter(function (k) { return choix[k]; }).length;
      zone.appendChild(el("div.if-l", {}, (f.messages || []).map(function (m, i) {
        var pe = m.qui ? DEPOT.trouve("personnes", m.qui) : null;
        var deja = (p.idees || []).some(function (x) { return x.texte === m.texte; });
        return el("div.if-m" + (choix[i] ? ".idee" : "") + (deja ? ".deja" : ""), {},
          el("div.ifm-h", {},
            pe ? UI.avatar(pe, 22) : UI.avatar(null, 22),
            el("span.ifm-q", {}, pe ? pe.nom : (m.auteurLibre || "sans auteur")),
            el("span.ifm-d", {}, O.joli(m.quand))),
          el("div.ifm-t", {}, m.texte),
          deja
            ? el("div.ifm-e", {}, "déjà posée en atelier")
            : el("button.ifm-b" + (choix[i] ? ".actif" : ""), { type: "button",
                onclick: function () { choix[i] = !choix[i]; dessiner(); } },
                choix[i] ? "✓  posée comme idée" : "en faire une idée"));
      })));
      zone.appendChild(el("div.ifm-n", {}, n + (n > 1 ? " idées seront posées" : " idée sera posée")));
    }
    dessiner();

    PANNEAU.sur("Extraire les idées", f.sujet, el("div.if", {},
      UI.banniere("", "Les tournures repérées sont pré-cochées — « et si on », « on pourrait », « je propose ». L'outil ne comprend pas, il repère. Décoche ce qui n'en est pas."),
      zone,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!p.idees) p.idees = [];
          var n = 0;
          (f.messages || []).forEach(function (m, i) {
            if (!choix[i]) return;
            if ((p.idees || []).some(function (x) { return x.texte === m.texte; })) return;
            p.idees.push({ id: O.id("ID"), texte: m.texte, auteur: m.qui || null,
              quand: new Date().toISOString(), statut: "proposee", filId: f.id });
            n++;
          });
          DEPOT.tracer("idées extraites", "atelier", p.id, n + " depuis « " + f.sujet + " »");
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (rafraichir) rafraichir();
        } }, "Poser les idées"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  return { FORMES: FORMES, decouper: decouper, reconnaitre: reconnaitre,
    ressembleAUneIdee: ressembleAUneIdee, ouvrir: ouvrir, extraire: extraire };
})();
