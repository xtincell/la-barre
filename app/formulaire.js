/* formulaire.js — le moteur de saisie unique.
 *
 * Il lit une liste de champs et rend le formulaire. Deux comportements
 * particuliers, tirés du plan :
 *   — un champ dont le poste n'est pas le tien se saisit en mode « mise en
 *     forme » : on déplace du contenu, on n'en écrit pas de neuf ;
 *   — le vocabulaire surveillé est signalé à la frappe, jamais bloqué.
 */

window.FORM = (function () {
  var el = O.el;

  function rendre(champs, valeurs, options) {
    options = options || {};
    var v = Object.assign({}, valeurs || {});
    var avertissements = el("div");

    var noeud = el("div.form", {},
      champs.map(function (c) {
        var monPoste = !c.poste || c.poste === MAISON.titulaire || !options.frontiere;
        var classe = "champ" + (c.critique ? ".critique" : "") + (monPoste ? "" : ".verrouille");

        var saisie;
        if (c.type === "long" || c.type === "puces") {
          saisie = el("textarea", {
            rows: c.type === "puces" ? 4 : 3,
            placeholder: c.type === "puces" ? "Une ligne par élément" : "",
            readonly: !monPoste && options.frontiere ? true : null,
          });
          saisie.value = Array.isArray(v[c.cle]) ? v[c.cle].join("\n") : (v[c.cle] || "");
        } else if (c.type === "choix") {
          /* Un vocabulaire fermé. « IMP », « imp », « lait en poudre » écrits
           * à la main sont trois catégories différentes pour la machine et une
           * seule pour l'œil : plus rien n'est comparable. On choisit dans une
           * liste, ou on n'écrit pas. */
          saisie = el("select", { disabled: !monPoste && options.frontiere ? true : null });
          saisie.appendChild(el("option", { value: "" }, c.vide || "— non renseigné —"));
          var choix = typeof c.options === "function" ? c.options(v) : (c.options || []);
          choix.forEach(function (x) {
            var val = typeof x === "string" ? x : x.cle;
            var lab = typeof x === "string" ? x : x.nom;
            var o = el("option", { value: val }, lab);
            if (String(v[c.cle]) === String(val)) o.selected = true;
            saisie.appendChild(o);
          });
        } else if (c.type === "objet") {
          /* Une référence au dépôt, pas un nom recopié. « Bonnet Rouge & Peak »
           * tapé à la main ne se lie à rien : ni au vault, ni aux packs, ni aux
           * décideurs. On convoque ce qui existe. */
          saisie = el("select", { disabled: !monPoste && options.frontiere ? true : null });
          saisie.appendChild(el("option", { value: "" }, c.vide || "— non renseigné —"));
          (typeof c.source === "function" ? c.source(v) : DEPOT.liste(c.source)).forEach(function (x) {
            var o = el("option", { value: x.id }, c.libelle ? c.libelle(x) : x.nom);
            if (v[c.cle] === x.id) o.selected = true;
            saisie.appendChild(o);
          });
        } else if (c.type === "objets") {
          /* Plusieurs références — une campagne peut porter plusieurs marques,
           * c'est même le cas courant chez un annonceur à portefeuille. */
          saisie = el("div.ch-multi", {});
          var choisis = Array.isArray(v[c.cle]) ? v[c.cle].slice() : [];
          (typeof c.source === "function" ? c.source(v) : DEPOT.liste(c.source)).forEach(function (x) {
            var b = el("button.ch-mi" + (choisis.indexOf(x.id) !== -1 ? ".ici" : ""),
              { type: "button" }, c.libelle ? c.libelle(x) : x.nom);
            b.onclick = function () {
              var i = choisis.indexOf(x.id);
              if (i === -1) choisis.push(x.id); else choisis.splice(i, 1);
              b.className = "ch-mi" + (choisis.indexOf(x.id) !== -1 ? " ici" : "");
              v[c.cle] = choisis.slice();
              saisie.dispatchEvent(new Event("input", { bubbles: true }));
            };
            saisie.appendChild(b);
          });
        } else if (c.type === "personne") {
          saisie = el("select", {});
          saisie.appendChild(el("option", { value: "" }, "— personne —"));
          DEPOT.liste("personnes").forEach(function (p) {
            var o = el("option", { value: p.id }, p.nom + " · " + O.poste(p.poste).court);
            if (v[c.cle] === p.id) o.selected = true;
            saisie.appendChild(o);
          });
        } else {
          saisie = el("input", {
            type: c.type === "date" ? "date" : c.type === "nombre" ? "number" : "text",
            readonly: !monPoste && options.frontiere ? true : null,
          });
          saisie.value = v[c.cle] === null || v[c.cle] === undefined ? "" : v[c.cle];
        }

        saisie.addEventListener("input", function () {
          if (c.type === "objets") { valeurs[c.cle] = v[c.cle]; return; }
          var val = saisie.value;
          if (c.type === "puces") {
            v[c.cle] = val.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
          } else if (c.type === "nombre") {
            v[c.cle] = val === "" ? null : Number(val);
          } else {
            v[c.cle] = val;
          }
          verifierVocabulaire();
        });
        saisie.addEventListener("change", function () { saisie.dispatchEvent(new Event("input")); });

        return el("div." + classe.replace(/^\./, ""), {},
          el("label", {}, c.nom),
          c.aide ? el("div.indice", {}, c.aide) : null,
          !monPoste && options.frontiere
            ? el("div.indice", {}, "Ce champ appartient à " + O.poste(c.poste).nom + ". Vous pouvez le mettre en forme, pas l'écrire.")
            : null,
          saisie
        );
      }),
      avertissements
    );

    function verifierVocabulaire() {
      O.vider(avertissements);
      var texte = Object.keys(v).map(function (k) {
        return Array.isArray(v[k]) ? v[k].join(" ") : String(v[k] || "");
      }).join(" ");
      var trouves = REGLES.vocabulaire(texte);
      trouves.forEach(function (t) {
        avertissements.appendChild(el("div.avertissement", {},
          t.type === "retire"
            ? "« " + t.mot + " » est un nom retiré du nommage de la marque."
            : "« " + t.mot + " » fait partie de ce que la marque ne dit jamais."
        ));
      });
    }

    verifierVocabulaire();
    return { noeud: noeud, valeurs: function () { return v; } };
  }

  /* Rendu en lecture, depuis les mêmes champs.
   * options : { projet, section } — pour dire quels champs tiennent sur une
   * inférence plutôt que sur du reçu. */
  /* La lecture d'une section. Quand `options.editer` est fourni, chaque champ
   * devient son propre geste : on corrige une ligne sans rouvrir tout le
   * formulaire — et les champs vides cessent d'être cachés, puisqu'ils sont
   * justement ceux qu'on vient remplir. */

  /* ————————————————————— Lire une valeur ————————————————————— */

  /* Un champ de référence stocke un identifiant : « C-fc », « MQ-br ». C'est ce
   * qui permet de lier, et c'est précisément ce qu'il ne faut jamais montrer.
   * Un seul endroit traduit — sinon chaque écran réinvente sa traduction, et
   * l'un d'eux finit par afficher le code. */
  function texte(c, v) {
    if (v === null || v === undefined || v === "") return "";

    if (c.type === "objet") {
      var x = trouver(c, v);
      return x ? (c.libelle ? c.libelle(x) : x.nom) : String(v);
    }
    if (c.type === "objets") {
      var ids = Array.isArray(v) ? v : [v];
      return ids.map(function (id) {
        var y = trouver(c, id);
        return y ? (c.libelle ? c.libelle(y) : y.nom) : String(id);
      }).join("  ·  ");
    }
    if (c.type === "choix") {
      var opts = typeof c.options === "function" ? c.options({}) : (c.options || []);
      var o = opts.filter(function (x) {
        return (typeof x === "string" ? x : x.cle) === v; })[0];
      return o ? (typeof o === "string" ? o : o.nom) : String(v);
    }
    if (c.type === "personne") {
      var pe = DEPOT.trouve("personnes", v);
      return pe ? pe.nom : String(v);
    }
    if (c.type === "date") return O.joli(v);
    if (c.type === "nombre") return O.milliers(v) + " FCFA";
    if (Array.isArray(v)) return v.join("  ·  ");
    return String(v);
  }

  /* La source d'un champ de référence : une collection du dépôt, ou une
   * fonction qui la filtre selon les autres valeurs. */
  function trouver(c, id) {
    if (typeof c.source === "string") return DEPOT.trouve(c.source, id);
    var liste = typeof c.source === "function" ? c.source({}) : [];
    return liste.filter(function (x) { return x.id === id; })[0]
      || chercherPartout(id);
  }

  /* Une source filtrée peut ne pas contenir la valeur enregistrée — un client
   * changé après coup, par exemple. On ne rend pas un code pour autant. */
  function chercherPartout(id) {
    var cols = ["clients", "marques", "contacts", "marches", "supports", "sku", "personnes"];
    for (var i = 0; i < cols.length; i++) {
      var x = DEPOT.trouve(cols[i], id);
      if (x) return x;
    }
    return null;
  }

  function lire(champs, valeurs, options) {
    var v = valeurs || {};
    var o = options || {};
    return el("div", {}, champs.map(function (c) {
      var brut = v[c.cle];
      var vide = Array.isArray(brut) ? !brut.length : (brut === undefined || brut === null || String(brut).trim() === "");
      if (vide && !c.critique && !c.requis && !o.editer) return null;

      if (o.editer) {
        var infereE = o.projet && o.section && INFERENCE.est(o.projet, o.section, c.cle);
        return el("button.ch-e" + (vide ? ".vide" : "") + (infereE ? ".infere" : ""), {
          type: "button", title: "modifier — " + c.nom,
          onclick: function () { o.editer(c.cle); } },
          el("span.che-n", {}, c.nom,
            infereE ? el("span.che-i", {}, "inféré") : null),
          el("span.che-v", {}, vide ? (c.aide || "non renseigné") : texte(c, brut)));
      }

      var infere = o.projet && o.section && INFERENCE.est(o.projet, o.section, c.cle);
      var nom = infere
        ? el("span", {}, c.nom, INFERENCE.marque(INFERENCE.pourquoi(o.projet, o.section, c.cle)))
        : c.nom;

      if (c.type === "objets" && Array.isArray(brut) && brut.length) {
        return PANNEAU.sousbloc(nom, PANNEAU.puces(brut.map(function (id) {
          return texte({ type: "objet", source: c.source, libelle: c.libelle }, id); })));
      }
      if (Array.isArray(brut) && brut.length) return PANNEAU.sousbloc(nom, PANNEAU.puces(brut));
      return PANNEAU.ligne(nom, vide ? null : texte(c, brut), vide);
    }));
  }

  return { rendre: rendre, lire: lire, texte: texte };
})();
