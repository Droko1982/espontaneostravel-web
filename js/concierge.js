/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Conserje con Jenny (motor). Zero-cost, estático.
   Carga data/bookings.json por ?code=, arma itinerario + chat multilingüe.
   ========================================================================== */
(function () {
  "use strict";
  const LANGS = [
    { code:"es", name:"ES" }, { code:"en", name:"EN" }, { code:"fr", name:"FR" },
    { code:"de", name:"DE" }, { code:"pt", name:"PT" }, { code:"it", name:"IT" }
  ];
  const SUPPORTED = LANGS.map(l => l.code);
  const $ = (s, c = document) => c.querySelector(s);
  const el = (t, cls, html) => { const e = document.createElement(t); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const bold = (s) => esc(s).replace(/\*(.+?)\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

  let lang = "es", booking = null, busy = false;
  const U = () => CUI[lang] || CUI.es;
  const HAS_PLANS = typeof window.EspoPlans !== "undefined";
  const P = () => (HAS_PLANS ? EspoPlans.ui(lang) : {});

  function fill(str) {
    if (!booking) return str;
    const g = booking.guide || {}; const h = booking.hotel || {};
    const gl = (g.langs || []).map(c => (LANGS.find(x => x.code === c) || {}).name || c).join(" · ");
    return String(str)
      .replace(/{name}/g, booking.name || "")
      .replace(/{code}/g, booking.code || "")
      .replace(/{region}/g, booking.region || "")
      .replace(/{guide}/g, g.name || "—")
      .replace(/{guideLangs}/g, gl)
      .replace(/{host}/g, (booking.host || {}).name || "")
      .replace(/{hotel}/g, h.name || "")
      .replace(/{hotelArea}/g, h.area || "");
  }
  function waHost(msg) {
    const num = ((booking && booking.host && booking.host.phone) || "573187200023").replace(/\D/g, "");
    const m = fill(msg);
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(window.EspoOrigen ? window.EspoOrigen.etiquetar(m, "VIAJERO", (booking && booking.code) || "viaje") : m);
  }
  function mapsUrl(q) {
    const area = (booking && booking.hotel && booking.hotel.area) || "Eje Cafetero";
    return "https://www.google.com/maps/search/" + encodeURIComponent(q + " " + area);
  }
  function titleOf(it) { const t = it.title; if (typeof t === "string") return t; return (t && (t[lang] || t.es || t.en)) || ""; }

  /* ---------- Self-contained booking links (?d=base64) ---------- */
  function b64urlDecode(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; try { return decodeURIComponent(escape(atob(s))); } catch (e) { return null; } }
  function decodeBooking(s) { try { const j = b64urlDecode(s); return j ? JSON.parse(j) : null; } catch (e) { return null; } }

  /* ---------- Add to calendar (.ics) ---------- */
  const CAL_LABEL = { es: "Añadir a mi calendario", en: "Add to my calendar", fr: "Ajouter à mon calendrier", de: "Zu meinem Kalender", pt: "Adicionar ao meu calendário", it: "Aggiungi al mio calendario" };
  function pad2(n) { return String(n).padStart(2, "0"); }
  function icsFmt(d) { return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00"; }
  const CAL_REMIND = {
    es: "Mañana viajas con Espontáneos Travel: revisa tu itinerario y qué llevar 🎒",
    en: "You're travelling with Espontáneos Travel tomorrow: check your itinerary and what to pack 🎒",
    fr: "Demain vous voyagez avec Espontáneos Travel : vérifiez votre itinéraire et ce qu'il faut emporter 🎒",
    de: "Morgen reist du mit Espontáneos Travel: prüfe deinen Reiseplan und was du mitnimmst 🎒",
    pt: "Amanhã você viaja com a Espontáneos Travel: confira seu roteiro e o que levar 🎒",
    it: "Domani viaggi con Espontáneos Travel: controlla il tuo itinerario e cosa portare 🎒"
  };
  function icsText(s) { return String(s).replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n"); }
  // RFC 5545: lines longer than 75 octets are folded (continuation lines start with a space)
  function icsFold(line) { const p = []; for (let i = 0; i < line.length; i += 70) p.push(line.slice(i, i + 70)); return p.join("\r\n "); }
  function buildICS() {
    const o = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Espontaneos Travel//Concierge//EN", "CALSCALE:GREGORIAN"];
    const items = booking.itinerary || [];
    items.forEach((it, i) => {
      const s = itemDate(it), e = new Date(s.getTime() + 90 * 60000);
      const title = icsText(fill(titleOf(it)));
      o.push("BEGIN:VEVENT", "UID:esp-" + ((booking.code || "x") + "-" + i) + "@espontaneostravel.com",
        "DTSTAMP:" + icsFmt(new Date()), "DTSTART:" + icsFmt(s), "DTEND:" + icsFmt(e),
        "SUMMARY:" + title,
        "LOCATION:" + icsText(booking.region || ""),
        "DESCRIPTION:" + icsText("Espontáneos Travel · " + (booking.code || "") + "\n" + location.href),
        "URL:" + location.href,
        "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT1H", "DESCRIPTION:" + title, "END:VALARM");
      // Evening-before reminder, once per day (14 h before the first stop of the day)
      if (i === 0 || items[i - 1].date !== it.date)
        o.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT14H", "DESCRIPTION:" + icsText(CAL_REMIND[lang] || CAL_REMIND.es), "END:VALARM");
      o.push("END:VEVENT");
    });
    o.push("END:VCALENDAR"); return o.map(icsFold).join("\r\n");
  }
  function downloadICS() {
    try { const blob = new Blob([buildICS()], { type: "text/calendar;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mi-viaje-espontaneos.ics"; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    let s = null; try { s = localStorage.getItem("esp_theme"); } catch (e) {}
    if (s) document.documentElement.setAttribute("data-theme", s);
    paintThemeIcon();
  }
  function effTheme() { const a = document.documentElement.getAttribute("data-theme"); return a || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
  function paintThemeIcon() {
    const b = $("#c-theme"); if (!b) return;
    b.innerHTML = effTheme() === "dark"
      ? "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='5'/><path d='M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'/></svg>"
      : "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/></svg>";
  }

  /* ---------- Dates ---------- */
  // Fechas tolerantes: acepta "8:00", "08:00", "8:00 am" y fechas AAAA-MM-DD
  function itemDate(it) {
    const d = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(it.date || "")); if (!d) return new Date(NaN);
    const m = /(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?/i.exec(String(it.time || "0:00")) || [];
    let h = +(m[1] || 0); const mi = +(m[2] || 0); if (m[3] && /p/i.test(m[3]) && h < 12) h += 12; if (m[3] && /a/i.test(m[3]) && h === 12) h = 0;
    return new Date(+d[1], +d[2] - 1, +d[3], h, mi, 0);
  }
  function fmtDay(it) {
    const d = itemDate(it); const now = new Date();
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
    if (sameDay(d, now)) return U().today;
    if (sameDay(d, tmr)) return U().tomorrow;
    try { return d.toLocaleDateString(lang === "en" ? "en-GB" : lang, { weekday: "short", day: "numeric", month: "short" }); } catch (e) { return it.date; }
  }
  function nextIndex() {
    if (!booking || !booking.itinerary) return -1;
    const now = new Date();
    for (let i = 0; i < booking.itinerary.length; i++) { if (itemDate(booking.itinerary[i]) >= now) return i; }
    return -1;
  }

  /* ---------- Render ---------- */
  function renderHeader() {
    // Idiomas con bandera (como en el sitio) y «Volver a la web» en el idioma elegido
    $("#c-langs").innerHTML = LANGS.map(l => `<button class="c-lang${l.code === lang ? " active" : ""}" data-l="${l.code}" title="${l.name}" aria-pressed="${l.code === lang}"><i class="flag-i flag-i--${l.code}" aria-hidden="true"></i><span class="sr-only">${l.name}</span></button>`).join("");
    const back = $("#c-back");
    if (back) { back.href = lang === "es" ? "/" : "/" + lang + "/"; back.setAttribute("aria-label", U().back_site || "Volver a la web"); $("#c-back-txt").textContent = U().back_site || "Volver a la web"; }
    $("#c-brand-sub").textContent = U().brand;
    $$(".c-lang", $("#c-langs")).forEach(b => b.addEventListener("click", () => { lang = b.getAttribute("data-l"); renderAll(); }));
  }
  function renderBooking() {
    const g = booking.guide || {}; const h = booking.hotel || {};
    const gl = (g.langs || []).map(c => (LANGS.find(x => x.code === c) || {}).name || c).join(" · ");
    $("#c-welcome").innerHTML = `
      <div class="c-hello">${esc(U().brand)}</div>
      <h1>${esc(booking.name)} 👋</h1>
      <p class="c-region">📍 ${esc(booking.region || "")}</p>
      ${/pendiente|pending/i.test(booking.status || "") && P().pending ? `<p class="c-pending">${esc(P().pending)}</p>` : ""}
      <div class="c-chips-info">
        <span class="c-pill">${esc(U().status)}: <b>${esc(booking.code)}</b></span>
        <span class="c-pill">${esc(U().party)}: <b>${esc(booking.party || 1)}</b></span>
        <span class="c-pill">${esc(U().guide)}: <b>${esc(g.name || "—")}</b> ${gl ? "· " + esc(gl) : ""}</span>
        <span class="c-pill">${esc(U().hotel)}: <b>${esc(h.name || "—")}</b></span>
      </div>`;

    renderReview();

    // next stop
    const ni = nextIndex();
    const nextWrap = $("#c-next");
    if (ni >= 0) {
      const it = booking.itinerary[ni];
      nextWrap.style.display = "";
      nextWrap.innerHTML = `
        <span class="c-next__label">⏭️ ${esc(U().next_stop)}</span>
        <div class="c-next__row">
          <div><b>${stepTitle(it)}</b><span>${esc(fmtDay(it))} · ${esc(it.time || "")}</span></div>
          ${it.maps ? `<a class="c-mini" href="${esc(it.maps)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></a>` : ""}
        </div>${nextTips(it)}`;
    } else { nextWrap.style.display = "none"; }

    // itinerary
    $("#c-itin-title").textContent = U().itinerary;
    // Con pocas paradas, «Qué incluye» abierto: el cliente y el equipo ven todo sin tocar nada
    const extras = tripExtras(), openMore = booking.itinerary.length + extras.length <= 3;
    $("#c-itin").innerHTML = booking.itinerary.map((it, i) => `
      <li class="c-step${i === ni ? " now" : ""}">
        <span class="c-step__time">${esc(it.time || "")}<small>${esc(fmtDay(it))}</small></span>
        <span class="c-step__dot"></span>
        <span class="c-step__body">
          <b>${stepTitle(it)}</b>${stepFacts(it)}${stepMore(it.tourId, openMore)}
          ${it.maps ? `<a href="${esc(it.maps)}" target="_blank" rel="noopener" class="c-step__map">${esc(U().maps_btn)} →</a>` : ""}
        </span>
      </li>`).join("") + extras.map(id => `
      <li class="c-step c-step--extra">
        <span class="c-step__time">—<small>${esc(RQ().extra)}</small></span>
        <span class="c-step__dot"></span>
        <span class="c-step__body"><b>${stepTitle({ tourId: id })}</b>${stepFacts({ tourId: id })}${stepMore(id, openMore)}</span>
      </li>`).join("");
    const calBtn = $("#c-cal"); if (calBtn) { const cl = $("#c-cal-label"); if (cl) cl.textContent = CAL_LABEL[lang] || CAL_LABEL.es; calBtn.onclick = downloadICS; }
    renderRequest();
    renderPack();
    renderRoute();

    // actions (sticky)
    const host = booking.host || {}; const drv = booking.driver || {};
    $("#c-actions").innerHTML = `
      <a class="btn btn--wa btn--sm" href="${waHost(U().wa_generic)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z"/></svg>
        ${esc(U().wa_host)}</a>
      ${host.phone ? `<a class="btn btn--ghost btn--sm" href="tel:+${esc(host.phone.replace(/\D/g,''))}">${esc(U().call_host)}</a>` : ""}
      ${HAS_PLANS && EspoPlans.safePayLink(booking.payLink) ? `<a class="btn btn--primary btn--sm" href="${esc(EspoPlans.safePayLink(booking.payLink))}" target="_blank" rel="noopener">${esc(P().pay_deposit)}</a>` : ""}`;
  }

  /* ---------- Chat ---------- */
  function addMsg(html, who) { const m = el("div", "espo-msg " + who); m.innerHTML = html; $("#c-chat").appendChild(m); scroll(); return m; }
  function scroll() { const c = $("#c-chat"); c.scrollTop = c.scrollHeight; }
  function typing() { const t = el("div", "espo-typing", "<span></span><span></span><span></span>"); $("#c-chat").appendChild(t); scroll(); return t; }
  function botSay(list) {
    return new Promise(res => {
      busy = true; $("#c-chips").innerHTML = ""; const arr = Array.isArray(list) ? list.slice() : [list];
      const next = () => { if (!arr.length) { busy = false; res(); return; } const t = typing(); const msg = arr.shift(); setTimeout(() => { t.remove(); addMsg(bold(fill(msg)), "bot"); setTimeout(next, 150); }, 380 + Math.min(500, msg.length * 6)); };
      next();
    });
  }
  function chips(list) {
    const wrap = $("#c-chips"); wrap.innerHTML = "";
    list.forEach(c => {
      const b = el("button", "espo-chip" + (c.kind ? " espo-chip--" + c.kind : ""));
      b.innerHTML = (c.kind === "wa" ? "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z'/></svg>" : "") + "<span>" + esc(c.label) + "</span>";
      b.addEventListener("click", () => onChip(c));
      wrap.appendChild(b);
    });
  }
  const PRIMARY = ["schedule", "change", "taxi", "lost", "restaurants", "money", "weather", "access", "health", "reco"];
  function menuChips(all) {
    const src = all ? CKB : CKB.filter(k => PRIMARY.indexOf(k.id) >= 0);
    const arr = src.map(k => ({ label: U()[k.menu], topic: k.id }));
    if (HAS_PLANS) arr.unshift({ label: P().m_pack, pack: true });
    if (HAS_PLANS && tripEnded()) arr.unshift({ label: P().review_btn, href: EspoPlans.reviewUrl() });
    if (!all) arr.push({ label: U().more_topics || "➕", more: true });
    return arr;
  }
  function startChat() {
    $("#c-chat").innerHTML = "";
    botSay([U().greet, U().menu_prompt]).then(() => chips(menuChips()));
  }
  function onChip(c) {
    if (busy) return;
    pendingText = null;
    if (c.fn) { addMsg("<span>" + esc(c.label) + "</span>", "user"); c.fn(); return; }
    if (c.more) { chips(menuChips(true)); return; }
    if (c.pack) { addMsg("<span>" + esc(c.label) + "</span>", "user"); packChat(); return; }
    if (c.share) { window.open("https://wa.me/?text=" + encodeURIComponent(c.share), "_blank", "noopener"); backMenu(); return; }
    if (c.topic) {
      addMsg("<span>" + esc(U()[CKB.find(k => k.id === c.topic).menu]) + "</span>", "user");
      runTopic(c.topic);
    } else if (c.wa) { window.open(waHost(c.waMsg), "_blank", "noopener"); backMenu(); }
    else if (c.href) { window.open(c.href, "_blank", "noopener"); backMenu(); }
    else backMenu();
  }
  function backMenu() { botSay([U().more]).then(() => chips(menuChips())); }

  function allTopics() { return CKB.concat(typeof CKB_EXTRA !== "undefined" ? CKB_EXTRA : []); }
  function topicById(id) { return allTopics().find(x => x.id === id); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function matchTopic(text) {
    const t = norm(text); if (!t || typeof CKB_KW === "undefined") return null;
    let best = null, score = 0, changeScore = 0;
    Object.keys(CKB_KW).forEach(id => {
      let s = 0; (CKB_KW[id] || []).forEach(k => { const nk = norm(k); if (nk && t.indexOf(nk) >= 0) s += nk.length > 3 ? 2 : 1; });
      if (s > score) { score = s; best = id; }
      if (id === "change") changeScore = s;
    });
    // "quiero cambiar de horario": el verbo manda (cambiar/mover/reprogramar) sobre "horario" o "cambio" de dinero
    if (changeScore > 0 && /\b(hora|horas|horario|horarios|time|times|heure|horaire|uhr|uhrzeit|zeit|dia|dias|day|fecha|date|jour|tag|data|ora|orario|orari|giorno|giorni)\b/.test(t)) return "change";
    return score > 0 ? best : null;
  }
  // Temas que tienen respuesta oficial en data/jenny.json: se responde con esa (misma fuente que el sitio)
  const OFFICIAL = { weather: "clima", rain: "clima", access: "accesibilidad", children: "ninos_mayores", travelers: "ninos_mayores",
    payment: "pagos", cancellation: "cancelacion", airport: "traslados" };
  const ED = () => (window.EspoData && EspoData.ready() ? EspoData : null);
  const ROUTE_T = { es: "Tu ruta y distancias", en: "Your route & distances", fr: "Votre itinéraire et les distances", de: "Ihre Route & Entfernungen", pt: "Sua rota e distâncias", it: "Il tuo percorso e le distanze" };
  const TIPS_T = { es: "Para esta experiencia", en: "For this experience", fr: "Pour cette expérience", de: "Für dieses Erlebnis", pt: "Para esta experiência", it: "Per questa esperienza" };
  // Respaldo: temas oficiales de Jenny (data/jenny.json) por palabras clave + pregunta_tipo traducido
  const OFFICIAL_KW = {
    clima: ["clima", "lluvia", "llover", "llueve", "frio", "calor", "temperatura", "weather", "rain", "cold", "meteo", "pluie", "wetter", "regen", "chuva", "tempo", "pioggia", "piove", "freddo", "caldo"],
    pagos: ["pago", "pagar", "anticipo", "saldo", "nequi", "daviplata", "tarjeta", "payment", "pay", "deposit", "paiement", "zahlung", "pagamento", "pagament", "acconto", "caparra", "carta di credito", "bonifico"],
    cancelacion: ["cancel", "reembols", "refund", "annul", "storn", "rimbors", "disdett", "disdire"],
    accesibilidad: ["accesib", "silla de ruedas", "movilidad", "invidente", "wheelchair", "accessib", "barriere", "acessib", "sedia a rotelle", "disabil", "mobilita ridotta", "non vedent"],
    ninos_mayores: ["nino", "bebe", "adulto mayor", "kid", "child", "senior", "enfant", "kinder", "crianca", "bambin", "neonat", "anzian", "figli"],
    idiomas: ["idioma", "ingles", "language", "english", "langue", "sprache", "lingua", "lingue", "inglese", "parla italiano", "in italiano"],
    traslados: ["traslado", "aeropuerto", "airport", "aeroport", "flughafen", "aeroporto", "transfer", "trasferiment", "navetta"],
    temporadas: ["temporada", "semana santa", "season", "saison", "stagion", "settimana santa", "pasqua"],
    sostenibilidad: ["sostenib", "sustainab", "durabl", "nachhaltig", "sustent"],
    empresa: ["quienes son", "empresa", "who are", "about you", "chi siete", "azienda"],
    redes: ["instagram", "facebook", "redes sociales", "social media", "social network"],
    que_llevar: ["llevar", "empacar", "maleta", "ropa", "bring", "pack", "emporter", "mitnehmen", "levar", "cosa portare", "valigia", "vestiti"]
  };
  function officialMatch(q) {
    const D = ED(); if (!D) return null;
    const n = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!]/g, "").trim();
    const t = n(q); let best = null, score = 0;
    Object.keys(OFFICIAL_KW).forEach(id => {
      const node = id === "que_llevar" ? null : D.node(id, lang);
      const kws = OFFICIAL_KW[id].concat((node && node.pregunta_tipo) || []);
      const s = kws.reduce((a, k) => { const nk = n(k); return a + (nk && t.indexOf(nk) >= 0 ? nk.length : 0); }, 0);
      if (s > score) { score = s; best = id; }
    });
    return best;
  }
  const PAY_CARD = { es: "💳 Pagar con tarjeta", en: "💳 Pay by card", fr: "💳 Payer par carte", de: "💳 Mit Karte zahlen", pt: "💳 Pagar com cartão", it: "💳 Paga con carta" };
  function officialChips(nodeId) {
    const out = [{ label: U().wa_host, kind: "wa", wa: true, waMsg: U().wa_generic }, { label: U().back }];
    const pay = nodeId === "pagos" && HAS_PLANS && EspoPlans.safePayLink(EspoPlans.cfg.payLink);
    if (pay) out.unshift({ label: PAY_CARD[lang] || PAY_CARD.es, href: pay });
    return out;
  }
  function tripTours() {
    const D = ED(); if (!D || !booking) return [];
    const seen = {};
    return (booking.itinerary || []).map(it => it.tourId && !seen[it.tourId] && (seen[it.tourId] = 1) && D.tour(it.tourId, lang)).filter(Boolean);
  }
  function tripFacts(kind) {
    const D = ED(), list = tripTours();
    if (!list.length) return false;
    const msgs = kind === "duration"
      ? [list.map(i => "• *" + i.nombre + "*: " + D.fmtDur(i.dur, lang) + " · " + D.fmtHorario(i.horario, lang)).join("\n")]
      : list.map(i => "*" + i.nombre + "*\n" + i.incluye.map(x => "✅ " + x).join("\n")).concat([D.general("no_incluye_siempre", lang)]);
    botSay(msgs).then(() => chips([{ label: U().wa_host, kind: "wa", wa: true, waMsg: U().wa_generic }, { label: U().back }]));
    return true;
  }
  function runTopic(id) {
    const k = topicById(id); if (!k) return;
    if (id === "change" && booking) { changeFlow(); return; }
    const act = k.action || "info";
    if (ED()) {
      if (id === "pack" || id === "clothing") { packChat(); return; }
      if ((id === "includes" || id === "duration") && tripFacts(id)) return;
      const node = OFFICIAL[id] && ED().node(OFFICIAL[id], lang);
      if (node && node.respuesta) { botSay([node.respuesta]).then(() => chips(officialChips(OFFICIAL[id]))); return; }
    }
    if (act === "dyn:schedule") {
      const lines = booking.itinerary.map(it => "• " + (it.time || "") + " · " + fmtDay(it) + " — " + (titleOf(it))).join("\n");
      botSay([U().itinerary + ":\n" + lines, U().more]).then(() => chips([{ label: U().m_change, topic: "change" }].concat(menuChips().filter(m => m.topic !== "schedule"))));
      return;
    }
    if (act === "dyn:guide") {
      const g = booking.guide || {}; const gl = (g.langs || []).map(c => (LANGS.find(x => x.code === c) || {}).name || c).join(", ");
      const msg = (lang === "en" ? `Your guide is *${g.name}* and speaks: ${gl}.` : lang === "fr" ? `Votre guide est *${g.name}* et parle : ${gl}.` : lang === "de" ? `Ihr Guide ist *${g.name}* und spricht: ${gl}.` : lang === "pt" ? `Seu guia é *${g.name}* e fala: ${gl}.` : lang === "it" ? `La tua guida è *${g.name}* e parla: ${gl}.` : `Tu guía es *${g.name}* y habla: ${gl}.`);
      botSay([msg]).then(() => chips([{ label: U().wa_host, kind: "wa", wa: true, waMsg: U().wa_generic }, { label: U().back, topic0: true }].map(x => x.topic0 ? { label: U().back } : x)));
      return;
    }
    // answer text
    const ans = (k.a && (k.a[lang] || k.a.es)) || "";
    const after = [];
    if (act === "wa:wa_taxi" || act === "wa:wa_lost") {
      const base = fill(U()[act.slice(3)]);
      botSay([ans]).then(() => waWithLocation(base));
      return;
    }
    if (act.startsWith("wa:")) {
      const waKey = act.slice(3);
      after.push({ label: U().wa_open, kind: "wa", wa: true, waMsg: fill(U()[waKey]) + ctxLines() });
    } else if (act.startsWith("maps:")) {
      after.push({ label: U().maps_btn, href: mapsUrl(act.slice(5)) });
    }
    after.push({ label: U().back });
    botSay([ans]).then(() => chips(after.length === 1 ? menuChips() : after.concat([])));
  }

  /* ---------- Cambiar un horario (guiado): actividad → nueva hora → vista previa → WhatsApp ----------
     El mensaje lleva todo lo que el anfitrión necesita: código, actividad, día y hora actuales, hora deseada,
     personas, hotel y el enlace del viaje. Si el viajero no escribe en español, se agrega un resumen en español. */
  const CHG = {
    es: { which: "¿Qué actividad quieres mover? 👇", other: "✍️ Otra cosa", other_ask: "Cuéntame qué quieres cambiar (actividad, día y hora) y lo preparo para tu anfitrión 👇",
      now: "*{act}* está programada para el *{day}* a las *{time}*.", window: "Horario oficial de esta experiencia: {h}",
      when: "¿A qué hora te gustaría? Elige una opción o escríbela abajo (ej. 11:00 o «domingo 10:00»).",
      official: "{t} (horario oficial)", earlier: "{t} (1 h antes)", later: "{t} (1 h después)", later2: "{t} (2 h después)",
      other_day: "📅 Otro día", type_time: "✍️ Escribir otra hora", type_ask: "Escríbeme el día y la hora que prefieres 👇",
      same_day: "mismo día", preview: "Este es el mensaje para tu anfitrión 👇", note: "El cambio queda *confirmado cuando tu anfitrión te responda*: depende del guía, del conductor y de la disponibilidad.",
      send: "📲 Enviar por WhatsApp", edit: "✏️ Elegir otra hora", sent: "¡Listo! Cuando tu anfitrión confirme, el cambio aparece en tu itinerario.",
      hi: "Hola, soy {name} (reserva {code}) 👋", title: "⏰ *Solicitud de cambio de horario*", act: "• Actividad: {v}", was: "• Programada: {v}", want: "• Nuevo horario que prefiero: {v}",
      free: "• Lo que necesito cambiar: {v}", party: "• Personas: {v}", hotel: "• Hotel: {v}", thanks: "Quedo atento/a a la confirmación. ¡Gracias!", link: "Mi viaje:" },
    en: { which: "Which activity do you want to move? 👇", other: "✍️ Something else", other_ask: "Tell me what you'd like to change (activity, day and time) and I'll prepare it for your host 👇",
      now: "*{act}* is scheduled for *{day}* at *{time}*.", window: "Official schedule for this experience: {h}",
      when: "What time would you prefer? Pick an option or type it below (e.g. 11:00 or “Sunday 10:00”).",
      official: "{t} (official time)", earlier: "{t} (1 h earlier)", later: "{t} (1 h later)", later2: "{t} (2 h later)",
      other_day: "📅 Another day", type_time: "✍️ Type another time", type_ask: "Type the day and time you prefer 👇",
      same_day: "same day", preview: "Here is the message for your host 👇", note: "The change is *confirmed once your host replies*: it depends on the guide, the driver and availability.",
      send: "📲 Send on WhatsApp", edit: "✏️ Pick another time", sent: "Done! Once your host confirms, the change will show in your itinerary.",
      hi: "Hi, I'm {name} (booking {code}) 👋", title: "⏰ *Schedule change request*", act: "• Activity: {v}", was: "• Scheduled: {v}", want: "• New time I'd prefer: {v}",
      free: "• What I need to change: {v}", party: "• Travellers: {v}", hotel: "• Hotel: {v}", thanks: "Looking forward to your confirmation. Thank you!", link: "My trip:" },
    fr: { which: "Quelle activité voulez-vous déplacer ? 👇", other: "✍️ Autre chose", other_ask: "Dites-moi ce que vous voulez changer (activité, jour et heure) et je le prépare pour votre hôte 👇",
      now: "*{act}* est prévue le *{day}* à *{time}*.", window: "Horaire officiel de cette expérience : {h}",
      when: "À quelle heure préférez-vous ? Choisissez une option ou écrivez-la ci-dessous (ex. 11:00 ou « dimanche 10:00 »).",
      official: "{t} (horaire officiel)", earlier: "{t} (1 h plus tôt)", later: "{t} (1 h plus tard)", later2: "{t} (2 h plus tard)",
      other_day: "📅 Un autre jour", type_time: "✍️ Écrire une autre heure", type_ask: "Écrivez le jour et l'heure souhaités 👇",
      same_day: "même jour", preview: "Voici le message pour votre hôte 👇", note: "Le changement est *confirmé quand votre hôte répond* : il dépend du guide, du chauffeur et des disponibilités.",
      send: "📲 Envoyer sur WhatsApp", edit: "✏️ Choisir une autre heure", sent: "C'est fait ! Dès que votre hôte confirme, le changement apparaît dans votre itinéraire.",
      hi: "Bonjour, je suis {name} (réservation {code}) 👋", title: "⏰ *Demande de changement d'horaire*", act: "• Activité : {v}", was: "• Prévue : {v}", want: "• Nouvel horaire souhaité : {v}",
      free: "• Ce que je dois changer : {v}", party: "• Voyageurs : {v}", hotel: "• Hôtel : {v}", thanks: "Dans l'attente de votre confirmation. Merci !", link: "Mon voyage :" },
    de: { which: "Welche Aktivität möchten Sie verschieben? 👇", other: "✍️ Etwas anderes", other_ask: "Schreiben Sie, was Sie ändern möchten (Aktivität, Tag und Uhrzeit), und ich bereite es für Ihren Gastgeber vor 👇",
      now: "*{act}* ist für *{day}* um *{time}* geplant.", window: "Offizielle Zeit dieses Erlebnisses: {h}",
      when: "Welche Uhrzeit wäre Ihnen lieber? Wählen Sie eine Option oder schreiben Sie sie unten (z. B. 11:00 oder „Sonntag 10:00“).",
      official: "{t} (offizielle Zeit)", earlier: "{t} (1 Std. früher)", later: "{t} (1 Std. später)", later2: "{t} (2 Std. später)",
      other_day: "📅 Anderer Tag", type_time: "✍️ Andere Uhrzeit schreiben", type_ask: "Schreiben Sie den gewünschten Tag und die Uhrzeit 👇",
      same_day: "gleicher Tag", preview: "Das ist die Nachricht an Ihren Gastgeber 👇", note: "Die Änderung ist *bestätigt, sobald Ihr Gastgeber antwortet*: Sie hängt von Guide, Fahrer und Verfügbarkeit ab.",
      send: "📲 Per WhatsApp senden", edit: "✏️ Andere Uhrzeit wählen", sent: "Erledigt! Sobald Ihr Gastgeber bestätigt, erscheint die Änderung in Ihrem Reiseplan.",
      hi: "Hallo, ich bin {name} (Buchung {code}) 👋", title: "⏰ *Anfrage zur Zeitänderung*", act: "• Aktivität: {v}", was: "• Geplant: {v}", want: "• Gewünschte neue Zeit: {v}",
      free: "• Was ich ändern möchte: {v}", party: "• Reisende: {v}", hotel: "• Hotel: {v}", thanks: "Ich freue mich auf Ihre Bestätigung. Vielen Dank!", link: "Meine Reise:" },
    pt: { which: "Qual atividade você quer mudar? 👇", other: "✍️ Outra coisa", other_ask: "Conte o que quer mudar (atividade, dia e horário) e eu preparo para o seu anfitrião 👇",
      now: "*{act}* está marcada para *{day}* às *{time}*.", window: "Horário oficial desta experiência: {h}",
      when: "Que horário você prefere? Escolha uma opção ou escreva abaixo (ex. 11:00 ou «domingo 10:00»).",
      official: "{t} (horário oficial)", earlier: "{t} (1 h antes)", later: "{t} (1 h depois)", later2: "{t} (2 h depois)",
      other_day: "📅 Outro dia", type_time: "✍️ Escrever outro horário", type_ask: "Escreva o dia e o horário que prefere 👇",
      same_day: "mesmo dia", preview: "Esta é a mensagem para o seu anfitrião 👇", note: "A mudança fica *confirmada quando seu anfitrião responder*: depende do guia, do motorista e da disponibilidade.",
      send: "📲 Enviar pelo WhatsApp", edit: "✏️ Escolher outro horário", sent: "Pronto! Quando seu anfitrião confirmar, a mudança aparece no seu roteiro.",
      hi: "Olá, sou {name} (reserva {code}) 👋", title: "⏰ *Pedido de mudança de horário*", act: "• Atividade: {v}", was: "• Marcada: {v}", want: "• Novo horário que prefiro: {v}",
      free: "• O que preciso mudar: {v}", party: "• Viajantes: {v}", hotel: "• Hotel: {v}", thanks: "Aguardo a confirmação. Obrigado(a)!", link: "Minha viagem:" },
    it: { which: "Quale attività vuoi spostare? 👇", other: "✍️ Altro", other_ask: "Dimmi cosa vuoi cambiare (attività, giorno e ora) e lo preparo per il tuo host 👇",
      now: "*{act}* è in programma *{day}* alle *{time}*.", window: "Orario ufficiale di questa esperienza: {h}",
      when: "A che ora preferiresti? Scegli un'opzione o scrivila qui sotto (es. 11:00 o «domenica 10:00»).",
      official: "{t} (orario ufficiale)", earlier: "{t} (1 h prima)", later: "{t} (1 h dopo)", later2: "{t} (2 h dopo)",
      other_day: "📅 Un altro giorno", type_time: "✍️ Scrivi un altro orario", type_ask: "Scrivimi il giorno e l'ora che preferisci 👇",
      same_day: "stesso giorno", preview: "Ecco il messaggio per il tuo host 👇", note: "Il cambio è *confermato quando il tuo host ti risponde*: dipende dalla guida, dall'autista e dalla disponibilità.",
      send: "📲 Invia su WhatsApp", edit: "✏️ Scegli un altro orario", sent: "Fatto! Quando il tuo host conferma, il cambio compare nel tuo itinerario.",
      hi: "Ciao, sono {name} (prenotazione {code}) 👋", title: "⏰ *Richiesta di cambio orario*", act: "• Attività: {v}", was: "• In programma: {v}", want: "• Nuovo orario che preferisco: {v}",
      free: "• Cosa devo cambiare: {v}", party: "• Persone: {v}", hotel: "• Hotel: {v}", thanks: "Resto in attesa della conferma. Grazie!", link: "Il mio viaggio:" }
  };
  const C = () => CHG[lang] || CHG.es;
  const CTX = {
    es: { hotel: "🏨 Mi hotel: {v}", next: "🗓️ Próxima actividad: {v}", here: "📍 Estoy aquí: {v}", share: "📍 (Te comparto mi ubicación por aquí)",
      loc_btn: "📍 Enviar con mi ubicación", no_loc: "📲 Enviar sin ubicación", loc_wait: "Buscando tu ubicación… (acepta el permiso del navegador)",
      loc_ok: "Ubicación lista ✅ Toca para enviarla a tu anfitrión.", loc_fail: "No pude obtener tu ubicación. Envía el mensaje y compártela en WhatsApp (📎 → Ubicación).", send: "📲 Enviar por WhatsApp" },
    en: { hotel: "🏨 My hotel: {v}", next: "🗓️ Next activity: {v}", here: "📍 I'm here: {v}", share: "📍 (I'll share my location here)",
      loc_btn: "📍 Send with my location", no_loc: "📲 Send without location", loc_wait: "Getting your location… (please allow location access in your browser)",
      loc_ok: "Location ready ✅ Tap to send it to your host.", loc_fail: "I couldn't get your location. Send the message and share it on WhatsApp (📎 → Location).", send: "📲 Send on WhatsApp" },
    fr: { hotel: "🏨 Mon hôtel : {v}", next: "🗓️ Prochaine activité : {v}", here: "📍 Je suis ici : {v}", share: "📍 (Je partage ma position ici)",
      loc_btn: "📍 Envoyer avec ma position", no_loc: "📲 Envoyer sans position", loc_wait: "Recherche de votre position… (acceptez la demande d'autorisation du navigateur)",
      loc_ok: "Position prête ✅ Touchez pour l'envoyer à votre hôte.", loc_fail: "Impossible d'obtenir votre position. Envoyez le message et partagez-la sur WhatsApp (📎 → Localisation).", send: "📲 Envoyer sur WhatsApp" },
    de: { hotel: "🏨 Mein Hotel: {v}", next: "🗓️ Nächste Aktivität: {v}", here: "📍 Ich bin hier: {v}", share: "📍 (Ich teile hier meinen Standort)",
      loc_btn: "📍 Mit meinem Standort senden", no_loc: "📲 Ohne Standort senden", loc_wait: "Standort wird ermittelt… (bitte im Browser erlauben)",
      loc_ok: "Standort bereit ✅ Tippen Sie, um ihn Ihrem Gastgeber zu senden.", loc_fail: "Standort nicht verfügbar. Senden Sie die Nachricht und teilen Sie ihn in WhatsApp (📎 → Standort).", send: "📲 Per WhatsApp senden" },
    pt: { hotel: "🏨 Meu hotel: {v}", next: "🗓️ Próxima atividade: {v}", here: "📍 Estou aqui: {v}", share: "📍 (Compartilho minha localização por aqui)",
      loc_btn: "📍 Enviar com minha localização", no_loc: "📲 Enviar sem localização", loc_wait: "Buscando sua localização… (aceite a permissão do navegador)",
      loc_ok: "Localização pronta ✅ Toque para enviar ao seu anfitrião.", loc_fail: "Não consegui obter sua localização. Envie a mensagem e compartilhe no WhatsApp (📎 → Localização).", send: "📲 Enviar pelo WhatsApp" },
    it: { hotel: "🏨 Il mio hotel: {v}", next: "🗓️ Prossima attività: {v}", here: "📍 Sono qui: {v}", share: "📍 (Ti invio la mia posizione qui)",
      loc_btn: "📍 Invia con la mia posizione", no_loc: "📲 Invia senza posizione", loc_wait: "Sto cercando la tua posizione… (accetta il permesso del browser)",
      loc_ok: "Posizione pronta ✅ Tocca per inviarla al tuo host.", loc_fail: "Non sono riuscita a ottenere la tua posizione. Invia il messaggio e condividila su WhatsApp (📎 → Posizione).", send: "📲 Invia su WhatsApp" }
  };
  const X = () => CTX[lang] || CTX.es;
  // Líneas de contexto: hotel, próxima actividad y enlace del viaje (para que el anfitrión no tenga que preguntar)
  function ctxLines(loc) {
    const L = [], h = (booking && booking.hotel) || {}, i = nextIndex(), it = i >= 0 ? booking.itinerary[i] : null;
    if (loc !== undefined) L.push(loc ? sub(X().here, { v: loc }) : X().share);
    if (h.name) L.push(sub(X().hotel, { v: h.name + (h.area ? " (" + h.area + ")" : "") }));
    if (it) L.push(sub(X().next, { v: titleOf(it) + " · " + fmtDay(it) + " " + (it.time || "") }));
    L.push(C().link + " " + tripLink());
    return "\n" + L.join("\n");
  }
  function getLocation() {
    return new Promise(res => {
      if (!navigator.geolocation) { res(""); return; }
      let done = false; const fin = v => { if (!done) { done = true; res(v); } };
      setTimeout(() => fin(""), 10000);
      try {
        navigator.geolocation.getCurrentPosition(
          pos => fin("https://maps.google.com/?q=" + pos.coords.latitude.toFixed(5) + "," + pos.coords.longitude.toFixed(5)),
          () => fin(""), { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
      } catch (e) { fin(""); }
    });
  }
  // Taxi / perdido: primero la ubicación (opcional), luego el botón de WhatsApp (toque del usuario: no lo bloquea el navegador)
  function waWithLocation(base) {
    chips([
      { label: X().loc_btn, fn: () => botSay([X().loc_wait]).then(() => getLocation()).then(loc => {
        const msg = base + ctxLines(loc);
        botSay([loc ? X().loc_ok : X().loc_fail]).then(() => chips([{ label: X().send, kind: "wa", wa: true, waMsg: msg }, { label: U().back }]));
      }) },
      { label: X().no_loc, kind: "wa", wa: true, waMsg: base + ctxLines("") },
      { label: U().back }
    ]);
  }
  let pendingText = null;   // si no es null, lo próximo que escriba el viajero responde a esta pregunta
  const sub = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  const pad = n => String(n).padStart(2, "0");
  function hm(t) { const m = /(\d{1,2}):(\d{2})/.exec(String(t || "")); return m ? +m[1] * 60 + +m[2] : null; }
  function fmtHM(min) { return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }
  function longDay(it) {
    const d = itemDate(it);
    if (isNaN(d)) return it.date || "";
    try { return d.toLocaleDateString(lang === "en" ? "en-GB" : lang, { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return it.date; }
  }
  function tripLink() {
    const code = getParam("code");
    return code ? location.origin + location.pathname + "?code=" + encodeURIComponent(code) : location.href;
  }
  // Opciones de hora: respetan el horario oficial de la experiencia si existe (fijo / ventana / desde)
  function timeOptions(it) {
    const cur = hm(it.time), h = (ED() && it.tourId && (ED().tour(it.tourId, lang) || {}).horario) || null;
    const out = [], add = (min, key) => { if (min == null || min < 300 || min > 21 * 60 || min === cur || out.some(o => o.t === fmtHM(min))) return; out.push({ t: fmtHM(min), key }); };
    if (h && h.tipo === "fijo" && h.horas) h.horas.forEach(x => add(hm(x), "official"));
    else if (h && h.tipo === "ventana") { for (let m = hm(h.desde); m != null && m <= hm(h.hasta) && out.length < 4; m += 30) add(m, "official"); }
    else if (h && h.tipo === "desde") { const b = hm(h.hora); add(b, "official"); add(b + 60, "official"); add(b + 120, "official"); }
    else if (cur != null) { add(cur - 60, "earlier"); add(cur + 60, "later"); add(cur + 120, "later2"); }
    return out.slice(0, 4);
  }
  function changeFlow() {
    pendingText = null;
    const now = new Date(), list = (booking.itinerary || []).map((it, i) => ({ it, i })).filter(x => !(itemDate(x.it) < now));
    const stops = (list.length ? list : (booking.itinerary || []).map((it, i) => ({ it, i }))).slice(0, 8);
    botSay([C().which]).then(() => chips(stops.map(x => ({ label: fmtDay(x.it) + " · " + (x.it.time || "") + " — " + titleOf(x.it), fn: () => changeWhen(x.it) }))
      .concat([{ label: C().other, fn: changeOther }, { label: U().back }])));
  }
  function changeWhen(it) {
    const D = ED(), tour = D && it.tourId ? D.tour(it.tourId, lang) : null;
    const msgs = [sub(C().now, { act: titleOf(it), day: longDay(it), time: it.time || "—" })];
    if (tour && tour.horario) msgs.push(sub(C().window, { h: D.fmtHorario(tour.horario, lang) }));
    msgs.push(C().when);
    const pick = (v) => changePreview(it, v);
    pendingText = (q) => pick(q);
    botSay(msgs).then(() => chips(timeOptions(it).map(o => ({ label: sub(C()[o.key], { t: o.t }), fn: () => pick(o.t + " (" + C().same_day + ")") }))
      .concat([{ label: C().other_day, fn: () => askText(C().type_ask, pick) }, { label: C().type_time, fn: () => askText(C().type_ask, pick) }, { label: U().back }])));
  }
  function changeOther() { askText(C().other_ask, (q) => changePreview(null, q)); }
  function askText(prompt, cb) {
    pendingText = cb;
    botSay([prompt]).then(() => { chips([{ label: U().back }]); const inp = $("#c-ask-in"); if (inp) inp.focus(); });
  }
  function changeMessage(it, want) {
    const c = C(), b = booking, h = b.hotel || {};
    const L = [sub(c.hi, { name: b.name || "", code: b.code || "" }), "", c.title];
    if (it) { L.push(sub(c.act, { v: titleOf(it) }), sub(c.was, { v: longDay(it) + ", " + (it.time || "") }), sub(c.want, { v: want })); }
    else L.push(sub(c.free, { v: want }));
    if (b.party) L.push(sub(c.party, { v: b.party }));
    if (h.name) L.push(sub(c.hotel, { v: h.name + (h.area ? " (" + h.area + ")" : "") }));
    L.push("", c.thanks);
    if (lang !== "es") {   // resumen en español para el equipo
      L.push("", "🇪🇸 Cambio de horario · " + (b.code || "") + (it ? " · " + (typeof it.title === "object" ? it.title.es || titleOf(it) : titleOf(it)) + " · " + (it.date || "") + " " + (it.time || "") + " → " + want.replace(C().same_day, CHG.es.same_day) : " · " + want));
    }
    L.push("", c.link + " " + tripLink());
    return L.join("\n");
  }
  function changePreview(it, want) {
    pendingText = null;
    want = String(want || "").trim().slice(0, 120);
    const msg = changeMessage(it, want);
    botSay([C().preview, msg, C().note]).then(() => chips([
      { label: C().send, kind: "wa", fn: () => { window.open(waHost(msg), "_blank", "noopener"); botSay([C().sent]).then(() => chips(menuChips())); } },
      ...(it ? [{ label: C().edit, fn: () => changeWhen(it) }] : []),
      { label: U().back }
    ]));
  }

  /* ---------- Qué llevar (clima + pronóstico por parada) ---------- */
  let packToken = 0;
  function packPlain(pack) {
    return P().pack_title + "\n" + pack.items.map(x => (x.i ? x.i + " " : "") + x.label).join("\n") +
      (pack.tips.length ? "\n\n" + P().pack_tips + "\n" + pack.tips.map(x => "• " + x).join("\n") : "");
  }
  function renderPack() {
    const box = $("#c-pack"); if (!box) return;
    if (!HAS_PLANS) { box.style.display = "none"; return; }
    const my = ++packToken;
    EspoPlans.packFor(booking.itinerary || [], lang).then(pack => {
      if (my !== packToken) return; // language changed meanwhile
      if (!pack.items.length) { box.style.display = "none"; return; }
      const days = pack.days.map(d => `
        <li><b>${esc(fill(d.title))}</b><span>${d.date ? esc(fmtDay({ date: d.date })) + " · " : ""}${esc(d.fc ? EspoPlans.fcText(d.fc) : d.climate)}</span></li>`).join("");
      const noFc = pack.days.some(d => !d.fc);
      box.style.display = "";
      box.innerHTML = `
        <div class="c-itin-head"><h2 class="c-card__title">${esc(P().pack_title)}</h2>
          <button class="c-cal-btn" type="button" id="c-pack-share">${esc(P().share)}</button></div>
        <ul class="c-pack__days">${days}</ul>
        ${noFc ? `<p class="c-pack__note">${esc(P().fc_na)}</p>` : ""}
        <ul class="c-pack__items">${pack.items.map(x => `<li>${x.i ? x.i + " " : ""}${esc(x.label)}</li>`).join("")}</ul>
        ${pack.tips.length ? `<div class="c-pack__tips"><b>${esc(P().pack_tips)}</b>${pack.tips.map(x => `<p>${esc(x)}</p>`).join("")}</div>` : ""}`;
      $("#c-pack-share").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(packPlain(pack)), "_blank", "noopener");
    });
  }
  function packChat() {
    busy = true; $("#c-chips").innerHTML = "";
    EspoPlans.packFor(booking.itinerary || [], lang).then(pack => {
      busy = false;
      if (!pack.items.length) { backMenu(); return; }
      const fc = pack.days.filter(d => d.fc).map(d => "• " + fill(d.title) + ": " + EspoPlans.fcText(d.fc)).join("\n");
      const msgs = ["*" + P().pack_title + "*\n" + pack.items.map(x => (x.i ? x.i + " " : "") + x.label).join("\n")];
      if (pack.tips.length) msgs.push("*" + P().pack_tips + "*\n" + pack.tips.map(x => "• " + x).join("\n"));
      if (fc) msgs.push("*" + P().fc_title + "*\n" + fc);
      botSay(msgs).then(() => chips([{ label: P().share, share: packPlain(pack) }, { label: U().back }]));
    });
  }
  function scanFromGate() {
    const t = P();
    EspoQR.scan({ title: t.scan_title, hint: t.scan_hint, file: t.scan_file, nocam: t.scan_nocam, bad: t.scan_bad }).then(text => {
      if (!text) return;
      const r = EspoPlans.parseQR(text);
      if (!r) { showGate(t.scan_bad); return; }
      if (r.type === "trip") location.search = "?" + r.query;
      else if (r.type === "code") location.search = "?code=" + encodeURIComponent(r.code);
      else location.href = "/?" + (r.type === "plan" ? "plan=" : "tour=") + encodeURIComponent(r.id) + (r.src ? "&src=" + encodeURIComponent(r.src) : "");
    });
  }

  /* ---------- Datos oficiales por parada (duración, recomendaciones) ---------- */
  const okId = id => /^[a-z0-9]{2,40}$/.test(String(id || ""));
  // Página propia de la experiencia en el idioma de la página (dirección legible: js/pages-map.js); sin ella, la ficha en el inicio
  function tourHref(id) {
    const P = window.ESPO_PAGES, s = P && P.slugs[id], l = s && s[lang] ? lang : "es";
    return s && s[l] ? "/" + P.dir[l] + "/" + s[l] + ".html" : (lang === "es" ? "/" : "/" + lang + "/") + "#tour-" + id;
  }
  // Nombre de la parada; si es una experiencia del catálogo, enlaza a su página (pestaña nueva: el itinerario queda abierto)
  function stepTitle(it) {
    const D = ED(), i = D && okId(it.tourId) && D.tour(it.tourId, lang);
    const t = esc(fill(titleOf(it)) || (i && i.nombre) || "");
    return i ? `<a class="c-tour-link" href="${esc(tourHref(it.tourId))}" target="_blank" rel="noopener">${t}<span aria-hidden="true"> ↗</span></a>` : t;
  }
  // Qué incluye, qué no y el punto de encuentro (datos oficiales de la experiencia)
  function stepMore(id, open) {
    const D = ED(), i = D && okId(id) && D.tour(id, lang); if (!i) return "";
    const inc = i.incluye || [], no = i.no_incluye || [], R = RQ();
    if (!inc.length && !no.length && !i.horario_nota) return "";
    return `<details class="c-step__more"${open ? " open" : ""}><summary>${esc(R.incl)}</summary>
      ${inc.length ? `<ul>${inc.map(x => `<li>✓ ${esc(x)}</li>`).join("")}</ul>` : ""}
      ${no.length ? `<p><strong>${esc(R.noincl)}:</strong> ${no.map(esc).join(" · ")}</p>` : ""}${i.horario_nota ? `<p>📍 ${esc(i.horario_nota)}</p>` : ""}</details>`;
  }
  // Experiencias que el cliente sumó sin fecha (combo): van al final del itinerario «por programar»
  function tripExtras() {
    const D = ED(), seen = {};
    (booking.itinerary || []).forEach(it => { if (it.tourId) seen[it.tourId] = 1; });      // las que ya tienen fecha no se repiten
    return (Array.isArray(booking.extras) ? booking.extras : []).filter(id => okId(id) && !seen[id] && (seen[id] = 1) && D && D.tour(id, lang)).slice(0, 6);
  }
  /* ---------- Tu solicitud: todo lo que el cliente eligió en el sitio ---------- */
  const RQ_T = {
    es: { t: "📋 Tu solicitud", plan: "🗺️ Itinerario", start: "📅 Inicio", guide: "🧭 Idioma del guía", contact: "💬 Idioma de contacto", access: "♿ Turismo accesible", diet: "🍽️ Alimentación", notes: "📝 Notas", kit: "🎒 Ayuda con lo que te falte", deal: "🎁 Beneficio por convenio", hotel: "🏨 Convenio con tu hotel", code: "🔑 Código", photos: "📸 Uso de fotos donde apareces", yes: "Sí", ok: "Autorizado", no: "No autorizado", tbc: "por confirmar", until: "válido hasta", incl: "Qué incluye", noincl: "No incluye", extra: "Por programar" },
    en: { t: "📋 Your request", plan: "🗺️ Itinerary", start: "📅 Start", guide: "🧭 Guide language", contact: "💬 Contact language", access: "♿ Accessible tourism", diet: "🍽️ Diet", notes: "📝 Notes", kit: "🎒 Help with anything you're missing", deal: "🎁 Partner benefit", hotel: "🏨 Agreement with your hotel", code: "🔑 Code", photos: "📸 Use of photos showing you", yes: "Yes", ok: "Authorised", no: "Not authorised", tbc: "to be confirmed", until: "valid until", incl: "What's included", noincl: "Not included", extra: "To be scheduled" },
    fr: { t: "📋 Votre demande", plan: "🗺️ Itinéraire", start: "📅 Début", guide: "🧭 Langue du guide", contact: "💬 Langue de contact", access: "♿ Tourisme accessible", diet: "🍽️ Alimentation", notes: "📝 Notes", kit: "🎒 Aide pour ce qui vous manque", deal: "🎁 Avantage partenaire", hotel: "🏨 Accord avec votre hôtel", code: "🔑 Code", photos: "📸 Utilisation des photos où vous apparaissez", yes: "Oui", ok: "Autorisée", no: "Non autorisée", tbc: "à confirmer", until: "valable jusqu'au", incl: "Ce qui est inclus", noincl: "Non inclus", extra: "À programmer" },
    de: { t: "📋 Ihre Anfrage", plan: "🗺️ Reiseplan", start: "📅 Beginn", guide: "🧭 Sprache des Guides", contact: "💬 Kontaktsprache", access: "♿ Barrierefreier Tourismus", diet: "🍽️ Ernährung", notes: "📝 Notizen", kit: "🎒 Hilfe bei fehlender Ausrüstung", deal: "🎁 Partnervorteil", hotel: "🏨 Vereinbarung mit Ihrem Hotel", code: "🔑 Code", photos: "📸 Nutzung von Fotos, auf denen Sie zu sehen sind", yes: "Ja", ok: "Erlaubt", no: "Nicht erlaubt", tbc: "noch zu bestätigen", until: "gültig bis", incl: "Inklusive", noincl: "Nicht inklusive", extra: "Noch zu planen" },
    pt: { t: "📋 Sua solicitação", plan: "🗺️ Roteiro", start: "📅 Início", guide: "🧭 Idioma do guia", contact: "💬 Idioma de contato", access: "♿ Turismo acessível", diet: "🍽️ Alimentação", notes: "📝 Observações", kit: "🎒 Ajuda com o que faltar", deal: "🎁 Benefício de convênio", hotel: "🏨 Convênio com seu hotel", code: "🔑 Código", photos: "📸 Uso de fotos em que você aparece", yes: "Sim", ok: "Autorizado", no: "Não autorizado", tbc: "a confirmar", until: "válido até", incl: "O que inclui", noincl: "Não inclui", extra: "A programar" },
    it: { t: "📋 La tua richiesta", plan: "🗺️ Itinerario", start: "📅 Inizio", guide: "🧭 Lingua della guida", contact: "💬 Lingua di contatto", access: "♿ Turismo accessibile", diet: "🍽️ Alimentazione", notes: "📝 Note", kit: "🎒 Aiuto con ciò che ti manca", deal: "🎁 Vantaggio convenzione", hotel: "🏨 Convenzione con il tuo hotel", code: "🔑 Codice", photos: "📸 Uso delle foto in cui compari", yes: "Sì", ok: "Autorizzato", no: "Non autorizzato", tbc: "da confermare", until: "valido fino al", incl: "Cosa include", noincl: "Non include", extra: "Da programmare" }
  };
  const RQ = () => RQ_T[lang] || RQ_T.es;
  const LNAME = { es: "Español", en: "English", fr: "Français", de: "Deutsch", pt: "Português", it: "Italiano" };
  const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n || 200);
  function fmtUntil(ms) {
    try { return new Date(+ms).toLocaleString(lang === "en" ? "en-GB" : lang, { timeZone: "America/Bogota", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }
  function renderRequest() {
    const box = $("#c-req"); if (!box) return;
    const R = RQ(), p = booking.prefs || {}, d = booking.deal || {}, g = booking.guide || {}, rows = [];
    const add = (k, v) => { if (v) rows.push(`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`); };
    const plan = booking.plan && HAS_PLANS ? EspoPlans.planById(booking.plan) : null;
    if (plan) add(R.plan, EspoPlans.name(plan, lang));
    const first = (booking.itinerary || [])[0];
    if (first && first.date) add(R.start, longDay(first));
    add(R.guide, (g.langs || []).map(c => LNAME[c] || clip(c, 20)).join(", "));
    if (booking._fromLink && LNAME[booking.lang]) add(R.contact, LNAME[booking.lang]);
    if (p.accessible) add(R.access, R.yes);
    add(R.diet, clip(p.diet)); add(R.notes, clip(p.notes));
    if (p.kit) add(R.kit, R.yes);
    if (d.name) add(R.deal, clip(d.name, 80) + (d.until && fmtUntil(d.until) ? " · " + R.until + " " + fmtUntil(d.until) : "") + " (" + R.tbc + ")");
    if (d.hotel) add(R.hotel, R.tbc);
    if (d.code) add(R.code, clip(d.code, 30) + " (" + R.tbc + ")");
    if (typeof p.photos === "boolean") add(R.photos, p.photos ? R.ok : R.no);
    box.style.display = rows.length ? "" : "none";
    box.innerHTML = `<h2 class="c-card__title">${esc(R.t)}</h2><dl class="c-req__list">${rows.join("")}</dl>`;
  }
  function stepFacts(it) {
    const D = ED(); const i = D && it.tourId && D.tour(it.tourId, lang);
    return i ? `<small class="c-step__facts">⏱ ${esc(D.fmtDur(i.dur, lang))} · ${esc(i.codigo)}</small>` : "";
  }
  // Recomendación oficial de la próxima experiencia si es hoy o mañana (la "víspera")
  function nextTips(it) {
    const D = ED(); const i = D && it.tourId && D.tour(it.tourId, lang);
    if (!i || !i.rec.items.length) return "";
    const days = Math.round((itemDate(it).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (days > 1) return "";
    return `<div class="c-next__tips"><b>${esc(i.rec.titulo || TIPS_T[lang] || TIPS_T.es)}</b><ul>${i.rec.items.slice(0, 5).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }
  /* ---------- Mapa del recorrido (js/maps.js) ---------- */
  function renderRoute() {
    const box = $("#c-route"); if (!box) return;
    if (!window.EspoMaps || !EspoMaps.itinerary || !(booking.itinerary || []).length) { box.style.display = "none"; return; }
    box.style.display = "";
    $("#c-route-title").textContent = ROUTE_T[lang] || ROUTE_T.es;
    const stops = booking.itinerary.map(it => ({ tourId: it.tourId || "", title: fill(titleOf(it)), date: it.date, time: it.time }));
    try { EspoMaps.itinerary($("#c-route-map"), stops, { lang, hotel: booking.hotel || null }); } catch (e) { box.style.display = "none"; }
  }

  /* ---------- After the trip: ask for a review ---------- */
  function tripEnded() {
    const it = (booking && booking.itinerary) || [];
    if (!it.length) return false;
    const last = itemDate(it[it.length - 1]);
    return !isNaN(last) && Date.now() > last.getTime() + 3 * 3600000;
  }
  function renderReview() {
    const box = $("#c-review"); if (!box) return;
    if (!HAS_PLANS || !tripEnded()) { box.style.display = "none"; return; }
    const t = P();
    box.style.display = "";
    box.innerHTML = `
      <h2 class="c-card__title">${esc(t.review_title)}</h2>
      <p class="c-review__txt">${esc(t.review_text)}</p>
      <div class="c-review__btns">
        <a class="btn btn--primary btn--sm" href="${esc(EspoPlans.reviewUrl())}" target="_blank" rel="noopener">${esc(t.review_btn)}</a>
        <a class="btn btn--ghost btn--sm" href="${esc(waHost(t.review_wa_msg))}" target="_blank" rel="noopener">${esc(t.review_wa)}</a>
      </div>`;
  }

  /* ---------- Remember the last trip (works offline / from the home screen) ---------- */
  // Se recuerda el último viaje en este dispositivo solo hasta 7 días después de la última actividad
  function lastTrip() {
    let v = null; try { v = JSON.parse(localStorage.getItem("esp_last_trip") || "null"); } catch (e) { v = null; }
    if (!v || typeof v !== "object" || !v.q || !(v.exp > Date.now())) { try { localStorage.removeItem("esp_last_trip"); } catch (e) {} return ""; }
    return /^\?(code|d)=/.test(v.q) && v.q !== location.search ? v.q : "";
  }
  function saveTrip() {
    try {
      if (!/^\?(code|d)=/.test(location.search)) return;
      const it = (booking && booking.itinerary) || [];
      const last = it.length ? itemDate(it[it.length - 1]).getTime() : Date.now();
      localStorage.setItem("esp_last_trip", JSON.stringify({ q: location.search, exp: (isNaN(last) ? Date.now() : last) + 7 * 86400000 }));
    } catch (e) {}
  }

  /* ---------- Gate (no/invalid code) ---------- */
  function showGate(msg) {
    $("#c-app").style.display = "none";
    const gate = $("#c-gate"); gate.style.display = "";
    gate.innerHTML = `
      <img src="assets/img/logo.png" alt="Espontáneos Travel" width="70" height="70">
      <h2>${esc(U().brand)}</h2>
      ${msg ? `<p class="c-err">${esc(msg)}</p>` : ""}
      <form id="c-gate-form" class="c-gate-form">
        <input type="text" id="c-code-in" placeholder="${esc(U().enter_code)}" aria-label="${esc(U().enter_code)}" value="" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24">
        <button class="btn btn--primary" type="submit">${esc(U().go)}</button>
      </form>
      ${HAS_PLANS && window.EspoQR ? `<button class="btn btn--ghost" type="button" id="c-scan">${esc(P().m_scan)}</button>` : ""}
      ${lastTrip() ? `<a class="btn btn--primary" href="viaje.html${esc(lastTrip())}">${esc(P().last_trip || "↩")}</a>` : ""}
      <a class="c-gate-wa" href="https://wa.me/573187200023" target="_blank" rel="noopener">WhatsApp +57 318 7200023</a>`;
    const scanBtn = $("#c-scan"); if (scanBtn) scanBtn.addEventListener("click", scanFromGate);
    $("#c-gate-form").addEventListener("submit", e => { e.preventDefault(); const v = $("#c-code-in").value.trim().toUpperCase(); if (v) location.search = "?code=" + encodeURIComponent(v); });
  }

  function renderAll() {
    try { localStorage.setItem("esp_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.title = (booking ? booking.name + " · " : "") + "Espontáneos Travel";
    renderHeader();
    if (!booking) { showGate(U().not_found && getParam("code") ? U().not_found : ""); return; }
    $("#c-gate").style.display = "none"; $("#c-app").style.display = "";
    saveTrip();
    $("#c-brand-sub").textContent = U().brand;
    $("#c-foot").textContent = U().foot;
    const ai = $("#c-ask-in"); if (ai && U().ask_ph) ai.placeholder = U().ask_ph;
    renderBooking();
    startChat();
  }

  /* ---------- Boot ---------- */
  function getParam(k) { return new URLSearchParams(location.search).get(k); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  // Un enlace ?d= no está firmado: cualquiera puede armarlo. Por eso el WhatsApp/teléfono solo puede ser un
  // número oficial, nunca se toma un enlace de pago de ahí y los enlaces de mapa deben ser https.
  const OFFICIAL_PHONE = () => (window.EspoPlans && EspoPlans.cfg.officialPhones[0]) || "573187200023";
  const isOfficial = (p) => (window.EspoPlans ? EspoPlans.isOfficialPhone(p) : String(p || "").replace(/\D/g, "") === "573187200023");
  const https = (u) => (window.EspoPlans ? EspoPlans.safeHttps(u) : (/^https:\/\//i.test(String(u || "")) ? String(u) : ""));
  function cleanLinks(b) {
    b.itinerary = (b.itinerary || []).map(it => Object.assign({}, it, { maps: https(it.maps) }));
    if (b.hotel) b.hotel = Object.assign({}, b.hotel, { maps: https(b.hotel.maps) });
    return b;
  }
  function fromLink(b) {
    b = cleanLinks(Object.assign({}, b));
    b.host = Object.assign({}, b.host || {}, { phone: isOfficial(b.host && b.host.phone) ? b.host.phone : OFFICIAL_PHONE() });
    if (b.driver) b.driver = Object.assign({}, b.driver, { phone: isOfficial(b.driver.phone) ? b.driver.phone : OFFICIAL_PHONE() });
    delete b.payLink;
    b._fromLink = true;
    return b;
  }
  function useBooking(b) {
    booking = cleanLinks(b);
    if (SUPPORTED.includes(booking.lang)) { try { if (!localStorage.getItem("esp_lang")) lang = booking.lang; } catch (e) { lang = booking.lang; } }
  }
  // Reservas creadas en el portal (Firestore). Si el backend no está configurado, devuelve null.
  // El viajero puede escribir el código con o sin guion, espacios o minúsculas ("esp 7q2x9", "7Q2X9").
  function cleanCode(v) { return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function findCode(list, code) {
    if (!list || !code) return "";
    if (list[code]) return code;
    const n = cleanCode(code);
    return Object.keys(list).find(k => { const kn = cleanCode(k); return kn === n || kn === "ESP" + n; }) || "";
  }
  function fromBackend(code) {
    const dataReady = window.EspoData ? EspoData.load().catch(() => null) : Promise.resolve(null);
    if (!code) { dataReady.then(renderAll); return; }
    const ask = () => window.EspoBackend.getBooking(code).catch(() => null).then(b => { if (b) useBooking(b); return dataReady; }).then(renderAll);
    if (window.EspoBackend) ask();
    else {
      let done = false;
      window.addEventListener("espo:backend", () => { if (!done) { done = true; ask(); } }, { once: true });
      setTimeout(() => { if (!done) { done = true; dataReady.then(renderAll); } }, 6000);   // sin backend: no esperar más
    }
  }
  function boot() {
    initTheme();
    if (typeof CUI_EXTRA !== "undefined") { SUPPORTED.forEach(l => { if (CUI[l] && CUI_EXTRA[l]) Object.assign(CUI[l], CUI_EXTRA[l]); }); }
    $("#c-theme").addEventListener("click", () => { const n = effTheme() === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", n); try { localStorage.setItem("esp_theme", n); } catch (e) {} paintThemeIcon(); });
    const askForm = $("#c-ask");
    if (askForm) askForm.addEventListener("submit", (e) => {
      e.preventDefault(); const inp = $("#c-ask-in"); const q = (inp.value || "").trim();
      if (!q || busy) return; inp.value = ""; addMsg("<span>" + esc(q) + "</span>", "user");
      if (pendingText) { const cb = pendingText; pendingText = null; cb(q); return; }
      const m = matchTopic(q);
      const o = m ? null : officialMatch(q);
      if (m) runTopic(m);
      else if (o === "que_llevar") packChat();
      else if (o) { const node = ED().node(o, lang); botSay([node.respuesta]).then(() => chips(officialChips(o))); }
      else botSay([U().no_match]).then(() => chips([{ label: U().wa_host, kind: "wa", wa: true, waMsg: (U().wa_q || U().wa_generic) + " " + q }, { label: U().back }]));
    });
    let storedLang = null; try { storedLang = localStorage.getItem("esp_lang"); } catch (e) {}
    if (SUPPORTED.includes(storedLang)) lang = storedLang;
    // Datos oficiales de Jenny (duraciones, recomendaciones); si no cargan, el conserje funciona igual
    const dataReady = window.EspoData ? EspoData.load().catch(() => null) : Promise.resolve(null);
    const dparam = getParam("d");
    if (dparam) { const b = decodeBooking(dparam); if (b) { booking = fromLink(b); if (!storedLang && SUPPORTED.includes(b.lang)) lang = b.lang; } dataReady.then(renderAll); return; }
    const code = (getParam("code") || "").trim().toUpperCase();
    fetch("data/bookings.json", { cache: "no-store" })
      .then(r => r.json())
      .then(db => {
        const key = findCode(db.bookings, code);
        if (key) { const b = db.bookings[key]; useBooking(window.EspoPlans && EspoPlans.demoShift ? EspoPlans.demoShift(b) : b); dataReady.then(renderAll); return; }
        fromBackend(cleanCode(code));
      })
      .catch(() => fromBackend(cleanCode(code)));
    // El mapa carga diferido: cuando esté listo, se pinta la ruta
    addEventListener("load", () => { if (booking) renderRoute(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
