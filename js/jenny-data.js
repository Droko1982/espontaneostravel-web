/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Fuente única de datos de Jenny (data/jenny.json)
   Lo usan: el sitio (tarjetas, FAQ, sostenibilidad), Jenny (bot.js), el
   conserje (concierge.js), el panel y el portal. También funciona en Node
   (tools/build-static.js) para generar el HTML base en español (SEO).
   Traducciones: data/jenny.i18n.json (en, fr, de, pt, it). Español = fuente.
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EspoData = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  let Y = null, I = null, loading = null, iLoading = null, BASE = "/";
  const get = (u) => fetch(BASE + u, { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null);

  /* ---------- Carga ---------- */
  // lang = "es": las traducciones (data/jenny.i18n.json) se piden solo al cambiar de idioma (ensureLang)
  function load(base, lang) {
    if (Y) return Promise.resolve(api);
    if (loading) return loading;
    BASE = base || "/";
    loading = Promise.all([get("data/jenny.json"), lang === "es" ? null : loadI18n()]).then(([y]) => {
      if (!y) throw new Error("jenny.json");
      Y = y;
      return api;
    });
    return loading;
  }
  function loadI18n() {
    if (!iLoading) iLoading = get("data/jenny.i18n.json").then(i => { I = i || {}; return api; });
    return iLoading;
  }
  const ensureLang = (lang) => (!lang || lang === "es" || (I && I[lang]) ? Promise.resolve(api) : loadI18n());
  function use(y, i) { Y = y; I = i || {}; return api; }     // para Node / pruebas
  const ready = () => !!Y;

  /* ---------- Traducción con respaldo en español ---------- */
  function tr(lang) { return (lang && lang !== "es" && I && I[lang]) || null; }
  function pick(es, t) {
    if (t == null) return es;
    if (Array.isArray(es)) return Array.isArray(t) && t.length === es.length ? t : es;
    if (typeof es === "string") return typeof t === "string" && t ? t : es;
    return t;
  }

  /* ---------- Tours ---------- */
  function rawTour(id) { return Y && Y.tours.find(t => t.id_web === id) || null; }
  // Publicada = existe y no está marcada «solo agencias» (publico: false, portafolio 2027)
  function published(id) { const t = rawTour(id); return !Y || (!!t && t.publico !== false); }
  function tour(id, lang) {
    const t = rawTour(id); if (!t) return null;
    const x = (tr(lang) && tr(lang).tours && tr(lang).tours[id]) || {};
    const rec = t.recomendacion || {}; const xr = x.recomendacion || {};
    return {
      id: t.id_web, codigo: t.codigo, dur: t.duracion_horas, horario: t.horario || null,
      nombre: pick(t.nombre, x.nombre),
      incluye: pick(t.incluye || [], x.incluye),
      no_incluye: pick(t.no_incluye || [], x.no_incluye),
      notas: pick(t.notas || [], x.notas),
      horario_nota: t.horario && t.horario.nota ? pick(t.horario.nota, x.horario && x.horario.nota) : "",
      precio_publico: t.precio_publico ? pick(t.precio_publico, x.precio_publico) : "",
      // Portafolio 2027 (públicos): descripción corta, departamentos, modalidad, almuerzo y combinaciones
      descripcion: t.descripcion ? pick(t.descripcion, x.descripcion) : "",
      departamentos: t.departamentos || [], modalidad: t.modalidad || "", almuerzo: typeof t.almuerzo === "boolean" ? t.almuerzo : null,
      combina: t.combina || [], combina_todas: !!t.combina_todas, ubicacion_publica: t.ubicacion_publica !== false, publico: t.publico !== false,
      duracion_texto: t.duracion_texto || "",
      rec: { fuente: rec.fuente || "", titulo: pick(rec.titulo || "", xr.titulo), items: pick(rec.items || [], xr.items) }
    };
  }
  function tours(lang) { return Y ? Y.tours.map(t => tour(t.id_web, lang)) : []; }

  /* ---------- Árbol, planes, textos generales ---------- */
  function node(id, lang) {
    const n = Y && Y.arbol.find(a => a.id === id); if (!n) return null;
    const x = (tr(lang) && tr(lang).arbol && tr(lang).arbol[id]) || {};
    const out = Object.assign({}, n);
    ["respuesta", "jenny", "itinerario", "precio_publico", "operacion"].forEach(k => { if (n[k]) out[k] = pick(n[k], x[k]); });
    ["pregunta_tipo", "incluye", "no_incluye", "no_opera"].forEach(k => { if (n[k]) out[k] = pick(n[k], x[k]); });
    return out;
  }
  function planes(lang) {
    if (!Y) return [];
    const x = (tr(lang) && tr(lang).planes) || {};
    return Y.planes.map(p => Object.assign({}, p, { nombre: pick(p.nombre, x[p.id] && x[p.id].nombre), incluye: pick(p.incluye, x[p.id] && x[p.id].incluye) }));
  }
  function planesNoIncluye(lang) { return Y ? pick(Y.planes_no_incluye, tr(lang) && tr(lang).planes_no_incluye) : ""; }
  function general(key, lang) { return Y ? pick(Y.general[key], tr(lang) && tr(lang).general && tr(lang).general[key]) : ""; }
  function sost(lang) {
    if (!Y) return null;
    const s = Y.sostenibilidad, x = (tr(lang) && tr(lang).sostenibilidad) || {};
    const xp = x.pilares || {}, xh = x.historias || {};
    return {
      eyebrow: pick(s.eyebrow, x.eyebrow), titulo: pick(s.titulo, x.titulo), intro: pick(s.intro, x.intro),
      pilares: s.pilares.map(p => ({ id: p.id, icono: p.icono, nombre: pick(p.nombre, xp[p.id] && xp[p.id].nombre),
        titulo: pick(p.titulo, xp[p.id] && xp[p.id].titulo), acciones: pick(p.acciones, xp[p.id] && xp[p.id].acciones) })),
      historias: s.historias.map(h => ({ nombre: h.nombre, rol: pick(h.rol, xh[h.nombre] && xh[h.nombre].rol), texto: pick(h.texto, xh[h.nombre] && xh[h.nombre].texto) }))
    };
  }
  /* Reseñas de Google (data/jenny.json → resenas). visible = hay calificación y total (sección del sitio);
     url_escribir sirve aunque la sección aún no se muestre (botón de reseña del conserje). */
  function resenas() {
    const r = Y && Y.resenas;
    if (!r) return null;
    const https = u => (/^https:\/\/[^\s]+$/.test(u || "") ? u : "");
    return {
      // Sin número de reseñas: no se actualiza solo, así que el sitio muestra solo la calificación y los enlaces
      visible: Number(r.calificacion) > 0,
      calificacion: Math.min(5, Number(r.calificacion)), actualizado: r.actualizado || "",
      url_ver: https(r.url_ver), url_escribir: https(r.url_escribir),
      destacadas: (r.destacadas || []).filter(d => d && d.texto && d.nombre).slice(0, 6).map(d => ({
        nombre: String(d.nombre), texto: String(d.texto), estrellas: Math.max(1, Math.min(5, Math.round(Number(d.estrellas) || 5))),
        fecha: /^\d{4}-\d{2}/.test(d.fecha || "") ? d.fecha.slice(0, 7) : "", idioma: /^[a-z]{2}$/.test(d.idioma || "") ? d.idioma : "" }))
    };
  }
  /* Beneficios por convenio (data/jenny.json → convenios): Jenny ofrece UNO al viajero directo que cotiza.
     null = apagados. valor solo si es un porcentaje válido; si no, el equipo comercial confirma el valor. */
  function convenios() {
    const c = Y && Y.convenios;
    if (!c || !c.activo) return null;
    const pct = v => (typeof v === "number" && v > 0 && v < 100 ? v : null);
    const lista = (c.lista || []).filter(x => x && x.id && x.activo !== false).map(x => Object.assign({}, x, { valor: pct(x.valor) }));
    return lista.length ? { horas: Math.max(1, Math.min(240, Number(c.vigencia_horas) || 24)), lista } : null;
  }
  /* Gremios y redes (franja "Somos parte de"): solo autorizados y con logo local */
  function aliados() {
    const a = (Y && Y.aliados && Y.aliados.lista) || [];
    return a.filter(x => x && x.estado === "autorizado" && /^assets\/img\/aliados\/[\w.-]+\.(png|svg|webp)$/.test(x.logo || ""))
      .map(x => ({ id: x.id, nombre: x.nombre, url: /^https:\/\//.test(x.url || "") ? x.url : "", logo: x.logo }));
  }
  function contacto() { return (Y && Y.contacto) || { whatsapp: "573187200023", rnt: "91795", correo: "info@espontaneostravel.com" }; }
  function meta() { return (Y && Y._meta) || {}; }

  /* ---------- Formatos ---------- */
  function hhmm(s, lang) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); if (!m) return s || "";
    const h = +m[1], mi = m[2];
    if (lang === "en") return ((h % 12) || 12) + ":" + mi + (h < 12 ? " AM" : " PM");
    if (lang === "fr") return h + " h " + mi;
    if (lang === "de") return h + ":" + mi + " Uhr";
    if (lang === "pt") return h + "h" + (mi === "00" ? "" : mi);
    if (lang === "it") return h + ":" + mi;
    return ((h % 12) || 12) + ":" + mi + (h < 12 ? " a. m." : " p. m.");
  }
  const L = {
    es: { fijo1: "Recogida a las {h}", fijoN: "Recogida: {h}", ventana: "Inicio entre {a} y {b}", desde: "Desde las {h}", tbd: "Horario a convenir", and: " o ", dur: "{n} h" },
    en: { fijo1: "Pickup at {h}", fijoN: "Pickup: {h}", ventana: "Start between {a} and {b}", desde: "From {h}", tbd: "Time to be arranged", and: " or ", dur: "{n} h" },
    fr: { fijo1: "Départ à {h}", fijoN: "Départ : {h}", ventana: "Début entre {a} et {b}", desde: "À partir de {h}", tbd: "Horaire à convenir", and: " ou ", dur: "{n} h" },
    de: { fijo1: "Abholung um {h}", fijoN: "Abholung: {h}", ventana: "Start zwischen {a} und {b}", desde: "Ab {h}", tbd: "Uhrzeit nach Absprache", and: " oder ", dur: "{n} Std." },
    pt: { fijo1: "Saída às {h}", fijoN: "Saída: {h}", ventana: "Início entre {a} e {b}", desde: "A partir das {h}", tbd: "Horário a combinar", and: " ou ", dur: "{n} h" },
    it: { fijo1: "Partenza alle {h}", fijoN: "Partenza: {h}", ventana: "Inizio tra le {a} e le {b}", desde: "Dalle {h}", tbd: "Orario da concordare", and: " o ", dur: "{n} h" }
  };
  function fmtHorario(h, lang) {
    const l = L[lang] || L.es;
    if (!h) return l.tbd;
    if (h.tipo === "fijo" && h.horas && h.horas.length) {
      const hs = h.horas.map(x => hhmm(x, lang));
      return hs.length === 1 ? l.fijo1.replace("{h}", hs[0]) : l.fijoN.replace("{h}", hs.join(l.and));
    }
    if (h.tipo === "ventana") return l.ventana.replace("{a}", hhmm(h.desde, lang)).replace("{b}", hhmm(h.hasta, lang));
    if (h.tipo === "desde") return l.desde.replace("{h}", hhmm(h.hora, lang));
    return l.tbd;
  }
  function fmtDur(n, lang) {
    if (n == null) return "";
    const v = Number.isInteger(n) ? String(n) : String(n).replace(".", lang === "en" ? "." : ",");
    return (L[lang] || L.es).dur.replace("{n}", v);
  }
  // Agrupación por duración para filtros: corta (≤2 h), media (3–5 h), día completo (≥6 h)
  function durBucket(n) { if (n == null) return ""; return n <= 2 ? "corta" : n <= 5 ? "media" : "completa"; }

  const api = { load, ensureLang, use, ready, published, tour, tours, node, planes, planesNoIncluye, general, sost, resenas, convenios, aliados, contacto, meta, fmtHorario, fmtDur, hhmm, durBucket };
  return api;
});
