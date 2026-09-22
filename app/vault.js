/* vault.js — le vault de marque : ce qui survit aux campagnes.
 *
 * Une campagne est une SÉLECTION : une ou plusieurs marques, un ou plusieurs
 * SKU, un ou plusieurs marchés. Elle ne définit pas la marque — elle y puise.
 *
 * Ce qui appartient à la marque vit ici et vaut plusieurs années : son
 * positionnement, sa promesse, son idée directrice, son ton, ce qu'elle ne dit
 * jamais, ses couleurs, son logo, son catalogue de packs, les marchés où elle
 * est distribuée. Ce qui appartient à une campagne — la mécanique, le message
 * de cette saison, l'ombre portée — reste dans la campagne.
 *
 * Mettre le socle dans le projet obligeait à le réécrire à chaque campagne, et
 * faisait fuir les packs d'une marque dans le dossier d'une autre. C'est ce que
 * ce module répare.
 */

window.VAULT = (function () {
  /* Les champs pluriannuels d'une marque, rangés par pilier.
   *
   * Le socle en portait dix, et les dix étaient du D avec un peu de V et de E.
   * Zéro Authenticité : ni vision, ni mission, ni valeurs, ni mythe d'origine,
   * ni archétype. Or c'est exactement ce qui permet de dire qu'une piste EST
   * la marque — sans eux on juge sur le positionnement et le ton, c'est-à-dire
   * sur la surface du Mythe, et « c'est pas la marque » reste une impression.
   *
   * Les clés `code` sont celles d'ADVE. LA BARRE n'en reprend pas les cent
   * cinquante-cinq variables : elle prend ce qu'une agence d'exécution
   * emploie, et garde les codes pour que le branchement futur sur La Fusée
   * soit une identité plutôt qu'une traduction. Les clés du produit, elles,
   * ne bougent pas : `positionnement` reste `positionnement`, et aucun dépôt
   * n'a à être réécrit.
   * ————— */
  var CHAMPS = [
    /* ————— A · Authenticité — Le Gospel : ce que la marque EST ————— */
    { cle: "vision", pilier: "A", code: "a.prophecy", nom: "Vision", type: "long",
      aide: "Le monde que la marque veut créer. Pas ce qu'elle vend — ce qu'elle veut voir advenir." },
    { cle: "mission", pilier: "A", code: "a.missionStatement", nom: "Mission", type: "texte",
      aide: "Comment elle réalise sa vision. Vingt-cinq mots au plus." },
    { cle: "valeurs", pilier: "A", code: "a.valeurs", nom: "Valeurs", type: "puces",
      aide: "Trois au maximum. Au-delà, ce ne sont plus des valeurs : c'est une liste." },
    { cle: "origine", pilier: "A", code: "a.originMyth", nom: "Mythe d'origine", type: "long",
      aide: "L'histoire fondatrice qui justifie qu'elle existe." },
    { cle: "archetype", pilier: "A", code: "a.archetype", nom: "Archétype", type: "texte",
      aide: "Le patron narratif : le Sage, le Héros, le Créateur, le Rebelle…" },
    { cle: "preuves_origine", pilier: "A", code: "a.preuvesAuthenticite",
      nom: "Preuves de légitimité", type: "puces",
      aide: "Ancienneté, certifications, reconnaissance. Ce qui rend l'origine opposable." },

    /* ————— D · Distinction — Le Mythe : ce qui la sépare ————— */
    { cle: "positionnement", pilier: "D", code: "d.positionnement", nom: "Positionnement", type: "long" },
    { cle: "promesse", pilier: "D", code: "d.promesseMaitre", nom: "Promesse", type: "texte" },
    { cle: "idee_directrice", pilier: "D", code: "d.ideeDirectrice", nom: "Idée directrice", type: "texte",
      aide: "Pluriannuelle. Les campagnes en sont des déclinaisons." },
    { cle: "ton", pilier: "D", code: "d.tonDeVoix", nom: "Personnalité et ton", type: "long" },
    { cle: "symboles", pilier: "D", code: "d.symboles", nom: "Symboles", type: "puces" },
    { cle: "dialecte", pilier: "D", code: "d.assetsLinguistiques", nom: "Vocabulaire propriétaire", type: "puces",
      aide: "Les mots qui n'appartiennent qu'à elle : signature, mantras, lexique." },
    { cle: "concurrents", pilier: "D", code: "d.paysageConcurrentiel", nom: "Contre qui elle se situe", type: "puces" },

    /* ————— V · Valeur — Le Miracle : ce qu'elle délivre ————— */
    { cle: "benefices", pilier: "V", code: "v.valeurClientTangible", nom: "Bénéfices, dans l'ordre", type: "puces" },
    { cle: "preuves", pilier: "V", code: "v.roiProofs", nom: "Preuves tangibles", type: "puces" },
    { cle: "sacrifice", pilier: "V", code: "v.sacrificeRequis", nom: "Ce qu'elle demande au client", type: "long",
      aide: "Prix, temps, effort — et pourquoi ça vaut le coup." },

    /* ————— E · Engagement — L'Église : ce qui attache ————— */
    { cle: "jamais", pilier: "E", code: "e.taboos", nom: "Ce qu'on ne dit jamais", type: "puces",
      aide: "Le contrôle de vocabulaire s'y adosse." },
    { cle: "ne_fera_pas", pilier: "E", code: "e.commandments", nom: "Ce que la marque ne fera pas", type: "puces" },
    { cle: "rituels", pilier: "E", code: "e.rituels", nom: "Rituels", type: "puces",
      aide: "Ce qui revient et crée l'habitude : un rendez-vous, un geste, une formule." },
    { cle: "occasions", pilier: "E", code: "e.sacredCalendar", nom: "Le calendrier de la marque", type: "puces",
      aide: "Ses temps forts à elle. Noël ne veut pas dire la même chose partout." },
    /* Même mécanique que « ce qu'on ne dit jamais », autre usage : une faute
     * déjà partie en production se retrouve sur toute la descendance. On la
     * note une fois, l'outil la traque ensuite. C'est aussi, littéralement,
     * un tabou appris — la marque antifragile est celle qui note ses fautes. */
    { cle: "fautes", pilier: "E", code: "e.taboosAppris", nom: "Fautes déjà commises", type: "puces",
      aide: "Une par ligne, au format « écrit → correct ». Ex. Nourissons → Nourrissons" },
  ];

  /* Les quatre piliers viennent de la maison : c'est de la doctrine d'agence,
   * pas une loi du métier. Le repli garde le produit debout si la maison ne
   * les déclare pas. */
  var PILIERS = (window.MAISON && MAISON.piliers) || [
    { cle: "A", nom: "Authenticité" }, { cle: "D", nom: "Distinction" },
    { cle: "V", nom: "Valeur" }, { cle: "E", nom: "Engagement" },
  ];

  function champsDuPilier(cle) {
    return CHAMPS.filter(function (c) { return c.pilier === cle; });
  }

  function marque(id) { return DEPOT.trouve("marques", id); }

  function de(marqueId) {
    var m = marque(marqueId);
    if (!m) return null;
    if (!m.vault) m.vault = {};
    return m.vault;
  }

  function valeur(marqueId, cle) {
    var v = de(marqueId);
    return v ? v[cle] : null;
  }

  /* ————————————————————— Le catalogue de packs ————————————————————— */

  /* Strictement les packs de cette marque. Un pack sans marque n'appartient
   * pas à tout le monde : il n'appartient à personne, et il attend d'être
   * qualifié. La règle inverse faisait apparaître les boîtes Bonnet Rouge
   * dans le dossier Beignet Paradise. */
  function catalogue(marqueId) {
    if (!marqueId) return [];
    return DEPOT.liste("sku").filter(function (s) {
      return s.marque === marqueId && !s.archive; });
  }

  /* Les packs que personne ne revendique. Ils ne se rangent nulle part tant
   * qu'on ne leur donne pas de marque — et c'est un geste, pas un défaut. */
  function orphelins() {
    return DEPOT.liste("sku").filter(function (s) { return !s.marque && !s.archive; });
  }

  function rattacher(skuId, marqueId) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return false;
    s.marque = marqueId || null;
    s.aQualifier = !marqueId || !s.categorie || !s.format;
    DEPOT.tracer("pack rattaché", "sku", null,
      s.nom + " → " + (marqueId ? (marque(marqueId) || {}).nom || marqueId : "sans marque"));
    return true;
  }




  /* ————————————————————— L'arbre des socles ————————————————————— */

  /* Une marque n'est pas plate. FrieslandCampina porte un socle d'entreprise ;
   * Bonnet Rouge porte le sien — « Réussir dès le matin » ; et Bonnet Rouge IMP
   * en porte encore un autre, construit autour de l'enfance et de la famille.
   * Chaque niveau hérite du précédent et peut le spécialiser : ce qui n'est pas
   * réécrit plus bas vaut tel quel, et l'héritage se voit.
   *
   * Sans cet arbre, on écrit trois fois la même promesse — ou on la contredit
   * sans s'en apercevoir. */
  var NIVEAUX = { ombrelle: "clients", marque: "marques", gamme: null };

  function noeud(type, id) {
    if (type === "ombrelle") return DEPOT.trouve("clients", id);
    if (type === "marque") return marque(id);
    if (type === "gamme") {
      var parts = String(id).split("|");
      var m = marque(parts[0]);
      if (!m) return null;
      m.gammes = m.gammes || {};
      if (!m.gammes[parts[1]]) m.gammes[parts[1]] = { vault: {} };
      return m.gammes[parts[1]];
    }
    return null;
  }

  function nomDe(type, id) {
    if (type === "gamme") {
      var parts = String(id).split("|");
      var m = marque(parts[0]);
      return (m ? m.nom : "?") + " " + parts[1];
    }
    var n = noeud(type, id);
    return n ? n.nom : "?";
  }

  function parent(type, id) {
    if (type === "gamme") return { type: "marque", id: String(id).split("|")[0] };
    if (type === "marque") {
      var m = marque(id);
      return m && m.clientId ? { type: "ombrelle", id: m.clientId } : null;
    }
    return null;
  }

  function vaultDe(type, id) {
    var n = noeud(type, id);
    if (!n) return null;
    if (!n.vault) n.vault = {};
    return n.vault;
  }

  /* La valeur d'un champ à ce niveau : la sienne si elle existe, sinon celle
   * héritée — et l'écran dit d'où elle vient. */
  function herite(type, id, cle) {
    var v = vaultDe(type, id) || {};
    var x = v[cle];
    var plein = Array.isArray(x) ? x.length : (x !== undefined && x !== null && String(x).trim() !== "");
    if (plein) return { valeur: x, propre: true, source: { type: type, id: id, nom: nomDe(type, id) } };
    var p = parent(type, id);
    if (!p) return { valeur: null, propre: false, source: null };
    var h = herite(p.type, p.id, cle);
    return { valeur: h.valeur, propre: false, source: h.source };
  }

  /* L'arbre complet : l'ombrelle, ses marques, et les gammes que le catalogue
   * emploie réellement. On n'invente pas une gamme vide. */
  function arbre() {
    var out = [];
    DEPOT.liste("clients").forEach(function (c) {
      var mqs = DEPOT.liste("marques").filter(function (m) { return m.clientId === c.id; });
      if (!mqs.length) return;
      out.push({ type: "ombrelle", id: c.id, nom: c.nom,
        enfants: mqs.map(function (m) {
          var cats = {};
          DEPOT.liste("sku").forEach(function (s) {
            if (s.marque === m.id && s.categorie && !s.archive) cats[s.categorie] = true; });
          DEPOT.liste("projets").forEach(function (p) {
            (p.livrables || []).forEach(function (l) {
              if (l.marqueId === m.id && l.categorie) cats[l.categorie] = true; });
          });
          return { type: "marque", id: m.id, nom: m.nom,
            enfants: Object.keys(cats).sort().map(function (k) {
              return { type: "gamme", id: m.id + "|" + k, nom: m.nom + " " + k, enfants: [] };
            }) };
        }) });
    });
    /* Les marques sans client déclaré ne disparaissent pas. */
    var orph = DEPOT.liste("marques").filter(function (m) {
      return !m.clientId || !DEPOT.trouve("clients", m.clientId); });
    if (orph.length) out.push({ type: "ombrelle", id: null, nom: "Sans marque ombrelle",
      enfants: orph.map(function (m) {
        return { type: "marque", id: m.id, nom: m.nom, enfants: [] }; }) });
    return out;
  }

  /* Empiler la révision AVANT d'écrire.
   *
   * `v[cle] = val` effaçait la valeur précédente. Sur un champ de campagne
   * c'est sans conséquence ; sur une plateforme de marque, qui vaut plusieurs
   * années et se révise, c'est la mémoire de la marque qui disparaît. On ne
   * pouvait pas dire quand le positionnement avait changé, ni pourquoi.
   *
   * La règle de la maison, appliquée là où elle manquait le plus : on archive,
   * on ne supprime pas. Une révision sans changement n'en est pas une — on ne
   * consigne que ce qui bouge. */
  function ecrireNiveau(type, id, cle, val, motif) {
    var v = vaultDe(type, id);
    if (!v) return false;
    var avant = v[cle];
    if (JSON.stringify(avant === undefined ? null : avant) === JSON.stringify(val === undefined ? null : val)) {
      return true;
    }
    v[cle] = val;
    var estVide = avant === undefined || avant === null || avant === ""
      || (Array.isArray(avant) && !avant.length);
    if (!estVide) {
      v.revisions = v.revisions || [];
      v.revisions.push({
        quand: new Date().toISOString(), qui: MAISON.titulaire,
        champ: cle, avant: avant, apres: val,
        motif: (motif || "").trim() || null,
      });
    }
    DEPOT.tracer(estVide ? "socle écrit" : "socle révisé", "marques", id,
      nomDe(type, id) + " · " + cle, type === "marque" ? [id] : null);
    return true;
  }

  /* Ce qu'un champ a été avant, du plus récent au plus ancien. */
  function revisions(type, id, cle) {
    var v = vaultDe(type, id);
    if (!v || !v.revisions) return [];
    return v.revisions.filter(function (r) { return !cle || r.champ === cle; })
      .slice().reverse();
  }

  /* Ce qu'un niveau porte en propre, et ce qu'il tient de plus haut. */
  function etatNiveau(type, id) {
    var propres = 0, herites = 0, vides = [];
    CHAMPS.forEach(function (c) {
      var h = herite(type, id, c.cle);
      if (h.propre) propres++;
      else if (h.valeur !== null && h.valeur !== undefined) herites++;
      else vides.push(c);
    });
    return { propres: propres, herites: herites, vides: vides, total: CHAMPS.length };
  }


  /* ————————————————————— Ce qui définit une marque, au-delà du socle ————————————————————— */

  /* Qui décide pour cette marque. Une validation obtenue de quelqu'un qui n'a
   * pas ce pouvoir ne tient pas — et on ne le découvre qu'au moment où elle est
   * contestée. Les contacts vivent au dépôt ; ici on dit lesquels comptent. */
  function decideurs(marqueId) {
    var m = marque(marqueId);
    if (!m) return [];
    var v = vaultDe("marque", marqueId) || {};
    var ids = v.decideurs || [];
    var directs = ids.map(function (id) { return DEPOT.trouve("contacts", id); }).filter(Boolean);
    /* Et ceux du client, qui valent par défaut tant qu'on n'a pas dit mieux. */
    var duClient = DEPOT.liste("contacts").filter(function (c) {
      return c.clientId === m.clientId && ids.indexOf(c.id) === -1; });
    return directs.map(function (c) { return { contact: c, propre: true }; })
      .concat(duClient.map(function (c) { return { contact: c, propre: false }; }));
  }

  /* Les mécaniques de promo que cette marque sait faire. Elles ne s'inventent
   * pas au moment de la campagne : elles ont un historique, un coût, et des
   * marchés où elles marchent. */
  function promos(marqueId) {
    var v = vaultDe("marque", marqueId) || {};
    var declarees = (v.promos || []).slice();
    /* Ce que les packs portent déjà est une promo qui existe, qu'on l'ait
     * déclarée ou non. */
    var vues = {};
    DEPOT.liste("sku").forEach(function (s) {
      if (s.marque === marqueId && s.promo && !s.archive) vues[s.promo] = (vues[s.promo] || 0) + 1;
    });
    Object.keys(vues).forEach(function (k) {
      if (!declarees.some(function (p) { return p.nom === k; }))
        declarees.push({ nom: k, packs: vues[k], parLUsage: true });
    });
    return declarees.map(function (p) {
      return { nom: p.nom, detail: p.detail || null, marches: p.marches || [],
        packs: vues[p.nom] || 0, parLUsage: !!p.parLUsage };
    });
  }

  function ajouterPromo(marqueId, nom, detail) {
    var v = vaultDe("marque", marqueId);
    if (!v) return false;
    v.promos = v.promos || [];
    if (v.promos.some(function (p) { return O.normalise(p.nom) === O.normalise(nom); })) return false;
    v.promos.push({ nom: nom, detail: detail || null, marches: [] });
    DEPOT.tracer("promo déclarée", "marques", null, nomDe("marque", marqueId) + " · " + nom);
    return true;
  }

  function basculerDecideur(marqueId, contactId) {
    var v = vaultDe("marque", marqueId);
    if (!v) return false;
    v.decideurs = v.decideurs || [];
    var i = v.decideurs.indexOf(contactId);
    if (i === -1) v.decideurs.push(contactId); else v.decideurs.splice(i, 1);
    return true;
  }



  /* Les fautes connues d'une marque, lues « écrit → correct ». Elles héritent
   * comme le reste : une faute relevée à l'ombrelle vaut pour ses marques. */
  function fautesDe(marqueId) {
    var h = herite("marque", marqueId, "fautes");
    var brut = Array.isArray(h.valeur) ? h.valeur : (h.valeur ? [h.valeur] : []);
    return brut.map(function (x) {
      var parts = String(x).split(/→|->|=>/);
      return { mauvais: (parts[0] || "").trim(), bon: (parts[1] || "").trim() };
    }).filter(function (f) { return f.mauvais; });
  }

  /* Ce qu'un livrable porte de fautif. On regarde ce qui se lit : l'accroche, le
   * nom, la note — pas les identifiants techniques. */
  function fautesSur(l) {
    if (!l.marqueId) return [];
    var fs = fautesDe(l.marqueId);
    if (!fs.length) return [];
    var texte = [(l.kv || {}).copy, l.nom, l.note].filter(Boolean).join("  ");
    return fs.filter(function (f) {
      return new RegExp("\\b" + f.mauvais.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i")
        .test(texte);
    });
  }

  /* ————————————————————— Les packs montrés par un livrable ————————————————————— */

  /* Un livrable déclare les packs qu'elle montre. Sans ce lien, « 0 sur 32 packs
   * retenus » est vrai mais inutile — et surtout, on ne peut pas voir qu'un
   * pack apparaît sur un marché qui ne le vend pas. C'est l'erreur qui fait
   * rappeler une campagne, et elle ne se voit qu'ici. */
  function packsDe(l) {
    return ((l.kv || {}).sku || []).map(function (id) { return DEPOT.trouve("sku", id); })
      .filter(Boolean);
  }

  function basculerPack(l, skuId) {
    if (!l.kv) l.kv = {};
    if (!Array.isArray(l.kv.sku)) l.kv.sku = [];
    var i = l.kv.sku.indexOf(skuId);
    if (i === -1) l.kv.sku.push(skuId); else l.kv.sku.splice(i, 1);
    return true;
  }

  /* Ce que ce livrable montre et qui n'est pas vendu sur son marché. Un pack
   * dont personne n'a renseigné les marchés ne peut rien affirmer : il est
   * signalé à part, comme un contrôle impossible plutôt qu'un contrôle réussi. */
  function packsHorsZone(l) {
    if (!l.marche) return { hors: [], muets: [] };
    var hors = [], muets = [];
    packsDe(l).forEach(function (s) {
      var d = s.marches || [];
      if (!d.length) { muets.push(s); return; }
      if (d.indexOf(l.marche) === -1) hors.push(s);
    });
    return { hors: hors, muets: muets };
  }

  /* Le catalogue proposable à un livrable : celui de sa marque, jamais l'autre.
   * Le cloisonnement vaut ici comme partout. */
  function proposables(l) {
    if (!l.marqueId) return [];
    return catalogue(l.marqueId).filter(function (s) {
      /* Une langue de pack qui contredit celle du marché n'est pas proposée en
       * premier, mais reste choisissable : un marché bilingue existe. */
      return true;
    });
  }

  /* ————————————————————— Créer, archiver, restaurer ————————————————————— */

  /* Un pack se crée à la main quand il n'a pas de packshot au dossier — un
   * nouveau format, une promo qui arrive. La fiche existe avant l'image. */
  function creerSku(marqueId) {
    var s = DEPOT.ajoute("sku", {
      marque: marqueId || null, nom: "Nouveau pack", code: "",
      categorie: null, format: null, variante: null, langue: null,
      promo: null, mentions: [], marches: [],
      vignette: null, production: null, review: null, espace: null,
      aQualifier: true, creeLe: new Date().toISOString(),
    });
    DEPOT.tracer("pack créé", "sku", null, s.nom);
    return s;
  }

  /* On n'efface pas un pack : on l'archive. Une campagne passée peut le
   * montrer, et un fichier supprimé est une trace qui manque le jour où
   * quelqu'un demande ce qu'on avait imprimé. Il sort des catalogues, il
   * reste au dépôt, et il revient d'un geste. */
  function archiver(skuId, motif) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return false;
    s.archive = { quand: new Date().toISOString(), motif: motif || null,
      par: MAISON.titulaire };
    DEPOT.tracer("pack archivé", "sku", null, s.nom + (motif ? " — " + motif : ""));
    return true;
  }

  function restaurer(skuId) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return false;
    delete s.archive;
    DEPOT.tracer("pack restauré", "sku", null, s.nom);
    return true;
  }

  function archives(marqueId) {
    return DEPOT.liste("sku").filter(function (s) {
      return s.archive && (!marqueId || s.marque === marqueId); });
  }

  /* ————————————————————— La fiche d'un pack ————————————————————— */

  /* Un SKU n'est pas une vignette : c'est un article, avec un code, des
   * mentions obligatoires qui changent d'un pays à l'autre, et une liste de
   * marchés où il est réellement distribué. Le montrer sur un marché où il ne
   * l'est pas est l'erreur qui fait rappeler une campagne — et elle ne se voit
   * qu'à la fiche. */

  /* ————————————————————— Les relations descendent ————————————————————— */

  /* Une base de données, ce n'est pas des listes globales qu'on filtre à
   * l'œil : c'est des relations. Un pack de Beignet Paradise ne peut pas être
   * distribué au Ghana — Beignet Paradise n'y est pas — et sa catégorie n'est
   * pas « lait évaporé ». Proposer les seize marchés du référentiel et les
   * cinq catégories laitières à toutes les marques, c'est inviter la faute. */

  function clientDe(marqueId) {
    var m = marque(marqueId);
    return m && m.clientId ? DEPOT.trouve("clients", m.clientId) : null;
  }

  /* Les marchés où ce client opère. Déclarés s'il en a, sinon déduits de ce que
   * ses marques ont réellement produit — le référentiel se remplit par l'usage. */
  function marchesDuClient(clientId) {
    var c = clientId ? DEPOT.trouve("clients", clientId) : null;
    var vus = {};
    if (c && (c.marches || []).length) {
      c.marches.forEach(function (id) { vus[id] = true; });
    } else {
      var siennes = DEPOT.liste("marques").filter(function (m) { return m.clientId === clientId; })
        .map(function (m) { return m.id; });
      DEPOT.liste("projets").forEach(function (p) {
        var ident = p.sections.identite || {};
        var concerne = ident.clientId === clientId
          || (ident.marqueIds || []).some(function (x) { return siennes.indexOf(x) !== -1; });
        (p.livrables || []).forEach(function (l) {
          if (l.annule || !l.marche) return;
          if (concerne || siennes.indexOf(l.marqueId) !== -1) vus[l.marche] = true;
        });
      });
      DEPOT.liste("sku").forEach(function (s) {
        if (siennes.indexOf(s.marque) === -1) return;
        (s.marches || []).forEach(function (id) { vus[id] = true; });
      });
    }
    return Object.keys(vus).map(function (id) { return DEPOT.trouve("marches", id); })
      .filter(Boolean);
  }

  /* Les catégories de produit de ce client. Le lait a IMP, EVAP, SCM, UHT et
   * yaourt ; un pâtissier n'en a aucune. Elles se déclarent, ou se déduisent
   * de ce que le catalogue emploie. */
  function categoriesDuClient(clientId) {
    var c = clientId ? DEPOT.trouve("clients", clientId) : null;
    if (c && (c.categories || []).length) {
      var noms = c.categoriesNoms || {};
      return c.categories.map(function (k) {
        if (noms[k]) return { cle: k, nom: noms[k] };
        var t = CATEGORIES.filter(function (x) { return x.cle === k; })[0];
        return t || { cle: k, nom: k };
      });
    }
    var siennes = DEPOT.liste("marques").filter(function (m) { return m.clientId === clientId; })
      .map(function (m) { return m.id; });
    var vus = {};
    DEPOT.liste("sku").forEach(function (s) {
      if (siennes.indexOf(s.marque) !== -1 && s.categorie) vus[s.categorie] = true; });
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (siennes.indexOf(l.marqueId) !== -1 && l.categorie) vus[l.categorie] = true; });
    });
    return Object.keys(vus).sort().map(function (k) {
      var t = CATEGORIES.filter(function (x) { return x.cle === k; })[0];
      return t || { cle: k, nom: k };
    });
  }

  /* Ce qu'on propose sur la fiche d'un pack : ce que sa marque permet, et rien
   * d'autre. Les listes viennent de la relation, jamais du référentiel entier. */

  /* Un client qui n'a pas encore de catégories n'en a aucune à proposer — et
   * il faut bien qu'il puisse en créer une. Elles lui appartiennent : « Boîte »
   * et « Sachet » chez un pâtissier n'ont rien à voir avec « EVAP » et « UHT ». */
  function ajouterCategorie(clientId, cle, nom) {
    var c = DEPOT.trouve("clients", clientId);
    if (!c) return false;
    c.categories = c.categories || [];
    var k = String(cle).trim();
    if (!k) return false;
    if (c.categories.indexOf(k) !== -1) return false;
    c.categories.push(k);
    if (nom && nom !== k) {
      c.categoriesNoms = c.categoriesNoms || {};
      c.categoriesNoms[k] = nom;
    }
    DEPOT.tracer("catégorie déclarée", "clients", c.id, c.nom + " · " + k);
    return true;
  }

  function marchesPossibles(sku) {
    var c = clientDe(sku.marque);
    var l = marchesDuClient(c ? c.id : null);
    /* Un marché déjà coché reste proposé même s'il sort du périmètre déduit :
     * on ne fait pas disparaître une donnée existante. */
    (sku.marches || []).forEach(function (id) {
      if (!l.some(function (m) { return m.id === id; })) {
        var m = DEPOT.trouve("marches", id);
        if (m) l.push(m);
      }
    });
    return l;
  }

  function categoriesPossibles(sku) {
    var c = clientDe(sku.marque);
    var l = categoriesDuClient(c ? c.id : null);
    if (sku.categorie && !l.some(function (x) { return x.cle === sku.categorie; })) {
      var t = CATEGORIES.filter(function (x) { return x.cle === sku.categorie; })[0];
      l = l.concat([t || { cle: sku.categorie, nom: sku.categorie }]);
    }
    return l;
  }

  /* Les vocabulaires fermés. Écrits à la main, « IMP » et « lait en poudre »
   * sont deux catégories pour la machine et une seule pour l'œil : plus rien
   * n'est comparable, et le catalogue ne se filtre plus. */
  var CATEGORIES = [
    { cle: "IMP",    nom: "IMP — lait en poudre" },
    { cle: "EVAP",   nom: "EVAP — lait évaporé" },
    { cle: "SCM",    nom: "SCM — lait concentré sucré" },
    { cle: "UHT",    nom: "UHT — lait à boire" },
    { cle: "YAOURT", nom: "Yaourt" },
  ];

  /* Les variantes appartiennent à la marque : Bonnet Rouge en a quatre, Peak
   * deux. Une liste unique mélangerait les gammes. */
  var VARIANTES = {
    "MQ-br":   ["Rouge", "Bleu", "Gold", "Délice"],
    "MQ-peak": ["Regular", "Green", "Full Cream", "Low Fat"],
  };
  function variantesDe(marqueId) {
    if (VARIANTES[marqueId]) return VARIANTES[marqueId];
    /* Pour les autres marques, ce que le catalogue emploie déjà. */
    var vus = {};
    DEPOT.liste("sku").forEach(function (s) {
      if (s.marque === marqueId && s.variante) vus[s.variante] = true; });
    return Object.keys(vus);
  }

  function promosConnues() {
    var vus = {};
    DEPOT.liste("sku").forEach(function (s) { if (s.promo) vus[s.promo] = true; });
    return Object.keys(vus).sort();
  }

  /* La fiche d'un pack. Chaque champ dit à qui il appartient : le code article
   * est celui du client, pas le nôtre — l'absence se réclame, elle ne se
   * remplit pas au jugé. */
  var FICHE = [
    { cle: "nom",        nom: "Nom du pack",     type: "texte" },
    { cle: "categorie",  nom: "Catégorie",       type: "choix",
      options: function (s) { return categoriesPossibles(s); },
      aide: "Les catégories de ce client. Un pâtissier n'a pas de lait évaporé." },
    { cle: "format",     nom: "Format",          type: "texte", aide: "16g, 400g, 1L…" },
    { cle: "variante",   nom: "Variante",        type: "choix",
      options: function (s) { return variantesDe(s.marque); },
      vide: "— aucune variante —" },
    { cle: "langue",     nom: "Langue du pack",  type: "choix",
      options: [{ cle: "fr", nom: "Français" }, { cle: "en", nom: "Anglais" },
                { cle: "fr-en", nom: "Bilingue" }] },
    { cle: "promo",      nom: "Mécanique promo", type: "choix",
      options: promosConnues, vide: "— version normale —" },
    { cle: "code",       nom: "Code article",    type: "texte", poste: "clientele",
      aide: "Celui du client. C'est lui qui fait foi en production — il se réclame, "
          + "il ne s'invente pas." },
    { cle: "mentions",   nom: "Mentions obligatoires", type: "puces", poste: "clientele",
      aide: "Elles changent d'un pays à l'autre et viennent du client. "
          + "Leur absence se découvre à l'impression." },
  ];

  /* Où ce pack est réellement distribué. Un pack montré sur un marché qui ne le
   * vend pas est un rappel de campagne. */
  function distribution(skuId) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return [];
    return (s.marches || []).map(function (id) { return DEPOT.trouve("marches", id); })
      .filter(Boolean);
  }

  /* Où ce pack est montré : les livrables qui le déclarent. C'est la relation que
   * le §2 du modèle réclame — « cet asset est utilisé où ? ». */
  function usage(skuId) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return [];
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        if (((l.kv || {}).sku || []).indexOf(skuId) === -1) return;
        out.push({ projet: p, livrable: l,
          marche: l.marche ? DEPOT.trouve("marches", l.marche) : null });
      });
    });
    return out;
  }

  /* Ce qui cloche sur ce pack, et ce que ça coûte. */
  function controles(skuId) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return [];
    var d = distribution(skuId);
    var u = usage(skuId);
    var out = [];

    if (!s.marque) out.push({ quoi: "Rattaché à une marque", ok: false,
      cout: "sans marque, ce pack n'entre dans aucun catalogue et aucune campagne ne peut le montrer" });
    if (!s.categorie || !s.format) out.push({ quoi: "Catégorie et format lus", ok: false,
      cout: "le nom du fichier ne les dit pas — impossible de savoir de quel article il s'agit" });
    if (!s.code) out.push({ quoi: "Code article", ok: false, aQui: "clientele",
      cout: "il vient du client — sans lui, la production ne sait pas quel article elle imprime" });
    if (!(s.mentions || []).length) out.push({ quoi: "Mentions obligatoires", ok: false, aQui: "clientele",
      cout: "elles viennent du client et changent par pays ; leur absence se découvre à l'impression, et se paie en rappel" });
    if (!d.length) out.push({ quoi: "Marchés de distribution", ok: false,
      cout: "on ne saura pas si ce pack est montré là où il n'est pas vendu" });
    if (s.espace === "CMYK") out.push({ quoi: "Espace colorimétrique", ok: false,
      cout: "fichier CMYK : bon pour l'impression, faux sur tout format digital" });

    /* Le contrôle qui vaut le plus : montré là où il n'est pas vendu. */
    var horsZone = u.filter(function (x) {
      return x.marche && d.length && !d.some(function (m) { return m.id === x.marche.id; });
    });
    if (horsZone.length) out.push({ quoi: "Montré seulement où il est vendu", ok: false,
      cout: horsZone.length + (horsZone.length > 1 ? " livrables le montrent" : " livrable le montre")
        + " sur un marché où il n'est pas distribué : "
        + horsZone.map(function (x) { return x.marche.code; }).join(", ") });

    return out;
  }

  function ecrireSku(skuId, cle, val) {
    var s = DEPOT.trouve("sku", skuId);
    if (!s) return false;
    s[cle] = val;
    s.aQualifier = !s.marque || !s.categorie || !s.format;
    DEPOT.tracer("fiche pack", "sku", null, s.nom + " · " + cle);
    return true;
  }

  /* ————————————————————— Où la marque est distribuée ————————————————————— */

  /* Déduit de l'usage : un marché où la marque a déjà produit un livrable est un
   * marché où elle est distribuée. Le référentiel se remplit en travaillant. */
  function marches(marqueId) {
    var vus = {};
    (de(marqueId) || {}).marches && (de(marqueId).marches || []).forEach(function (id) { vus[id] = "déclaré"; });
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule || !l.marche) return;
        if (l.marqueId === marqueId) vus[l.marche] = vus[l.marche] || "par l'usage";
      });
    });
    return Object.keys(vus).map(function (id) {
      var m = DEPOT.trouve("marches", id);
      return m ? { marche: m, origine: vus[id] } : null;
    }).filter(Boolean);
  }

  /* ————————————————————— Ce qu'une campagne en retient ————————————————————— */

  /* La sélection : c'est ça, une campagne. Le vault dit ce qui existe, la
   * campagne dit ce qu'elle en prend — et l'écart entre les deux est une
   * information, pas un oubli. */
  function selection(p, marqueId) {
    var pieces = (p.livrables || []).filter(function (l) {
      return !l.annule && l.marqueId === marqueId; });
    var mk = {};
    pieces.forEach(function (l) { if (l.marche) mk[l.marche] = true; });

    var retenus = {};
    pieces.forEach(function (l) {
      ((l.kv || {}).sku || []).forEach(function (s) { retenus[s] = true; });
    });

    var cat = catalogue(marqueId);
    var dispo = marches(marqueId);
    return {
      marque: marque(marqueId),
      pieces: pieces.length,
      marchesRetenus: Object.keys(mk).map(function (id) { return DEPOT.trouve("marches", id); }).filter(Boolean),
      marchesDisponibles: dispo.length,
      skuRetenus: Object.keys(retenus).length,
      skuCatalogue: cat.length,
      skuAQualifier: cat.filter(function (s) { return s.aQualifier; }).length,
      catalogue: cat,
    };
  }


  /* Les campagnes qui servent cette marque. Le lien passe par le livrable quand
   * elle porte sa marque — mais un dossier mono-marque n'a jamais eu besoin de
   * le répéter sur chaque livrable : son identité le dit. Ne lire que le premier
   * cassait le lien pour tous les dossiers d'avant les campagnes multi-marques. */
  function campagnesDe(marqueId) {
    var m = marque(marqueId);
    return DEPOT.liste("projets").filter(function (p) {
      if ((p.livrables || []).some(function (l) { return l.marqueId === marqueId; })) return true;
      var ident = p.sections.identite || {};
      if (m && ident.marque && O.normalise(ident.marque) === O.normalise(m.nom)) return true;
      return m && m.socle === p.id;
    });
  }

  /* ————————————————————— L'état d'un vault ————————————————————— */

  function etat(marqueId) {
    var v = de(marqueId) || {};
    var ecrits = CHAMPS.filter(function (c) {
      var x = v[c.cle];
      return Array.isArray(x) ? x.length : (x !== undefined && x !== null && String(x).trim() !== "");
    });
    var cat = catalogue(marqueId);
    return {
      champs: CHAMPS.length, ecrits: ecrits.length,
      manquants: CHAMPS.filter(function (c) { return ecrits.indexOf(c) === -1; }),
      packs: cat.length, aQualifier: cat.filter(function (s) { return s.aQualifier; }).length,
      marches: marches(marqueId).length,
      campagnes: campagnesDe(marqueId),
    };
  }

  /* L'écriture au niveau marque passe par la même porte : une seule façon
   * d'écrire dans un socle, donc une seule façon de le réviser. */
  function ecrire(marqueId, cle, val, motif) {
    return ecrireNiveau("marque", marqueId, cle, val, motif);
  }

  return { CHAMPS: CHAMPS, PILIERS: PILIERS, champsDuPilier: champsDuPilier, FICHE: FICHE, CATEGORIES: CATEGORIES,
    revisions: revisions,
    clientDe: clientDe, marchesDuClient: marchesDuClient, categoriesDuClient: categoriesDuClient,
    marchesPossibles: marchesPossibles, categoriesPossibles: categoriesPossibles,
    ajouterCategorie: ajouterCategorie,
    arbre: arbre, herite: herite, vaultDe: vaultDe, ecrireNiveau: ecrireNiveau,
    etatNiveau: etatNiveau, nomDe: nomDe, parent: parent, campagnesDe: campagnesDe,
    decideurs: decideurs, promos: promos, ajouterPromo: ajouterPromo,
    fautesDe: fautesDe, fautesSur: fautesSur,
    packsDe: packsDe, basculerPack: basculerPack, packsHorsZone: packsHorsZone,
    proposables: proposables,
    basculerDecideur: basculerDecideur,
    variantesDe: variantesDe, de: de, valeur: valeur, ecrire: ecrire,
    distribution: distribution, usage: usage, controles: controles, ecrireSku: ecrireSku,
    creerSku: creerSku, archiver: archiver, restaurer: restaurer, archives: archives,
    catalogue: catalogue, orphelins: orphelins, rattacher: rattacher,
    marches: marches, selection: selection, etat: etat };
})();
