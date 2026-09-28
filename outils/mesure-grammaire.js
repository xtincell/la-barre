/* La mesure de la grammaire Studio (documents/GRAMMAIRE_STUDIO.md §3), à charger dans
 * la console : capitales, sérif, aplats d'état, cibles, contraste, débordement.
 * Usage : await __mesure(["valider/file", "planning/ordre"])
 * Option : await __mesure(routes, ".pj-section") ignore ce qui vit sous ce sélecteur.
 * Un panneau : window.__racine = ".panneau" ; await __mesure([location.hash.slice(2)]) */
window.__mesure = async function (routes, exclure) {
  function rgb(s) { var m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0,0,0,0]; }
  function hsl(r, g, b) { r/=255; g/=255; b/=255; var mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, s=0, h=0;
    if (mx!==mn) { var d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); h = mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4); h*=60; } return [h,s,l]; }
  function lum(c) { var a = c.slice(0,3).map(function (v) { v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*a[0]+.7152*a[1]+.0722*a[2]; }
  function fond(e) { while (e) { var c = rgb(getComputedStyle(e).backgroundColor); if (c.length<4 || c[3] > .5) return c; e = e.parentElement; } return [255,255,255,1]; }
  var SIGLES = /^(MT|KV|BAT|PLV|SKU|POSM|OOH|DAM|IMP|EVAP|ESA|UEMOA|CEMAC|WAMEA|NSIA|FRC|CAD|ECO|XC|PDF|JSON|CMYK|RGB|TV|CI|CM|GH|BF|SN|GA|ML|BJ|TG|NE|CG|CD|CF|TD|ZA|SO|FR|EN|AD|DA|DC|DG|DAF|ECCP|IA|ADVE|OS|TG|ID|OK|URL|RDV|BTS|EOTY|HT|TTC|FCFA|XAF|XOF|GHS|USD|EUR|ESOV|KPI|SOV|SOM)$/;
  var res = [];
  for (var i = 0; i < routes.length; i++) {
    var r = routes[i];
    location.hash = "#/" + r; await new Promise(function (ok) { setTimeout(ok, 700); });
    var z = document.querySelector(window.__racine || ".zone"); if (!z) { res.push({ r: r, erreur: "pas de zone" }); continue; }
    var caps = [], serif = [], aplats = [], cibles = [], contraste = [], titres = 0;
    z.querySelectorAll("*").forEach(function (e) {
      if (exclure && e.closest(exclure)) return;
      if (!e.offsetParent && getComputedStyle(e).position !== "fixed") return;
      /* Le contenu d'un <details> fermé garde un offsetParent : sans ce test,
       * un catalogue replié comptait comme s'il était étalé. */
      if (e.checkVisibility && !e.checkVisibility()) return;
      var cs = getComputedStyle(e);
      var t = Array.prototype.filter.call(e.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join("").trim();
      var bg = rgb(cs.backgroundColor);
      if (bg.length === 3 || bg[3] > .3) { var h = hsl(bg[0], bg[1], bg[2]); if (h[1] > .25 && h[2] > .6 && h[2] < .97 && (h[0] < 170 || h[0] > 290)) aplats.push((e.className + "").slice(0, 30)); }
      if (/^(A|BUTTON|SELECT|INPUT|SUMMARY|TEXTAREA)$/.test(e.tagName)) { var b = e.getBoundingClientRect(); var enLigne = cs.display === "inline" && /^(P|LI|SPAN|DD|TD)$/.test(e.parentElement.tagName);
        /* La zone invisible du design system (§14) : un ::after absolu d'au moins
         * 44 px porte la cible sans grossir la ligne. Elle compte comme cible. */
        var apres = getComputedStyle(e, "::after");
        var zone = apres.content !== "none" && apres.position === "absolute" && parseFloat(apres.minHeight) >= 44;
        if (b.height && b.height < 44 && b.width < 400 && !enLigne && !zone) cibles.push(e.tagName + "." + (e.className + "").slice(0, 20) + ":" + Math.round(b.height)); }
      if (!t) return;
      if (/Source Serif|Georgia/.test(cs.fontFamily.split(",")[0])) serif.push((e.className + "").slice(0, 20) + ":" + t.slice(0, 24));
      var vu = cs.textTransform === "uppercase" ? t.toUpperCase() : t;
      var mots = vu.split(/[\s·—,:;()«»'’\/]+/).filter(function (m) { return /^[A-ZÀ-Ý&]{3,}$/.test(m) && !SIGLES.test(m); });
      if (mots.length && (cs.textTransform === "uppercase" || mots.length >= 1 && vu === vu.toUpperCase() && /[A-ZÀ-Ý]{4,}/.test(vu))) caps.push((cs.textTransform === "uppercase" ? "css " : "js ") + (e.className + "").slice(0, 20) + ":" + vu.slice(0, 26));
      var c = rgb(cs.color), f = fond(e); var L1 = lum(c), L2 = lum(f); var k = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      if (k < 4.5 && (c.length < 4 || c[3] > .5)) contraste.push((e.className + "").slice(0, 20) + ":" + k.toFixed(2));
      if (/^H1$|^H2$/.test(e.tagName) && parseFloat(cs.fontSize) >= 30) titres++;
    });
    res.push({ r: r, caps: caps.length, serif: serif.length, aplats: aplats.length, cibles: cibles.length, contraste: contraste.length,
      titres: titres, debord: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ex: { caps: caps.slice(0, 6), serif: serif.slice(0, 3), aplats: aplats.slice(0, 4), cibles: cibles.slice(0, 6), contraste: contraste.slice(0, 4) } });
  }
  return res;
};
"ok";
