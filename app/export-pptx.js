/* export-pptx.js — la présentation en PowerPoint, éditable, images en haute définition.
 *
 * Demande du titulaire (13/10/2026) : « exporte mon PDF en PPT avec les images
 * en HD, je vais faire certains ajustements moi-même, puis inclus cette
 * fonction dans LA BARRE ». Un PDF ne se retouche pas : le deck doit sortir en
 * objets PowerPoint — chaque texte une zone de texte, chaque aplat une forme,
 * chaque image une image — à la place exacte qu'ils occupent dans le PDF.
 *
 * Le chemin le plus sûr vers « la même chose que le PDF » est de partir des
 * mêmes diapositives : elles se composent à 1280 × 720 dans un cadre caché
 * (le format du PDF : 13,333 × 7,5 pouces à 96 px par pouce), puis chaque
 * élément est relevé — position, police, corps, graisse, couleur — et posé
 * dans la diapositive PowerPoint au même endroit.
 *
 * La haute définition : une vignette du dépôt pèse 200 Ko ; son original est au
 * disque, nommé par `master` (une image) ou `source` (un film) sur l'objet qui
 * porte la vignette. En local, l'export lit l'original ; en ligne, le disque
 * n'est pas joignable et l'export prend les aperçus — l'écran le dit.
 *
 * Ce que PowerPoint ne refait pas comme le navigateur, et qu'on assume : la
 * coupure des lignes peut tomber un mot plus tôt ou plus tard (les zones de
 * texte sont élargies d'un cheveu pour l'éviter), et les polices Asap et
 * Source Serif 4 doivent être installées sur la machine qui ouvre le fichier.
 */

window.EXPORT_PPTX = (function () {
  var L = 1280, H = 720;
  var POUCE = 13.333 / L;      /* pouces par pixel de diapositive */
  var PT = 0.75;               /* points par pixel */
  var COTE_MAX = 2400;         /* une image ne dépasse pas 2 400 px de côté */
  var el = O.el;

  /* La bibliothèque compresse le fichier par petits morceaux, chacun planifié
   * par `setImmediate`, qu'elle capture au chargement. Le navigateur de
   * l'application de bureau en expose un qui ne rend jamais la main dans cette
   * page : l'écriture attendait sans fin (13/10/2026). On lui en prête un sûr le
   * temps du chargement, puis on rend l'original. */
  function charger() {
    if (window.PptxGenJS) return Promise.resolve();
    var avant = window.setImmediate;
    window.setImmediate = function (fn) {
      var args = Array.prototype.slice.call(arguments, 1), c = new MessageChannel();
      c.port1.onmessage = function () { fn.apply(null, args); };
      c.port2.postMessage(0);
    };
    function rendre() { if (avant) window.setImmediate = avant; else delete window.setImmediate; }
    return new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = "app/vendeur/pptxgen.bundle.js";
      s.onload = function () { rendre(); ok(); };
      s.onerror = function () { rendre(); ko(new Error("la bibliothèque PowerPoint n'a pas chargé")); };
      document.head.appendChild(s);
    });
  }

  /* ————————————————————— Les originaux ————————————————————— */

  /* Vignette → original au disque, relevé sur tout le dossier : un KV porte
   * `master`, une case de storyboard aussi, une animatique `source`. */
  function originaux(p) {
    var m = {};
    if (!(window.DISQUE && DISQUE.local)) return m;
    (function voir(o) {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) { o.forEach(voir); return; }
      var img = o.master && DISQUE.depuisOrigine(o.master);
      if (o.vignette && img && /\.(png|jpe?g|webp)$/i.test(img)) m[o.vignette] = img;
      var film = o.source && DISQUE.depuisOrigine(o.source);
      if (o.video && film && /\.(mp4|mov|m4v)$/i.test(film)) m[o.video] = film;
      Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === "object") voir(o[k]); });
    })(p);
    return m;
  }

  function adresse(src, hd) {
    var brut = String(src || "").replace(location.href.split("#")[0], "");
    if (hd[brut]) return DISQUE.url(hd[brut]);
    return window.DISQUE && !/^(data|blob|https?):/.test(brut) ? DISQUE.src(brut) : src;
  }

  /* ————————————————————— Le cadre de composition ————————————————————— */

  function attendre(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function cadre(p, pages) {
    var f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.tabIndex = -1;
    f.style.cssText = "position:fixed;left:-20000px;top:0;width:" + L + "px;height:" + H + "px;border:0;visibility:hidden";
    document.body.appendChild(f);
    var d = f.contentDocument;
    var feuilles = Array.prototype.map.call(document.querySelectorAll("link[rel=stylesheet], style"),
      function (x) { return x.outerHTML; }).join("");
    d.open();
    d.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><base href="' + location.href.split("#")[0] + '">'
      + feuilles + '<style>.pg-film{display:none!important}</style></head><body data-vue="partage" data-impression="1" style="margin:0;padding:0;display:block;width:' + L + 'px">'
      + '<div class="pt-impression" style="width:' + L + 'px"></div></body></html>');
    d.close();
    var hote = d.querySelector(".pt-impression");
    pages.forEach(function (pg) {
      var diapo = document.createElement("div");
      diapo.className = "pr-diapo";
      diapo.appendChild(VUE_PRESENTATION.page(p, pg));
      hote.appendChild(d.adoptNode(diapo));
    });
    d.querySelectorAll("img").forEach(function (i) { i.loading = "eager"; });
    var limite = Date.now() + 30000;
    function pret() {
      var imgs = Array.prototype.slice.call(d.images);
      return imgs.every(function (i) { return i.complete; });
    }
    return (d.fonts ? d.fonts.ready : Promise.resolve()).then(function boucle() {
      if (pret() || Date.now() > limite) return attendre(300).then(function () { return f; });
      return attendre(200).then(boucle);
    });
  }

  /* ————————————————————— Relever les styles ————————————————————— */

  function couleur(css, opacite) {
    var m = String(css || "").match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
    if (!m) return null;
    var a = m[4] == null ? 1 : (/%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    a *= (opacite == null ? 1 : opacite);
    if (a <= 0.02) return null;
    var hex = [m[1], m[2], m[3]].map(function (x) { return ("0" + Math.round(+x).toString(16)).slice(-2); }).join("").toUpperCase();
    return { color: hex, transparency: Math.round((1 - a) * 100) };
  }

  function opaciteDe(n, racine) {
    var o = 1;
    for (var x = n; x && x !== racine.parentNode; x = x.parentElement) {
      o *= parseFloat(x.ownerDocument.defaultView.getComputedStyle(x).opacity || "1");
    }
    return o;
  }

  function police(cs) {
    var f = String(cs.fontFamily || "").split(",")[0].trim().replace(/^["']|["']$/g, "");
    return f || "Asap";
  }

  function gras(cs, face) {
    return parseInt(cs.fontWeight, 10) >= 600 && !/bold|black|heavy/i.test(face);
  }

  function casse(t, cs) {
    if (cs.textTransform === "uppercase") return t.toLocaleUpperCase("fr");
    if (cs.textTransform === "lowercase") return t.toLocaleLowerCase("fr");
    if (cs.textTransform === "capitalize") return t.replace(/(^|\s)(\S)/g, function (_, a, b) { return a + b.toLocaleUpperCase("fr"); });
    return t;
  }

  function px(v) { return parseFloat(v) || 0; }

  /* ————————————————————— Composer une diapositive ————————————————————— */

  function Diapo(pptx, slide, racine, hd, taches) {
    var win = racine.ownerDocument.defaultView;
    var R = racine.getBoundingClientRect();
    var cs0 = win.getComputedStyle(racine);
    var fond = couleur(cs0.backgroundColor);
    slide.background = { color: fond ? fond.color : "FFFFFF" };

    function boite(r) {
      var x = Math.max(r.left - R.left, 0), y = Math.max(r.top - R.top, 0);
      var x2 = Math.min(r.right - R.left, L), y2 = Math.min(r.bottom - R.top, H);
      if (x2 - x < 0.5 || y2 - y < 0.5) return null;
      return { x: x, y: y, w: x2 - x, h: y2 - y };
    }
    function pouces(b) { return { x: b.x * POUCE, y: b.y * POUCE, w: b.w * POUCE, h: b.h * POUCE }; }

    function contenu(n, cs) {
      var r = n.getBoundingClientRect();
      return { left: r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft), top: r.top + px(cs.borderTopWidth) + px(cs.paddingTop),
        right: r.right - px(cs.borderRightWidth) - px(cs.paddingRight), bottom: r.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom) };
    }

    /* Un fond, une bordure : une forme. Une bordure d'un seul côté (les filets
     * de séparation) devient un rectangle fin, plus simple à reprendre. */
    function habillage(n, cs, op) {
      var b = boite(n.getBoundingClientRect());
      if (!b) return;
      var f = couleur(cs.backgroundColor, op);
      var cotes = ["Top", "Right", "Bottom", "Left"].map(function (c) {
        return { c: c, w: cs["border" + c + "Style"] === "none" ? 0 : px(cs["border" + c + "Width"]), col: couleur(cs["border" + c + "Color"], op) };
      });
      var egaux = cotes.every(function (k) { return k.w === cotes[0].w && k.w > 0 && k.col && cotes[0].col && k.col.color === cotes[0].col.color; });
      var rayon = Math.min(px(cs.borderTopLeftRadius), b.w / 2, b.h / 2);
      if (f || egaux) {
        var o = pouces(b);
        o.fill = f ? { color: f.color, transparency: f.transparency } : { type: "none" };
        o.line = egaux ? { color: cotes[0].col.color, transparency: cotes[0].col.transparency, width: cotes[0].w * PT } : { type: "none" };
        if (rayon > 0.5) o.rectRadius = rayon * POUCE;
        slide.addShape(rayon > 0.5 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, o);
      }
      if (!egaux) cotes.forEach(function (k) {
        if (!k.w || !k.col) return;
        var t = k.c === "Top" ? { x: b.x, y: b.y, w: b.w, h: k.w } : k.c === "Bottom" ? { x: b.x, y: b.y + b.h - k.w, w: b.w, h: k.w }
          : k.c === "Left" ? { x: b.x, y: b.y, w: k.w, h: b.h } : { x: b.x + b.w - k.w, y: b.y, w: k.w, h: b.h };
        var o2 = pouces(t);
        o2.fill = { color: k.col.color, transparency: k.col.transparency }; o2.line = { type: "none" };
        slide.addShape(pptx.ShapeType.rect, o2);
      });
    }

    /* Les pseudo-éléments : le tiret rouge sous un titre d'intercalaire, le
     * tiret des listes. Le navigateur ne donne pas leur boîte ; on la déduit. */
    function pseudo(n, cs, quel, op) {
      var ps = win.getComputedStyle(n, quel);
      var c = ps.content;
      if (!c || c === "none" || c === "normal") return;
      var texte = c.replace(/^["']|["']$/g, "");
      var k = contenu(n, cs);
      if (!texte) {
        var f = couleur(ps.backgroundColor, op);
        var w = px(ps.width), h = px(ps.height);
        if (!f || !w || !h) return;
        var y = quel === "::after" ? k.bottom - h : k.top;
        var b = boite({ left: k.left, top: y, right: k.left + w, bottom: y + h });
        if (!b) return;
        var o = pouces(b); o.fill = { color: f.color, transparency: f.transparency }; o.line = { type: "none" };
        slide.addShape(pptx.ShapeType.rect, o);
        return;
      }
      if (ps.position !== "absolute") return;
      var r = n.getBoundingClientRect();
      var lh = px(cs.lineHeight) || px(cs.fontSize) * 1.3;
      var b2 = boite({ left: r.left + px(ps.left), top: k.top, right: r.left + px(ps.left) + Math.max(px(cs.paddingLeft), lh), bottom: k.top + lh });
      if (!b2) return;
      var face = police(ps), col = couleur(ps.color, op) || { color: "000000", transparency: 0 };
      var o3 = pouces(b2);
      Object.assign(o3, { fontFace: face, fontSize: Math.round(px(ps.fontSize) * PT * 10) / 10, color: col.color, transparency: col.transparency,
        bold: gras(ps, face), margin: 0, valign: "top", fit: "none", wrap: false });
      slide.addText(texte, o3);
    }

    /* Une zone de texte : l'élément dont les enfants sont tous en ligne. Ses
     * morceaux gardent chacun leur police, leur graisse, leur couleur. */
    function estEnLigne(n) {
      if (n.nodeType === 3) return true;
      if (n.nodeType !== 1) return true;
      var d = win.getComputedStyle(n).display;
      return d === "inline" || n.tagName === "BR";
    }
    function blocDeTexte(n) {
      var aTexte = false;
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3 && c.nodeValue.trim()) aTexte = true;
        else if (c.nodeType === 1) {
          if (win.getComputedStyle(c).display === "none") continue;
          if (!estEnLigne(c)) return false;
          if ((c.textContent || "").trim()) aTexte = true;
        }
      }
      return aTexte;
    }

    function morceaux(n, op) {
      var out = [];
      (function lire(x) {
        for (var c = x.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 3) {
            var t = c.nodeValue.replace(/\s+/g, " ");
            if (!t) continue;
            var cs = win.getComputedStyle(x), face = police(cs), col = couleur(cs.color, op * opaciteDe(x, n) / opaciteDe(n, n)) || { color: "000000", transparency: 0 };
            out.push({ text: casse(t, cs), options: { fontFace: face, fontSize: Math.round(px(cs.fontSize) * PT * 10) / 10,
              bold: gras(cs, face), italic: cs.fontStyle === "italic", color: col.color, transparency: col.transparency,
              charSpacing: cs.letterSpacing === "normal" ? 0 : Math.round(px(cs.letterSpacing) * PT * 100) / 100,
              underline: /underline/.test(cs.textDecorationLine) ? { style: "sng" } : undefined } });
          } else if (c.nodeType === 1) {
            if (c.tagName === "BR") { if (out.length) out[out.length - 1].options.breakLine = true; else out.push({ text: "", options: { breakLine: true } }); continue; }
            if (win.getComputedStyle(c).display === "none") continue;
            lire(c);
          }
        }
      })(n);
      if (out.length) {
        out[0].text = out[0].text.replace(/^\s+/, "");
        out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, "");
      }
      return out.filter(function (m) { return m.text || m.options.breakLine; });
    }

    function texte(n, cs, op) {
      var runs = morceaux(n, op);
      if (!runs.length) return;
      var k = contenu(n, cs);
      var b = boite(k);
      if (!b) return;
      /* Une ligne seule ne doit pas se couper : PowerPoint compose un rien plus
       * large que le navigateur. Plusieurs lignes : on élargit d'un cheveu. */
      var lh = px(cs.lineHeight) || px(cs.fontSize) * 1.2;
      var uneLigne = b.h < lh * 1.5;
      var marge = b.w * 0.02 + 4;
      var al = cs.textAlign === "center" ? "center" : (cs.textAlign === "right" || cs.textAlign === "end") ? "right" : cs.textAlign === "justify" ? "justify" : "left";
      if (al === "center") { b.x -= marge / 2; b.w += marge; }
      else if (al === "right") { b.x -= marge; b.w += marge; }
      else b.w += marge;
      b.w = Math.min(b.w, L - b.x);
      var o = pouces(b);
      Object.assign(o, { align: al, valign: "top", margin: 0, fit: "none", wrap: !uneLigne,
        lineSpacing: Math.round(lh * PT * 10) / 10, paraSpaceBefore: 0, paraSpaceAfter: 0 });
      slide.addText(runs, o);
    }

    function image(n, cs) {
      var r = n.getBoundingClientRect();
      var b = boite(r);
      if (!b) return;
      var src = n.tagName === "VIDEO" ? n.poster : n.currentSrc || n.src;
      if (!src) return;
      var fit = cs.objectFit || "fill";
      taches.push(rasteriser(adresse(src, hd), b, fit, n).then(function (img) {
        if (!img) return;
        var o = pouces(img.b);
        o.data = img.data;
        if (n.tagName === "VIDEO" && n.getAttribute("src")) {
          return lireFichier(adresse(n.getAttribute("src"), hd)).then(function (v) {
            if (!v) { slide.addImage(o); return; }
            var m = pouces(img.b);
            m.type = "video"; m.data = v.replace(/^data:/, ""); m.cover = img.data;
            slide.addMedia(m);
          });
        }
        slide.addImage(o);
      }));
    }

    function svg(n) {
      var b = boite(n.getBoundingClientRect());
      if (!b) return;
      var xml = new XMLSerializer().serializeToString(n);
      var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
      taches.push(rasteriser(url, b, "fill", n).then(function (img) {
        if (!img) return;
        var o = pouces(img.b); o.data = img.data; slide.addImage(o);
      }));
    }

    function parcourir(n, opParent) {
      var cs = win.getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      var op = opParent * parseFloat(cs.opacity || "1");
      if (op <= 0.02) return;
      if (n !== racine) habillage(n, cs, op);
      var tag = n.tagName;
      if (tag === "IMG" || tag === "VIDEO") { image(n, cs); return; }
      if (tag === "svg" || tag === "SVG") { svg(n); return; }
      pseudo(n, cs, "::before", op);
      if (blocDeTexte(n)) texte(n, cs, op);
      else {
        for (var c = n.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 1) parcourir(c, op);
          else if (c.nodeType === 3 && c.nodeValue.trim()) {
            /* Du texte nu entre deux blocs : sa propre zone, à sa place. */
            var rg = n.ownerDocument.createRange(); rg.selectNodeContents(c);
            var rr = rg.getBoundingClientRect(), bb = boite(rr);
            if (!bb) continue;
            var face = police(cs), col = couleur(cs.color, op) || { color: "000000", transparency: 0 };
            var o = pouces({ x: bb.x, y: bb.y, w: Math.min(bb.w * 1.04 + 4, L - bb.x), h: bb.h });
            Object.assign(o, { fontFace: face, fontSize: Math.round(px(cs.fontSize) * PT * 10) / 10, bold: gras(cs, face),
              italic: cs.fontStyle === "italic", color: col.color, transparency: col.transparency, margin: 0, valign: "top", fit: "none" });
            slide.addText(casse(c.nodeValue.replace(/\s+/g, " ").trim(), cs), o);
          }
        }
      }
      pseudo(n, cs, "::after", op);
    }

    parcourir(racine, 1);
  }

  /* ————————————————————— Les images ————————————————————— */

  function charge(url) {
    return new Promise(function (ok) {
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { ok(null); };
      i.src = url;
    });
  }

  /* L'image se pose comme dans la diapositive : « contain » se réduit à sa
   * place réelle dans la boîte, « cover » se recadre. Puis elle est ramenée à
   * 2 400 px de côté au plus — la haute définition, pas le poids d'un tirage. */
  function rasteriser(url, b, fit, n) {
    return charge(url).then(function (i) {
      if (!i && n && n.tagName === "IMG" && url !== n.src) return charge(n.src);
      return i;
    }).then(function (i) {
      if (!i || !i.naturalWidth) return null;
      var nw = i.naturalWidth, nh = i.naturalHeight;
      var sx = 0, sy = 0, sw = nw, sh = nh, cible = { x: b.x, y: b.y, w: b.w, h: b.h };
      var rb = b.w / b.h, ri = nw / nh;
      if (fit === "contain" || fit === "scale-down") {
        if (ri > rb) { var h2 = b.w / ri; cible.y = b.y + (b.h - h2) / 2; cible.h = h2; }
        else { var w2 = b.h * ri; cible.x = b.x + (b.w - w2) / 2; cible.w = w2; }
      } else if (fit === "cover") {
        if (ri > rb) { sw = nh * rb; sx = (nw - sw) / 2; } else { sh = nw / rb; sy = (nh - sh) / 2; }
      }
      var k = Math.min(1, COTE_MAX / Math.max(sw, sh));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
      var x = c.getContext("2d");
      x.drawImage(i, sx, sy, sw, sh, 0, 0, c.width, c.height);
      var transparent = false;
      try {
        var px4 = x.getImageData(0, 0, c.width, c.height).data;
        for (var j = 3; j < px4.length; j += 4 * 7) if (px4[j] < 250) { transparent = true; break; }
      } catch (e) { transparent = /\.png(\?|$)/i.test(url); }
      var data = transparent ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.92);
      return { data: data.replace(/^data:/, ""), b: cible };
    });
  }

  function lireFichier(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (blob) {
        return new Promise(function (ok) {
          var fr = new FileReader();
          fr.onload = function () { ok(fr.result); };
          fr.onerror = function () { ok(null); };
          fr.readAsDataURL(blob);
        });
      }).catch(function () { return null; });
  }

  /* L'animatique : le PDF ne la montre pas (une page imprimée ne joue rien) et
   * la page spot garde la place du storyboard. Le PowerPoint, lui, la joue :
   * elle vient sur sa propre diapositive, juste après la page spot, avec le
   * même titre — en local le film original, en ligne sa version web. */
  function film(pptx, racine, v, hd, taches) {
    var win = racine.ownerDocument.defaultView;
    var slide = pptx.addSlide();
    var fond = couleur(win.getComputedStyle(racine).backgroundColor);
    slide.background = { color: fond ? fond.color : "FFFFFF" };
    var eti = racine.querySelector(".pg-eti");
    if (eti) {
      var cs = win.getComputedStyle(eti), face = police(cs), col = couleur(cs.color) || { color: "000000", transparency: 0 };
      var r = eti.getBoundingClientRect(), R = racine.getBoundingClientRect();
      slide.addText(eti.textContent.replace(/le spot$/, "l'animatique"), { x: (r.left - R.left) * POUCE, y: (r.top - R.top) * POUCE,
        w: (L - 2 * (r.left - R.left)) * POUCE, h: r.height * POUCE * 1.2, fontFace: face, fontSize: Math.round(px(cs.fontSize) * PT * 10) / 10,
        bold: gras(cs, face), color: col.color, margin: 0, valign: "top", fit: "none" });
    }
    var vertical = v.classList.contains("vertical");
    var h = vertical ? 560 : 450, w = vertical ? h * 9 / 16 : h * 16 / 9;
    var b = { x: (L - w) / 2, y: (H - h) / 2 + 40, w: w, h: h };
    var o = { x: b.x * POUCE, y: b.y * POUCE, w: b.w * POUCE, h: b.h * POUCE };
    taches.push(rasteriser(adresse(v.getAttribute("poster"), hd), b, "cover", null).then(function (img) {
      return lireFichier(adresse(v.getAttribute("src"), hd)).then(function (vid) {
        if (vid) slide.addMedia(Object.assign({ type: "video", data: vid.replace(/^data:/, ""), cover: img ? img.data : undefined }, o));
        else if (img) slide.addImage(Object.assign({ data: img.data }, o));
      });
    }));
  }

  /* ————————————————————— L'export ————————————————————— */

  function nom(p) {
    var i = (p.sections && p.sections.identite) || {};
    return [i.client, p.nom, "Présentation"].filter(Boolean).join(" — ").replace(/[\/\\:]/g, "-") + ".pptx";
  }

  /* opts.sortie : "fichier" (le navigateur télécharge, par défaut) ou "blob".
   * opts.progres(n, total) : pour le bouton. */
  function exporter(p, opts) {
    opts = opts || {};
    var d = VUE_PRESENTATION.pres(p);
    var pages = d.pages || [];
    var hd = originaux(p);
    var f = null;
    return charger().then(function () { return cadre(p, pages); }).then(function (frame) {
      f = frame;
      var pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "Matanga";
      pptx.company = "Matanga";
      pptx.title = p.nom;
      var diapos = f.contentDocument.querySelectorAll(".pr-diapo > .pg");
      var taches = [];
      var n = 0;
      Array.prototype.forEach.call(diapos, function (racine, k) {
        var slide = pptx.addSlide();
        Diapo(pptx, slide, racine, hd, taches);
        n++;
        Array.prototype.forEach.call(racine.querySelectorAll("video.pg-film"), function (v) {
          film(pptx, racine, v, hd, taches); n++;
        });
        if (opts.progres) opts.progres(k + 1, diapos.length);
      });
      return Promise.all(taches).then(function () {
        var nomFichier = nom(p);
        if (opts.sortie === "blob") return pptx.write({ outputType: "blob" }).then(function (b) { return { blob: b, nom: nomFichier, pages: n }; });
        return pptx.writeFile({ fileName: nomFichier }).then(function () { return { nom: nomFichier, pages: n }; });
      });
    }).then(function (r) {
      if (f) f.remove();
      r.hd = Object.keys(hd).length > 0;
      return r;
    }, function (e) {
      if (f) f.remove();
      throw e;
    });
  }

  /* Le bouton, posé dans le bloc « Partager » à côté du PDF. */
  function bouton(p) {
    return el("button.b.nu", { type: "button", onclick: function (e) {
      var b = e.currentTarget;
      b.disabled = true; b.textContent = "PowerPoint en cours…";
      exporter(p, { progres: function (n, t) { b.textContent = "PowerPoint " + n + "/" + t + "…"; } })
        .then(function (r) {
          AVIS.fait("PowerPoint exporté (" + r.pages + " diapositives" + (r.hd ? ", images originales" : ", aperçus : les originaux sont au disque, sur l'iMac") + ").");
        })
        .catch(function (x) { AVIS.refus("Le PowerPoint n'a pas pu être exporté : " + (x && x.message || x)); })
        .then(function () { b.disabled = false; b.textContent = "PowerPoint (.pptx)"; });
    } }, "PowerPoint (.pptx)");
  }

  return { exporter: exporter, bouton: bouton, nom: nom };
})();
