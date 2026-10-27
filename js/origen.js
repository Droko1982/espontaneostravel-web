/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Origen de cada contacto (para saber de dónde llegan las solicitudes)
   · Al entrar se anota, solo en esta pestaña (sessionStorage, sin cookies), de dónde llegó la visita:
     buscador, red social, asistente de IA, campaña (utm_*), otro sitio o directo.
   · Todo WhatsApp que sale del sitio lleva al final una línea «Ref: CANAL · IDIOMA · página · origen».
   · Los correos de los formularios llevan los mismos datos (EspoOrigen.datos).
   ========================================================================== */
(function () {
  "use strict";
  const WA_NUM = "573187200023";
  const KEY = "esp_origen";
  // Sitio de procedencia → nombre corto (el primero que coincide)
  const FUENTES = [
    [/(^|\.)google\./, "Google"], [/(^|\.)bing\.com$/, "Bing"], [/(^|\.)yahoo\./, "Yahoo"], [/duckduckgo\./, "DuckDuckGo"],
    [/(^|\.)instagram\.com$/, "Instagram"], [/(^|\.)(facebook|fb)\.com$|^m\.me$/, "Facebook"], [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X"],
    [/tiktok\./, "TikTok"], [/youtube\.|youtu\.be/, "YouTube"], [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"], [/linkedin\./, "LinkedIn"], [/pinterest\./, "Pinterest"],
    [/chatgpt\.com|openai\.com/, "ChatGPT"], [/perplexity\./, "Perplexity"], [/gemini\.google|bard\.google/, "Gemini"], [/copilot\.microsoft|bing\.com\/chat/, "Copilot"], [/claude\.ai/, "Claude"],
    [/tripadvisor\./, "TripAdvisor"], [/getyourguide\./, "GetYourGuide"], [/viator\./, "Viator"], [/civitatis\./, "Civitatis"], [/airbnb\./, "Airbnb"], [/booking\.com/, "Booking"],
    [/mail\.|outlook\.|gmail\./, "Correo"]
  ];
  const nombre = s => { const x = String(s || "").trim(); return x ? x.charAt(0).toUpperCase() + x.slice(1, 40) : ""; };
  function detectar() {
    const q = new URLSearchParams(location.search), out = { via: "Directo", camp: "", entrada: location.pathname || "/" };
    if (q.get("utm_source")) { out.via = nombre(q.get("utm_source")) + (q.get("utm_medium") ? " / " + q.get("utm_medium").slice(0, 30) : ""); out.camp = (q.get("utm_campaign") || "").slice(0, 60); return out; }
    if (q.get("gclid")) { out.via = "Google Ads"; return out; }
    if (q.get("fbclid")) { out.via = "Facebook / Instagram"; return out; }
    let host = "";
    try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch (e) { host = ""; }
    if (!host || host === location.hostname.replace(/^www\./, "")) return out;
    const f = FUENTES.find(([re]) => re.test(host));
    out.via = f ? f[1] : host.slice(0, 40);
    return out;
  }
  // Primer origen de la visita (se conserva al pasar de página en la misma pestaña)
  let O = null;
  try { O = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { O = null; }
  if (!O || !O.via) { O = detectar(); try { sessionStorage.setItem(KEY, JSON.stringify(O)); } catch (e) { /* sin almacenamiento */ } }

  const LANG = () => String(document.documentElement.lang || "es").slice(0, 2).toUpperCase();
  // Página corta y legible: <meta name="espo-pagina"> o el nombre del archivo (inicio, cocora-valley-salento-tour, agencias…)
  function pagina() {
    const m = document.querySelector('meta[name="espo-pagina"]'); if (m && m.content) return m.content.slice(0, 50);
    const parts = location.pathname.replace(/\/index\.html$/, "/").split("/").filter(Boolean);
    const last = (parts[parts.length - 1] || "").replace(/\.html$/, "");
    if (!last || /^(en|fr|de|pt|it)$/.test(last)) return "inicio";
    return last.slice(0, 50);
  }
  const ref = (canal, que) => `Ref: ${canal || "WEB"} · ${LANG()} · ${(que || pagina()).slice(0, 50)} · ${O.via}`;
  const SALUDO = { ES: "¡Hola Espontáneos Travel!", EN: "Hi Espontáneos Travel!", FR: "Bonjour Espontáneos Travel !", DE: "Hallo Espontáneos Travel!", PT: "Olá Espontáneos Travel!", IT: "Ciao Espontáneos Travel!" };
  // Agrega la referencia al texto de un mensaje (una sola vez)
  function etiquetar(msg, canal, que) {
    const t = String(msg || SALUDO[LANG()] || SALUDO.ES);
    return /\bRef: [A-Z]+ · /.test(t) ? t : t.replace(/\s+$/, "") + "\n\n" + ref(canal, que);
  }
  // Enlace de WhatsApp del negocio con la referencia (los de compartir con otra persona no se tocan)
  function waHref(href, canal, que) {
    let u; try { u = new URL(href, location.href); } catch (e) { return href; }
    if (!/(^|\.)wa\.me$/.test(u.hostname) || u.pathname.replace(/\//g, "") !== WA_NUM) return href;
    // encodeURIComponent (no searchParams): WhatsApp mostraría los «+» de los espacios
    return `https://wa.me/${WA_NUM}?text=${encodeURIComponent(etiquetar(u.searchParams.get("text"), canal, que))}`;
  }
  // Todos los enlaces del sitio a nuestro WhatsApp: la referencia se pone al tocarlos
  document.addEventListener("click", ev => {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href*="wa.me/' + WA_NUM + '"]');
    if (a) a.href = waHref(a.href, a.getAttribute("data-canal") || "WEB");
  }, true);

  window.EspoOrigen = {
    via: () => O.via, campana: () => O.camp, pagina, ref, etiquetar, waHref,
    // Para los correos: de qué canal y página sale, y cómo llegó la persona al sitio
    datos: canal => ({ "Canal": canal || "Sitio web", "Página": location.href.split("#")[0].slice(0, 300), "Idioma de la página": LANG(),
      "Llegó al sitio desde": O.via, "Campaña": O.camp || "—", "Página de entrada": O.entrada })
  };
})();
