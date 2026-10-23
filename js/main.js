/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Motor del sitio (rediseño 2026)
   Datos: js/data.js (tours, fotos, resúmenes) + data/jenny.json (duración,
   horario, incluye, recomendaciones — la misma fuente de Jenny).
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Config ---------- */
  const CFG = {
    whatsapp: "573187200023",            // +57 318 720 0023 (confirmado)
    email: "info@espontaneostravel.com",
    siteUrl: "https://www.espontaneostravel.com",
    formEndpoint: "https://formsubmit.co/ajax/info@espontaneostravel.com"
  };
  const SUPPORTED = ["es", "en", "fr", "de", "pt"];
  const DEFAULT_LANG = "es";
  // Tours que no están en el portafolio ni en el tarifario 2026: ocultos hasta que Carolina los valide.
  const PENDING_VALIDATION = ["rodizio", "alimentacion"];
  // Solo fotos propias: los respaldos locales (fb:"local:…") ya no se usan; esta lista queda por compatibilidad
  const MISLEADING_PHOTOS = ["laberinto.jpg"];

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const D = () => window.EspoData;
  const R = () => window.EspoRender;

  let currentLang = DEFAULT_LANG;
  let activeFilter = "all", activeDur = "", searchQ = "", view = "cards";

  /* ---------- Imágenes: local (WebP) primero; Drive como respaldo ---------- */
  const IMG = window.IMG_LOCAL || { drive: {}, local: {}, tours: {} };
  function svgFallback(w, h, label) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='%234A5C3A'/><stop offset='1' stop-color='%23272E19'/></linearGradient></defs>
      <rect width='100%' height='100%' fill='url(%23g)'/>
      <text x='50%' y='50%' fill='%23FFB067' font-family='Georgia,serif' font-size='${Math.round(w / 16)}' text-anchor='middle' dominant-baseline='middle' opacity='0.9'>${label}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + svg.replace(/\s{2,}/g, " ").trim();
  }
  // Cadena de respaldo si una imagen falla: miniatura de Drive → ilustración de marca
  window.__imgErr = function (el) {
    const stage = el.getAttribute("data-stage") || "0";
    const drive = el.getAttribute("data-drive");
    const w = el.getAttribute("data-w") || 1200, h = el.getAttribute("data-h") || 800;
    if (drive && stage === "0") { el.setAttribute("data-stage", "1"); el.removeAttribute("srcset"); el.src = "https://drive.google.com/thumbnail?id=" + drive + "&sz=w" + w; return; }
    el.setAttribute("data-stage", "2"); el.onerror = null; el.removeAttribute("srcset"); el.src = svgFallback(w, h, "Espontáneos Travel");
  };
  // Una foto → { src, srcset, big, drive }
  function photo(ref) {
    if (ref.tourLocal) {
      const b = "/assets/img/t/" + ref.tourLocal;
      return { src: b + "-640.webp", srcset: b + "-640.webp 640w, " + b + "-1600.webp 1600w", big: b + "-1600.webp" };
    }
    if (ref.local) {
      const name = ref.local, base = "/assets/img/" + name.replace(/\.(jpe?g|png)$/i, "");
      if (IMG.local && IMG.local[name]) return { src: base + "-640.webp", srcset: base + "-640.webp 640w, " + base + "-1600.webp 1600w", big: base + "-1600.webp" };
      return { src: "/assets/img/" + name, big: "/assets/img/" + name };
    }
    if (ref.drive) {
      if (IMG.drive && IMG.drive[ref.drive]) { const b = "/assets/img/d/" + ref.drive; return { src: b + "-640.webp", srcset: b + "-640.webp 640w, " + b + "-1600.webp 1600w", big: b + "-1600.webp" }; }
      return { src: "https://lh3.googleusercontent.com/d/" + ref.drive + "=w800", big: "https://lh3.googleusercontent.com/d/" + ref.drive + "=w1600", drive: ref.drive };
    }
    if (ref.url) return { src: ref.url, big: ref.url };
    return { src: svgFallback(800, 560, "Espontáneos Travel"), big: svgFallback(1400, 950, "Espontáneos Travel") };
  }
  function tourPhotos(tour) {
    const list = [];
    const n = IMG.tours && IMG.tours[tour.id];
    if (n) for (let i = 1; i <= n; i++) list.push({ tourLocal: tour.id + "-" + i });
    if (tour.cover) {
      if (tour.cover.startsWith("local:")) list.push({ local: tour.cover.slice(6) });
      else if (tour.cover.startsWith("url:")) list.push({ url: tour.cover.slice(4) });
    }
    if (!list.length && !(tour.imgs || []).length && tour.fb && tour.fb.startsWith("local:") && MISLEADING_PHOTOS.indexOf(tour.fb.slice(6)) < 0) list.push({ local: tour.fb.slice(6) });
    (tour.imgs || []).forEach(id => list.push({ drive: id }));
    if (!list.length) list.push({});
    return list.map(photo);
  }
  function imgAttrs(p, w, h) { return p.drive ? ` data-drive="${esc(p.drive)}" data-w="${w}" data-h="${h}" data-stage="0" onerror="window.__imgErr(this)"` : ` data-w="${w}" data-h="${h}" onerror="window.__imgErr(this)"`; }

  /* ---------- Idioma ---------- */
  // {n} en la descripción y el sello de confianza = experiencias publicadas (así el número nunca queda viejo)
  const COUNT_KEYS = { doc_desc: 1, trust_exp: 1 };
  function t(key) { const v = (I18N[currentLang] && I18N[currentLang][key]) || I18N[DEFAULT_LANG][key] || key; return COUNT_KEYS[key] ? v.replace("{n}", visibleTours().length) : v; }
  function tourSummary(tour) { return (tour.sum && (tour.sum[currentLang] || tour.sum.en || tour.sum.es)) || ""; }
  function info(tour) { return D() && D().ready() ? D().tour(tour.id, currentLang) : null; }
  function tourName(tour) { const i = info(tour); return (i && i.nombre) || tour.name; }
  function tourText(tour) { return { name: tourName(tour), summary: tourSummary(tour) }; }
  // Departamentos en el idioma elegido (solo cambia el norte del Valle)
  const NV = { es: "Norte del Valle del Cauca", en: "Northern Valle del Cauca", fr: "Nord du Valle del Cauca", de: "Nördliches Valle del Cauca", pt: "Norte do Valle del Cauca" };
  function deptos(list) { return list.map(d => (d === "Norte del Valle del Cauca" ? (NV[currentLang] || d) : d)).join(", "); }
  function catLabel(cat) { const c = CATEGORIES.find(x => x.id === cat); return c ? (c[currentLang] || c.es) : cat; }
  function visibleTours() { return TOURS.filter(x => PENDING_VALIDATION.indexOf(x.id) < 0 && (!D() || D().published(x.id))); }

  // Cada idioma tiene su inicio propio (/, /en/, /fr/, /de/, /pt/): el HTML trae data-page-lang (tools/build-static.js)
  const PAGE_LANG = document.documentElement.getAttribute("data-page-lang") || "";
  const langPath = (l) => (l === DEFAULT_LANG ? "/" : "/" + l + "/");
  function detectLang() {
    const q = (new URLSearchParams(location.search).get("lang") || "").toLowerCase();
    if (SUPPORTED.includes(q)) return q;
    if (SUPPORTED.includes(PAGE_LANG) && PAGE_LANG !== DEFAULT_LANG) return PAGE_LANG;
    try { const s = localStorage.getItem("esp_lang"); if (SUPPORTED.includes(s)) return s; } catch (e) {}
    // Sin ?lang ni preferencia guardada: español. No se adapta al navegador (Google lo lee en inglés y veía
    // la raíz como otra página); a esas visitas se les ofrece su idioma con langHint().
    return DEFAULT_LANG;
  }
  const HINT = {
    en: ["This page is also available in English.", "View in English", "Close"],
    fr: ["Cette page existe aussi en français.", "Voir en français", "Fermer"],
    de: ["Diese Seite gibt es auch auf Deutsch.", "Auf Deutsch ansehen", "Schließen"],
    pt: ["Esta página também está disponível em português.", "Ver em português", "Fechar"]
  };
  function langHint() {
    if (currentLang !== DEFAULT_LANG || new URLSearchParams(location.search).get("lang")) return;
    try { if (localStorage.getItem("esp_lang") || localStorage.getItem("esp_lang_hint")) return; } catch (e) {}
    const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
    const tx = HINT[nav]; if (!tx) return;
    const bar = document.createElement("div"); bar.className = "lang-hint"; bar.lang = nav;
    const msg = document.createElement("span"); msg.textContent = "🌐 " + tx[0];
    const go = document.createElement("a"); go.href = langPath(nav); go.textContent = tx[1];
    const x = document.createElement("button"); x.type = "button"; x.className = "lang-hint__x"; x.setAttribute("aria-label", tx[2]); x.textContent = "×";
    go.addEventListener("click", e => { e.preventDefault(); bar.remove(); setLang(nav); });
    x.addEventListener("click", () => { bar.remove(); try { localStorage.setItem("esp_lang_hint", "1"); } catch (e) {} });
    bar.append(msg, go, x);
    document.body.appendChild(bar);
  }
  function waLink(msg) { return `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg || t("wa_default"))}`; }

  /* ---------- Filtros ---------- */
  function renderFilters() {
    const wrap = $("#filters"); if (!wrap) return;
    const vis = visibleTours();
    wrap.innerHTML = CATEGORIES.filter(c => c.id === "all" || vis.some(x => x.cat === c.id)).map(c =>
      `<button class="filter${c.id === activeFilter ? " active" : ""}" data-filter="${c.id}" type="button" aria-pressed="${c.id === activeFilter}">${esc(c[currentLang] || c.es)}</button>`
    ).join("");
    $$(".filter", wrap).forEach(b => b.addEventListener("click", () => { activeFilter = b.getAttribute("data-filter"); renderFilters(); renderTours(); }));
  }
  function matches(tour) {
    if (activeFilter !== "all" && tour.cat !== activeFilter) return false;
    const i = info(tour);
    if (activeDur && (!i || D().durBucket(i.dur) !== activeDur)) return false;
    if (searchQ) {
      const hay = [tourName(tour), tour.name, catLabel(tour.cat), tourSummary(tour), i && i.descripcion, i && i.codigo, i && i.incluye.join(" ")].join(" ").toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (!searchQ.split(/\s+/).every(w => hay.indexOf(w) >= 0)) return false;
    }
    return true;
  }

  /* ---------- Tarjetas ---------- */
  function renderTours() {
    const grid = $("#tours-grid"); if (!grid) return;
    // Las tarjetas en español ya vienen en el HTML: no se repintan (sin datos) para evitar parpadeo
    if (currentLang === "es" && !(D() && D().ready()) && grid.querySelector(".cat-tile") && overview()) return;
    const list = visibleTours().filter(matches);
    const count = $("#tours-count");
    if (count) count.innerHTML = (list.length === 1 ? t("results_1") : t("results_n").replace("{n}", list.length)) +
      ((activeFilter !== "all" || activeDur || searchQ) ? ` · <button type="button" class="linkbtn" id="clear-filters">${esc(t("clear_filters"))}</button>` : "");
    const cf = $("#clear-filters"); if (cf) cf.addEventListener("click", clearFilters);
    if (!list.length) { grid.innerHTML = `<p class="tours-empty">${esc(t("tours_empty"))}</p>`; updateMap(list); return; }
    grid.classList.toggle("tours-grid--cats", overview());
    if (overview()) { grid.innerHTML = R().catTiles(catGroups(list), { t }); observeReveals(); updateMap(list); return; }
    const ctx = { t, lang: currentLang, catLabel, fmtDur: n => D().fmtDur(n, currentLang), fmtHorario: h => D().fmtHorario(h, currentLang), durBucket: n => D().durBucket(n) };
    grid.innerHTML = list.map((tour, i) => {
      const p = tourPhotos(tour)[0];
      return R().card(tour, info(tour), Object.assign({}, ctx, { summary: tourSummary(tour), delay: (i % 3) + 1, img: { src: p.src, srcset: p.srcset, attrs: imgAttrs(p, 800, 560) } }));
    }).join("");
    wireCards(grid);
    observeReveals();
    updateMap(list);
  }
  // Página propia de cada experiencia (tools/build-pages.js → js/pages-map.js); sin mapa, la ficha del sitio
  function pageHref(id) {
    const P = window.ESPO_PAGES, s = P && P.slugs[id] && P.slugs[id][currentLang];
    return s ? "/" + P.dir[currentLang] + "/" + s + ".html" : "#tour-" + id;
  }
  // Vista general (sin filtros): una foto por categoría + lista desplegable de sus experiencias
  const overview = () => activeFilter === "all" && !activeDur && !searchQ;
  function catGroups(list) {
    return CATEGORIES.filter(c => c.id !== "all").map(c => {
      const ts = list.filter(x => x.cat === c.id); if (!ts.length) return null;
      const cover = tourPhotos(ts.find(x => tourPhotos(x)[0].srcset) || ts[0])[0];
      return { id: c.id, label: c[currentLang] || c.es, img: { src: cover.src, srcset: cover.srcset },
        items: ts.map(x => { const i = info(x), p = tourPhotos(x)[0]; return { id: x.id, name: tourName(x), dur: i ? D().fmtDur(i.dur, currentLang) : "", href: pageHref(x.id), thumb: p.srcset ? p.src : "" }; }) };
    }).filter(Boolean);
  }
  // Clics en la vista por categorías (delegados: sirve para el HTML base y para lo que se repinta)
  function wireTiles(grid) {
    if (!grid || grid._tiles) return; grid._tiles = true;
    grid.addEventListener("click", e => {
      const a = e.target.closest(".cat-tile__list a");
      if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) { e.preventDefault(); openModal(a.getAttribute("data-id")); return; }
      const b = e.target.closest(".cat-tile__cards");
      if (b) { activeFilter = b.getAttribute("data-cat"); renderFilters(); renderTours(); const s = $("#experiencias"); if (s) s.scrollIntoView({ behavior: "smooth" }); }
    });
  }
  function wireCards(root) {
    $$(".tour-card", root).forEach(card => {
      const open = () => openModal(card.getAttribute("data-id"));
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }
  function clearFilters() {
    activeFilter = "all"; activeDur = ""; searchQ = "";
    const s = $("#tour-search"); if (s) s.value = "";
    $$("#dur-filters .seg__btn").forEach(b => b.classList.toggle("active", !b.getAttribute("data-dur")));
    renderFilters(); renderTours();
  }

  /* ---------- Vista de mapa ---------- */
  function setView(v) {
    view = v;
    $$("#view-toggle .seg__btn").forEach(b => { const on = b.getAttribute("data-view") === v; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on); });
    const map = $("#tours-map"), grid = $("#tours-grid");
    if (map) map.hidden = v !== "map";
    if (grid) grid.hidden = v === "map";
    updateMap(visibleTours().filter(matches));
  }
  function updateMap(list) {
    const el = $("#tours-map");
    if (!el || view !== "map" || !window.EspoMaps) return;
    try {
      EspoMaps.overview(el, {
        lang: currentLang,
        tours: list.map(x => ({ id: x.id, cat: x.cat, name: tourName(x), dur: info(x) ? D().fmtDur(info(x).dur, currentLang) : "" })),
        categories: CATEGORIES.map(c => ({ id: c.id, label: c[currentLang] || c.es })),
        onSelect: openModal
      });
    } catch (e) { /* el mapa es opcional */ }
  }

  /* ---------- Selector del formulario ---------- */
  function renderTourSelect() {
    const sel = $("#f-tour"); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">${esc(t("f_tour_opt"))}</option>` +
      visibleTours().map(x => { const i = info(x); const v = tourName(x) + (i ? " (" + i.codigo + ")" : ""); return `<option value="${esc(v)}">${esc(v)}</option>`; }).join("");
    if (cur) sel.value = cur;
  }

  /* ---------- Planes ---------- */
  function renderPlans() {
    const box = $("#plans-list"); if (!box || !D() || !D().ready()) return;
    const sug = (window.EspoPlans ? EspoPlans.plans() : []).map(p => ({
      id: p.id, days: p.days, nombre: EspoPlans.name(p, currentLang),
      dayLabel: EspoPlans.ui(currentLang).day,
      stops: p.stops.filter(s => s.tour).map(s => { const i = D().tour(s.tour, currentLang); return { d: s.d, name: (i && i.nombre) || EspoPlans.stopTitle(s, currentLang) }; })
    }));
    box.innerHTML = R().planes(D().planes(currentLang), sug, {
      t, noIncluye: D().planesNoIncluye(currentLang),
      waPlan: name => waLink(t("wa_plan_msg").replace("{plan}", name))
    });
    observeReveals();
  }

  /* ---------- Sostenibilidad ---------- */
  function renderSust() {
    if (!D() || !D().ready()) return;
    const s = D().sost(currentLang); if (!s) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };
    set("sust-eyebrow", s.eyebrow); set("sust-title", s.titulo); set("sust-intro", s.intro);
    const c = $("#sust-content"); if (c) c.innerHTML = R().sost(s, { t });
    const escnna = D().general("escnna", currentLang);
    set("escnna-text", escnna);   // el aviso ESCNNA va solo en la sección de sostenibilidad
    observeReveals();
  }

  /* "Somos parte de": logos de gremios y redes autorizados (data/jenny.json → aliados) */
  function renderAliados() {
    const sec = document.getElementById("aliados"), row = document.getElementById("aliados-row");
    if (!sec || !row || !D() || !D().ready() || !D().aliados) return;
    const list = D().aliados();
    sec.hidden = !list.length;
    row.innerHTML = list.map(a => {
      const img = `<img src="/${esc(a.logo).replace(/^\/+/, "")}" alt="${esc(a.nombre)}" loading="lazy" decoding="async" height="64">`;
      return a.url ? `<a class="allies__item" href="${esc(a.url)}" target="_blank" rel="noopener" title="${esc(a.nombre)}">${img}</a>` : `<span class="allies__item" title="${esc(a.nombre)}">${img}</span>`;
    }).join("");
  }

  /* Reseñas de Google: sección y sello en la franja de confianza (ocultos si no hay datos) */
  function renderResenas() {
    if (!D() || !D().ready() || !D().resenas) return;
    const r0 = D().resenas(), r = r0 && r0.visible ? r0 : null, sec = document.getElementById("resenas"), badge = document.getElementById("trust-google");
    if (sec) sec.hidden = !r;
    if (badge) badge.hidden = !r;
    if (!r) return;
    const c = $("#resenas-content"); if (c) c.innerHTML = R().resenas(r, { t, lang: currentLang });
    const bt = document.getElementById("trust-google-txt");
    if (bt) bt.textContent = t("trust_google").replace("{r}", R().score(r.calificacion, currentLang));
    observeReveals();
  }

  /* ---------- Ficha de experiencia ---------- */
  let lastFocus = null, modalId = null;
  // La foto grande de la ficha abre el visor (clic, Enter o espacio)
  function heroLightbox(e) {
    const h = $("#modal-hero"); if (!h || !h._lb || !h._lb.length) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    if (e.target.closest && e.target.closest(".modal__cat")) return;
    e.preventDefault(); openLightbox(h._lb, h._ix || 0);
  }
  (function bindHero() { const h = $("#modal-hero"); if (!h) { document.addEventListener("DOMContentLoaded", bindHero, { once: true }); return; } h.addEventListener("click", heroLightbox); h.addEventListener("keydown", heroLightbox); })();
  function openModal(id) {
    const tour = TOURS.find(x => x.id === id); if (!tour) return;
    lastFocus = document.activeElement;
    const i = info(tour), name = tourName(tour), photos = tourPhotos(tour);
    $("#modal-hero").style.backgroundImage = `url('${photos[0].big}')`;
    $("#modal-cat").textContent = catLabel(tour.cat);
    $("#modal-title").textContent = name;
    const I = R().ICON;
    const meta = [];
    if (i) {
      meta.push(`<span class="m">${I.clock}${esc(D().fmtDur(i.dur, currentLang))}</span>`);
      meta.push(`<span class="m">${I.cal}${esc(D().fmtHorario(i.horario, currentLang))}</span>`);
      meta.push(`<span class="m m--code">${esc(t("modal_code"))}: ${esc(i.codigo)}</span>`);
      if (i.modalidad) meta.push(`<span class="m">${esc(t("mod_" + i.modalidad))}</span>`);
      if (i.almuerzo !== null) meta.push(`<span class="m">${esc(t(i.almuerzo ? "lunch_yes" : "lunch_no"))}</span>`);
      // Sin ubicación pública (el punto exacto es solo para agencias): se muestra el departamento
      if (!i.ubicacion_publica && i.departamentos.length) meta.push(`<span class="m">${I.pin}${esc(deptos(i.departamentos))}</span>`);
    }
    const dist = window.EspoMaps && EspoMaps.distanceText ? EspoMaps.distanceText(id, currentLang) : "";
    if (dist) meta.push(`<span class="m m--dist">${I.pin}${esc(dist)}</span>`);
    $("#modal-meta").innerHTML = meta.join("");
    $("#modal-desc").textContent = ((i && i.descripcion) || tourSummary(tour)) + (i && i.horario_nota ? "\n\n" + i.horario_nota : "");
    // fotos
    const gal = $("#modal-gallery");
    const lb = photos.map(p => Object.assign({}, p, { cap: name }));
    gal.innerHTML = photos.length > 1 || photos[0].drive || photos[0].srcset ? photos.map((p, ix) =>
      `<button class="modal__thumb" data-ix="${ix}" aria-label="${esc(name)} ${ix + 1}"><img src="${esc(p.src)}" alt="" loading="lazy" width="320" height="240"${imgAttrs(p, 320, 240)}></button>`).join("") : "";
    // Miniatura = cambia la foto grande; foto grande = abre el visor en esa foto
    const hero = $("#modal-hero"); hero._lb = lb; hero._ix = 0;
    const pick = (ix) => { hero._ix = ix; hero.style.backgroundImage = `url('${photos[ix].big}')`; $$(".modal__thumb", gal).forEach(b => b.classList.toggle("active", +b.getAttribute("data-ix") === ix)); };
    $$(".modal__thumb", gal).forEach(b => b.addEventListener("click", () => pick(+b.getAttribute("data-ix"))));
    if (photos.length > 1) pick(0);
    // incluye / no incluye
    $("#modal-incl-title").textContent = t("modal_includes");
    const incl = i ? i.incluye : ["inc1", "inc2", "inc3", "inc4", "inc5"].map(k => t(k));
    $("#modal-incl").innerHTML = incl.map(x => `<li>${I.check}<span>${esc(x)}</span></li>`).join("");
    const noin = $("#modal-noincl");
    noin.innerHTML = i && i.no_incluye.length ? `<b>${esc(t("modal_notincl_t"))}:</b> ${esc(i.no_incluye.join(" · "))}. ${esc(t("modal_notincl"))}` : esc(t("modal_notincl"));
    // recomendaciones de Jenny
    const tips = $("#modal-tips");
    if (i && i.rec.items.length) { tips.hidden = false; tips.innerHTML = `<h4>${esc(t("modal_tips"))}</h4><p class="modal__tips-t">${esc(i.rec.titulo)}</p><ul>${i.rec.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; }
    else tips.hidden = true;
    // notas públicas
    const notes = $("#modal-notes");
    if (i && i.notas.length) { notes.hidden = false; notes.innerHTML = `<h4>${esc(t("modal_notes"))}</h4><ul class="modal__notes">${i.notas.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; }
    else notes.hidden = true;
    // Combínalo con (solo experiencias publicadas)
    const combo = $("#modal-combo");
    const cids = i ? i.combina.filter(c => c !== id && visibleTours().some(x => x.id === c)) : [];
    if (i && (cids.length || i.combina_todas)) {
      combo.hidden = false;
      combo.innerHTML = `<h4>${esc(t("combo_t"))}</h4>` + (cids.length ? `<div class="modal__combo-list">${cids.map(c => `<button type="button" class="filter" data-combo="${esc(c)}">${esc(tourName(TOURS.find(x => x.id === c)))}</button>`).join("")}</div>` : "") +
        (i.combina_todas ? `<p class="modal__combo-all">${esc(t("combo_all"))}</p>` : "");
      $$("[data-combo]", combo).forEach(b => b.addEventListener("click", () => openModal(b.getAttribute("data-combo"))));
    } else combo.hidden = true;
    // mapa y distancia: esperan a que carguen los datos del mapa (data/geo.json)
    const mw = $("#modal-map-wrap"); mw.hidden = true; modalId = id;
    const showMap = () => {
      if (modalId !== id || !$("#modal").classList.contains("open") || !EspoMaps.place(id)) return;
      mw.hidden = false; $("#modal-map-title").textContent = t("modal_map");
      try { EspoMaps.tour($("#modal-map"), id, { lang: currentLang, name: name }); } catch (e) { mw.hidden = true; }
      const dt = EspoMaps.distanceText(id, currentLang);
      if (dt && !$("#modal-meta .m--dist")) $("#modal-meta").insertAdjacentHTML("beforeend", `<span class="m m--dist">${I.pin}${esc(dt)}</span>`);
    };
    if (window.EspoMaps) (EspoMaps.load ? EspoMaps.load() : Promise.resolve()).then(showMap, () => {});
    // acciones
    const wa = $("#modal-wa");
    wa.href = waLink(t("wa_tour_msg").replace("{tour}", name).replace("{code}", i ? i.codigo : tour.id));
    wa.querySelector("span").textContent = t("modal_wa");
    const q = $("#modal-quote");
    q.querySelector("span").textContent = t("jenny_quote");
    // Cotiza con Jenny: abre el chat en esta experiencia (si Jenny no está, el formulario de contacto)
    q.onclick = (e) => { e.preventDefault(); closeModal(); if (window.EspoBot && EspoBot.quote) { EspoBot.quote(id); return; } const sel = $("#f-tour"); if (sel) { const opt = Array.from(sel.options).find(o => o.value.indexOf(name) === 0); if (opt) sel.value = opt.value; } location.hash = "#contacto"; };
    const hook = $("#modal-hook");
    if (hook) { hook.hidden = !(D() && D().convenios && D().convenios()); hook.textContent = t("jenny_hook"); }
    $("#modal").classList.add("open");
    $(".modal__panel").scrollTop = 0;
    document.body.style.overflow = "hidden";
    $("#modal-close").focus();
    try { history.replaceState(null, "", "#tour-" + id); } catch (e) {}
  }
  function closeModal() {
    if (!$("#modal").classList.contains("open")) return;
    $("#modal").classList.remove("open"); document.body.style.overflow = ""; modalId = null;
    if (window.EspoMaps && EspoMaps.destroy) { try { EspoMaps.destroy($("#modal-map")); } catch (e) {} }
    try { if (location.hash.indexOf("#tour-") === 0) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- Visor de fotos ---------- */
  let lbList = [], lbIndex = 0;
  let lbReturn = null;
  function openLightbox(list, i) { lbReturn = document.activeElement; lbList = list || []; lbIndex = i || 0; updateLightbox(); $("#lightbox").classList.add("open"); document.body.style.overflow = "hidden"; $("#lightbox-close").focus(); }
  function updateLightbox() {
    const g = lbList[lbIndex]; if (!g) return;
    const img = $("#lightbox-img");
    img.removeAttribute("data-drive"); img.setAttribute("data-stage", "0"); img.setAttribute("data-w", 1400); img.setAttribute("data-h", 950);
    if (g.drive) img.setAttribute("data-drive", g.drive);
    img.onerror = function () { window.__imgErr(this); };
    img.src = g.big || g.src; img.alt = g.cap || ""; $("#lightbox-cap").textContent = g.cap || "";
  }
  function lbNav(d) { if (!lbList.length) return; lbIndex = (lbIndex + d + lbList.length) % lbList.length; updateLightbox(); }
  function closeLightbox() {
    if (!$("#lightbox").classList.contains("open")) return;
    $("#lightbox").classList.remove("open"); if (!$("#modal").classList.contains("open")) document.body.style.overflow = "";
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }

  /* ---------- Aplicar idioma ---------- */
  function applyI18n() {
    $$("[data-i18n]").forEach(el => { const v = t(el.getAttribute("data-i18n")); if (v) el.textContent = v; });
    $$("[data-i18n-ph]").forEach(el => { const v = t(el.getAttribute("data-i18n-ph")); if (v) el.setAttribute("placeholder", v); });
    $$("[data-i18n-aria]").forEach(el => { const v = t(el.getAttribute("data-i18n-aria")); if (v) el.setAttribute("aria-label", v); });
    document.documentElement.lang = currentLang;
    document.title = t("doc_title");
    setMeta("name", "description", t("doc_desc"));
    setMeta("property", "og:title", t("doc_title"));
    setMeta("property", "og:description", t("doc_desc"));
    setMeta("property", "og:locale", ({ es: "es_CO", en: "en_GB", fr: "fr_FR", de: "de_DE", pt: "pt_BR" })[currentLang]);
    setMeta("name", "twitter:title", t("doc_title"));
    setMeta("name", "twitter:description", t("doc_desc"));
    // Una dirección por idioma (igual que hreflang y sitemap.xml): español = raíz; los demás = /en/, /fr/, /de/, /pt/
    if (document.head.querySelector('link[hreflang]')) {
      const canon = CFG.siteUrl + langPath(currentLang);
      let cl = document.head.querySelector('link[rel="canonical"]');
      if (!cl) { cl = document.createElement("link"); cl.rel = "canonical"; document.head.appendChild(cl); }
      cl.href = canon;
      setMeta("property", "og:url", canon);
    }
    $$("[data-wa]").forEach(a => a.href = waLink());
    const lb = $("#lang-current"); if (lb) { const L = LANGS.find(x => x.code === currentLang); lb.textContent = L.name; }
    const lf = $("#lang-flag"); if (lf) lf.className = "flag-i flag-i--" + currentLang;
    $$("[data-hub]").forEach(a => { const P = window.ESPO_PAGES; if (P && P.dir[currentLang]) a.href = "/" + P.dir[currentLang] + "/"; });
    $$("[data-b2b]").forEach(a => { const P = window.ESPO_PAGES; if (P && P.b2b && P.b2b[currentLang]) a.href = "/" + P.b2b[currentLang] + "/"; });
    $$("[data-guides]").forEach(a => { const P = window.ESPO_PAGES; if (P && P.guides && P.guides[currentLang]) a.href = "/" + P.guides[currentLang] + "/"; });
    $$(".lang__item").forEach(it => it.classList.toggle("active", it.getAttribute("data-lang") === currentLang));
    renderAllData();
    document.dispatchEvent(new CustomEvent("espo:lang", { detail: currentLang }));
  }
  function renderAllData() { renderFilters(); renderTours(); renderTourSelect(); renderPlans(); renderSust(); renderResenas(); renderAliados(); injectTourJsonLd(); }
  function setMeta(attr, key, val) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute("content", val);
  }
  // La dirección sigue al idioma (sin recargar): / ↔ /en/ … (las direcciones viejas ?lang=xx pasan a /xx/)
  function syncLangUrl() {
    if (!/^\/(index\.html)?$|^\/(en|fr|de|pt)\/(index\.html)?$/.test(location.pathname)) return;
    const url = new URL(location.href); url.searchParams.delete("lang");
    try { history.replaceState(null, "", langPath(currentLang) + url.search + url.hash); } catch (e) {}
  }
  function setLang(lang, persist) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    currentLang = lang;
    if (persist !== false) { try { localStorage.setItem("esp_lang", lang); } catch (e) {} }
    syncLangUrl();
    applyI18n();
    // Traducciones de los textos de las experiencias: se cargan la primera vez que se elige otro idioma
    if (lang !== "es" && D() && D().ensureLang) D().ensureLang(lang).then(() => {
      if (currentLang === lang && D().ready()) { renderAllData(); document.dispatchEvent(new CustomEvent("espo:data")); }
    }, () => {});
  }

  /* ---------- Tema ---------- */
  function effectiveTheme() { const set = document.documentElement.getAttribute("data-theme"); if (set) return set; return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  function setThemeIcon() {
    const btn = $("#theme-toggle"); if (!btn) return;
    btn.innerHTML = effectiveTheme() === "dark"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  }
  function initTheme() { let s = null; try { s = localStorage.getItem("esp_theme"); } catch (e) {} if (s) document.documentElement.setAttribute("data-theme", s); setThemeIcon(); }
  function toggleTheme() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("esp_theme", next); } catch (e) {}
    setThemeIcon();
  }

  /* ---------- Aparición al hacer scroll ---------- */
  let io, revealWired = false;
  function revealInView() {
    const h = window.innerHeight || document.documentElement.clientHeight;
    $$(".reveal:not(.in)").forEach(el => { const r = el.getBoundingClientRect(); if (r.top < h - 30 && r.bottom > 0) el.classList.add("in"); });
  }
  function observeReveals() {
    if ("IntersectionObserver" in window) {
      if (!io) io = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
      $$(".reveal:not(.in)").forEach(el => io.observe(el));
    } else $$(".reveal").forEach(el => el.classList.add("in"));
    revealInView();
    if (!revealWired) {
      revealWired = true;
      let ticking = false;
      const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; revealInView(); }); };
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll, { passive: true });
      addEventListener("load", () => { observeReveals(); revealInView(); });
    }
  }
  window.__revealScan = function () { observeReveals(); revealInView(); };

  /* ---------- Hero ---------- */
  function initHero() {
    const slides = $$(".hero__slide");
    if (slides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Las fotos 2 y 3 (data-bg) se piden cuando la página ya cargó: no compiten con la primera ni con el texto
    const lazy = () => slides.forEach(s => { if (s.dataset.bg) { s.style.backgroundImage = "url('" + s.dataset.bg + "')"; s.removeAttribute("data-bg"); } });
    if (document.readyState === "complete") setTimeout(lazy, 1200); else addEventListener("load", () => setTimeout(lazy, 1200), { once: true });
    let idx = 0;
    setInterval(() => { slides[idx].classList.remove("active"); idx = (idx + 1) % slides.length; slides[idx].classList.add("active"); }, 6500);
  }

  /* ---------- JSON-LD de experiencias ---------- */
  function injectTourJsonLd() {
    const old = $("#jsonld-tours"); if (old) old.remove();
    const items = visibleTours().map((x, n) => {
      const i = info(x);
      const item = { "@type": "TouristTrip", "name": tourName(x), "description": tourSummary(x), "touristType": catLabel(x.cat),
        "provider": { "@type": "TravelAgency", "name": "Espontáneos Travel" } };
      if (i) { const h = Math.floor(i.dur), mi = Math.round((i.dur - h) * 60); item.identifier = i.codigo; item.duration = "PT" + h + "H" + (mi ? mi + "M" : ""); }
      return { "@type": "ListItem", "position": n + 1, "item": item };
    });
    const s = document.createElement("script"); s.type = "application/ld+json"; s.id = "jsonld-tours";
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", "name": t("tours_title"), "itemListElement": items });
    document.head.appendChild(s);
  }

  /* ---------- Aviso ---------- */
  // Aviso con enlace (no lo bloquean los navegadores, a diferencia de window.open tras un await)
  function toastLink(msg, href) {
    const el = $("#toast"); const m = $("#toast-msg");
    m.textContent = msg + " ";
    const a = document.createElement("a"); a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = "WhatsApp →"; a.className = "toast__link";
    m.appendChild(a); el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 12000);
  }
  function toast(msg) { const el = $("#toast"); $("#toast-msg").textContent = msg; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 4500); }

  /* ---------- Formulario ---------- */
  function initForm() {
    const form = $("#contact-form"); if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const consent = $("#f-consent");
      if (consent && !consent.checked) { toast(t("f_consent_req")); consent.focus(); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const btn = $("#f-submit"); const original = btn.textContent;
      btn.disabled = true; btn.textContent = "…";
      const data = Object.fromEntries(new FormData(form).entries());
      data._subject = "Nueva solicitud — Espontáneos Travel";
      data.consent = "Autoriza tratamiento de datos (Ley 1581 de 2012)";
      try {
        const res = await fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.success === false || j.success === "false") throw new Error("bad");
        if (window.EspoPlans) EspoPlans.sendLead({ stage: "resumen", name: data.name, tour: data.tour, party: data.people, date: data.date, notes: data.message, lang: currentLang, src: "formulario" });
        form.reset(); renderTourSelect(); toast(t("toast_sent"));
      } catch (err) {
        const msg = `${t("wa_default")}\n\n${data.name || ""} · ${data.email || ""} · ${data.phone || ""}\n${data.tour || ""}\n${data.message || ""}`;
        toastLink(t("toast_fallback") || "WhatsApp", waLink(msg));
      } finally { btn.disabled = false; btn.textContent = original; }
    });
  }

  /* ---------- Encabezado, menú, controles ---------- */
  function initChrome() {
    const header = $("#header"), totop = $("#totop");
    const onScroll = () => { const y = scrollY; header.classList.toggle("scrolled", y > 40); totop.classList.toggle("show", y > 600); };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    const links = $$(".nav__link");
    // Solo los enlaces a secciones de esta página (#…); «Agencias / DMCs» va a la página para agencias
    const sections = links.map(l => l.getAttribute("href") || "").filter(h => /^#[\w-]+$/.test(h)).map(h => $(h)).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      const navIo = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { const id = "#" + en.target.id; links.forEach(l => { const on = l.getAttribute("href") === id; l.classList.toggle("active", on); if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current"); }); } });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(s => navIo.observe(s));
    }
    $("#theme-toggle").addEventListener("click", toggleTheme);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", setThemeIcon); else if (mq.addListener) mq.addListener(setThemeIcon);

    const lang = $("#lang"), lbtn = $("#lang-btn");
    lbtn.addEventListener("click", (e) => { e.stopPropagation(); const o = lang.classList.toggle("open"); lbtn.setAttribute("aria-expanded", o); });
    document.addEventListener("click", () => { lang.classList.remove("open"); lbtn.setAttribute("aria-expanded", "false"); });
    $$(".lang__item").forEach(it => it.addEventListener("click", () => { setLang(it.getAttribute("data-lang")); lang.classList.remove("open"); }));

    const mm = $("#mobile-menu"), burger = $("#burger");
    burger.addEventListener("click", () => {
      if (mm.classList.contains("open")) { closeMM(); return; }
      mm.classList.add("open"); burger.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; $("#mm-close").focus();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mm.classList.contains("open")) { closeMM(); burger.focus(); } });
    // Botones "Armarlo con Jenny" (delegado: funciona aunque los planes se repinten o los datos no carguen)
    document.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-plan-jenny]"); if (!b) return;
      e.preventDefault();
      const id = b.getAttribute("data-plan-jenny");
      if (window.EspoBot && EspoBot.openPlan) EspoBot.openPlan(id); else location.search = "?plan=" + encodeURIComponent(id);
    });
    $("#mm-close").addEventListener("click", closeMM);
    $$("#mobile-menu a").forEach(a => a.addEventListener("click", closeMM));
    function closeMM() { mm.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }
    $$(".mm-lang").forEach(b => b.addEventListener("click", () => setLang(b.getAttribute("data-lang"))));

    // Buscador, duración y vista
    const search = $("#tour-search");
    if (search) { let tm; search.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => { searchQ = search.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); renderTours(); }, 160); }); }
    $$("#dur-filters .seg__btn").forEach(b => b.addEventListener("click", () => {
      activeDur = b.getAttribute("data-dur");
      $$("#dur-filters .seg__btn").forEach(x => x.classList.toggle("active", x === b));
      renderTours();
    }));
    $$("#view-toggle .seg__btn").forEach(b => b.addEventListener("click", () => setView(b.getAttribute("data-view"))));
    $$("[data-open-tour]").forEach(b => b.addEventListener("click", () => openModal(b.getAttribute("data-open-tour"))));
    // Abre a Jenny en un tema del árbol (p. ej. Sostenibilidad)
    $$("[data-jenny-node]").forEach(b => b.addEventListener("click", () => { if (window.EspoBot && EspoBot.topic) EspoBot.topic(b.getAttribute("data-jenny-node")); }));

    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-backdrop").addEventListener("click", closeModal);
    $("#lightbox-close").addEventListener("click", closeLightbox);
    $("#lightbox-prev").addEventListener("click", () => lbNav(-1));
    $("#lightbox-next").addEventListener("click", () => lbNav(1));
    $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
    $("#totop").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { if ($("#lightbox").classList.contains("open")) closeLightbox(); else closeModal(); $("#lang").classList.remove("open"); }
      if ($("#lightbox").classList.contains("open")) { if (e.key === "ArrowLeft") lbNav(-1); if (e.key === "ArrowRight") lbNav(1); }
      // Mantener el foco dentro de la ficha abierta
      if (e.key === "Tab" && $("#modal").classList.contains("open")) {
        const f = $$("#modal button, #modal a[href], #modal [tabindex]:not([tabindex='-1'])").filter(x => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- API pública (Jenny y otros módulos) ---------- */
  window.EspoApp = {
    getLang: () => currentLang,
    tours: () => visibleTours(),
    categories: () => CATEGORIES,
    tourText: (tour) => tourText(tour),
    catLabel: (cat) => catLabel(cat),
    openTour: (id) => openModal(id),
    waLink: (msg) => waLink(msg),
    openWhatsApp: (msg) => window.open(waLink(msg), "_blank", "noopener"),
    filterTo: (cat) => { activeFilter = cat || "all"; renderFilters(); renderTours(); const s = document.getElementById("experiencias"); if (s) s.scrollIntoView({ behavior: "smooth" }); },
    t: (k) => t(k)
  };

  function init() {
    if (typeof I18N_EXTRA !== "undefined") SUPPORTED.forEach(lg => { if (I18N[lg] && I18N_EXTRA[lg]) Object.assign(I18N[lg], I18N_EXTRA[lg]); });
    if (typeof I18N_2026 !== "undefined") SUPPORTED.forEach(lg => { if (I18N[lg] && I18N_2026[lg]) Object.assign(I18N[lg], I18N_2026[lg]); });
    // /index.html → / en la barra de direcciones (misma página; así se comparte la dirección corta)
    if (/\/index\.html$/.test(location.pathname)) { try { history.replaceState(null, "", location.pathname.replace(/index\.html$/, "") + location.search + location.hash); } catch (e) {} }
    currentLang = detectLang();
    syncLangUrl();
    initTheme(); initChrome(); initHero(); initForm();
    // Las tarjetas en español ya vienen en el HTML (SEO): se conectan y se repintan cuando llegan los datos
    wireCards(document); wireTiles($("#tours-grid"));
    applyI18n();
    langHint();
    observeReveals();
    requestAnimationFrame(() => $$(".hero .reveal").forEach(el => el.classList.add("in")));
    if (D()) D().load(undefined, currentLang).then(() => {
      renderAllData();
      document.dispatchEvent(new CustomEvent("espo:data"));
      const m = /^#tour-([a-z0-9]+)$/.exec(location.hash); if (m) openModal(m[1]);
    }).catch(() => { /* sin datos extra: el sitio sigue funcionando con data.js */ });
    // Cuando el módulo de mapas termina de cargar, pinta la vista si está activa
    addEventListener("load", () => { if (view === "map") updateMap(visibleTours().filter(matches)); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
