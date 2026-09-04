/* ui.js — la bibliothèque de composants. Le système visuel vit ici, et nulle part ailleurs.
 *
 * Trois règles, tenues :
 *   1. aucune couleur écrite en dur — tout passe par les jetons de base.css ;
 *   2. aucun composant recopié d'un écran à l'autre ;
 *   3. chaque composant sait dire son état vide, plutôt que laisser un trou.
 */

window.UI = (function () {
  var el = O.el;
  var NS = "http://www.w3.org/2000/svg";

  function svg(nom, attrs, enfants) {
    var n = document.createElementNS(NS, nom);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (enfants || []).forEach(function (e) { if (e) n.appendChild(e); });
    return n;
  }

  /* ————————————————————— 1 · Icônes ————————————————————— */

  var TRACES = {
    revue: "M3 12h4l3-7 4 14 3-7h4",
    projets: "M3 4h7l2 3h9v13H3z",
    attentes: "M7 17L17 7M17 7H9M17 7v8",
    referentiel: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
    reglages: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
    journee: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4M12 7a5 5 0 100 10 5 5 0 000-10z",
    feedback: "M4 5h16v11H9l-5 4z",
    charge: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    equipe: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 100-6M16 15c3 0 5 2 5 5",
    standard: "M4 20h16M6 20V9M11 20V4M16 20v-8M21 20v-5",
    cahier: "M5 3h11l4 4v14H5zM16 3v4h4",
    renvoi: "M9 14L4 9l5-5M4 9h11a5 5 0 015 5v6",
    capture: "M3 7h4l2-3h6l2 3h4v13H3zM12 17a4 4 0 100-8 4 4 0 000 8z",
    recherche: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
    imprimer: "M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z",
    alerte: "M12 3l9 17H3zM12 9v5M12 17h.01",
    horloge: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
    fichier: "M6 2h8l4 4v16H6zM14 2v4h4",
    lien: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
  };

  function icone(nom, taille) {
    var t = taille || 16;
    var d = TRACES[nom];
    if (!d) return el("span", { style: { width: t + "px", display: "inline-block" } }, "");
    var n = svg("svg", {
      viewBox: "0 0 24 24", width: t, height: t, fill: "none",
      stroke: "currentColor", "stroke-width": "1.6",
      "stroke-linecap": "round", "stroke-linejoin": "round",
      class: "ico-svg", "aria-hidden": "true",
    }, [svg("path", { d: d })]);
    return n;
  }

  /* ————————————————————— 2 · Avatar ————————————————————— */

  function avatar(personne, taille) {
    var t = taille || 26;
    var p = typeof personne === "string" ? DEPOT.trouve("personnes", personne) : personne;
    if (!p) {
      return el("span.avatar.vide", { style: { width: t + "px", height: t + "px", "font-size": Math.max(12, t * 0.36) + "px" },
        title: "personne non nommée" }, "?");
    }
    var init = String(p.nom).split(/\s+/).slice(0, 2).map(function (m) { return m[0]; }).join("").toUpperCase();
    /* La couleur du poste identifie la personne — elle reste au filet, qui est
     * une marque. Les initiales, elles, sont du texte : elles prennent une
     * encre lisible. Une couleur de poste sur fond sombre tombe à 2:1, très
     * en dessous du minimum du §14. */
    return el("span.avatar" + (p.nature === "ia" ? ".ia" : ""), {
      style: { width: t + "px", height: t + "px", "font-size": Math.max(12, t * 0.34) + "px",
        "border-color": O.poste(p.poste).couleur },
      title: p.nom + " · " + O.poste(p.poste).nom
        + (p.nature === "ia" ? " · sa production entre comme inférence, jamais comme reçu" : ""),
    }, init);
  }

  /* ————————————————————— 3 · Drapeau de marché ————————————————————— */

  function drapeau(marche, avecNom) {
    var m = typeof marche === "string" ? DEPOT.trouve("marches", marche) : marche;
    if (!m) return el("span.drapeau.vide", {}, "—");
    return el("span.drapeau", { title: m.nom + " · " + (m.langues || []).join(", ") },
      el("span.code", {}, m.code),
      avecNom ? el("span.nom-m", {}, m.nom) : null,
      (m.langues || []).length ? el("span.langue", {}, m.langues.join("/")) : null
    );
  }

  /* ————————————————————— 4 · Anneau de progression ————————————————————— */

  function anneau(part, taille, libelle) {
    var t = taille || 64;
    var r = (t - 8) / 2;
    var c = 2 * Math.PI * r;
    var ton = part >= 100 ? "var(--vert)" : part >= 70 ? "var(--attente)" : "var(--alerte)";
    var n = svg("svg", { viewBox: "0 0 " + t + " " + t, width: t, height: t, class: "anneau" }, [
      svg("circle", { cx: t / 2, cy: t / 2, r: r, fill: "none", stroke: "var(--trait)", "stroke-width": "4" }),
      svg("circle", {
        cx: t / 2, cy: t / 2, r: r, fill: "none", stroke: ton, "stroke-width": "4",
        "stroke-dasharray": c, "stroke-dashoffset": c * (1 - Math.max(0, Math.min(1, part / 100))),
        "stroke-linecap": "round", transform: "rotate(-90 " + t / 2 + " " + t / 2 + ")",
      }),
    ]);
    return el("div.anneau-boite", { style: { width: t + "px" } }, n,
      el("span.anneau-val", { style: { color: ton, "font-size": (t * 0.24) + "px" } }, part + " %"),
      libelle ? el("span.anneau-lib", {}, libelle) : null
    );
  }

  /* ————————————————————— 5 · Barre horizontale ————————————————————— */

  function barre(valeur, max, ton, libelle) {
    var part = max ? Math.round((valeur / max) * 100) : 0;
    return el("div.barre-l", {},
      libelle ? el("span.b-lib", {}, libelle) : null,
      el("span.b-piste", {}, el("i", { style: { width: part + "%", background: ton || "var(--or)" } })),
      el("span.b-val", {}, String(valeur))
    );
  }

  /* ————————————————————— 6 · Sparkline ————————————————————— */

  function sparkline(valeurs, largeur, hauteur) {
    var w = largeur || 110, h = hauteur || 30;
    if (!valeurs || valeurs.length < 2) return el("span.sparkline.vide", {}, "pas encore d'historique");
    var max = Math.max.apply(null, valeurs), min = Math.min.apply(null, valeurs);
    var ecart = max - min || 1;
    var pas = w / (valeurs.length - 1);
    var pts = valeurs.map(function (v, i) {
      return (i * pas).toFixed(1) + "," + (h - ((v - min) / ecart) * (h - 4) - 2).toFixed(1);
    }).join(" ");
    return svg("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, class: "sparkline" }, [
      svg("polyline", { points: pts, fill: "none", stroke: "var(--violet)", "stroke-width": "1.5",
        "stroke-linecap": "round", "stroke-linejoin": "round" }),
    ]);
  }

  /* ————————————————————— 7 · Répartition en anneau segmenté ————————————————————— */

  var TONS = ["var(--alerte)", "var(--attente)", "var(--or)", "var(--violet)", "var(--clair-terne)"];

  function repartition(parts, taille) {
    var t = taille || 92;
    var total = parts.reduce(function (s, p) { return s + p.valeur; }, 0) || 1;
    var r = (t - 14) / 2, c = 2 * Math.PI * r, offset = 0;
    var arcs = parts.map(function (p, i) {
      var portion = p.valeur / total;
      var arc = svg("circle", {
        cx: t / 2, cy: t / 2, r: r, fill: "none", stroke: p.ton || TONS[i % TONS.length],
        "stroke-width": "10", "stroke-dasharray": (c * portion - 1.5) + " " + c,
        "stroke-dashoffset": -offset, transform: "rotate(-90 " + t / 2 + " " + t / 2 + ")",
      });
      offset += c * portion;
      return arc;
    });
    return el("div.repartition", {},
      svg("svg", { viewBox: "0 0 " + t + " " + t, width: t, height: t }, arcs),
      el("div.rep-legende", {}, parts.map(function (p, i) {
        return el("div.rep-l", {},
          el("span.pastille", { style: { background: p.ton || TONS[i % TONS.length] } }),
          el("span.rep-nom", {}, p.nom),
          el("span.rep-val", {}, Math.round((p.valeur / total) * 100) + " %")
        );
      }))
    );
  }

  /* ————————————————————— 8 · Fil d'étapes ————————————————————— */

  function filEtapes(etapes, ici, grand) {
    var points = el("div.points");
    etapes.forEach(function (nom, i) {
      if (i) points.appendChild(el("span.lien"));
      var etat = i < ici ? "faite" : i === ici ? "ici" : "";
      points.appendChild(grand
        ? el("div.etape-g" + (etat ? "." + etat : ""), {},
            el("span.rond"), el("span.nom", {}, nom))
        : el("span.rond" + (etat ? "." + etat : ""), { title: nom }));
    });
    return el("div.fil-etapes" + (grand ? ".grand" : ""), {},
      points,
      grand ? null : el("span.ou", {}, "étape : " + (etapes[ici] || "—"))
    );
  }

  /* ————————————————————— 9 · Carte de statistique ————————————————————— */

  function stat(titre, valeur, sous, ton) {
    return el("div.stat-c" + (ton ? "." + ton : ""), {},
      el("div.t", {}, titre),
      el("div.v", {}, String(valeur)),
      sous ? el("div.s", {}, sous) : null
    );
  }

  /* ————————————————————— 10 · Bannière ————————————————————— */

  function banniere(ton, texte, action) {
    return el("div.banniere" + (ton ? "." + ton : ""), {},
      el("span.b-ico", {}, icone(ton === "vert" ? "revue" : "alerte", 18)),
      el("div.b-corps", {},
        el("div.b-texte", {}, texte)
      ),
      action ? el("button.b.nu", { type: "button", onclick: action.quand }, action.nom + " →") : null
    );
  }

  /* ————————————————————— 11 · Mur de vignettes ————————————————————— */

  function mur(groupes, quandClic) {
    if (!groupes.length) return el("p.rien", {}, "Rien à montrer : aucun livrable n'a encore de visuel.");
    return el("div.mur", {}, groupes.map(function (g) {
      return el("div.mur-panneau", {},
        el("div.mur-tete", {},
          el("span.mur-nom", {}, g.nom),
          el("span.mur-compte", {}, g.items.length + (g.items.length > 1 ? " exécutions" : " exécution"))
        ),
        el("div.mur-grille", {}, g.items.slice(0, 6).map(function (it) {
          return el("button.mur-case", { type: "button", onclick: function () { quandClic && quandClic(it); } },
            IMAGE.vignette(it.objet, "carte"),
            el("span.mur-eti", {}, it.etat || "")
          );
        })),
        el("div.mur-pied", {}, g.pied || "")
      );
    }));
  }

  /* ————————————————————— 12 · Bande de vignettes ————————————————————— */

  function strip(items, actif, quandClic) {
    if (!items.length) return null;
    return el("div.strip", {}, items.map(function (it, i) {
      return el("button.strip-case" + (i === actif ? ".actif" : ""), {
        type: "button", title: it.nom || "",
        onclick: function () { quandClic && quandClic(it, i); },
      }, IMAGE.vignette(it.objet || it, "mini"));
    }));
  }

  /* ————————————————————— 13 · Frise datée ————————————————————— */

  function frise(jalons) {
    if (!jalons.length) return el("p.rien", {}, "Aucune date posée : la frise reste vide.");
    return el("div.frise", {}, jalons.map(function (j, i) {
      return el("div.frise-j" + (j.fait ? ".faite" : j.ici ? ".ici" : ""), {},
        i ? el("span.frise-lien") : null,
        el("span.frise-rond"),
        el("span.frise-date", {}, j.date ? O.joli(j.date) : "—"),
        el("span.frise-nom", {}, j.nom)
      );
    }));
  }

  /* ————————————————————— 14 · Carte numérotée ————————————————————— */

  function carteNumerotee(n, titre, corps, vide) {
    return el("div.carte-n" + (vide ? ".vide" : ""), {},
      el("div.carte-n-tete", {}, el("span.n", {}, String(n) + "."), el("span.t", {}, titre)),
      el("div.carte-n-corps", {}, vide ? el("p.rien", {}, "Non renseigné.") : corps)
    );
  }

  /* ————————————————————— 15 · Graphe de dépendances ————————————————————— */

  function graphe(centre, liens) {
    var w = 300, h = 210, cx = w / 2, cy = h / 2;
    var noeuds = [];
    var traits = [];
    var n = liens.length || 1;
    liens.forEach(function (l, i) {
      var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      var x = cx + Math.cos(angle) * 92, y = cy + Math.sin(angle) * 72;
      traits.push(svg("line", { x1: cx, y1: cy, x2: x, y2: y,
        stroke: l.ok ? "var(--trait-clair)" : "var(--alerte)", "stroke-width": "1",
        "stroke-dasharray": l.ok ? "" : "3 3" }));
      noeuds.push(svg("circle", { cx: x, cy: y, r: 5,
        fill: l.ok ? "var(--vert)" : "var(--alerte)" }));
      var t = svg("text", { x: x, y: y - 10, "text-anchor": "middle", class: "g-nom" });
      t.textContent = l.nom.length > 16 ? l.nom.slice(0, 15) + "…" : l.nom;
      noeuds.push(t);
    });
    var cCentre = svg("circle", { cx: cx, cy: cy, r: 24, fill: "none",
      stroke: centre.ok ? "var(--vert)" : "var(--alerte)", "stroke-width": "1.5" });
    var tCentre = svg("text", { x: cx, y: cy + 3, "text-anchor": "middle", class: "g-centre" });
    tCentre.textContent = centre.nom.length > 14 ? centre.nom.slice(0, 13) + "…" : centre.nom;
    return svg("svg", { viewBox: "0 0 " + w + " " + h, class: "graphe" },
      traits.concat([cCentre, tCentre]).concat(noeuds));
  }

  /* ————————————————————— 16 · Onglets ————————————————————— */

  function onglets(liste, courant, quand) {
    return el("div.onglets", {}, liste.map(function (o) {
      return el("button.onglet", {
        type: "button", "aria-current": o.cle === courant ? "true" : null,
        onclick: function () { quand(o.cle); },
      }, o.nom, o.compte !== undefined ? el("span.etat", {}, "(" + o.compte + ")") : null);
    }));
  }

  /* ————————————————————— 17 · La bande de recevabilité ————————————————————— */

  /* Le motif central du produit : une question, des contrôles, le prix de
   * l'écart, et le geste. Elle ouvre chaque écran d'objet — parce qu'un
   * directeur n'ouvre pas un document pour le lire, il l'ouvre pour trancher. */
  function recevabilite(question, controles, prix, gestes) {
    var manques = controles.filter(function (c) { return !c.ok; });
    /* Si aucun prix n'est donné, on prend la conséquence la plus lourde —
     * jamais la première venue. */
    if (!prix && manques.length) {
      var pire = manques.slice().sort(function (a, b) {
        return (b.poids || 0) - (a.poids || 0);
      })[0];
      if (pire && pire.cout) prix = pire.cout;
    }
    var ton = !controles.length ? "flou" : manques.length ? "manque" : "tenu";

    return el("div.recev." + ton, {},
      el("div.rv-question", {},
        el("div.rq-t", {}, question),
        el("div.rq-etat", {},
          manques.length
            ? manques.length + (manques.length > 1 ? " conditions non remplies" : " condition non remplie")
            : "toutes les conditions sont remplies"
        )
      ),

      el("div.rv-controles", {}, controles.map(function (c) {
        return el("span.rc-i" + (c.ok ? ".ok" : ""), { title: c.cout || "" },
          el("span.m", {}, c.ok ? "✓" : "✕"), el("span", {}, c.quoi));
      })),

      prix ? el("div.rv-prix", {}, icone("alerte", 15), el("span", {}, prix)) : null,

      gestes && gestes.length ? el("div.rv-gestes", {}, gestes.map(function (g) {
        return el("button.b" + (g.fort ? ".or" : g.doux ? ".nu" : ""), {
          type: "button", onclick: g.quand,
        }, g.nom);
      })) : null
    );
  }

  /* ————————————————————— Petits communs ————————————————————— */

  function eti(texte, ton) { return el("span.eti" + (ton ? "." + ton : ""), {}, texte); }

  function meta(t, v, vide) {
    return el("div.bloc", {}, el("div.t", {}, t), el("div.v" + (vide || !v ? ".vide" : ""), {}, v || "non renseigné"));
  }

  function fileItem(vignetteObj, nom, sous, etiquette, quand) {
    return el("div.file-item", { onclick: quand || null, style: quand ? { cursor: "pointer" } : {} },
      vignetteObj === null ? null : IMAGE.vignette(vignetteObj, "mini"),
      el("div.fi-corps", {}, el("div.fi-nom", {}, nom), sous ? el("div.fi-meta", {}, sous) : null),
      etiquette ? el("span.fi-eti", {}, etiquette) : null
    );
  }

  function titreEcran(titre, devise, actions) {
    return el("div.titre-ecran", {},
      el("div", {}, el("h2", {}, titre), devise ? el("div.devise", {}, devise) : null),
      actions ? el("div.actions", {}, actions) : null
    );
  }

  function sectionTitre(titre, compte, droite) {
    return el("div.section-titre", {}, titre,
      compte !== undefined && compte !== null ? el("span.taille", {}, "· " + compte) : null,
      droite ? el("span.droite", {}, droite) : null);
  }

  return {
    icone: icone, avatar: avatar, drapeau: drapeau, anneau: anneau, barre: barre,
    sparkline: sparkline, repartition: repartition, filEtapes: filEtapes, stat: stat,
    banniere: banniere, mur: mur, strip: strip, frise: frise,
    carteNumerotee: carteNumerotee, graphe: graphe, onglets: onglets,
    recevabilite: recevabilite,
    eti: eti, meta: meta, fileItem: fileItem, titreEcran: titreEcran, sectionTitre: sectionTitre,
  };
})();
