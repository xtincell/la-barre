/* vue-direction.js — les gens, et ce qu'on peut leur donner.
 *
 * Mode « les gens » de Placer. Deux bandes : ce dont je dispose, ce qui
 * s'impose. Et au centre un seul geste — commander un livrable : qui, combien,
 * pour quand.
 *
 * Les objectifs vivaient ici et n'y appelaient aucune action : un taux de
 * reprise ne se corrige pas en le regardant. Ils sont dans Constater.
 *
 * Règle de cet écran : aucun paragraphe. Des portraits, des vignettes, des
 * jauges, et des nombres courts.
 */

window.VUE_DIRECTION = (function () {
  var el = O.el;

  var selection = {};
  var filtreSemaine = null;
  var filtrePersonne = null;
  var vue = "adiriger";     /* adiriger · tout */
  var hote = null;

  function rafraichir() { if (hote) rendre(hote); }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(h) {
    hote = h;
    h.className = (h.className || "") + " commande";
    O.vider(h);

    var pieces = PLATEAU.pieces();
    var aDiriger = pieces.filter(function (x) {
      return !x.responsable || x.charge === null || !x.date || x.attendMoi;
    });
    var visibles = filtrer(vue === "adiriger" ? aDiriger : pieces);
    var choisies = Object.keys(selection).filter(function (k) { return selection[k]; });

    /* La file appartient à Décider, et à lui seul. La reprendre ici recréerait
     * deux destinations pour « par où je commence » — la question que
     * l'architecture a justement tranchée. Un lien suffit. */
    var nf = window.FILE ? FILE.tout().length : 0;
    if (nf) {
      h.appendChild(el("div.cmd-file", {},
        el("span", {}, nf + (nf > 1 ? " décisions attendent" : " décision attend")
          + " — elles se prennent dans la salle de tri, pas ici."),
        GESTE.bouton("file", {}, null, "b.nu")));
    }

    /* La partie ressources ne s'ouvre que si elle a quelque chose à montrer.
     * Un pan de vide sous un titre est pire qu'une absence : il fait croire
     * qu'on a raté quelque chose. */
    var aMontrer = pieces.length > 0;
    if (!aMontrer) {
      h.appendChild(el("div.cmd-rien", {},
        el("span", {}, "Aucun livrable à placer cette semaine."),
        GESTE.bouton("charge", {}, null, "b.nu")));
      return;
    }

    /* Les cinq objectifs vivaient ici. Ils n'y appelaient aucune action : un
     * taux de reprise ne se corrige pas en le regardant. Ils sont partis dans
     * Constater, qui regarde le mois — c'est leur horizon. */

    /* La semaine d'abord, pleine largeur : c'est elle qui répond à « à qui je
     * confie la prochaine livrable ». Les livrables à diriger viennent après. */
    h.appendChild(ressources(function () { rendre(h); }));
    if (visibles.length) {
      h.appendChild(el("div.cmd-corps.seule", {},
        centre(visibles, aDiriger.length, pieces.length)));
    }
    h.appendChild(bandeEngagements());
    h.appendChild(choisies.length ? barreGestes(choisies) : repos());
  }

  /* ————————————————————— 1 · Ce dont je dispose ————————————————————— */

  /* ————————————————————— Les gens : une semaine ————————————————————— */

  /* Une barre de pourcentage dit combien, jamais quand. Or la charge est un
   * problème de calendrier : savoir que Serge est à 140 % n'aide pas, savoir
   * qu'il est au mur jeudi si.
   *
   * Cinq jours en colonnes, une personne par ligne, et une ligne de capacité
   * qu'on voit dépasser. Un conflit, c'est deux blocs le même jour. */

  function ressources(rafraichir) {
    var gens = PLATEAU.personnes();
    var jours = cinqJours();
    var conflits = PRIORITE.conflits().conflits;

    var lignes = gens.map(function (pe) {
      var c = PLATEAU.chargeDe(pe.id, null);
      var mesPieces = PLATEAU.pieces().filter(function (x) { return x.responsable === pe.id; });
      return { pe: pe, c: c, pieces: mesPieces,
        conflit: conflits.filter(function (x) { return x.personne && x.personne.id === pe.id; })[0] || null };
    }).sort(function (a, b) { return b.c.part - a.c.part; });

    var enMur = lignes.filter(function (l) { return l.c.part > 100; });
    var vides = lignes.filter(function (l) { return !l.pieces.length; });

    return el("div.sm", {},
      el("div.sm-t", {},
        el("h3", {}, titreSemaine(enMur, vides)),
        el("p", {}, "La charge est un problème de calendrier, pas de pourcentage. "
          + "Un cumul déclaré réduit la capacité — il se voit ici, pas dans une note.")),

      /* Les cinq jours, nommés une fois. */
      el("div.sm-g", {},
        el("div.smg-h", {},
          el("span.smgh-v", {}),
          el("div.smgh-l", {}, jours.map(function (j) {
            return el("span.smgh-j" + (j.auj ? ".auj" : ""), {}, j.nom); }))),

        lignes.map(function (l) { return ligneSemaine(l, jours, rafraichir); })),

      el("div.sm-d", {},
        el("div.smd-t", {}, "CE QUE ÇA DÉPLACE"),
        el("p", {}, deplacement(enMur, vides)),
        el("div.form-actions", {},
          GESTE.bouton("charge", {}, null, "b.or"),
          el("button.b.nu", { type: "button", onclick: function () {
            if (lignes[0]) proteger(lignes[0].pe); } }, "Protéger du temps"))));
  }

  /* Les cinq jours ouvrés de la semaine courante. */
  function cinqJours() {
    var NOMS = ["LUN", "MAR", "MER", "JEU", "VEN"];
    var auj = new Date(O.jour() + "T12:00:00");
    var lundi = new Date(auj);
    lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
    var out = [];
    for (var i = 0; i < 5; i++) {
      var d = new Date(lundi); d.setDate(lundi.getDate() + i);
      out.push({ nom: NOMS[i] + " " + d.getDate(), d: d,
        auj: d.toDateString() === auj.toDateString() });
    }
    return out;
  }

  function titreSemaine(enMur, vides) {
    if (enMur.length && vides.length) {
      return vides[0].pe.nom.split(" ")[0] + " n'a rien cette semaine, "
        + enMur[0].pe.nom.split(" ")[0] + " est au mur";
    }
    if (enMur.length) return enMur.length + (enMur.length > 1 ? " personnes sont au mur" : " personne est au mur");
    if (vides.length) return vides.length + (vides.length > 1 ? " personnes n'ont rien" : " personne n'a rien") + " cette semaine";
    return "La semaine tient";
  }

  function deplacement(enMur, vides) {
    if (enMur.length && vides.length) {
      return "Déplacer un livrable de " + enMur[0].pe.nom.split(" ")[0] + " à "
        + vides[0].pe.nom.split(" ")[0] + " libère la semaine"
        + (vides[0].pe.seniorite === "junior"
          ? " et fait bouger l'indicateur « idées retenues émanant de juniors »." : ".");
    }
    if (enMur.length) return "Personne n'a d'air pour reprendre. C'est la date qu'il faut déplacer, pas le livrable.";
    return "Un cumul sans part déclarée rend la charge fausse. Ceux qui sont déclarés le sont avec leur part.";
  }

  function ligneSemaine(l, jours, rafraichir) {
    var pe = l.pe;
    var cums = (pe.casquettes || []);
    /* Ce qu'il porte, réparti sur les jours par leur date de remise. */
    var parJour = jours.map(function () { return []; });
    var apres = [], sansDate = [];
    l.pieces.forEach(function (x) {
      if (!x.date) { sansDate.push(x); return; }
      var d = new Date(x.date); var pose = false;
      for (var k = 0; k < jours.length; k++) {
        if (d.toDateString() === jours[k].d.toDateString()) { parJour[k].push(x); pose = true; break; }
      }
      if (pose) return;
      if (d < jours[0].d) parJour[0].push(x);   /* déjà dû : il pèse aujourd'hui */
      else apres.push(x);                        /* plus tard : hors de cette semaine */
    });

    var mur = l.c.part > 100;

    return el("div.sm-r" + (mur ? ".mur" : "") + (!l.pieces.length ? ".vide" : ""), {},
      el("div.smr-q", {},
        UI.avatar(pe, 32),
        el("div", {},
          el("div.smrq-n", {}, pe.nom,
            pe.seniorite === "junior" ? UI.eti("junior", "or") : null),
          el("div.smrq-p", {}, O.poste(pe.poste).nom),
          cums.length
            ? el("div.smrq-c", {}, "cumule " + cums.map(function (c) {
                return O.poste(c.poste).court + (c.part ? "\u00a0" + c.part + "\u00a0%" : ""); }).join(", "))
            : null)),

      el("div.smr-j", {},
        !l.pieces.length
          ? el("div.smr-rien", {}, "aucun livrable ne lui est affecté — c'est un talent qu'on ne détecte pas")
          : parJour.every(function (g) { return !g.length; })
            ? el("div.smr-rien", {}, "rien cette semaine — "
                + (apres.length ? apres.length + (apres.length > 1 ? " livrables attendus plus tard" : " livrable attendu plus tard") : "")
                + (apres.length && sansDate.length ? ", " : "")
                + (sansDate.length ? sansDate.length + (sansDate.length > 1 ? " sans date" : " sans date") : ""))
            : parJour.map(function (g, i) {
              return el("div.smr-c" + (jours[i].auj ? ".auj" : ""), {},
                g.map(function (x) {
                  return el("button.smr-b" + (x.retard ? ".retard" : ""), { type: "button",
                    title: x.nom + (x.charge ? "  ·  " + x.charge + " j" : "  ·  sans estimation"),
                    onclick: function () { VUE_ASSET.ouvrir(x.projet, x.objet, rafraichir); } },
                    el("span", {}, x.nom));
                }));
            }),
        /* La ligne de capacité : ce qui la dépasse se voit. */
        el("div.smr-mur", { style: { left: Math.min(100, Math.round((100 / Math.max(1, l.c.part)) * 100)) + "%" } },
          el("span", {}, "mur"))),

      el("div.smr-t" + (mur ? ".alerte" : ""), {},
        el("span", {}, l.c.jours + " j sur " + l.c.capacite),
        apres.length ? el("span.smr-ap", {}, apres.length
          + (apres.length > 1 ? " livrables plus tard" : " livrable plus tard")) : null,
        sansDate.length ? el("span.smr-sd", {}, sansDate.length
          + (sansDate.length > 1 ? " sans date — invisibles ici" : " sans date — invisible ici")) : null,
        l.conflit ? el("span.smr-x", {}, "2 dossiers, même jour") : null));
  }

  function materiel() {
    var manquantes = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        (l.entrees || []).forEach(function (e) {
          if (!e.fournisseur) manquantes.push({ quoi: e.quoi, projet: p, livrable: l });
        });
      });
    });
    var gabarits = 0;
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        var s = DEPOT.trouve("supports", l.support);
        if (s && !(s.gabarits || {})[l.marche]) gabarits++;
      });
    });

    if (!manquantes.length && !gabarits) {
      return el("div.mat-ok", {}, UI.icone("revue", 14), el("span", {}, "moyens réunis"));
    }
    return el("button.mat-manque", {
      type: "button",
      onclick: function () { panneauMateriel(manquantes, gabarits); },
    },
      el("span.m-n", {}, String(manquantes.length + gabarits)),
      el("span.m-t", {}, "moyens manquants")
    );
  }

  function panneauMateriel(manquantes, gabarits) {
    PANNEAU.ouvrir("Mes moyens", "ce qui manque pour produire", el("div", {},
      manquantes.length ? el("div.sousbloc", {},
        el("h3", {}, "ENTRÉES SANS FOURNISSEUR"),
        UI.banniere("", REGLES.prix("entree-sans-fournisseur")),
        el("div", {}, manquantes.map(function (m) {
          return el("div.file-item", {},
            el("div.fi-corps", {}, el("div.fi-nom", {}, m.quoi),
              el("div.fi-meta", {}, m.projet.ref + " · " + m.livrable.nom)),
            el("button.b.nu", { type: "button", onclick: function () {
              PANNEAU.fermer();
              RENVOI.ouvrir({ quoi: m.quoi, projet: m.projet.ref, projetId: m.projet.id, objet: m.livrable.id });
            } }, "réclamer"));
        }))
      ) : null,
      gabarits ? el("div.sousbloc", {},
        el("h3", {}, "GABARITS NON RENSEIGNÉS"),
        el("p", { style: { "font-size": ".84rem", color: "var(--clair-doux)" } },
          gabarits + " croisement" + (gabarits > 1 ? "s" : "") + " support × marché sans dimensions."),
        el("button.b", { type: "button", onclick: function () {
          PANNEAU.fermer(); GESTE.ouvrir("marches"); } }, "Renseigner les gabarits")
      ) : null
    ));
  }

  function proteger(p) {
    PANNEAU.demander("Créer de l'air pour " + p.nom, {
      label: "Combien de jours cette semaine", valeur: 1, type: "number",
      aide: "Veille, montée en compétence, respiration. C'est du temps que personne ne pourra prendre — pas même moi.",
      avertissement: "Ces jours sortent de la capacité disponible : la semaine se resserre d'autant, et l'outil le dira au moment d'affecter.",
      bouton: "Protéger",
    }, function (v) {
      if (isNaN(Number(v)) || !Number(v)) return;
      if (!p.protections) p.protections = [];
      p.protections.push({ semaine: filtreSemaine || O.jour(new Date()), jours: Number(v),
        quand: new Date().toISOString() });
      DEPOT.tracer("protection", "personnes", p.id, Number(v) + " j protégés");
      DEPOT.enregistrer();
      rafraichir();
    });
  }

  /* ————————————————————— 3 · Le centre : ce que je dirige ————————————————————— */

  function centre(visibles, nADiriger, total) {
    return el("div.cmd-centre", {},
      el("div.cc-tete", {},
        el("div.chips", {},
          el("button.chip", { type: "button", "aria-pressed": vue === "adiriger" ? "true" : "false",
            onclick: function () { vue = "adiriger"; rafraichir(); } },
            "à diriger", el("span.n", {}, String(nADiriger))),
          el("button.chip", { type: "button", "aria-pressed": vue === "tout" ? "true" : "false",
            onclick: function () { vue = "tout"; rafraichir(); } },
            "tout", el("span.n", {}, String(total)))
        ),
        el("span.cc-compte", {}, visibles.length + (visibles.length > 1 ? " livrables" : " livrable"))
      ),

      visibles.length
        ? el("div.cc-mur", {}, visibles.map(carte))
        : el("div.cc-rien", {},
            el("span", {}, vue === "adiriger"
              ? "Tous les livrables ont leur responsable, leur charge et leur date."
              : "Rien à ce filtre."),
            vue === "adiriger" && total
              ? el("button.b.nu", { type: "button", onclick: function () { vue = "tout"; rafraichir(); } },
                  "voir les " + total + " livrables")
              : null)
    );
  }

  function carte(pc) {
    var choisie = selection[pc.id];
    var resp = pc.responsable ? DEPOT.trouve("personnes", pc.responsable) : null;
    var manques = [];
    if (!resp) manques.push("qui");
    if (pc.charge === null) manques.push("combien");
    if (!pc.date) manques.push("quand");

    return el("div.piece-c" + (choisie ? ".choisie" : "") + (pc.attendMoi ? ".attend" : ""), {},
      el("button.pc-visuel", {
        type: "button",
        onclick: function (e) {
          if (e.shiftKey || e.metaKey || e.ctrlKey) { selection[pc.id] = !choisie; rafraichir(); }
          else VUE_LIVRABLE.ouvrir(pc.projet, pc.objet, rafraichir);
        },
      },
        IMAGE.vignette(pc.objet, "case"),
        pc.attendMoi ? el("span.pc-bat") : null,
        choisie ? el("span.pc-coche", {}, "✓") : null
      ),

      el("div.pc-nom", {}, pc.nom),

      el("div.pc-cmd", {},
        bouton("qui", resp ? resp.nom.split(" ")[0] : "qui ?", !resp, function () { commander(pc, "qui"); }, resp),
        bouton("combien", pc.charge !== null ? pc.charge + " j" : "combien ?", pc.charge === null, function () { commander(pc, "combien"); }),
        bouton("quand", pc.date ? O.joli(pc.date) : "quand ?", !pc.date, function () { commander(pc, "quand"); })
      ),

      el("button.pc-select", {
        type: "button",
        onclick: function () { selection[pc.id] = !choisie; rafraichir(); },
      }, choisie ? "retirer" : "sélectionner")
    );
  }

  function bouton(cle, texte, manque, quand, personne) {
    return el("button.cmd-b." + cle + (manque ? ".manque" : ""), { type: "button", onclick: quand },
      personne ? UI.avatar(personne, 18) : null,
      el("span", {}, texte)
    );
  }

  /* ————————————————————— L'acte : commander un livrable ————————————————————— */

  function commander(pc, quoi) {
    var objs = OBJECTIFS.tous();
    var junior = objs.filter(function (o) { return o.cle === "juniors"; })[0];

    if (quoi === "qui") {
      var dispos = PLATEAU.disponibles(pc.semaine);
      PANNEAU.ouvrir("Qui prend « " + pc.nom + " » ?", pc.semaine ? "semaine " + O.semaine(pc.semaine) : "sans date",
        el("div", {},
          junior && junior.tenu === false
            ? UI.banniere("", "Ton objectif « idées de juniors » est à " + junior.reel + " pour une cible de "
                + junior.cible + ". Une affectation à un junior le sert.")
            : null,
          el("div.affect", {}, dispos.map(function (d) {
            var jr = d.personne.seniorite === "junior";
            var ton = d.charge.part > 100 ? "mur" : d.charge.part > 80 ? "tendu" : "libre";
            return el("button.affect-l." + ton, {
              type: "button",
              onclick: function () {
                pc.objet.responsable = d.personne.id;
                DEPOT.tracer(jr ? "élévation" : "affectation", "livrables", pc.projet.id,
                  pc.nom + " → " + d.personne.nom);
                DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
              },
            },
              UI.avatar(d.personne, 30),
              el("div.a-corps", {},
                el("div.a-nom", {}, d.personne.nom, jr ? UI.eti("junior", "or") : null),
                el("div.a-jauge", {}, el("i", { style: { width: Math.min(100, d.charge.part) + "%" } })),
                el("div.a-air", {}, d.air > 0 ? d.air + " j d'air" : "aucun air — " + d.charge.part + " %")
              )
            );
          }))
        ));
      return;
    }

    if (quoi === "combien") {
      PANNEAU.demander("Combien de jours ?", {
        etiquette: pc.nom, label: "Estimation, en jours", type: "number",
        valeur: pc.charge !== null ? pc.charge : "",
        aide: "C'est elle qui rend la charge visible. Sans elle, la semaine ne se calcule pas et personne ne peut dire non.",
        requis: "Sans estimation, ce livrable est invisible dans la charge.",
      }, function (v) {
        if (isNaN(Number(v))) return;
        pc.objet.estime = Number(v);
        DEPOT.tracer("allocation", "livrables", pc.projet.id, pc.nom + " · " + v + " j");
        DEPOT.enregistrer(); rafraichir();
      });
      return;
    }

    if (quoi === "quand") {
      PANNEAU.demander("Pour quand ?", {
        etiquette: pc.nom, label: "Remise du fichier", type: "date",
        valeur: pc.date || O.jour(),
        aide: "La remise, pas la publication. C'est la date qui commande la production.",
        requis: "Un livrable sans date ne peut être ni placée ni réclamée.",
      }, function (v) {
        if (!v) return;
        pc.objet.remise = v;
        DEPOT.tracer("échéance", "livrables", pc.projet.id, pc.nom + " → " + v);
        DEPOT.enregistrer(); rafraichir();
      });
    }
  }

  /* ————————————————————— 4 · Ce qui s'impose ————————————————————— */

  function bandeEngagements() {
    var eng = OBJECTIFS.engagements();
    return el("div.bande-eng", {},
      el("div.be-titre", {}, "CE QUI S'IMPOSE"),
      el("div.be-liste", {}, eng.map(function (e) {
        var ton = e.tenable === null ? "inconnu" : e.tenable ? "tenable" : "intenable";
        return el("button.eng." + ton, {
          type: "button",
          onclick: function () { GESTE.ouvrir("brief", { p: e.projet }); },
        },
          el("span.e-nom", {}, e.projet.ref),
          el("span.e-date", {}, e.echeance ? O.joli(e.echeance) : "sans échéance"),
          el("span.e-charge", {},
            (e.charge ? e.charge + " j de travail" : "charge inconnue")
            + (e.joursRestants !== null
                ? " · " + (e.joursRestants >= 0 ? Math.max(0, e.joursRestants) + " j avant l'échéance" : "échéance dépassée de " + (-e.joursRestants) + " j")
                : "")),
          e.tenable === false ? el("span.e-manque", {}, "intenable en l'état") : null,
          e.inconnues ? el("span.e-inconnu", {}, e.inconnues + " sans estimation") : null,
          !e.echeance ? el("span.e-manque", {}, "date non fixée") : null
        );
      }))
    );
  }

  /* ————————————————————— 5 · Les gestes sur une sélection ————————————————————— */

  function barreGestes(ids) {
    var total = ids.reduce(function (t, id) {
      var pc = PLATEAU.trouverPiece(id);
      return t + (pc && pc.charge ? pc.charge : 0);
    }, 0);

    return el("div.zone-gestes", {},
      el("div.g-selection", {},
        el("b", {}, String(ids.length)),
        el("span", {}, ids.length > 1 ? "livrables" : "livrable"),
        el("span.g-jours", {}, total ? "· " + total + " j" : "· charge inconnue")
      ),
      el("div.g-verbes", {},
        verbe("ventiler", "Ventiler", function () { onde(PLATEAU.simulerVentiler(ids)); }),
        verbe("decaler", "Décaler", function () { onde(PLATEAU.simulerDecaler(ids, 1)); }),
        verbe("propulser", "Propulser", function () { onde(PLATEAU.simulerPropulser(ids)); }),
        verbe("annuler", "Annuler", function () { onde(PLATEAU.simulerAnnuler(ids)); })
      ),
      el("button.b.nu", { type: "button", onclick: function () { selection = {}; rafraichir(); } }, "désélectionner")
    );
  }

  function verbe(cle, nom, quand) {
    return el("button.verbe." + cle, { type: "button", onclick: quand }, nom);
  }

  function repos() {
    var f = [];
    if (filtreSemaine) f.push("semaine " + O.semaine(filtreSemaine));
    if (filtrePersonne) {
      var p = DEPOT.trouve("personnes", filtrePersonne);
      if (p) f.push(p.nom);
    }
    return el("div.zone-gestes.repos", {},
      f.length
        ? el("div.filtres-l", {}, el("span.f-t", {}, "filtré sur"),
            f.map(function (x) { return el("span.chip", {}, x); }),
            el("button.b.nu", { type: "button", onclick: function () {
              filtreSemaine = null; filtrePersonne = null; rafraichir();
            } }, "tout voir"))
        : el("span.f-aide", {}, "Qui · combien · quand — les trois décisions qui font avancer un livrable")
    );
  }

  /* ————————————————————— L'onde de choc ————————————————————— */

  function onde(sim) {
    var corps = sim.verbe === "décaler" ? ondeDecaler(sim)
      : sim.verbe === "ventiler" ? ondeVentiler(sim)
      : sim.verbe === "annuler" ? ondeAnnuler(sim)
      : ondePropulser(sim);

    PANNEAU.ouvrir(sim.verbe.charAt(0).toUpperCase() + sim.verbe.slice(1), "ce que ça change",
      el("div", {}, corps,
        el("div.form-actions", { style: { "margin-top": "1.2rem" } },
          el("button.b.or", { type: "button", onclick: function () {
            PLATEAU.appliquer(sim); selection = {}; PANNEAU.fermer(); rafraichir();
          } }, "Appliquer"),
          el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
      ));
  }

  function ondeDecaler(sim) {
    return el("div", {},
      comparaison(sim.avant, sim.apres),
      sim.casse.length ? UI.banniere("rouge", sim.casse.join(" · ")) : UI.banniere("vert", "Rien ne casse."),
      el("div.sousbloc", {}, el("h3", {}, "CE QUI BOUGE"),
        el("div", {}, sim.touches.map(function (t) {
          return UI.fileItem(t.piece.objet, t.piece.nom,
            (t.de ? O.joli(t.de) : "sans date") + "  →  " + (t.vers ? O.joli(t.vers) : "sans date"), null);
        }))));
  }

  function ondeVentiler(sim) {
    return el("div", {},
      sim.casse.length ? UI.banniere("", sim.casse.join(" · ")) : UI.banniere("vert", "Tout trouve preneur."),
      el("div.sousbloc", {}, el("h3", {}, "QUI PREND QUOI"),
        el("div", {}, sim.repartition.map(function (r) {
          var de = r.de ? DEPOT.trouve("personnes", r.de) : null;
          return el("div.ventil-l", {},
            IMAGE.vignette(r.piece.objet, "mini"),
            el("div.v-corps", {}, el("div.v-nom", {}, r.piece.nom),
              el("div.v-flux", {}, el("span", {}, de ? de.nom : "sans responsable"),
                el("span.fleche", {}, "→"),
                el("span" + (r.vers ? ".vers" : ".vide"), {}, r.vers ? r.vers.nom : "personne de libre"))),
            r.vers ? el("span.v-air", {}, r.air + " j d'air") : null);
        }))));
  }

  function ondeAnnuler(sim) {
    return el("div", {},
      el("div.stats", {},
        UI.stat("LIVRABLES", sim.touches.length, "retirées du plan", "alerte"),
        UI.stat("AIR LIBÉRÉ", (sim.libere || "—") + " j", sim.libere ? "rendus à l'équipe" : "charge inconnue", "vert")),
      sim.consequences.length
        ? el("div", { style: { "margin-top": ".8rem" } }, sim.consequences.map(function (c) { return UI.banniere("rouge", c); }))
        : UI.banniere("vert", "Aucune conséquence de périmètre."),
      el("div.sousbloc", {}, el("h3", {}, "CE QUI DISPARAÎT"),
        el("div", {}, sim.touches.map(function (t) {
          return UI.fileItem(t.objet, t.nom, t.projet.ref + (t.date ? " · " + O.joli(t.date) : ""), null);
        }))));
  }

  function ondePropulser(sim) {
    return el("div", {},
      sim.repousses.length
        ? UI.banniere("", "En le remontant, tu repousses : " + sim.repousses.join(" · "))
        : UI.banniere("vert", "Personne n'est repoussé."),
      el("div.sousbloc", {}, el("h3", {}, "CE QUI PASSE DEVANT"),
        el("div", {}, sim.touches.map(function (t) {
          return UI.fileItem(t.objet, t.nom, (t.date ? O.joli(t.date) + "  →  une semaine plus tôt" : "sans date"), null);
        }))));
  }

  function comparaison(avant, apres) {
    var max = Math.max(120, Math.max.apply(null, avant.concat(apres).map(function (s) { return s.part; })));
    return el("div.comparaison", {},
      el("div.comp-c", {}, el("div.comp-t", {}, "AVANT"), mini(avant, max)),
      el("div.comp-fleche", {}, "→"),
      el("div.comp-c", {}, el("div.comp-t", {}, "APRÈS"), mini(apres, max)));
  }

  function mini(pression, max) {
    return el("div.mini-p", {}, pression.map(function (s) {
      return el("span.mini-s." + s.ton, { title: "S" + s.n + " · " + s.part + " %" },
        el("i", { style: { height: Math.max(3, Math.round((s.part / max) * 100)) + "%" } }));
    }));
  }

  function filtrer(pieces) {
    return pieces.filter(function (x) {
      if (filtreSemaine === "retard") { if (!PLATEAU.estEnRetard(x)) return false; }
      else if (filtreSemaine && (x.semaine !== filtreSemaine || PLATEAU.estEnRetard(x))) return false;
      if (filtrePersonne && x.responsable !== filtrePersonne) return false;
      return true;
    });
  }

  return { rendre: rendre, titre: "Direction" };
})();
