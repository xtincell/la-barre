/* priorite.js — ce qui passe avant, et pourquoi.
 *
 * Une agence ne manque pas de travail : elle manque d'ordre. Le vrai risque
 * n'est pas de mal faire, c'est de faire au mauvais moment — passer trois jours
 * sur les déclinaisons d'une piste que personne n'a payée pendant qu'un client
 * qui a signé attend son EXE.
 *
 * L'ordre ne se discute pas, il se déduit de l'état commercial :
 *
 *   FERME       validé et payé — rétroplanning contractuel. Rien ne passe devant.
 *   ENGAGÉ      validé, pas encore facturé. On produit, on relance.
 *   PRÉSENTÉ    chez le client. On ne produit pas de déclinaisons en attendant.
 *   SPÉCULATIF  en élaboration. Ce qu'on fait avec le temps qui reste.
 *
 * Une piste mûre se valide plus souvent. Donc le spéculatif n'est pas du temps
 * perdu — c'est du temps qui n'a pas le droit de manger le ferme.
 */

window.PRIORITE = (function () {
  var el = O.el;

  var RANGS = [
    { cle: "ferme", rang: 0, nom: "Ferme", ton: "vert",
      quoi: "validé et payé — le rétroplanning est contractuel",
      regle: "Rien ne passe devant. Un jour pris ici est un jour pris à un client qui a signé." },
    { cle: "engage", rang: 1, nom: "Engagé", ton: "or",
      quoi: "validé, pas encore facturé",
      regle: "On produit. Et on relance la facturation : produire sans bon de commande, c'est financer le client." },
    { cle: "presente", rang: 2, nom: "Présenté", ton: "attente",
      quoi: "chez le client, en attente de retour",
      regle: "On ne décline pas. Tant qu'aucune route n'est retenue, chaque format produit peut être jeté." },
    { cle: "speculatif", rang: 3, nom: "Spéculatif", ton: "terne",
      quoi: "en élaboration, rien n'est engagé",
      regle: "Se fait avec le temps qui reste. Mûrir une piste augmente ses chances d'être retenue — mais jamais au prix d'un ferme." },
  ];

  function def(cle) {
    return RANGS.filter(function (r) { return r.cle === cle; })[0] || RANGS[3];
  }

  /* L'état commercial d'une route. Par défaut, spéculatif : c'est l'état de
   * tout ce qui n'a rien signé. */
  function etat(pi) {
    var c = pi.commercial || {};
    if (c.paye_le) return "ferme";
    if (pi.statut === "retenue" || c.valide_le) return "engage";
    if (c.presente_le) return "presente";
    return "speculatif";
  }

  function rang(pi) { return def(etat(pi)).rang; }

  /* Une pièce hérite du rang de sa route. Sans route, elle est spéculative :
   * personne ne l'a demandée. */
  function rangPiece(p, l) {
    var pi = (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0];
    return pi ? rang(pi) : 3;
  }

  /* ————————————————————— La maturité d'une piste ————————————————————— */

  /* Ce qui rend une piste crédible en présentation. Le client reçoit au minimum
   * une idée et deux ou trois KV ; le reste ne se produit qu'après validation.
   * Mais une piste qui porte déjà son dispositif et son rétroplanning se vend
   * mieux — d'où le compteur. */
  var JALONS = [
    { cle: "idee", nom: "L'idée est écrite", poids: 3, minimum: true,
      fait: function (p, pi) { return !!(p.sections.bigidea || {}).idee; } },
    { cle: "argument", nom: "Sacrifice et argument", poids: 3, minimum: true,
      fait: function (p, pi) { return !!pi.sacrifice && !!pi.argument; } },
    { cle: "maitre", nom: "Un KV maître", poids: 3, minimum: true,
      fait: function (p, pi) { return KV.maitres(p).some(function (l) { return l.pisteId === pi.id; }); } },
    { cle: "kv", nom: "Deux à trois KV montrables", poids: 3, minimum: true,
      fait: function (p, pi) {
        return KV.tous(p).filter(function (l) { return l.pisteId === pi.id && l.vignette; }).length >= 2; } },
    { cle: "dispositif", nom: "Un dispositif", poids: 2,
      fait: function (p, pi) { return (pi.dispositif || []).length > 0; } },
    { cle: "retro", nom: "Un rétroplanning", poids: 2,
      fait: function (p, pi) { return !!RETRO.finDe(p, pi); } },
    { cle: "situation", nom: "Vue en situation", poids: 2,
      fait: function (p, pi) {
        return (p.livrables || []).some(function (l) {
          return l.pisteId === pi.id && (l.mockups || []).length; }); } },
    { cle: "adaptations", nom: "Les marchés adaptés", poids: 1,
      fait: function (p, pi) { return KV.adaptations(p).filter(function (l) { return l.pisteId === pi.id; }).length >= 2; } },
    { cle: "declinaisons", nom: "Des déclinaisons", poids: 1,
      fait: function (p, pi) {
        return (p.livrables || []).filter(function (l) {
          return l.pisteId === pi.id && KV.niveau(l) === "declinaison"; }).length > 0; } },
  ];

  function maturite(p, pi) {
    var total = 0, acquis = 0, manqueMin = [];
    JALONS.forEach(function (j) {
      total += j.poids;
      var ok = j.fait(p, pi);
      if (ok) acquis += j.poids;
      else if (j.minimum) manqueMin.push(j);
    });
    return {
      part: Math.round((acquis / total) * 100),
      jalons: JALONS.map(function (j) { return { j: j, ok: j.fait(p, pi) }; }),
      presentable: manqueMin.length === 0,
      manqueMin: manqueMin,
    };
  }

  /* ————————————————————— Le conflit : du spéculatif devant du ferme ————————————————————— */

  /* La seule alerte qui compte vraiment : quelqu'un travaille sur du
   * spéculatif alors qu'un engagement contractuel est en retard. */
  function conflits() {
    var fermes = [], speculatifs = {};

    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        var r = rang(pi);
        var ls = (p.livrables || []).filter(function (l) { return !l.annule && l.pisteId === pi.id; });
        ls.forEach(function (l) {
          if (r <= 1) {
            var e = RETRO.etat(p, pi);
            var tard = e && e.commenceHier;
            if (tard || (l.remise && l.remise < O.jour())) {
              fermes.push({ p: p, pi: pi, l: l, rang: r });
            }
          } else if (l.responsable) {
            if (!speculatifs[l.responsable]) speculatifs[l.responsable] = [];
            speculatifs[l.responsable].push({ p: p, pi: pi, l: l });
          }
        });
      });
    });

    var out = [];
    Object.keys(speculatifs).forEach(function (pid) {
      var enRetardPourLui = fermes.filter(function (f) { return f.l.responsable === pid; });
      if (!enRetardPourLui.length) return;
      var pe = DEPOT.trouve("personnes", pid);
      out.push({ personne: pe, speculatif: speculatifs[pid], ferme: enRetardPourLui });
    });
    return { conflits: out, fermesEnRetard: fermes };
  }

  /* ————————————————————— La demande d'EXE ————————————————————— */

  /* À la validation client, les KV et leurs adaptations passent en demande
   * d'exécution. C'est le moment exact où le spéculatif devient du ferme, et
   * où la priorité du pipeline change. */
  function passerEnExe(p, pi) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule && l.pisteId === pi.id; });
    var n = 0;
    ls.forEach(function (l) {
      if (l.exe) return;
      l.exe = { demande_le: new Date().toISOString(), par: MAISON.titulaire,
        rang: rang(pi), source: pi.id };
      n++;
    });
    DEPOT.tracer("demande d'EXE", "production", p.id,
      n + " pièces passées en exécution sur « " + (pi.titre || "la route") + " »");
    return n;
  }

  function enExe(p) {
    return (p.livrables || []).filter(function (l) { return !l.annule && l.exe; });
  }

  /* ————————————————————— Le bloc commercial, dans la route ————————————————————— */

  function bande(p, pi, apres) {
    var e = etat(pi);
    var d = def(e);
    var m = maturite(p, pi);
    var c = pi.commercial || {};
    var nExe = (p.livrables || []).filter(function (l) {
      return !l.annule && l.pisteId === pi.id && l.exe; }).length;

    return el("div.pr-band." + d.ton, {},
      el("div.prb-h", {},
        el("span.prb-r", {}, d.nom.toUpperCase()),
        el("span.prb-q", {}, d.quoi),
        el("span.prb-m", {}, "maturité " + m.part + " %")),

      el("div.prb-regle", {}, d.regle),

      !m.presentable
        ? UI.banniere("", "Pas encore présentable : il manque "
            + m.manqueMin.map(function (j) { return j.nom.toLowerCase(); }).join(", ")
            + ". Le client reçoit au minimum l'idée et deux ou trois KV — en dessous, on présente une intention.")
        : e === "speculatif"
          ? UI.banniere("vert", "Présentable. Une piste à " + m.part + " % de maturité se valide plus souvent — mais mûrir ne passe jamais devant un engagement signé.")
          : null,

      el("div.prb-jalons", {}, m.jalons.map(function (x) {
        return el("span.prbj" + (x.ok ? ".ok" : "") + (x.j.minimum ? ".min" : ""),
          { title: x.j.nom + (x.j.minimum ? " — minimum client" : "") },
          el("span.m", {}, x.ok ? "✓" : "○"), el("span", {}, x.j.nom));
      })),

      el("div.prb-dates", {},
        ligneDate("Présentée", c.presente_le),
        ligneDate("Validée", c.valide_le),
        ligneDate("Payée", c.paye_le),
        c.montant ? el("span", {}, "montant : " + c.montant) : null,
        nExe ? el("span.vert", {}, nExe + " pièces en EXE") : null),

      el("div.prb-g", {},
        !c.presente_le
          ? el("button.b", { type: "button", onclick: function () { marquer(p, pi, "presente_le", apres); } },
              "Marquer présentée")
          : null,
        c.presente_le && !c.valide_le
          ? el("button.b.or", { type: "button", onclick: function () { valider(p, pi, apres); } },
              "Le client a validé")
          : null,
        c.valide_le && !c.paye_le
          ? el("button.b.vert", { type: "button", onclick: function () { payer(p, pi, apres); } },
              "Bon de commande reçu")
          : null)
    );
  }

  function ligneDate(t, d) {
    return el("span" + (d ? "" : ".vide"), {}, t + " : " + (d ? O.joli(d) : "—"));
  }

  function marquer(p, pi, champ, apres) {
    if (!pi.commercial) pi.commercial = {};
    pi.commercial[champ] = new Date().toISOString();
    DEPOT.enregistrer(); if (apres) apres();
  }

  /* Valider : c'est ici que la priorité du pipeline change. */
  function valider(p, pi, apres) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule && l.pisteId === pi.id; });
    var speculatifsAilleurs = [];
    DEPOT.liste("projets").forEach(function (x) {
      (x.sections.pistes || []).forEach(function (y) {
        if (y.id === pi.id) return;
        if (rang(y) >= 2) {
          speculatifsAilleurs = speculatifsAilleurs.concat(
            (x.livrables || []).filter(function (l) { return !l.annule && l.pisteId === y.id && l.responsable; }));
        }
      });
    });

    PANNEAU.sur("Le client a validé « " + (pi.titre || "cette route") + " »", "ce que ça change", el("div", {},
      el("div.stats", {},
        UI.stat("EN EXÉCUTION", String(ls.length),
          ls.length > 1 ? "pièces passent en demande d'EXE" : "pièce passe en demande d'EXE", "vert"),
        UI.stat("PRIORITÉ", "Engagé", "passe devant tout le spéculatif", "vert"),
        speculatifsAilleurs.length
          ? UI.stat("REPOUSSÉ", String(speculatifsAilleurs.length),
              "pièces spéculatives passent après", "")
          : null
      ),

      UI.banniere("vert", "Les KV et leurs adaptations passent en demande d'EXE. À partir de maintenant, cette route a un rétroplanning à tenir — et rien de spéculatif ne peut lui prendre un jour."),

      speculatifsAilleurs.length
        ? UI.banniere("", speculatifsAilleurs.length
            + (speculatifsAilleurs.length > 1 ? " pièces spéculatives sont affectées" : " pièce spéculative est affectée")
            + " ailleurs. Elles ne s'arrêtent pas — elles passent après. L'écran Pipeline le dira à chaque conflit.")
        : null,

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!pi.commercial) pi.commercial = {};
          pi.commercial.valide_le = new Date().toISOString();
          var n = passerEnExe(p, pi);
          DEPOT.tracer("validation client", "pistes", p.id,
            (pi.titre || "route") + " — " + n + " pièces en EXE");
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
        } }, "Valider et ouvrir les EXE"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function payer(p, pi, apres) {
    PANNEAU.demander("Bon de commande reçu", {
      etiquette: pi.titre || "", label: "Montant", type: "text",
      aide: "À partir du bon de commande, le rétroplanning devient contractuel : plus rien ne passe devant.",
      avertissement: "Produire sans bon de commande, c'est financer le client. Le noter ici sort la route du financement à l'aveugle.",
      ton: "vert", bouton: "Enregistrer",
    }, function (v) {
      if (!pi.commercial) pi.commercial = {};
      pi.commercial.paye_le = new Date().toISOString();
      pi.commercial.montant = v || null;
      DEPOT.tracer("bon de commande", "pistes", p.id, (pi.titre || "route") + (v ? " — " + v : ""));
      DEPOT.enregistrer(); if (apres) apres();
    });
  }

  return { RANGS: RANGS, JALONS: JALONS, def: def, etat: etat, rang: rang, rangPiece: rangPiece,
    maturite: maturite, conflits: conflits, passerEnExe: passerEnExe, enExe: enExe,
    bande: bande, valider: valider };
})();
