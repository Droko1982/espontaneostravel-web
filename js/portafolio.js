/* ==========================================================================
   Espontáneos Travel — Portafolio B2B 2027 (pestaña «Portafolio» del portal de agencias)
   Diseño y lógica del prototipo validado por ET (kit Portafolio_B2B_2027): mapa del Eje Cafetero, experiencias,
   ficha completa, arma tu ruta, transporte, kit de venta (PDF) y condiciones.

   Datos
   · Públicos (sin tarifas ni campos «solo agencias»): /data/portafolio.json (textos para el cliente final),
     /data/mapa-eje.json (límites DANE ya proyectados), /data/portafolio.<en|fr|it|pt>.json (traducciones por validar por ET).
     Se generan con tools/build-portafolio.js.
   · Privados, de Firestore y solo con sesión (los pasa portal.js en ctx): tarifas del tipo de cliente (DMC o
     Mercado Nacional), fichas técnicas «solo agencias» (condiciones) y portafolio/{año} (fincas con suplemento,
     hoteles aliados, ubicaciones exactas, formas de pago).
   · En Marca blanca y en el PDF para el cliente final nunca salen tarifas netas, códigos ni campos «solo agencias».
   ========================================================================== */

const VIG = 2027;
let D = null, M = null; const I18 = {};         // datos públicos (se cargan una vez; cada idioma cuando se necesita)
let ROOT = null, CTX = null, ac = null;         // instancia montada
let EXP = [], byId = {}, S = null, PR = null, HOTELS = [], FINCAS = [], finById = {};
let VB = { x: 0, y: 0, w: 100, h: 100 }, svg = null, base = null, ov = null, anim = 0, slideTimers = [], toastT = 0;

/* ---------- utilidades ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const cop = n => "$ " + Math.round(n).toLocaleString("es-CO");
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };
const $r = n => ROOT.querySelector(`[data-r="${n}"]`);
const $$ = s => [...ROOT.querySelectorAll(s)];
const json = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
const ph640 = b => b + "-640.webp", ph1600 = b => b + "-1600.webp";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- textos de la interfaz (es / en) ---------- */
const UI = {
  es: {
    banner_dmc: "Portafolio PCCC Espontáneos Travel 2027 · DMCs", banner_nac: "Portafolio PCCC Espontáneos Travel 2027 · Mayoristas y Mercado Nacional",
    tar_dmc: "Tarifario DMC", tar_nac: "Tarifario Mercado Nacional y Mayoristas", tar_prev: "tarifas {0} vigentes en {1} mientras ET publica las nuevas", tar_none: "aún sin tarifas cargadas",
    two_fingers: "Usa dos dedos para mover el mapa", mode: "Vista", m_agency: "Vista agencia", m_wl: "Marca blanca", wl_on: "Marca blanca: sin logo, precios, códigos ni datos solo agencias. Puedes mostrar esta pantalla a tu cliente.",
    map_t: "El Eje Cafetero, punto por punto", map_s: "Arrastra para moverte. Toca un punto para ver la experiencia.", map_aria: "Mapa del Eje Cafetero: departamentos, capitales, aeropuertos y experiencias",
    v_region: "Región", v_eje: "Eje Cafetero", v_quindio: "Quindío", z_in: "Acercar", z_out: "Alejar", k_apt: "Aeropuerto", k_cap: "Capital", k_hot: "Hoteles aliados", k_fin: "Fincas cafeteras",
    t_mapa: "Mapa", t_exp: "Experiencias", t_ruta: "Arma tu ruta", t_trans: "Transporte", t_kit: "Kit de venta", t_cond: "Condiciones",
    welcome: "Bienvenido al portafolio", welcome_l: "Todo el Paisaje Cultural Cafetero en un mapa: {0} experiencias 2027 en ocho líneas de producto, fincas cafeteras, aeropuertos y capitales de Quindío, Risaralda, Caldas y Valle del Cauca.",
    how1: "Explora el mapa.", how1b: "Toca un punto para ver la experiencia en fotos.", how2: "Abre la ficha.", how2b: "Qué incluye, operación, idiomas y tarifa neta según tu tarifario.",
    how3: "Arma tu ruta.", how3b: "Aeropuerto, hotel y tours por día: la ruta se dibuja sola y suma traslados y tours.", how4: "Descarga el kit de venta.", how4b: "PDF en el idioma de tu cliente, con o sin logo y con tu markup.",
    go_zone: "Ir a una zona", all_eje: "Todo el Eje", layers: "Capas del mapa", shortcuts: "Atajos", sc_exp: "Ver todas las experiencias", sc_ruta: "Armar una ruta", sc_kit: "Descargar kit de venta", sc_cond: "Condiciones y quiénes somos",
    exp_h: "Experiencias", q_ph: "Buscar: aves, café, Salento…", f_ideal: "Todo perfil de viajero", f_dur: "Cualquier duración", d_short: "Corta (hasta 2,5 h)", d_half: "Medio día (3 a 6 h)", d_full: "Día completo (7 h o más)",
    f_lang: "Cualquier idioma", f_route: "Rutas sugeridas…", f_clear: "Quitar filtros", n_exp: "{0} experiencias", n_exp1: "1 experiencia", none_match: "Ninguna experiencia coincide con esos filtros.",
    b_new: "Nuevo 2027", b_own: "Experiencia ET", b_com: "Comunitario", b_cord: "Paisaje Cordillerano", from_net: "Neta desde", pax10: "10 pax", ask_rate: "Consultar tarifa", photo_soon: "Material en preparación",
    see_ficha: "Ver ficha completa", add_route: "+ A la ruta", add_route_l: "+ Agregar a la ruta", in_route: "✓ En la ruta", close: "Cerrar", added_day: "Agregado a la ruta · Día {0}",
    f_dur_l: "Duración", f_mod: "Modalidad", f_lunch: "Almuerzo", f_age: "Edad", f_group: "Grupo", f_langs: "Idiomas", f_code: "Código", ask: "Consultar", min_pax: "mín. {0} pax", max_pax: "máx. {0}", upto: "Hasta {0} pax",
    s_exp: "La experiencia", s_photos: "Fotos", s_incl: "Incluye", s_noincl: "No incluye", s_oper: "Operación y horarios", s_tech: "Ficha técnica", s_reco: "Recomendaciones", s_noapto: "No apto para",
    s_sell: "Para vender", only_ag: "Solo agencias", why: "Por qué venderla", interesa: "Te interesa saber", where: "Dónde la operamos", menu: "Menú", impact: "Impacto local", s_notes: "Notas de tarifa y operación",
    s_supl: "Suplementos", s_combo: "Combínalo con", s_rate: "Tarifa neta por pasajero", pax: "Pasajeros", per_pax: "COP por pasajero", s_kit: "Kit de venta", pdf: "Descargar PDF", copy_txt: "Copiar texto", copy_link: "Copiar enlace de la ficha",
    kit_note: "PDF para tu cliente final (sin datos internos), con o sin logo, con o sin precios y en ES, EN, FR, IT o PT.", request: "Solicitar este tour", see_zones: "Ver municipios en el mapa", zones_note: "En «Arma tu ruta» se asigna la finca del municipio más cercano al hotel.",
    kids: "Niños de 0 a 2 años no pagan, pero ocupan silla de bebé en el vehículo; desde los 3 años pagan tarifa.", see_cond: "Políticas de reserva y pago", see_about: "Quiénes somos",
    com_txt: "Experiencia con la comunidad local (campesinos, artesanos, productores).", cord_txt: "Hace parte del proyecto Paisaje Cordillerano.", carry: "Tarifa {0} · aplica en {1}", copied: "Copiado", link_copied: "Enlace copiado", txt_copied: "Texto copiado",
    p_param: "Parámetro operativo", p_b2b: "Detalle técnico B2B", p_b2c: "Especificación comercial (B2C)", p_sched: "Horario recomendado", am: "Mañana", pm: "Tarde", ampm: "Mañana o tarde", guide_sup: "otros idiomas con suplemento de guianza",
    conv_t: "Convenciones e iconografía", inst_t: "Presentación institucional", idx_t: "Índice de experiencias", idx_l: "Toca una línea para ver sus experiencias.", see_more: "Ver todo en Condiciones", how_t: "Cómo usar el portafolio",
    ic_dur: "Duración y dificultad: tiempo estimado y exigencia física (baja, media, alta).", ic_geo: "Geolocalización: con el hotel de «Arma tu ruta», cada experiencia muestra su distancia y la finca se asigna en el municipio más cercano.",
    ic_com: "Comunitario: experiencia con la comunidad local (campesinos, artesanos, productores).", ic_cord: "Paisaje Cordillerano: tours del proyecto en Calarcá, Córdoba, Pijao, Buenavista y Génova (Quindío) y Caicedonia y Sevilla (Valle).",
    ic_b2b: "Solo agencias: datos de venta y operación que no salen en Marca blanca ni en el PDF para el cliente.", ic_code: "Códigos: HD medio día (menos de 7 h) · FD día completo (7 h o más) · PT parques temáticos.",
    near: "≈ {0} km de tu hotel", near_sort: "Cercanas a mi hotel primero", near_hint: "Elige el hotel en «Arma tu ruta» y verás la distancia a cada experiencia.", p_diff: "Nivel de dificultad", p_cap: "Capacidad máxima", p_meet: "Punto de encuentro", p_guide: "Idioma de guianza",
    low: "Baja", mid: "Media", high: "Alta", pick: "Recogida en el alojamiento (zona de cobertura según condiciones)", pickC: "Su hotel", onsite: "En el lugar de la experiencia", atHotel: "En el hotel del grupo",
    capB2B: "Tarifa publicada hasta {0} pax; grupos mayores: consultar", capB2C: "Hasta {0} personas", langB2B: "Español / inglés (otros idiomas con suplemento de guianza)", langC: "Español / inglés",
    r_h: "Arma tu ruta", r_l: "Elige aeropuerto, hotel y tours. La ruta se dibuja en el mapa con tiempos aproximados y el vehículo según el número de pasajeros.",
    r1: "Grupo", r_pax: "Pasajeros", r_start: "Primer día de tours", r_d1: "Día 1 (el de llegada)", day: "Día {0}", veh_sug: "Vehículo sugerido", see_fleet: "ver flota",
    r2: "Llegada y salida", r_arr: "Aeropuerto de llegada", r_dep: "Aeropuerto de salida", no_tr: "Sin traslado",
    r3: "Hotel", h_ph: "Escribe el nombre del hotel…", h_note: "Primero salen los hoteles aliados de ET. Si no está, búscalo en el mapa abierto (OpenStreetMap), pega su enlace de Google Maps o tócalo en el mapa.",
    h_ally: "Aliado ET", h_recent: "Usado antes", h_osm: "Buscar «{0}» en el mapa abierto", h_new: "Ubicar «{0}» con un enlace o en el mapa", h_change: "Cambiar", h_searching: "Buscando…", h_none: "No encontré ese hotel en el mapa abierto. Pega su enlace de Google Maps o tócalo en el mapa.",
    h_place: "Ubicar «{0}»", h_link: "Pega el enlace de Google Maps del hotel", h_link_ph: "https://www.google.com/maps/place/…", h_locate: "Ubicar", h_link_note: "Abre el hotel en Google Maps y copia la dirección completa de la barra del navegador. Los enlaces cortos (maps.app.goo.gl) no traen coordenadas.",
    h_tap: "Tocar en el mapa", cancel: "Cancelar", h_tap_b: "Toca el mapa donde queda «{0}»", h_nolink: "No encontré coordenadas en ese enlace", h_set: "{0} ubicado en {1}", h_chosen: "Hotel elegido: {0}", h_added: "Agregado por el asesor",
    r4: "Tours por día", r_add: "Agregar tour", r_choose: "Elige un tour…", r_empty: "Agrega tours desde esta lista, desde el mapa o desde cada ficha.", remove: "Quitar", which_finca: "¿En qué finca?", finca_auto: "La más cercana al hotel (asignada por ET)",
    r5: "Recorrido", r_none: "Elige hotel y tours para ver el recorrido.", arr_leg: "Llegada {0} → {1}", arr_sub: "Traslado de llegada", dep_leg: "{0} → {1}", dep_sub: "Traslado de salida", go_back: "ida y regreso al hotel", per_leg: "c/trayecto",
    choose_hotel: "elige un hotel para calcular el trayecto", in_hotel: "En el hotel", finca_in: "Finca en {0}",
    tot_arr: "Traslado de llegada", tot_dep: "Traslado de salida", quote: "Cotizar", sup_of: "Suplemento {0}", tot: "Total neto por pasajero", tot_q: " (sin lo que está por cotizar)", tot_note: "{0} pax en {1}. No incluye hotel. {2}.",
    fit: "Ver ruta completa en el mapa", copy_it: "Copiar itinerario", send_req: "Enviar como solicitud de reserva", kit_route: "Kit de venta con estos tours", reset: "Empezar de nuevo", it_copied: "Itinerario copiado", program: "Programa Paisaje Cultural Cafetero · {0} pasajeros", vehicle: "Vehículo",
    tr_h: "Transporte", tr_l: "Vehículos habilitados para servicio especial que se adaptan a cada necesidad de viaje. Seguridad · comodidad · confianza. Capacidad recomendada para mayor comodidad y capacidad máxima autorizada.",
    tr_pax: "{0} a {1} pasajeros · máx. {2}", tr_upto: "Hasta {0} pasajeros", vip: "Plus de confort bajo solicitud", vid_soon: "Video en preparación", tr_cond: "Condiciones de transporte",
    tr_tab: "Traslados aeropuerto – hotel", tr_pp: "{0} pax · por persona", tr_code: "Código", tr_route: "Trayecto", tr_note: "Tarifa neta por persona y por trayecto, según tu tarifario. Manizales (MZL) y Cali (CLO): cotización a la medida.",
    sup_tab: "Suplementos", sup_t: "Suplemento", value: "Valor", guide_tab: "Guianza en otros idiomas", none_rates: "Tu tarifario aún no tiene estos valores: consulta a tu asesor.",
    k_h: "Kit de venta", k_l: "Descarga un PDF con las experiencias que elijas, en el idioma de tu cliente. Puedes quitar el logo de Espontáneos y agregar tu markup.",
    k1: "Experiencias", k_route: "Solo los tours de mi ruta", k_all: "Todo el portafolio", k_none: "Quitar todos", k_sel: "{0} seleccionadas", k2: "Idioma y marca", k_lang: "Idioma del PDF", k_logo: "Marca", k_with: "Con logo Espontáneos Travel", k_without: "Sin logo (marca blanca)",
    k_agency: "Nombre de tu agencia en la portada (opcional)", k3: "Precios", k_price: "¿Qué precio mostrar?", k_pn: "Sin precios", k_pnet: "Con tarifa neta", k_psell: "Con precio de venta (neta + mi markup)", k_mk: "Mi markup (%)",
    k_pnote: "El PDF muestra el precio por persona para 2, 4, 6 y 10 pasajeros, según tu tarifario.", k_go: "Descargar PDF", k_need: "Elige al menos una experiencia.", k_making: "Armando el PDF…", k_done: "Listo: {0}", k_err: "No se pudo crear el PDF. Intenta de nuevo.",
    k_open: "Si no se descargó, ábrelo aquí", pdf_client: "PDF para tu cliente", pdf_net: "PDF con tarifa neta", pdf_more: "Más opciones (idioma, marca, markup)", pdf_note: "El PDF para el cliente no lleva tarifas ni datos internos. El de tarifa neta es solo para tu agencia.",
    k_trnote: "Traducción por validar por el equipo de Espontáneos Travel.", k_nolib: "No se pudo cargar el generador de PDF. Revisa tu conexión y vuelve a intentar.",
    c_h: "Condiciones 2027", c_l: "Quiénes somos, políticas de reserva y pago y cómo trabajamos. Información para agencias, DMCs y mayoristas.", c_about: "Quiénes somos", c_book: "Reservas y pagos", c_kids: "Niños y menores", c_sost: "Sostenibilidad e impacto", c_team: "Equipo y contacto", c_read: "Cómo leer las fichas",
    c_fit: "Servicios individuales (FIT)", c_grp: "Grupos (más de 20 pasajeros, incentivos, corporativos, estudiantiles o series)", c_conf: "Confirmación", c_pay: "Pagos", c_mod: "Modificaciones", c_canc: "Cancelaciones", c_gen: "Consideraciones generales", c_paym: "Formas de pago",
    c_paym_ask: "Tu asesor te envía las cuentas y el enlace de pago con cada confirmación.", c_2026: "Políticas del portafolio 2026: el equipo de ET confirma las de 2027.", c_access: "Turismo accesible", c_more: "Más sobre nosotros", c_actions: "Nuestras acciones", c_stories: "Historias de comunidad",
    c_drivers: "Conductores", c_contact: "Contacto", c_imp_conv: "Convenciones de impacto"
  },
  en: {
    banner_dmc: "Espontáneos Travel PCCC Portfolio 2027 · DMCs", banner_nac: "Espontáneos Travel PCCC Portfolio 2027 · Wholesalers & Domestic Market",
    tar_dmc: "DMC rate sheet", tar_nac: "Domestic Market & Wholesalers rate sheet", tar_prev: "{0} rates valid in {1} until ET publishes the new ones", tar_none: "no rates loaded yet",
    two_fingers: "Use two fingers to move the map", mode: "View", m_agency: "Agency view", m_wl: "White label", wl_on: "White label: no logo, prices, codes or agency-only data. You can show this screen to your client.",
    map_t: "The Coffee Region, point by point", map_s: "Drag to move. Tap a point to see the experience.", map_aria: "Map of the Coffee Region: departments, capitals, airports and experiences",
    v_region: "Region", v_eje: "Coffee Region", v_quindio: "Quindío", z_in: "Zoom in", z_out: "Zoom out", k_apt: "Airport", k_cap: "Capital", k_hot: "Partner hotels", k_fin: "Coffee farms",
    t_mapa: "Map", t_exp: "Experiences", t_ruta: "Build a route", t_trans: "Transport", t_kit: "Sales kit", t_cond: "Conditions",
    welcome: "Welcome to the portfolio", welcome_l: "The whole Coffee Cultural Landscape on one map: {0} 2027 experiences in eight product lines, coffee farms, airports and capitals of Quindío, Risaralda, Caldas and Valle del Cauca.",
    how1: "Explore the map.", how1b: "Tap a point to see the experience in photos.", how2: "Open the sheet.", how2b: "What's included, operation, languages and net rate for your rate sheet.",
    how3: "Build a route.", how3b: "Airport, hotel and tours per day: the route draws itself and adds transfers and tours.", how4: "Download the sales kit.", how4b: "PDF in your client's language, with or without logo and with your markup.",
    go_zone: "Go to an area", all_eje: "Whole region", layers: "Map layers", shortcuts: "Shortcuts", sc_exp: "See all experiences", sc_ruta: "Build a route", sc_kit: "Download sales kit", sc_cond: "Conditions and about us",
    exp_h: "Experiences", q_ph: "Search: birds, coffee, Salento…", f_ideal: "Any traveller profile", f_dur: "Any duration", d_short: "Short (up to 2.5 h)", d_half: "Half day (3 to 6 h)", d_full: "Full day (7 h or more)",
    f_lang: "Any language", f_route: "Suggested routes…", f_clear: "Clear filters", n_exp: "{0} experiences", n_exp1: "1 experience", none_match: "No experience matches those filters.",
    b_new: "New 2027", b_own: "ET experience", b_com: "Community", b_cord: "Paisaje Cordillerano", from_net: "Net from", pax10: "10 pax", ask_rate: "Rate on request", photo_soon: "Material in preparation",
    see_ficha: "See full sheet", add_route: "+ To route", add_route_l: "+ Add to route", in_route: "✓ In route", close: "Close", added_day: "Added to route · Day {0}",
    f_dur_l: "Duration", f_mod: "Format", f_lunch: "Lunch", f_age: "Age", f_group: "Group", f_langs: "Languages", f_code: "Code", ask: "Ask us", min_pax: "min. {0} pax", max_pax: "max. {0}", upto: "Up to {0} pax",
    s_exp: "The experience", s_photos: "Photos", s_incl: "Includes", s_noincl: "Not included", s_oper: "Operation and schedules", s_tech: "Technical sheet", s_reco: "Recommendations", s_noapto: "Not suitable for",
    s_sell: "To sell it", only_ag: "Agencies only", why: "Why sell it", interesa: "Good to know", where: "Where we operate it", menu: "Menu", impact: "Local impact", s_notes: "Rate and operation notes",
    s_supl: "Supplements", s_combo: "Pair it with", s_rate: "Net rate per passenger", pax: "Passengers", per_pax: "COP per passenger", s_kit: "Sales kit", pdf: "Download PDF", copy_txt: "Copy text", copy_link: "Copy sheet link",
    kit_note: "PDF for your final client (no internal data), with or without logo, with or without prices, in ES, EN, FR, IT or PT.", request: "Request this tour", see_zones: "See municipalities on the map", zones_note: "In «Build a route» the farm in the municipality closest to the hotel is assigned.",
    kids: "Children aged 0–2 travel free but occupy a baby seat in the vehicle; from age 3 they pay the rate.", see_cond: "Booking and payment policies", see_about: "About us",
    com_txt: "Experience with the local community (farmers, artisans, producers).", cord_txt: "Part of the Paisaje Cordillerano project.", carry: "{0} rate · valid in {1}", copied: "Copied", link_copied: "Link copied", txt_copied: "Text copied",
    p_param: "Operating parameter", p_b2b: "B2B technical detail", p_b2c: "Commercial specification (B2C)", p_sched: "Recommended schedule", am: "Morning", pm: "Afternoon", ampm: "Morning or afternoon", guide_sup: "other languages with guiding supplement",
    conv_t: "Conventions and icons", inst_t: "Who we are", idx_t: "Experience index", idx_l: "Tap a line to see its experiences.", see_more: "See everything in Conditions", how_t: "How to use the portfolio",
    ic_dur: "Duration and difficulty: estimated time and physical effort (low, medium, high).", ic_geo: "Geolocation: with the hotel from «Build a route», each experience shows its distance and the farm is assigned in the closest municipality.",
    ic_com: "Community: experience with the local community (farmers, artisans, producers).", ic_cord: "Paisaje Cordillerano: tours of the project in Calarcá, Córdoba, Pijao, Buenavista and Génova (Quindío) and Caicedonia and Sevilla (Valle).",
    ic_b2b: "Agencies only: sales and operation data never shown in White label or in the client PDF.", ic_code: "Codes: HD half day (under 7 h) · FD full day (7 h or more) · PT theme parks.",
    near: "≈ {0} km from your hotel", near_sort: "Closest to my hotel first", near_hint: "Choose the hotel in «Build a route» to see the distance to each experience.", p_diff: "Difficulty level", p_cap: "Maximum capacity", p_meet: "Meeting point", p_guide: "Guiding language",
    low: "Low", mid: "Medium", high: "High", pick: "Pick-up at the accommodation (coverage area as per conditions)", pickC: "Your hotel", onsite: "At the experience site", atHotel: "At the group's hotel",
    capB2B: "Rate published up to {0} pax; larger groups: ask us", capB2C: "Up to {0} people", langB2B: "Spanish / English (other languages with guiding supplement)", langC: "Spanish / English",
    r_h: "Build a route", r_l: "Choose airport, hotel and tours. The route is drawn on the map with approximate times and the vehicle for your group size.",
    r1: "Group", r_pax: "Passengers", r_start: "First tour day", r_d1: "Day 1 (arrival day)", day: "Day {0}", veh_sug: "Suggested vehicle", see_fleet: "see fleet",
    r2: "Arrival and departure", r_arr: "Arrival airport", r_dep: "Departure airport", no_tr: "No transfer",
    r3: "Hotel", h_ph: "Type the hotel name…", h_note: "ET partner hotels come first. If it isn't there, search the open map (OpenStreetMap), paste its Google Maps link or tap it on the map.",
    h_ally: "ET partner", h_recent: "Used before", h_osm: "Search «{0}» on the open map", h_new: "Locate «{0}» with a link or on the map", h_change: "Change", h_searching: "Searching…", h_none: "I couldn't find that hotel on the open map. Paste its Google Maps link or tap it on the map.",
    h_place: "Locate «{0}»", h_link: "Paste the hotel's Google Maps link", h_link_ph: "https://www.google.com/maps/place/…", h_locate: "Locate", h_link_note: "Open the hotel in Google Maps and copy the full address from the browser bar. Short links (maps.app.goo.gl) carry no coordinates.",
    h_tap: "Tap on the map", cancel: "Cancel", h_tap_b: "Tap the map where «{0}» is", h_nolink: "No coordinates found in that link", h_set: "{0} located in {1}", h_chosen: "Hotel chosen: {0}", h_added: "Added by the agent",
    r4: "Tours per day", r_add: "Add tour", r_choose: "Choose a tour…", r_empty: "Add tours from this list, from the map or from each sheet.", remove: "Remove", which_finca: "Which farm?", finca_auto: "The closest to the hotel (assigned by ET)",
    r5: "Itinerary", r_none: "Choose a hotel and tours to see the itinerary.", arr_leg: "Arrival {0} → {1}", arr_sub: "Arrival transfer", dep_leg: "{0} → {1}", dep_sub: "Departure transfer", go_back: "return trip from the hotel", per_leg: "each way",
    choose_hotel: "choose a hotel to calculate the trip", in_hotel: "At the hotel", finca_in: "Farm in {0}",
    tot_arr: "Arrival transfer", tot_dep: "Departure transfer", quote: "Quote", sup_of: "Supplement {0}", tot: "Net total per passenger", tot_q: " (excluding items to quote)", tot_note: "{0} pax in {1}. Hotel not included. {2}.",
    fit: "See full route on the map", copy_it: "Copy itinerary", send_req: "Send as booking request", kit_route: "Sales kit with these tours", reset: "Start over", it_copied: "Itinerary copied", program: "Coffee Cultural Landscape programme · {0} passengers", vehicle: "Vehicle",
    tr_h: "Transport", tr_l: "Vehicles licensed for special service, adapted to every travel need. Safety · comfort · trust. Recommended capacity for comfort and maximum authorised capacity.",
    tr_pax: "{0} to {1} passengers · max. {2}", tr_upto: "Up to {0} passengers", vip: "Comfort upgrade on request", vid_soon: "Video in preparation", tr_cond: "Transport conditions",
    tr_tab: "Airport – hotel transfers", tr_pp: "{0} pax · per person", tr_code: "Code", tr_route: "Route", tr_note: "Net rate per person, each way, from your rate sheet. Manizales (MZL) and Cali (CLO): tailor-made quote.",
    sup_tab: "Supplements", sup_t: "Supplement", value: "Value", guide_tab: "Guiding in other languages", none_rates: "Your rate sheet doesn't have these values yet: ask your advisor.",
    k_h: "Sales kit", k_l: "Download a PDF with the experiences you choose, in your client's language. You can remove the Espontáneos logo and add your markup.",
    k1: "Experiences", k_route: "Only the tours in my route", k_all: "Whole portfolio", k_none: "Clear all", k_sel: "{0} selected", k2: "Language and brand", k_lang: "PDF language", k_logo: "Brand", k_with: "With Espontáneos Travel logo", k_without: "No logo (white label)",
    k_agency: "Your agency name on the cover (optional)", k3: "Prices", k_price: "Which price to show?", k_pn: "No prices", k_pnet: "With net rate", k_psell: "With selling price (net + my markup)", k_mk: "My markup (%)",
    k_pnote: "The PDF shows the price per person for 2, 4, 6 and 10 passengers, from your rate sheet.", k_go: "Download PDF", k_need: "Choose at least one experience.", k_making: "Building the PDF…", k_done: "Done: {0}", k_err: "The PDF could not be created. Please try again.",
    k_open: "If it didn't download, open it here", pdf_client: "PDF for your client", pdf_net: "PDF with net rate", pdf_more: "More options (language, brand, markup)", pdf_note: "The client PDF has no rates or internal data. The net-rate PDF is for your agency only.",
    k_trnote: "Translation pending validation by the Espontáneos Travel team.", k_nolib: "The PDF generator could not be loaded. Check your connection and try again.",
    c_h: "Conditions 2027", c_l: "About us, booking and payment policies and how we work. Information for agencies, DMCs and wholesalers.", c_about: "About us", c_book: "Bookings and payments", c_kids: "Children and minors", c_sost: "Sustainability and impact", c_team: "Team and contact", c_read: "How to read the sheets",
    c_fit: "Individual services (FIT)", c_grp: "Groups (more than 20 passengers, incentives, corporate, student or series)", c_conf: "Confirmation", c_pay: "Payments", c_mod: "Changes", c_canc: "Cancellations", c_gen: "General considerations", c_paym: "Payment methods",
    c_paym_ask: "Your advisor sends you the accounts and the payment link with each confirmation.", c_2026: "Policies from the 2026 portfolio: the ET team confirms the 2027 ones.", c_access: "Accessible tourism", c_more: "More about us", c_actions: "Our actions", c_stories: "Community stories",
    c_drivers: "Drivers", c_contact: "Contact", c_imp_conv: "Impact conventions"
  }
};
const L = () => (CTX && CTX.lang === "en" ? "en" : "es");
function tx(k, ...a) { let s = (UI[L()] && UI[L()][k]) || UI.es[k] || k; a.forEach((v, i) => { s = s.split("{" + i + "}").join(String(v)); }); return s; }
const LANGS = { es: { ES: "Español", EN: "Inglés", IT: "Italiano", PT: "Portugués", FR: "Francés", LSC: "Lengua de señas" }, en: { ES: "Spanish", EN: "English", IT: "Italian", PT: "Portuguese", FR: "French", LSC: "Sign language" } };
const langName = k => (LANGS[L()] || LANGS.es)[k] || k;
// Texto de una experiencia en el idioma de la interfaz (o del PDF)
function tr(e, f, lang) {
  const lg = (lang || L()).toLowerCase();
  if (lg !== "es") { const x = I18[lg] && I18[lg].tours && I18[lg].tours[e.id]; if (x && x[f] != null) return x[f]; }
  return e[f];
}
const catName = k => (L() === "en" && I18.en && I18.en.cats && I18.en.cats[k]) || (D.cats[k] && D.cats[k].name) || k;

/* ---------- íconos (trazo, 24×24) ---------- */
const ICONS = {
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  route: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/>', bus: '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M3 11h18M7 17v2.5M17 17v2.5"/><circle cx="7.5" cy="14" r=".9"/><circle cx="16.5" cy="14" r=".9"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.2M17.5 14.2A6 6 0 0 1 21 20"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 6h3v12"/>', child: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11l4-2 4 2M9.5 21l2.5-6 2.5 6"/>', tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', hotel: '<path d="M3 20V6M21 20v-6a3 3 0 0 0-3-3h-8v9M3 15h18"/><circle cx="7" cy="10.5" r="2"/>',
  plane: '<path d="M10.5 21 12 15l-7-3 1.5-1.5 7 1.5 4.5-6a2 2 0 0 1 3 2.5l-5 5.5 1 7-1.5 1.5-3-6"/>', download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1.2 1.2M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1.2-1.2"/>', send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>', check: '<path d="m5 12 4.5 4.5L19 7"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z"/>', leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', heart: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.4 0 5.5 3.1 4.3 6.3C19.5 15.4 12 20 12 20z"/>'
};
const ic = (n, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n] || ""}</svg>`;
// Glifo blanco por línea de producto dentro de cada punto del mapa (caja −5…5)
const GLYPH = {
  rur: '<path d="M0 5V-.5M0-.5C0-3.6-2.6-5-5-5-5-2.4-2.7-.6 0-.5M0 1.4C0-1.6 2.4-3 5-3 5-.4 2.7 1.3 0 1.4" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  nat: '<path d="M-5 4-1-3.2 1.2 0 2.6-1.8 5 4z" fill="#fff"/>',
  bien: '<path d="M0-5C2.8-1.2 4 .9 4 2.4a4 4 0 0 1-8 0C-4 .9-2.8-1.2 0-5z" fill="#fff"/>',
  trad: '<ellipse rx="3.1" ry="4.6" transform="rotate(-28)" fill="#fff"/><path d="M-1.6-3.4Q1.2 0-.4 3.9" fill="none" stroke="currentColor" stroke-width="1.1"/>',
  metro: '<path d="M-5 5V-.5h3.5V-5H4v10z" fill="#fff"/>',
  aven: '<path d="M1.2-5-4 1h3.6L-1.3 5 4-1H.4z" fill="#fff"/>',
  parq: '<path d="m0-5 1.5 3.1 3.4.5-2.5 2.4.6 3.4L0 2.8-3 4.4l.6-3.4-2.5-2.4 3.4-.5z" fill="#fff"/>',
  inc: '<path d="M0-5 5 0 0 5-5 0z" fill="#fff"/>'
};

/* ---------- carga y modelo ---------- */
async function loadLang(lg) {
  lg = String(lg || "").toLowerCase();
  if (lg === "es" || I18[lg]) return I18[lg];
  try { I18[lg] = await json(`/data/portafolio.${lg}.json`); } catch (e) { return null; }   // sin traducción: sale en español y se reintenta
  return I18[lg];
}
function loadFonts() {
  if (document.getElementById("pf-fonts")) return;
  const l = document.createElement("link"); l.id = "pf-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap";
  document.head.appendChild(l);
}
const MCN = () => M.mc, MDEP = () => M.mdep;
function nearestMuni(lat, lon) { let best = null; for (const [k, c] of Object.entries(M.mc)) { const d = (c[0] - lat) ** 2 + (c[1] - lon) ** 2; if (!best || d < best.d) best = { k, d }; } return best ? best.k : ""; }
const llOf = e => (S && S.wl ? [e.plat, e.plon] : [e.lat, e.lon]);
const MUNI_LABEL = m => String(m || "").toLowerCase().split(" ").map(w => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(" ")
  .replace("Calarca", "Calarcá").replace("Cordoba", "Córdoba").replace("Genova", "Génova").replace("Alcala", "Alcalá").replace("Quindio", "Quindío").replace("Chinchina", "Chinchiná").replace("Ibague", "Ibagué");

// Ficha técnica «solo agencias» desde las condiciones del portal (etiquetas «Por qué venderla: …»)
function privFicha(id) {
  const c = CTX.cond && CTX.cond.get ? CTX.cond.get(id) : null;
  if (!c) return { ficha: [], cond: [], imp: "" };
  return CTX.splitNotes(c.notas_agencia || []);
}
const fv = (sp, k) => ((sp.ficha.find(([x]) => x === k) || [])[1] || "");
const bullets = s => String(s || "").split(/\s*\*\s*|\s*\n\s*/).map(x => x.trim()).filter(Boolean);

function buildModel() {
  const P = CTX.priv || {};
  EXP = D.tours.map(t => {
    const e = Object.assign({}, t);
    e.plat = e.lat; e.plon = e.lon;          // ubicación pública (municipio): la que se usa en Marca blanca
    if (P.coords && P.coords[e.id]) { e.lat = P.coords[e.id][0]; e.lon = P.coords[e.id][1]; }
    if (e.id === "finca" && P.fincaZonas && P.fincaZonas.length) e.zones = P.fincaZonas.slice();
    const sp = privFicha(e.id);
    e.p = { why: fv(sp, "Por qué venderla"), interesa: fv(sp, "Te interesa"), where: fv(sp, "Punto de operación"), menu: fv(sp, "Menú"),
      supl: bullets(fv(sp, "Suplementos")), notes: sp.cond, impacto: sp.imp, team: fv(sp, "Nota del equipo"), diff: fv(sp, "Dificultad"), cap: fv(sp, "Capacidad máxima") };
    return e;
  });
  byId = Object.fromEntries(EXP.map(e => [e.id, e]));
  EXP.forEach(e => { e._hay = norm([e.name, tr(e, "name"), e.code, e.deptos, e.tagline, tr(e, "tagline"), e.sub, (e.desc || []).join(" ")].join(" ")); });
  FINCAS = (P.fincas || []).filter(f => isFinite(f.lat) && isFinite(f.lon));
  finById = Object.fromEntries(FINCAS.map(f => [f.id, f]));
  PR = buildPrices(CTX.rates || []);
  HOTELS = buildHotels(P.hoteles || []);
}

/* ---------- tarifas (las pasa portal.js ya filtradas por tipo de cliente) ---------- */
function buildPrices(rates) {
  const codeToId = Object.fromEntries(D.tours.map(t => [t.code, t.id]));
  const tours = new Map(), svc = new Map(); let carried = null, years = new Set();
  for (const r of rates) {
    if (!(r.tarifa_neta >= 0) || (r.moneda && r.moneda !== "COP")) continue;
    const id = (r.tour_id && byId[r.tour_id]) ? r.tour_id : codeToId[r.codigo];
    const m = id ? tours : (/^(ET|SU|HT)-/.test(r.codigo || "") ? svc : null);
    if (!m) continue;
    const k = id || r.codigo; if (!m.has(k)) m.set(k, []); m.get(k).push(r);
    if (r._de) carried = r._de; years.add(r._de || r.vigencia);
  }
  return { tours, svc, carried, years };
}
// Filas de una temporada: sin temporada / General, si no «Baja», si no la primera
function seasonRows(rows) {
  if (!rows || !rows.length) return [];
  const by = {}; rows.forEach(r => { const k = r.temporada || ""; (by[k] = by[k] || []).push(r); });
  const k = by[""] ? "" : Object.keys(by).find(x => /general/i.test(x)) || Object.keys(by).find(x => /baja/i.test(x)) || Object.keys(by).sort()[0];
  return by[k];
}
function pickAt(rows, p) {
  const ok = seasonRows(rows).filter(r => r.pax_desde <= p && p <= r.pax_hasta);
  if (!ok.length) return null;
  const r = ok.find(x => x.especial || x.dmcId) || ok[0];
  return r;
}
function priceAt(id, p) { const r = pickAt(PR.tours.get(id), p); return r ? r.tarifa_neta : null; }
function rateRow(id, p) { return pickAt(PR.tours.get(id), p); }
function hasPrice(id) { return PR.tours.has(id); }
function fromPrice(id) {
  const v = priceAt(id, 10); if (v != null) return { v, pax: 10 };
  const rows = seasonRows(PR.tours.get(id)); if (!rows.length) return null;
  const r = rows.reduce((a, b) => (b.tarifa_neta < a.tarifa_neta ? b : a));
  return { v: r.tarifa_neta, pax: r.pax_hasta };
}
function svcAt(code, p) { const r = pickAt(PR.svc.get(code), p); return r ? r.tarifa_neta : null; }
function tarLabel() {
  const base = CTX.tier === "nac" ? tx("tar_nac") : tx("tar_dmc");
  if (!PR.tours.size && !PR.svc.size) return base + " · " + tx("tar_none");
  return PR.carried ? `${base} · ${tx("tar_prev", PR.carried, VIG)}` : `${base} ${[...PR.years].sort().join("/")}`;
}

/* ---------- hoteles aliados (privados) + los que el asesor ya usó ---------- */
function muniCenter(m) { const k = norm(m); return M.mc[k] || null; }
function buildHotels(list) {
  const out = [], seen = new Set();
  const push = h => { const k = norm(h.name); if (!k || seen.has(k) || !isFinite(h.lat) || !isFinite(h.lon)) return; seen.add(k); out.push(h); };
  list.forEach((h, i) => push({ id: "et" + i, name: h.name, muni: norm(h.muni), concept: h.concept || "", zone: h.zone || null, lat: h.lat, lon: h.lon, et: true }));
  // Hoteles con tarifa (HT-) que no estén en la lista: ubicación aproximada en su municipio
  for (const [code, rows] of PR.svc) {
    if (!/^HT-/.test(code)) continue;
    const m = /^(.*?)\s*·\s*([^(]+?)\s*(?:\((.*)\))?$/.exec(rows[0].nombre || ""); if (!m) continue;
    const c = muniCenter(m[2]); if (!c) continue;
    push({ id: code, name: m[1], muni: norm(m[2]), concept: m[3] || "", lat: c[0] + 0.004, lon: c[1] + 0.004, et: true });
  }
  const rec = ls.get("pf27-hoteles", []);
  (Array.isArray(rec) ? rec : []).filter(okHotel).forEach(h => push(Object.assign({}, h, { muni: norm(h.muni || ""), et: false, recent: true })));
  return out;
}
function rememberHotel(h) {
  if (h.et) return;
  const prev = ls.get("pf27-hoteles", []);
  const list = (Array.isArray(prev) ? prev : []).filter(x => okHotel(x) && norm(x.name) !== norm(h.name));
  list.unshift({ id: h.id, name: h.name, muni: h.muni, concept: h.concept || "", lat: h.lat, lon: h.lon });
  ls.set("pf27-hoteles", list.slice(0, 12));
}

/* ---------- ruta guardada en el navegador: se valida al leerla (puede venir dañada o de otra versión) ---------- */
const okHotel = h => h && typeof h.name === "string" && isFinite(h.lat) && isFinite(h.lon) && typeof (h.muni || "") === "string";
function sanitizeR(R) {
  R.pax = Math.min(30, Math.max(1, Math.round(+R.pax) || 2));
  R.start = +R.start === 1 ? 1 : 2;
  const apOk = a => a === "" || D.airports.some(x => x.id === a);
  if (!apOk(R.arr)) R.arr = "AXM"; if (!apOk(R.dep)) R.dep = "AXM";
  R.tours = (Array.isArray(R.tours) ? R.tours : []).filter(t => t && byId[t.id]).map(t => ({ id: t.id, day: Math.min(12, Math.max(1, Math.round(+t.day) || 2)) }));
  R.hotel = okHotel(R.hotel) ? Object.assign({}, R.hotel, { muni: String(R.hotel.muni || ""), name: String(R.hotel.name) }) : null;
  if (typeof R.finca !== "string" || (R.finca && !finById[R.finca])) R.finca = "";
  return R;
}

/* ---------- montaje ---------- */
// Descarga los datos públicos (y el idioma) mientras el portal lee las tarifas: así el portafolio abre más rápido
export async function preload(lang) {
  if (!D) [D, M] = await Promise.all([json("/data/portafolio.json"), json("/data/mapa-eje.json")]);
  if (lang === "en") await loadLang("en");
}
export async function mountPortafolio(host, ctx) {
  if (ac) ac.abort();
  ac = new AbortController();
  CTX = ctx;
  loadFonts();
  await preload(L());
  buildModel();
  const saved = ls.get("pf27-ruta", null);
  S = { cats: new Set(Object.keys(D.cats)), q: "", ideal: "", dur: "", lang: "", sugg: "", active: null, popLL: null, wl: false, hotels: false, fincas: true,
    tab: ls.get("pf27-tab", "mapa"), placing: false, editing: false, newName: "",
    R: Object.assign({ pax: 2, start: 2, arr: "AXM", dep: "AXM", hotel: null, finca: "", tours: [] }, saved || {}) };
  sanitizeR(S.R);
  if (!["mapa", "exp", "ruta", "trans", "kit", "cond"].includes(S.tab)) S.tab = "mapa";
  K.sel = null;
  host.innerHTML = skeleton();
  ROOT = host.querySelector(".pf");
  svg = $r("svg"); base = $r("base"); ov = $r("ov");
  const head = document.querySelector(".p-header"); if (head) ROOT.style.setProperty("--pf-top", head.offsetHeight + "px");
  bindStatic();
  drawBase(); renderLegend(); renderMapPane(); S.listDirty = true;
  requestAnimationFrame(() => {
    VB = boxToVB(...VIEWS.eje); applyVB(); setTab(S.tab, true);
    const m = /#ficha=([a-z0-9_-]+)/i.exec(location.hash); if (m && byId[m[1]]) openFicha(m[1]);
  });
}

function skeleton() {
  const tierB = CTX.tier === "nac" ? tx("banner_nac") : tx("banner_dmc");
  const tab = (k, icon, extra) => `<button role="tab" type="button" data-tab="${k}" id="pf-tab-${k}" aria-controls="pf-pane-${k}" aria-selected="false">${ic(icon)}<span>${tx("t_" + k)}</span>${extra || ""}</button>`;
  return `<div class="pf" data-tier="${esc(CTX.tier)}">
  <div class="pf-bar"><div class="pf-bar__t"><b data-r="bart">${esc(tierB)}</b><span class="sub money">${esc(CTX.agency || "")}${CTX.agency ? " · " : ""}<span class="money">${esc(tarLabel())}</span></span></div>
    <div class="modes" role="group" aria-label="${esc(tx("mode"))}"><button type="button" data-mode="0" aria-pressed="true">${ic("users")}${tx("m_agency")}</button><button type="button" data-mode="1" aria-pressed="false">${ic("eye")}${tx("m_wl")}</button></div></div>
  <p class="pf-wl-note" data-r="wlnote" hidden>${ic("eye")}${esc(tx("wl_on"))}</p>
  <div class="app">
    <div class="map-wrap" data-r="mapwrap">
      <svg class="mapsvg" data-r="svg" role="img" aria-label="${esc(tx("map_aria"))}"><g data-r="base"></g><g data-r="ov"></g></svg>
      <div class="map-title"><h2>${esc(tx("map_t"))}</h2><p>${esc(tx("map_s"))}</p></div>
      <div class="ctrl"><div class="seg" role="group" aria-label="Zoom"><button type="button" data-view="region">${tx("v_region")}</button><button type="button" data-view="eje" aria-pressed="true">${tx("v_eje")}</button><button type="button" data-view="quindio">${tx("v_quindio")}</button></div>
        <div class="zoom"><button type="button" data-z="in" aria-label="${esc(tx("z_in"))}">+</button><button type="button" data-z="out" aria-label="${esc(tx("z_out"))}">−</button></div></div>
      <div class="legend" data-r="legend"></div>
      <div data-r="banner"></div>
      <div class="keyrow">
        <span class="chip key"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" rx="3" fill="var(--sky)"/></svg>${tx("k_apt")}</span>
        <span class="chip key"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l1.8 3.9 4.2.4-3.2 2.8 1 4.1L7 10 3.2 12.2l1-4.1L1 5.3l4.2-.4z" fill="var(--fg)"/></svg>${tx("k_cap")}</span>
        ${FINCAS.length ? `<button type="button" class="chip" data-layer="fincas" aria-pressed="true"><svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><ellipse cx="6" cy="7" rx="5" ry="6" fill="var(--bean)"/></svg>${tx("k_fin")}</button>` : ""}
        ${HOTELS.length ? `<button type="button" class="chip" data-layer="hotels" aria-pressed="false"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" rx="3" fill="var(--bean)"/></svg>${tx("k_hot")}</button>` : ""}
      </div>
    </div>
    <div class="panel">
      <div class="tabs" role="tablist">${tab("mapa", "map")}${tab("exp", "grid")}${tab("ruta", "route", `<span class="n" data-r="rn">0</span>`)}${tab("trans", "bus")}${tab("kit", "file")}${tab("cond", "info")}</div>
      <section class="pane" id="pf-pane-mapa" data-pane="mapa" role="tabpanel" aria-labelledby="pf-tab-mapa" hidden></section>
      <section class="pane" id="pf-pane-exp" data-pane="exp" role="tabpanel" aria-labelledby="pf-tab-exp" hidden>
        <h2>${tx("exp_h")}</h2>
        <div class="filters">
          <input data-f="q" type="search" placeholder="${esc(tx("q_ph"))}" aria-label="${esc(tx("q_ph"))}">
          <select data-f="ideal" aria-label="${esc(tx("f_ideal"))}"><option value="">${tx("f_ideal")}</option>${[...new Set(EXP.flatMap(e => e.ideal || []))].sort().map(i => `<option>${esc(i)}</option>`).join("")}</select>
          <select data-f="dur" aria-label="${esc(tx("f_dur"))}"><option value="">${tx("f_dur")}</option><option value="Corta (hasta 2,5 h)">${tx("d_short")}</option><option value="Medio día">${tx("d_half")}</option><option value="Día completo">${tx("d_full")}</option></select>
          <select data-f="lang" aria-label="${esc(tx("f_lang"))}"><option value="">${tx("f_lang")}</option>${Object.keys(LANGS.es).map(k => `<option value="${k}">${esc(langName(k))}</option>`).join("")}</select>
          <select data-f="sugg" aria-label="${esc(tx("f_route"))}"><option value="">${tx("f_route")}</option>${Object.keys(D.sugg).map(r => `<option value="${esc(r)}">${esc(L() === "en" && I18.en && I18.en.sugg && I18.en.sugg[r] || r)}</option>`).join("")}</select>
          <button type="button" class="btn ghost sm" data-r="fclear" hidden>${ic("x")}${tx("f_clear")}</button>
        </div>
        <label class="nearsort" data-r="nearw"><input type="checkbox" data-r="near"> ${ic("pin", "sm")}<span data-r="neart">${tx("near_sort")}</span></label>
        <div class="count" data-r="count" role="status"></div>
        <div data-r="groups"></div>
      </section>
      <section class="pane" id="pf-pane-ruta" data-pane="ruta" role="tabpanel" aria-labelledby="pf-tab-ruta" hidden>
        <h2>${tx("r_h")}</h2><p class="lead">${tx("r_l")}</p>
        <div class="steps">
          <div class="step"><h3><span class="k">1</span>${tx("r1")}</h3>
            <div class="row2"><label class="field">${tx("r_pax")}<input data-r="rpax" type="number" min="1" max="30" inputmode="numeric"></label>
            <label class="field">${tx("r_start")}<select data-r="rstart"><option value="1">${tx("r_d1")}</option><option value="2">${tx("day", 2)}</option></select></label></div>
            <div class="veh" data-r="rveh"></div></div>
          <div class="step"><h3><span class="k">2</span>${tx("r2")}</h3>
            <div class="row2"><label class="field">${tx("r_arr")}<select data-r="rarr"></select></label><label class="field">${tx("r_dep")}<select data-r="rdep"></select></label></div></div>
          <div class="step"><h3><span class="k">3</span>${tx("r3")}</h3><div data-r="rhbox"></div><span class="note">${tx("h_note")}</span></div>
          <div class="step"><h3><span class="k">4</span>${tx("r4")}</h3><div class="titems" data-r="rtours"></div>
            <label class="field">${tx("r_add")}<select data-r="radd"></select></label></div>
          <div class="step"><h3><span class="k">5</span>${tx("r5")}</h3><div class="legs" data-r="rlegs"></div><div class="tot money" data-r="rtot"></div>
            <div class="btnrow"><button type="button" class="btn" data-r="rfit">${ic("map")}${tx("fit")}</button><button type="button" class="btn ghost" data-r="rcopy">${ic("copy")}${tx("copy_it")}</button>
              ${CTX.onRequest ? `<button type="button" class="btn ghost" data-r="rreq">${ic("send")}${tx("send_req")}</button>` : ""}<button type="button" class="btn ghost" data-r="rkit">${ic("file")}${tx("kit_route")}</button><button type="button" class="btn ghost" data-r="rclear">${tx("reset")}</button></div></div>
        </div>
      </section>
      <section class="pane" id="pf-pane-trans" data-pane="trans" role="tabpanel" aria-labelledby="pf-tab-trans" hidden></section>
      <section class="pane" id="pf-pane-kit" data-pane="kit" role="tabpanel" aria-labelledby="pf-tab-kit" hidden></section>
      <section class="pane" id="pf-pane-cond" data-pane="cond" role="tabpanel" aria-labelledby="pf-tab-cond" hidden></section>
    </div>
  </div>
  <div data-r="pop"></div><div data-r="ficha"></div><div data-r="lb"></div><div data-r="toast"></div>
</div>`;
}

function bindStatic() {
  const sig = { signal: ac.signal };
  $$("[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode === "1")));
  $$("[data-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  ROOT.querySelector(".tabs").addEventListener("keydown", ev => {
    const tabs = $$("[data-tab]"), i = tabs.indexOf(document.activeElement); if (i < 0) return;
    let j = null; if (ev.key === "ArrowRight") j = (i + 1) % tabs.length; else if (ev.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    if (j != null) { ev.preventDefault(); tabs[j].focus(); setTab(tabs[j].dataset.tab); }
  });
  // filtros
  const f = n => ROOT.querySelector(`[data-f="${n}"]`);
  const refilter = () => { drawOverlay(); renderList(); $r("fclear").hidden = !(S.q || S.ideal || S.dur || S.lang || S.sugg || S.cats.size < Object.keys(D.cats).length); };
  let qt = 0;
  f("q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; refilter(); }, 120); });
  ["ideal", "dur", "lang"].forEach(k => f(k).addEventListener("change", e => { S[k] = e.target.value; refilter(); }));
  f("sugg").addEventListener("change", e => {
    S.sugg = e.target.value; refilter();
    if (S.sugg) { const ids = D.sugg[S.sugg].filter(i => byId[i]); const la = ids.map(i => byId[i].lat), lo = ids.map(i => byId[i].lon); if (la.length) animateTo(boxToVB(Math.min(...la) - .06, Math.max(...la) + .08, Math.min(...lo) - .06, Math.max(...lo) + .06)); }
  });
  $r("near").addEventListener("change", e => { S.near = e.target.checked; renderList(); });
  $r("fclear").addEventListener("click", () => { S.q = S.ideal = S.dur = S.lang = S.sugg = ""; ["q", "ideal", "dur", "lang", "sugg"].forEach(k => { f(k).value = ""; }); S.cats = new Set(Object.keys(D.cats)); renderLegend(); refilter(); });
  S.refilter = refilter;
  // mapa
  $$("[data-view]").forEach(b => b.addEventListener("click", () => { animateTo(boxToVB(...VIEWS[b.dataset.view])); $$("[data-view]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }));
  $$("[data-z]").forEach(b => b.addEventListener("click", () => { const r = wrapRect(); zoomAt(b.dataset.z === "in" ? 1 / 1.45 : 1.45, r.left + r.width / 2, r.top + r.height / 2); }));
  $$("[data-layer]").forEach(b => b.addEventListener("click", () => toggleLayer(b.dataset.layer)));
  svg.addEventListener("click", onMapClick);
  svg.addEventListener("keydown", ev => { const g = ev.target.closest && ev.target.closest("[data-id],[data-cl]"); if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); g.dataset.id ? openPop(g.dataset.id) : zoomCluster(g.dataset.cl); } });
  let drag = false, last = null; S.dragMoved = false;
  const pts = new Map(); let pinch = null;
  const mid = () => { const [a, b] = [...pts.values()]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  let hintT = 0, touch1 = null;
  svg.addEventListener("pointerdown", ev => {
    pts.set(ev.pointerId, [ev.clientX, ev.clientY]); S.dragMoved = false;
    if (ev.pointerType === "touch") {
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); last = mid(); drag = true; }
      else { drag = false; touch1 = [ev.clientX, ev.clientY]; }
      return;
    }
    drag = true; last = [ev.clientX, ev.clientY];
  });
  addEventListener("pointermove", ev => {
    if (!ROOT.isConnected) { ac.abort(); return; }
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (drag && ev.pointerType === "mouse" && ev.buttons === 0) { up(ev); return; }
    if (!drag) {
      // Un solo dedo sobre el mapa: la página sigue desplazándose; si el gesto es de lado, se recuerda usar dos dedos
      if (ev.pointerType === "touch" && touch1 && pts.size === 1 && Math.abs(ev.clientX - touch1[0]) > 24 && !hintT) { const b = $r("banner"); if (b && !b.firstChild) { b.innerHTML = `<div class="mapbanner hint">${ic("users", "sm")}${esc(tx("two_fingers"))}</div>`; hintT = setTimeout(() => { hintT = 0; if (b.querySelector(".hint")) b.innerHTML = ""; }, 1800); } }
      return;
    }
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = mid();
      const u = px(); VB.x -= (m[0] - last[0]) * u; VB.y -= (m[1] - last[1]) * u; last = m;
      if (d > 0) { zoomAt(pinch / d, m[0], m[1]); pinch = d; } else applyVB("pan");
      S.dragMoved = true; return;
    }
    const dx = ev.clientX - last[0], dy = ev.clientY - last[1];
    if (!S.dragMoved && Math.hypot(dx, dy) < 4) return;
    if (!S.dragMoved) { S.dragMoved = true; svg.classList.add("drag"); }
    const u = px(); VB.x -= dx * u; VB.y -= dy * u; last = [ev.clientX, ev.clientY]; applyVB("pan");
  }, sig);
  function up(ev) { if (svg.classList.contains("moving") && pts.size <= 1) commitVB(); pts.delete(ev.pointerId); if (pts.size === 1) touch1 = null; if (pts.size < 2) { pinch = null; if (ev.pointerType === "touch") drag = false; } if (!pts.size) { drag = false; touch1 = null; svg.classList.remove("drag"); setTimeout(() => { S.dragMoved = false; }, 0); } }
  addEventListener("pointerup", up, sig); addEventListener("pointercancel", up, sig);
  const mw = $r("mapwrap");
  const twoFingers = ev => { if (ev.touches && ev.touches.length > 1) ev.preventDefault(); };
  mw.addEventListener("touchstart", twoFingers, { passive: false, signal: ac.signal });
  mw.addEventListener("touchmove", twoFingers, { passive: false, signal: ac.signal });
  svg.addEventListener("wheel", ev => { ev.preventDefault(); zoomAt(ev.deltaY > 0 ? 1.15 : 1 / 1.15, ev.clientX, ev.clientY); }, { passive: false });
  let rz = 0; addEventListener("resize", () => { if (!ROOT.isConnected) { ac.abort(); return; } clearTimeout(rz); rz = setTimeout(() => { VB = fitAspect(VB); applyVB(); }, 120); }, sig);
  addEventListener("scroll", () => { if (S.active) placePop(); }, { passive: true, signal: ac.signal });
  addEventListener("keydown", ev => { if (ev.key !== "Escape" || !ROOT.isConnected) return; if ($r("lb").firstChild) $r("lb").innerHTML = ""; else if ($r("ficha").firstChild) closeFicha(); else if (S.placing) stopPlacing(); else if (S.active) closePop(); }, sig);
  // ruta
  $r("rpax").addEventListener("change", e => { S.R.pax = Math.min(30, Math.max(1, Math.round(+e.target.value) || 1)); S.tpax = 0; saveR(); renderRoute(); });
  $r("rstart").addEventListener("change", e => { S.R.start = +e.target.value; saveR(); renderRoute(); });
  $r("rarr").addEventListener("change", e => { S.R.arr = e.target.value; saveR(); renderRoute(); fitRoute(); });
  $r("rdep").addEventListener("change", e => { S.R.dep = e.target.value; saveR(); renderRoute(); fitRoute(); });
  $r("radd").addEventListener("change", e => { if (e.target.value) { toggleTour(e.target.value); fitRoute(); } });
  $r("rfit").addEventListener("click", fitRoute);
  $r("rclear").addEventListener("click", () => { S.newName = ""; stopPlacing(); S.R = { pax: 2, start: 2, arr: "AXM", dep: "AXM", hotel: null, finca: "", tours: [] }; saveR(); renderRoute(); animateTo(boxToVB(...VIEWS.eje)); });
  $r("rcopy").addEventListener("click", () => copy(itineraryText(), tx("it_copied")));
  $r("rkit").addEventListener("click", () => { K.sel = new Set(S.R.tours.map(t => t.id)); setTab("kit"); });
  if ($r("rreq")) $r("rreq").addEventListener("click", () => {
    if (!S.R.tours.length) { toast(tx("r_empty")); return; }
    CTX.onRequest({ tours: S.R.tours.slice().sort((a, b) => a.day - b.day).map(t => byId[t.id]).map(e => ({ tour_id: e.id, codigo: e.code, nombre: e.name })),
      pax: S.R.pax, hotel: S.R.hotel ? S.R.hotel.name : "", notas: itineraryText(true) });
  });
}

/* ---------- pestañas y modo ---------- */
function setTab(t, first) {
  S.tab = t; ls.set("pf27-tab", t);
  $$("[data-tab]").forEach(b => { const on = b.dataset.tab === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  $$("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== t; });
  if (t === "exp" && S.listDirty) renderList();
  if (t !== "exp") S.listDirty = true;
  if (t === "ruta") { renderRoute(); if (!first) fitRoute(); } else drawOverlay();
  if (t === "kit") renderKit();
  if (t === "cond") renderCond();
  if (t === "trans") renderTrans();
  if (!first && innerWidth <= 920 && t === "mapa") $r("mapwrap").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
}
function setMode(wl) {
  S.wl = wl; ROOT.classList.toggle("wl", wl);
  $$("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.mode === "1") === wl)));
  $r("wlnote").hidden = !wl;
  $r("bart").textContent = wl ? (L() === "en" ? "Coffee Cultural Landscape · 2027 Experiences" : "Paisaje Cultural Cafetero · Experiencias 2027") : (CTX.tier === "nac" ? tx("banner_nac") : tx("banner_dmc"));
  if (S.active && /^fin:/.test(S.active)) closePop();
  S.listDirty = true;
  const t = S.tab;
  if (t === "exp") renderList(); else if (t === "ruta") renderRoute(); else if (t === "kit") renderKit(); else if (t === "cond") renderCond(); else if (t === "trans") renderTrans();
  if (S.active) { const id = S.active; openPop(id); } else drawOverlay();
  if ($r("ficha").firstChild) { const id = $r("ficha").querySelector("[data-fid]").dataset.fid; openFicha(id); }
}
function toggleLayer(k) {
  if (k === "hotels") S.hotels = !S.hotels; else S.fincas = !S.fincas;
  $$(`[data-layer="${k}"]`).forEach(b => b.setAttribute("aria-pressed", String(k === "hotels" ? S.hotels : S.fincas)));
  drawOverlay();
}

/* ---------- mapa: proyección y vista ---------- */
const P = (lat, lon) => [(lon - M.lon0) * M.k, (M.lat1 - lat) * M.k];
const VIEWS = { region: [3.25, 5.6, -76.85, -75.0], eje: [4.12, 5.12, -76.0, -75.38], quindio: [4.15, 4.76, -75.92, -75.42] };
const ZONEVIEW = { "Quindío": VIEWS.quindio, "Risaralda": [4.7, 5.35, -76.1, -75.45], "Caldas": [4.85, 5.6, -75.95, -74.75], "Valle del Cauca": [3.3, 4.95, -76.85, -75.7] };
const DEPNAME = { "63": "Quindío", "66": "Risaralda", "17": "Caldas", "76": "Valle del Cauca" };
function boxToVB(lat0, lat1, lon0, lon1) {
  const [x0, y0] = P(lat1, lon0), [x1, y1] = P(lat0, lon1), w = x1 - x0, h = y1 - y0;
  const W = Math.max(1, svg.clientWidth), H = Math.max(1, svg.clientHeight), mob = W < 640, top = mob ? 64 : 96, bot = mob ? 110 : 96, side = 24;
  const s = Math.max(w / Math.max(50, W - 2 * side), h / Math.max(50, H - top - bot));
  return { x: x0 - (W * s - w) / 2, y: y0 - top * s - ((H - top - bot) * s - h) / 2, w: W * s, h: H * s };
}
function fitAspect(b) { const r = svg.clientWidth / Math.max(1, svg.clientHeight); let { x, y, w, h } = b; if (w / h < r) { const nw = h * r; x -= (nw - w) / 2; w = nw; } else { const nh = w / r; y -= (nh - h) / 2; h = nh; } return { x, y, w, h }; }
function animateTo(t) {
  cancelAnimationFrame(anim); const s = Object.assign({}, VB), t0 = performance.now(), Dd = reduced() ? 0 : 450;
  const step = now => { const k = Dd ? Math.min(1, (now - t0) / Dd) : 1, e = 1 - Math.pow(1 - k, 3); VB = { x: s.x + (t.x - s.x) * e, y: s.y + (t.y - s.y) * e, w: s.w + (t.w - s.w) * e, h: s.h + (t.h - s.h) * e }; if (k < 1) { applyVB("zoom"); anim = requestAnimationFrame(step); } else applyVB(); };
  anim = requestAnimationFrame(step);
}
// Durante un gesto («pan» / «zoom») el mapa ya dibujado solo se traslada y escala con CSS (fluido también en
// celulares); 160 ms después del último movimiento —o al soltar— se fija el viewBox y se redibujan los puntos.
let vbRaf = 0, vbT = 0, VBc = null;
const wrapRect = () => ($r("mapwrap") || svg).getBoundingClientRect();
function commitVB() {
  clearTimeout(vbT); vbT = 0;
  if (!svg) return;
  svg.setAttribute("viewBox", `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  svg.style.transform = ""; svg.classList.remove("moving");
  VBc = Object.assign({}, VB);
  drawOverlay(); placePop();
}
function applyVB(mode) {
  if (!svg) return;
  if ((mode === "pan" || mode === "zoom") && VBc) {
    const W = Math.max(1, svg.clientWidth), k = VBc.w / VB.w, f = W / VB.w;
    svg.classList.add("moving");
    svg.style.transform = `translate(${(VBc.x - VB.x) * f}px, ${(VBc.y - VB.y) * f}px) scale(${k})`;
    placePop();
    clearTimeout(vbT); vbT = setTimeout(commitVB, 160);
    return;
  }
  if (!vbRaf) vbRaf = requestAnimationFrame(() => { vbRaf = 0; commitVB(); });
}
const px = () => VB.w / Math.max(1, svg.clientWidth);
function zoomAt(f, cx, cy) {
  const r = wrapRect(); const mx = VB.x + (cx - r.left) * px(), my = VB.y + (cy - r.top) * px();
  const nw = Math.min(3000, Math.max(40, VB.w * f)), k = nw / VB.w; VB = { x: mx - (mx - VB.x) * k, y: my - (my - VB.y) * k, w: nw, h: VB.h * k };
  $$("[data-view]").forEach(b => b.setAttribute("aria-pressed", "false")); applyVB("zoom");
}
function drawBase() {
  let s = "";
  M.depts.forEach(d => { s += `<path class="dept${d.f ? " focus" : ""}${d.c === "63" ? " q" : ""}" d="${d.d}" vector-effect="non-scaling-stroke"/>`; });
  M.munis.forEach(m => { s += `<path class="muni" data-m="${esc(norm(m.n))}" d="${m.d}" vector-effect="non-scaling-stroke"><title>${esc(MUNI_LABEL(norm(m.n)))}</title></path>`; });
  M.depts.filter(d => d.f).forEach(d => { s += `<path d="${d.d}" fill="none" stroke="var(--dept-line)" stroke-width="2" vector-effect="non-scaling-stroke"/>`; });
  base.innerHTML = s;
}
function setZones(list) { const set = new Set((list || []).map(norm)); base.querySelectorAll(".muni").forEach(p => p.classList.toggle("zone", set.has(p.dataset.m))); }

/* ---------- capas: puntos (agrupados al alejar), hoteles, fincas, ruta ---------- */
function visible() {
  const q = norm(S.q);
  return new Set(EXP.filter(e => S.cats.has(e.cat) && (!S.ideal || (e.ideal || []).includes(S.ideal)) && (!S.dur || e.durB === S.dur) && (!S.lang || (e.langs || []).includes(S.lang))
    && (!S.sugg || (D.sugg[S.sugg] || []).includes(e.id))
    && (!q || e._hay.includes(q))).map(e => e.id));
}
function drawOverlay() {
  if (!ov || !M) return;
  const u = px(), zoomedIn = u < 0.9, veryIn = u < 0.45;
  let s = "";
  const far = u > 1.6;
  D.dlabels.forEach(([n, la, lo, f]) => { if (!!f !== far) return; const [x, y] = P(la, lo); s += `<text class="dlabel" x="${x}" y="${y}" font-size="${13 * u}">${n}</text>`; });
  if (zoomedIn) D.towns.forEach(([n, la, lo]) => { const [x, y] = P(la, lo); s += `<g class="town"><circle cx="${x}" cy="${y}" r="${2.4 * u}" fill="var(--map-ink)" opacity=".6"/><text x="${x + 5 * u}" y="${y + 11 * u}" font-size="${10.5 * u}" stroke-width="${3 * u}">${esc(n)}</text></g>`; });
  D.capitals.forEach(c => { const [n, , la, lo] = Array.isArray(c) ? c : [c.ciudad || c.nombre, c.departamento || c.depto, c.lat, c.lon]; const [x, y] = P(la, lo), r = 7 * u;
    const star = [...Array(10)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; return (x + Math.cos(a) * rr) + "," + (y + Math.sin(a) * rr); }).join(" ");
    s += `<g class="cap"><polygon points="${star}" fill="var(--fg)" stroke="var(--land)" stroke-width="${1.5 * u}"/><text x="${n === "Cali" ? x - 10 * u : x + 10 * u}" y="${y + 4 * u}" font-size="${13 * u}" stroke-width="${4 * u}" text-anchor="${n === "Cali" ? "end" : "start"}">${esc(n)}</text></g>`; });
  const selH = S.R.hotel;
  if (S.hotels) HOTELS.forEach(h => { if (selH && norm(h.name) === norm(selH.name)) return; s += hotelSvg(h, false, u, veryIn); });
  if (selH) s += hotelSvg(selH, true, u, true);
  s += fincasSvg(u);
  s += routeSvg(u);
  D.airports.forEach(a => { const [x, y] = P(a.lat, a.lon), w = 30 * u, hh = 17 * u;
    s += `<g class="apt"><rect x="${x - w / 2}" y="${y - hh / 2}" width="${w}" height="${hh}" rx="${3 * u}"/><text class="iata" x="${x}" y="${y + 4 * u}" font-size="${10.5 * u}" text-anchor="middle">${a.id}</text>
      <text class="nm" x="${x}" y="${y + hh / 2 + 12 * u}" font-size="${10.5 * u}" stroke-width="${3.5 * u}" text-anchor="middle">✈ ${esc(a.name)}</text></g>`; });
  // Puntos: al alejar, los que se tocan (< 18 px) se agrupan en un círculo con el número; tocarlo acerca el mapa
  const vis = visible(), R = 18 * u, items = EXP.filter(e => vis.has(e.id)).map(e => { const [x, y] = P(...llOf(e)); return { e, x, y }; });
  const clusters = []; S.clusters = {};
  if (!veryIn) {
    items.forEach(it => { if (it.e.id === S.active) return; const c = clusters.find(c => Math.hypot(c.x - it.x, c.y - it.y) < R); if (c) { c.items.push(it); c.x = (c.x * (c.items.length - 1) + it.x) / c.items.length; c.y = (c.y * (c.items.length - 1) + it.y) / c.items.length; } else clusters.push({ x: it.x, y: it.y, items: [it] }); });
    const act = items.find(it => it.e.id === S.active); if (act) clusters.push({ x: act.x, y: act.y, items: [act] });
  } else items.forEach(it => clusters.push({ x: it.x, y: it.y, items: [it] }));
  EXP.forEach(e => { if (!vis.has(e.id)) { const [x, y] = P(...llOf(e)); s += `<circle class="pin-dim" cx="${x}" cy="${y}" r="${3 * u}"/>`; } });
  clusters.forEach((c, i) => {
    if (c.items.length === 1) { s += pinSvg(c.items[0], u, veryIn); return; }
    const n = c.items.length, cnt = {}; c.items.forEach(it => { cnt[it.e.cat] = (cnt[it.e.cat] || 0) + 1; });
    const main = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0], r = (9 + Math.min(8, n)) * u, key = "c" + i;
    S.clusters[key] = c.items.map(it => it.e.id);
    // anillo con los colores de las líneas presentes
    let a0 = -Math.PI / 2, ring = "";
    Object.entries(cnt).forEach(([k, v]) => { const a1 = a0 + 2 * Math.PI * v / n; const large = a1 - a0 > Math.PI ? 1 : 0;
      ring += n === v ? `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="none" stroke="${D.cats[k].color}" stroke-width="${3.2 * u}"/>` :
        `<path d="M${c.x + r * Math.cos(a0)},${c.y + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c.x + r * Math.cos(a1)},${c.y + r * Math.sin(a1)}" fill="none" stroke="${D.cats[k].color}" stroke-width="${3.2 * u}"/>`; a0 = a1; });
    s += `<g class="clu" data-cl="${key}" tabindex="0" role="button" aria-label="${n} ${esc(tx("exp_h"))}"><circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${D.cats[main].color}" stroke="var(--land)" stroke-width="${1.6 * u}"/>${ring}
      <text x="${c.x}" y="${c.y + 4.2 * u}" font-size="${12 * u}" text-anchor="middle">${n}</text></g>`;
  });
  ov.innerHTML = s;
}
function pinSvg(it, u, veryIn) {
  const e = it.e, x = it.x, y = it.y, col = D.cats[e.cat].color, on = S.active === e.id, r = (veryIn || on ? 8.6 : 6.8) * u;
  const lbl = (on || veryIn) ? `<text x="${x + r + 5 * u}" y="${y + 4 * u}" font-size="${11.5 * u}" stroke-width="${4 * u}">${esc(tr(e, "name"))}</text>` : "";
  const glyph = (veryIn || on) ? `<g transform="translate(${x} ${y}) scale(${u * 1.05})" style="color:${col}">${GLYPH[e.cat] || ""}</g>` : `<circle cx="${x}" cy="${y}" r="${2.4 * u}" fill="#fff"/>`;
  return `<g class="pin${on ? " on" : ""}" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(tr(e, "name"))}">
    <circle class="halo" cx="${x}" cy="${y}" r="${r}" stroke="${col}" stroke-width="${2 * u}"/><circle class="dot" cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke-width="${2.2 * u}"/>${glyph}${lbl}</g>`;
}
function hotelSvg(h, sel, u, label) {
  const [x, y] = P(h.lat, h.lon), w = (sel ? 15 : 10) * u;
  return `<g class="hot${sel ? " sel" : ""}" data-h="${esc(h.id || "")}"><rect x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}" rx="${2.5 * u}"/>
    <path d="M${x - w * .3},${y + w * .25}v-${w * .5}M${x - w * .3},${y + w * .05}h${w * .6}v${w * .2}M${x - w * .05},${y - w * .1}h${w * .35}" stroke="#fff" stroke-width="${1.3 * u}" fill="none"/>
    ${label ? `<text x="${x + w * .8}" y="${y + 4 * u}" font-size="${(sel ? 12 : 10) * u}" stroke-width="${3.5 * u}" style="font-weight:${sel ? 800 : 500}">${esc(h.name)}</text>` : ""}</g>`;
}
function fincasSvg(u) {
  if (!S.fincas || !FINCAS.length || S.wl) return ""; let s = "";
  FINCAS.forEach(f => { const [x, y] = P(f.lat, f.lon), sel = S.R.finca === f.id, r = (sel ? 7 : 5) * u;
    s += `<g class="fin${sel ? " sel" : ""}" data-f="${esc(f.id)}" tabindex="0" role="button" aria-label="${esc(f.name)}"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.3}" transform="rotate(-30 ${x} ${y})"/><path d="M${x},${y - r * 1.1} Q${x - r * .4},${y} ${x},${y + r * 1.1}" stroke="var(--land)" stroke-width="${1.2 * u}" fill="none"/>
      ${(sel || px() < 0.9) ? `<text x="${x + r + 4 * u}" y="${y + 4 * u}" font-size="${10.5 * u}" stroke-width="${3.5 * u}">${esc(f.name)}</text>` : ""}</g>`; });
  return s;
}
function zoomCluster(key) {
  const ids = (S.clusters || {})[key]; if (!ids) return;
  const la = ids.map(i => llOf(byId[i])[0]), lo = ids.map(i => llOf(byId[i])[1]), pad = 0.025;
  animateTo(boxToVB(Math.min(...la) - pad, Math.max(...la) + pad, Math.min(...lo) - pad, Math.max(...lo) + pad));
}
function onMapClick(ev) {
  if (S.dragMoved) return;
  if (S.placing) { const r = wrapRect(), x = VB.x + (ev.clientX - r.left) * px(), y = VB.y + (ev.clientY - r.top) * px(); finishNewHotel(M.lat1 - y / M.k, x / M.k + M.lon0); return; }
  if (S.editing) { const m = ev.target.closest(".muni"); if (m) toggleZone(m.dataset.m); return; }
  const pin = ev.target.closest(".pin"), cl = ev.target.closest(".clu"), hot = ev.target.closest(".hot"), fin = ev.target.closest(".fin");
  if (fin) { openFinPop(fin.dataset.f); return; }
  if (pin) { openPop(pin.dataset.id); return; }
  if (cl) { zoomCluster(cl.dataset.cl); return; }
  if (hot) { const h = HOTELS.find(x => x.id === hot.dataset.h); if (h) { setHotel(h); toast(tx("h_chosen", h.name)); } return; }
  if (S.active) closePop();
}

/* ---------- leyenda (filtra por línea) ---------- */
function renderLegend() {
  const cnt = {}; EXP.forEach(e => { cnt[e.cat] = (cnt[e.cat] || 0) + 1; });
  $r("legend").innerHTML = Object.entries(D.cats).map(([k, c]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${S.cats.has(k)}"><i style="background:${c.color}"></i>${esc(catName(k))} <span class="sub">${cnt[k] || 0}</span></button>`).join("");
  $r("legend").querySelectorAll("[data-cat]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.cat, all = S.cats.size === Object.keys(D.cats).length;
    if (all) S.cats = new Set([k]); else if (S.cats.has(k)) S.cats.delete(k); else S.cats.add(k);   // primer toque = solo esa línea
    if (!S.cats.size) S.cats = new Set(Object.keys(D.cats));
    renderLegend(); S.refilter();
  }));
}

/* ---------- media ---------- */
function videosOf(id) {
  const v = CTX.priv && CTX.priv.videos && CTX.priv.videos[id];
  return CTX.loadVideo && Array.isArray(v) ? v.filter(x => x && /^[a-z0-9-]{1,60}$/.test(x.id || "") && x.partes > 0 && x.partes <= 20) : [];
}
const VURL = new Map();
function videoUrl(v) {
  if (!VURL.has(v.id)) VURL.set(v.id, CTX.loadVideo(v.id, v.partes).then(b => URL.createObjectURL(b)).catch(err => { VURL.delete(v.id); throw err; }));
  return VURL.get(v.id);
}
// Pone el video en cada <video data-vid> de root y lo reproduce (mudo, en bucle); si falla, queda el póster
function hydrate(root) {
  root.querySelectorAll("video[data-vid]").forEach(el => {
    if (el.dataset.ok) return; el.dataset.ok = "1";
    videoUrl({ id: el.dataset.vid, partes: +el.dataset.partes }).then(u => {
      if (!el.isConnected) return;
      el.src = u;
      if (el.dataset.auto) { el.muted = true; const pr = el.play(); if (pr && pr.catch) pr.catch(() => { el.controls = true; }); }
    }).catch(() => { el.controls = false; el.removeAttribute("data-auto"); });
  });
}
const posterOf = (v, e, big) => (v.poster ? (big ? ph1600(v.poster) : ph640(v.poster)) : (e.fotos[0] ? ph640(e.fotos[0]) : ""));
function videoTag(v, e, big, extra) {
  const po = posterOf(v, e, big);
  return `<video data-vid="${esc(v.id)}" data-partes="${+v.partes}" ${po ? `poster="${esc(po)}"` : ""} ${reduced() ? "controls" : 'data-auto="1"'} ${extra || ""} muted loop playsinline preload="none"></video>`;
}
function mediaBlock(e, { video = true, label = true, big = false, one = false } = {}) {
  const vids = videosOf(e.id);
  if (video && vids[0]) return videoTag(vids[0], e, big) + (label ? `<span class="vid-tag">▶ Video</span>` : "");
  const fotos = (e.fotos && e.fotos.length) ? e.fotos : (vids[0] && vids[0].poster ? [vids[0].poster] : []);
  if (fotos.length) {
    // Solo la primera foto se descarga de entrada; las demás, justo antes de mostrarse
    const later = p => (big && innerWidth > 700 ? ph1600(p) : ph640(p));
    return fotos.slice(0, one ? 1 : 5).map((p, i) => i ? `<img class="slide" data-src="${later(p)}" alt="" decoding="async">`
      : `<img class="slide on" src="${ph640(p)}"${big ? ` srcset="${ph640(p)} 640w, ${ph1600(p)} 1600w" sizes="(max-width: 700px) 100vw, 1100px" fetchpriority="high"` : ` loading="lazy"`} alt="${esc(tr(e, "name"))}" decoding="async">`).join("");
  }
  return `<div class="ph"><span>${ic("leaf")}</span>${esc(tx("photo_soon"))}<br><b>${esc(tr(e, "name"))}</b></div>`;
}
function startSlides(root) {
  slideTimers.forEach(clearInterval); slideTimers = [];
  if (reduced()) return;
  root.querySelectorAll(".media").forEach(md => { const s = [...md.querySelectorAll(".slide")]; if (s.length < 2) return; let i = 0;
    const load = k => { const im = s[k]; if (im && im.dataset.src && !im.getAttribute("src")) im.src = im.dataset.src; };
    load(1);
    const tid = setInterval(() => { if (!md.isConnected) { clearInterval(tid); return; } s[i].classList.remove("on"); i = (i + 1) % s.length; s[i].classList.add("on"); load((i + 1) % s.length); }, 3800); slideTimers.push(tid); });
}
function badges(e) {
  const b = [];
  if (e.nuevo) b.push(`<span class="new">${tx("b_new")}</span>`); if (e.propio) b.push(`<span class="own">${tx("b_own")}</span>`);
  if (e.com) b.push(`<span class="com">${tx("b_com")}</span>`); if (e.cord) b.push(`<span class="cord">${tx("b_cord")}</span>`);
  return b.length ? `<div class="badge">${b.join("")}</div>` : "";
}
// Distancia aproximada por carretera desde el hotel de «Arma tu ruta» (la finca, al municipio con finca más cercano)
function distKm(e) { const h = S.R && S.R.hotel; if (!h) return null; const tp = tourPoint(e, h); return Math.round(Math.max(1, hav([h.lat, h.lon], [tp.lat, tp.lon]) * 1.4)); }
const nearLine = e => { const k = distKm(e); return k == null ? "" : `<div class="near">${ic("pin", "sm")}${tx("near", k)}</div>`; };
const priceLine = e => { const f = fromPrice(e.id); return f ? `${tx("from_net")} <b>${cop(f.v)}</b> <span class="code">· ${f.pax} pax</span>` : tx("ask_rate"); };

/* ---------- lista de experiencias ---------- */
function renderList() {
  if (S.tab !== "exp") { S.listDirty = true; return; }      // se pinta al abrir «Experiencias»
  S.listDirty = false;
  const vis = visible(); let html = "", n = 0;
  const nw = $r("nearw"); if (nw) { const has = !!S.R.hotel; $r("near").disabled = !has; nw.classList.toggle("is-off", !has); $r("neart").textContent = has ? tx("near_sort") + " · " + S.R.hotel.name : tx("near_hint"); }
  for (const [k, c] of Object.entries(D.cats)) {
    const items = EXP.filter(e => e.cat === k && vis.has(e.id)); if (!items.length) continue; n += items.length;
    if (S.near && S.R.hotel) items.sort((a, b) => distKm(a) - distKm(b));
    html += `<div class="group"><h3><i style="background:${c.color}"></i>${esc(catName(k))} <span class="sub">${[...new Set(items.map(e => e.sub))].map(esc).join(" · ")}</span></h3><div class="cards">` +
      items.map(e => `<button type="button" class="card${S.active === e.id ? " on" : ""}" data-card="${e.id}">
        <div class="media">${mediaBlock(e, { video: false, one: true })}${badges(e)}${videosOf(e.id).length ? '<span class="vid-tag">▶ Video</span>' : ""}</div>
        <div class="body"><h4>${esc(tr(e, "name"))}</h4><div class="meta"><span class="code">${e.code}</span>${e.code ? " · " : ""}${esc(e.deptos)} · ${ic("clock", "sm")}${esc(tr(e, "dur"))}</div>
        <div class="lchips">${(e.langs || []).map(l => `<span title="${esc(langName(l))}">${l}</span>`).join("")}</div>${nearLine(e)}<div class="meta tl">${esc(tr(e, "tagline"))}</div>
        <div class="price">${priceLine(e)}</div></div></button>`).join("") + `</div></div>`;
  }
  $r("groups").innerHTML = html || `<p class="empty">${tx("none_match")}</p>`;
  $r("count").textContent = n === 1 ? tx("n_exp1") : tx("n_exp", n);
  $r("groups").querySelectorAll("[data-card]").forEach(c => c.addEventListener("click", () => openFicha(c.dataset.card)));
}

/* ---------- tarjeta flotante en el mapa ---------- */
const inRoute = id => S.R.tours.some(t => t.id === id);
function openPop(id, fromList) {
  S.active = id; S.popLL = null; const e = byId[id]; setZones(S.wl ? null : e.zones);
  if (fromList) { const [x, y] = P(...llOf(e)); if (x < VB.x || x > VB.x + VB.w || y < VB.y || y > VB.y + VB.h) animateTo(boxToVB(...VIEWS.eje)); if (innerWidth <= 920) $r("mapwrap").scrollIntoView({ behavior: "smooth" }); }
  drawOverlay(); markActive();
  $r("pop").innerHTML = `<div class="pop" role="dialog" aria-label="${esc(tr(e, "name"))}">
    <button type="button" class="x" data-r="popx" aria-label="${esc(tx("close"))}">×</button><div class="media">${mediaBlock(e)}${badges(e)}</div>
    <div class="body"><span class="eyebrow">${esc(catName(e.cat))} · ${esc(e.sub)}</span><h3>${esc(tr(e, "name"))}</h3>
      <div class="row"><span><span class="code">${esc(e.code)}</span> · ${esc(e.deptos)}</span><span>${ic("clock", "sm")}${esc(tr(e, "dur"))}</span></div>
      <p class="tl">${esc(tr(e, "tagline"))}</p>${nearLine(e)}
      ${e.zones ? `<p class="note">${esc(tx("zones_note"))}</p>` : ""}
      <div class="price money">${priceLine(e)}</div>
      <div class="btnrow"><button type="button" class="btn" data-r="popopen">${tx("see_ficha")}</button>
        <button type="button" class="btn ghost add" data-add="${id}" aria-pressed="${inRoute(id)}">${inRoute(id) ? tx("in_route") : tx("add_route")}</button></div></div></div>`;
  const pop = $r("pop").firstChild; startSlides(pop); hydrate(pop); placePop();
  $r("popx").addEventListener("click", closePop); $r("popopen").addEventListener("click", () => openFicha(id));
  bindAdd(pop);
}
function placePop() {
  const p = $r("pop") && $r("pop").firstChild; if (!p || !(S.active || S.popLL)) return;
  const e = byId[S.active]; const ll = S.popLL || (e ? llOf(e) : null); if (!ll) return;
  const [x, y] = P(ll[0], ll[1]), wr = wrapRect();
  const sx = wr.left + (x - VB.x) / px(), sy = wr.top + (y - VB.y) / px(), pw = p.offsetWidth, ph = p.offsetHeight;
  let left = sx - pw / 2, top = sy - ph - 16; if (top < wr.top + 8) top = sy + 16;
  left = Math.max(wr.left + 10, Math.min(left, wr.right - pw - 10)); top = Math.max(Math.max(8, wr.top + 8), Math.min(top, wr.bottom - ph - 8));
  p.style.left = left + "px"; p.style.top = top + "px";
  p.style.visibility = (sx < wr.left || sx > wr.right || sy < wr.top || sy > wr.bottom) ? "hidden" : "visible";
}
function closePop() { S.active = null; S.popLL = null; setZones(null); $r("pop").innerHTML = ""; drawOverlay(); markActive(); }
function markActive() { if (S.listDirty) return; $r("groups").querySelectorAll("[data-card]").forEach(c => c.classList.toggle("on", c.dataset.card === S.active)); }
function openFinPop(id) {
  const f = finById[id]; S.active = "fin:" + id; S.popLL = [f.lat, f.lon]; drawOverlay();
  $r("pop").innerHTML = `<div class="pop" role="dialog" aria-label="${esc(f.name)}"><button type="button" class="x" data-r="popx" aria-label="${esc(tx("close"))}">×</button>
    <div class="body pad"><span class="eyebrow">${esc(tx("k_fin"))} · ${esc(tx("only_ag"))}</span><h3>${esc(f.name)}</h3><div class="row"><span>${ic("pin", "sm")}${esc(f.muni)}</span></div>
    ${f.aviso ? `<p class="fnote money">${esc(f.aviso)}</p>` : ""}
    <div class="btnrow"><button type="button" class="btn" data-r="finuse">${tx("add_route_l")}</button>${byId.finca ? `<button type="button" class="btn ghost" data-r="finficha">${tx("see_ficha")}</button>` : ""}</div></div></div>`;
  placePop(); $r("popx").addEventListener("click", closePop);
  $r("finuse").addEventListener("click", () => { if (!inRoute("finca")) toggleTour("finca"); S.R.finca = id; saveR(); renderRoute(); closePop(); setTab("ruta"); toast(f.name); });
  if ($r("finficha")) $r("finficha").addEventListener("click", () => openFicha("finca"));
}

/* ---------- ficha completa (orden lógico: qué es → qué incluye → cómo opera → para vender → tarifa) ---------- */
function openFicha(id) {
  const e = byId[id]; if (!e) return;
  if (S.active || S.popLL) closePop(); else $r("pop").innerHTML = "";
  const p = e.p, wl = S.wl;
  const gal = [...videosOf(id).map(v => ({ v, p: posterOf(v, e, false) })), ...(e.fotos || []).map(b => ({ i: b }))];
  const L1 = (title, arr, cls) => arr && arr.length ? `<ul class="ul${cls ? " " + cls : ""}">${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const fact = (icon, k, v) => v ? `<div><dt>${ic(icon, "sm")}${k}</dt><dd>${esc(v)}</dd></div>` : "";
  const grp = e.minPax ? tx("min_pax", e.minPax) + (e.maxPax ? " · " + tx("max_pax", e.maxPax) : "") : (e.maxPax ? tx("upto", e.maxPax) : "");
  const comb = (e.combina || []).map(c => c.id && byId[c.id] ? `<button type="button" data-go="${c.id}"><span class="th">${byId[c.id].fotos[0] ? `<img src="${ph640(byId[c.id].fotos[0])}" alt="" loading="lazy">` : `<span class="ph sm"></span>`}</span><span><b>${esc(tr(byId[c.id], "name"))}</b><br><span class="sub"><span class="code">${esc(byId[c.id].code)} · </span>${esc(tr(byId[c.id], "dur"))}</span></span></button>` : `<span class="ct">${esc(c.t)}</span>`).join("");
  const sell = !wl && (p.why || p.interesa || p.where || p.menu || p.impacto || p.team);
  const notes = !wl && p.notes && p.notes.length;
  const paxRows = seasonRows(PR.tours.get(id)), pax0 = rateRow(id, 2) ? 2 : (paxRows.length ? Math.min(...paxRows.map(r => r.pax_desde)) : 2);
  const rate = rateRow(id, pax0);
  const nav = [["exp", tx("s_exp")], ["tech", tx("s_tech")], ["incl", tx("s_incl")], ["oper", tx("s_oper")], ...(sell ? [["sell", tx("s_sell")]] : []), ...(!wl ? [["rate", tx("s_rate").split(" ")[0] === "Tarifa" ? "Tarifa" : "Rate"]] : [])];
  $r("ficha").innerHTML = `<div class="ficha" role="dialog" aria-modal="true" aria-label="${esc(tr(e, "name"))}" data-fid="${id}"><article class="sheet">
    <div class="hero"><div class="media">${mediaBlock(e, { label: false, big: true })}</div>${badges(e)}<button type="button" class="close" data-r="fx">${ic("x", "sm")}${tx("close")}</button>
      <div class="hero-txt"><span class="eyebrow">${esc(catName(e.cat))} · ${esc(e.sub)} · ${esc(e.deptos)}</span><h2>${esc(tr(e, "name"))}</h2><p>${esc(tr(e, "tagline"))}</p></div></div>
    <dl class="facts">${fact("clock", tx("f_dur_l"), tr(e, "dur"))}${fact("users", tx("f_mod"), tr(e, "modalidad"))}${fact("food", tx("f_lunch"), tr(e, "almuerzo"))}${fact("child", tx("f_age"), tr(e, "edad") || tx("ask"))}${fact("users", tx("f_group"), grp)}
      <div><dt>${ic("globe", "sm")}${tx("f_langs")}</dt><dd>${(e.langs || []).map(langName).map(esc).join(", ")}</dd></div><div class="code-wrap"><dt>${ic("tag", "sm")}${tx("f_code")}</dt><dd class="code">${esc(e.code)}</dd></div></dl>
    <nav class="fnav" aria-label="${esc(tr(e, "name"))}">${nav.map(([k, l]) => `<a href="#pf-f-${k}" data-jump="${k}">${esc(l)}</a>`).join("")}</nav>
    <div class="f-body"><div class="f-main">
      <section id="pf-f-exp"><h3>${tx("s_exp")}</h3>${(tr(e, "desc") || []).map(x => `<p>${esc(x)}</p>`).join("")}</section>
      <section id="pf-f-tech"><h3>${tx("s_tech")}</h3>${techTable(e)}</section>
      ${gal.length > 1 ? `<section><h3>${tx("s_photos")}</h3><div class="gallery">${gal.map((g, i) => `<button type="button" data-g="${i}" aria-label="${esc(tx("s_photos"))} ${i + 1}">${g.v ? `${g.p ? `<img src="${esc(g.p)}" alt="" loading="lazy">` : ""}<span class="play">▶ Video</span>` : `<img src="${ph640(g.i)}" alt="${esc(tr(e, "name"))} ${i + 1}" loading="lazy">`}</button>`).join("")}</div></section>` : ""}
      <section id="pf-f-incl" class="lists"><div><h3>${ic("check")}${tx("s_incl")}</h3>${L1("", tr(e, "incl"), "yes")}</div><div><h3>${ic("x")}${tx("s_noincl")}</h3>${L1("", tr(e, "noIncl"), "no")}</div></section>
      <section id="pf-f-oper"><h3>${tx("s_oper")}</h3>${L1("", tr(e, "oper")) || `<p>${tx("ask")}</p>`}</section>
      ${(tr(e, "reco") || []).length || (tr(e, "noApto") || []).length ? `<section><h3>${tx("s_reco")}</h3>${L1("", tr(e, "reco"))}${(tr(e, "noApto") || []).length ? `<p class="fnote">${ic("info", "sm")}${esc(tx("s_noapto"))}: ${tr(e, "noApto").map(esc).join(" ")}</p>` : ""}</section>` : ""}
      ${sell ? `<section id="pf-f-sell" class="sellbox"><h3>${tx("s_sell")} <span class="b2b">${tx("only_ag")}</span></h3>
        ${p.why ? `<div><h4>${tx("why")}</h4><p>${esc(p.why)}</p></div>` : ""}${p.interesa ? `<div><h4>${tx("interesa")}</h4><p>${esc(p.interesa)}</p></div>` : ""}
        ${p.where ? `<div><h4>${tx("where")}</h4><p>${esc(p.where)}</p>${e.zones ? `<div class="tags">${e.zones.map(z => `<span class="tag z">${esc(MUNI_LABEL(z))}</span>`).join("")}</div><p class="note">${tx("zones_note")}</p><div><button type="button" class="btn ghost sm" data-r="seez">${ic("map", "sm")}${tx("see_zones")}</button></div>` : ""}</div>` : ""}
        ${p.menu ? `<div><h4>${tx("menu")}</h4>${menuHtml(p.menu)}</div>` : ""}
        ${p.team ? `<div><h4>${L() === "en" ? "Team note" : "Nota del equipo"}</h4><p>${esc(p.team)}</p></div>` : ""}</section>` : ""}
      ${notes ? `<section><h3>${tx("s_notes")} <span class="b2b">${tx("only_ag")}</span></h3><ul class="fnotes">${p.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
      <section class="f-foot"><p class="note">${ic("child", "sm")}${esc(tx("kids"))}</p><div class="btnrow"><button type="button" class="btn ghost sm" data-cond="book">${ic("shield", "sm")}${tx("see_cond")}</button><button type="button" class="btn ghost sm" data-cond="about">${ic("info", "sm")}${tx("see_about")}</button></div></section>
    </div><aside class="aside">
      ${!wl ? `<div class="box netbox" id="pf-f-rate"><span class="eyebrow">${tx("s_rate")}</span><div class="big" data-r="net">${rate ? cop(rate.tarifa_neta) : tx("ask")}</div>
        <label>${tx("pax")} <input type="range" data-r="paxr" min="1" max="30" value="${pax0}"> <b data-r="paxn">${pax0}</b></label>
        <small>${esc(tarLabel())}. ${tx("per_pax")}.${rate && rate.temporada ? " " + esc(rate.temporada) + "." : ""}</small>${rate && rate._de ? `<span class="pill">${esc(tx("carry", rate._de, VIG))}</span>` : ""}
        ${p.supl.length ? `<div class="supl"><span class="eyebrow">${tx("s_supl")}</span><ul>${p.supl.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>` : ""}
      <div class="btnrow col"><button type="button" class="btn add" data-add="${id}" aria-pressed="${inRoute(id)}">${inRoute(id) ? tx("in_route") : tx("add_route_l")}</button>
        ${CTX.onRequest && !wl ? `<button type="button" class="btn ghost" data-r="freq">${ic("send", "sm")}${tx("request")}</button>` : ""}</div>
      ${(!wl && p.impacto) || e.com || e.cord ? `<div class="box impact"><span class="eyebrow">${tx("impact")}${p.impacto && !wl ? ` <span class="b2b">${tx("only_ag")}</span>` : ""}</span><p>${!wl && p.impacto ? `<b>${esc(impName(p.impacto))}</b>` : ""}${e.com ? `<span>${esc(tx("com_txt"))}</span>` : ""}${e.cord ? `<span>${esc(tx("cord_txt"))}</span>` : ""}</p></div>` : ""}
      ${comb ? `<div class="box"><span class="eyebrow">${tx("s_combo")}</span><div class="combo">${comb}</div></div>` : ""}
      <div class="box"><span class="eyebrow">${tx("s_kit")}</span><div class="kit">
        <button type="button" class="btn" data-pdf="none">${ic("download", "sm")}${tx("pdf_client")}</button>
        ${wl ? "" : `<button type="button" class="btn ghost" data-pdf="net">${ic("download", "sm")}${tx("pdf_net")}</button>`}
        <button type="button" class="btn ghost" data-r="ktxt">${ic("copy", "sm")}${tx("copy_txt")}</button><button type="button" class="btn ghost" data-r="klink">${ic("link", "sm")}${tx("copy_link")}</button></div>
        <p class="note" data-r="fst" aria-live="polite"></p>
        <small class="sub">${tx("pdf_note")} <a href="#" data-r="kpdf">${tx("pdf_more")}</a></small></div>
    </aside></div></article></div>`;
  document.body.style.overflow = "hidden";
  const f = $r("ficha").firstChild; startSlides(f); hydrate(f);
  $r("fx").addEventListener("click", closeFicha); f.addEventListener("click", ev => { if (ev.target === f) closeFicha(); });
  const pax = $r("paxr"); if (pax) pax.addEventListener("input", () => { $r("paxn").textContent = pax.value; const v = priceAt(id, +pax.value); $r("net").textContent = v != null ? cop(v) : tx("ask"); });
  f.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => lightbox(gal[+b.dataset.g])));
  f.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => openFicha(b.dataset.go)));
  f.querySelectorAll("[data-jump]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); const t = f.querySelector("#pf-f-" + a.dataset.jump); if (t) t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); }));
  f.querySelectorAll("[data-cond]").forEach(b => b.addEventListener("click", () => { closeFicha(); setTab("cond"); jumpCond(b.dataset.cond); }));
  const sz = $r("seez"); if (sz) sz.addEventListener("click", () => { closeFicha(); animateTo(boxToVB(...VIEWS.eje)); openPop(id); $r("mapwrap").scrollIntoView({ behavior: "smooth" }); });
  if ($r("freq")) $r("freq").addEventListener("click", () => { closeFicha(); CTX.onRequest({ tours: [{ tour_id: e.id, codigo: e.code, nombre: e.name }] }); });
  bindAdd(f);
  $r("kpdf").addEventListener("click", ev => { ev.preventDefault(); closeFicha(); K.sel = new Set([id]); setTab("kit"); });
  f.querySelectorAll("[data-pdf]").forEach(b => b.addEventListener("click", () => pdfRun([id], { lang: L() === "en" ? "EN" : "ES", logo: !S.wl, price: S.wl ? "none" : b.dataset.pdf, markup: 0, agency: "" }, $r("fst"), b)));
  $r("ktxt").addEventListener("click", () => copy(fichaText(e), tx("txt_copied")));
  $r("klink").addEventListener("click", () => copy(location.origin + location.pathname + "#ficha=" + id, tx("link_copied")));
  try { history.replaceState(null, "", location.pathname + location.search + "#ficha=" + id); } catch (err) { /* sin historial */ }
  f.querySelector("[data-r=fx]").focus({ preventScroll: true });
}
function closeFicha() {
  $r("ficha").innerHTML = ""; document.body.style.overflow = "";
  if (/#ficha=/.test(location.hash)) { try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* sin historial */ } }
}
function lightbox(g) {
  $r("lb").innerHTML = `<div class="lb" role="dialog" aria-modal="true"><button type="button" class="close">${ic("x", "sm")}${tx("close")}</button>${g.v ? `<video data-vid="${esc(g.v.id)}" data-partes="${+g.v.partes}" ${g.p ? `poster="${esc(g.p)}"` : ""} data-auto="1" controls muted loop playsinline></video>` : `<img src="${ph1600(g.i)}" alt="">`}</div>`;
  const lb = $r("lb").firstChild; hydrate(lb); lb.addEventListener("click", ev => { if (ev.target === lb || ev.target.closest(".close")) $r("lb").innerHTML = ""; });
}
// Menú del Excel («Opción 1. * Trucha … * Cerdo …»): una línea por plato, agrupado por opción
function menuHtml(m) {
  const parts = String(m).split(/(?=Opci[oó]n\s*\d)/i).map(x => x.trim()).filter(Boolean);
  return parts.map(op => { const [head, ...items] = op.split(/\s*\*\s*/).map(x => x.trim()).filter(Boolean);
    return items.length ? `<p class="menu"><b>${esc(head)}</b></p><ul class="ul">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="menu">${esc(op)}</p>`; }).join("");
}
const IMPN = { es: { "Ambiental": "🌿 Ambiental", "Sociocultural": "🤝 Sociocultural", "Económico": "💰 Económico" }, en: { "Ambiental": "🌿 Environmental", "Sociocultural": "🤝 Socio-cultural", "Económico": "💰 Economic" } };
const impName = x => (IMPN[L()] || IMPN.es)[x] || x;
// Ficha técnica del documento 2027: Parámetro operativo | Detalle técnico B2B | Especificación comercial (B2C).
// Todo sale de los datos (duración, operación, idiomas, ficha del Excel, tarifas); lo que falta dice «Consultar».
function franja(txt) {
  const hs = []; String(txt || "").replace(/(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/gi, (m, h, mm, ap) => { let x = +h; if (!mm && !ap) return m; if (ap && /p/i.test(ap) && x < 12) x += 12; if (x >= 5 && x <= 22) hs.push(x); return m; });
  if (!hs.length) return "";
  return hs.every(x => x < 12) ? tx("am") : hs.every(x => x >= 12) ? tx("pm") : tx("ampm");
}
function techTable(e) {
  const p = e.p, hrs = Number(e.hrs) || 0, oper = tr(e, "oper") || [];
  const full = hrs >= 7, durB = `${tr(e, "dur")}${hrs ? (full ? " (Full Day)" : hrs >= 3 ? " (Half Day)" : "") : ""}`;
  const durC = full ? (L() === "en" ? "Full day" : "Día completo") : hrs >= 3 ? (L() === "en" ? "Half day" : "Medio día") : tr(e, "dur");
  const d = String(p.diff || "").toLowerCase(), diff = /baja|f[aá]cil/.test(d) ? tx("low") : /media|moderad/.test(d) ? tx("mid") : /alta|exigente/.test(d) ? tx("high") : tx("ask");
  const capN = parseInt(p.cap, 10) || (seasonRows(PR.tours.get(e.id)).reduce((m, r) => Math.max(m, r.pax_hasta || 0), 0)) || e.maxPax || 0;
  const incl = (e.incl || []).join(" ").toLowerCase();
  const meet = e.athotel ? [tx("atHotel"), tx("atHotel")] : /transporte/.test(incl) ? [tx("pick"), tx("pickC")] : [tx("onsite"), tx("onsite")];
  const langs = (e.langs || []).map(langName).join(" / ") || tx("langC");
  const rows = [[tx("f_dur_l"), durB, durC], [tx("p_sched"), oper[0] || tx("ask"), franja(oper.join(" ")) || oper[0] || tx("ask")], [tx("p_diff"), diff, diff],
    [tx("p_cap"), capN ? tx("capB2B", capN) : tx("ask"), capN ? tx("capB2C", capN) : tx("ask")], [tx("p_meet"), meet[0], meet[1]], [tx("p_guide"), `${langs} (${tx("guide_sup")})`, langs]];
  return `<div class="tbl-wrap tech"><table><thead><tr><th>${tx("p_param")}</th>${S.wl ? "" : `<th>${tx("p_b2b")}</th>`}<th>${tx("p_b2c")}</th></tr></thead><tbody>
    ${rows.map(r => `<tr><th scope="row">${esc(r[0])}</th>${S.wl ? "" : `<td>${esc(r[1])}</td>`}<td>${esc(r[2])}</td></tr>`).join("")}</tbody></table></div>`;
}
function fichaText(e) {
  const j = a => (a || []).join(", ");
  let t = `${S.wl ? "" : e.code + " · "}${tr(e, "name")} (${e.deptos})\n${tr(e, "tagline")}\n\n${(tr(e, "desc") || []).join("\n\n")}\n\n`;
  t += `${tx("s_incl")}: ${j(tr(e, "incl"))}.\n${tx("s_noincl")}: ${j(tr(e, "noIncl"))}.\n${tx("f_dur_l")}: ${tr(e, "dur")} · ${tx("f_mod")}: ${tr(e, "modalidad")}${tr(e, "edad") ? " · " + tx("f_age") + ": " + tr(e, "edad") : ""}\n`;
  if ((tr(e, "oper") || []).length) t += `${tx("s_oper")}: ${tr(e, "oper").join(". ")}.\n`;
  if ((tr(e, "reco") || []).length) t += `${tx("s_reco")}: ${tr(e, "reco").join(" ")}\n`;
  return t;
}
function bindAdd(root) {
  root.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => { toggleTour(b.dataset.add); const on = inRoute(b.dataset.add); b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? tx("in_route") : (b.closest(".pop") ? tx("add_route") : tx("add_route_l")); }));
}

/* ---------- arma tu ruta ---------- */
const saveR = () => { ls.set("pf27-ruta", S.R); S.listDirty = true; };
function toggleTour(id) {
  if (inRoute(id)) S.R.tours = S.R.tours.filter(t => t.id !== id);
  else { const used = new Set(S.R.tours.map(t => t.day)); let d = +S.R.start; while (used.has(d) && d < 12) d++; S.R.tours.push({ id, day: d }); toast(tx("added_day", d)); }
  if (id === "finca" && !inRoute("finca")) S.R.finca = "";
  saveR(); renderRoute();
}
const hav = (a, b) => { const R = 6371, t = x => x * Math.PI / 180, dl = t(b[0] - a[0]), dn = t(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
function legInfo(a, b) { const km = Math.max(3, hav(a, b) * 1.4); const min = Math.round((km / 36 * 60 + 5) / 5) * 5; return { km: Math.round(km), min }; }
const fmtMin = m => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? String(m % 60).padStart(2, "0") : ""}`.trim() : `${m} min`);
const vehFor = p => D.vehicles.filter(v => !v.vip && !v.suplemento).find(v => p >= v.min && p <= v.max) || D.vehicles.filter(v => !v.vip && !v.suplemento).slice(-1)[0];
const vehName = v => { const x = L() === "en" && I18.en && I18.en.vehicles && I18.en.vehicles.find(y => y.id === v.id); return (x && x.name) || v.name; };
function tourPoint(e, h) {
  if (e.id === "finca" && S.R.finca && finById[S.R.finca]) { const f = finById[S.R.finca]; return { lat: f.lat, lon: f.lon, label: f.name + " · " + f.muni }; }
  if (e.athotel && h) return { lat: h.lat, lon: h.lon, label: tx("in_hotel") };
  if (e.zones && h) { let best = null; e.zones.forEach(z => { const c = M.mc[norm(z)]; if (!c) return; const d = hav([h.lat, h.lon], c); if (!best || d < best.d) best = { d, z, c }; });
    if (best) return { lat: best.c[0], lon: best.c[1], label: tx("finca_in", MUNI_LABEL(best.z)) }; }
  const [la, lo] = llOf(e); return { lat: la, lon: lo, label: e.deptos };
}
const apById = id => D.airports.find(a => a.id === id);
function buildRoute() {
  const R = S.R, h = R.hotel, legs = []; let n = 0;
  if (h && apById(R.arr)) { const a = apById(R.arr), i = legInfo([a.lat, a.lon], [h.lat, h.lon]); legs.push({ type: "t", day: 1, n: ++n, from: [a.lat, a.lon], to: [h.lat, h.lon], title: tx("arr_leg", a.id, h.name), sub: tx("arr_sub"), ...i }); }
  const tours = R.tours.slice().sort((x, y) => x.day - y.day);
  tours.forEach(t => { const e = byId[t.id]; if (!h) { legs.push({ type: "x", day: t.day, n: ++n, title: tr(e, "name"), sub: e.deptos + " · " + tx("choose_hotel"), nohotel: true, to: llOf(e) }); return; }
    const tp = tourPoint(e, h); const pts = [[h.lat, h.lon], ...(e.stops || []).map(s => [s[0], s[1]]), [tp.lat, tp.lon]];
    let km = 0, min = 0; for (let i = 1; i < pts.length; i++) { const li = legInfo(pts[i - 1], pts[i]); km += li.km; min += li.min; }
    legs.push({ type: "x", day: t.day, n: ++n, pts, to: [tp.lat, tp.lon], title: tr(e, "name"), sub: `${tp.label} · ${String(tr(e, "dur")).toLowerCase()} · ${tx("go_back")}`, km, min, id: e.id }); });
  if (h && apById(R.dep)) { const a = apById(R.dep), i = legInfo([h.lat, h.lon], [a.lat, a.lon]); const lastDay = Math.max(R.start, ...tours.map(t => t.day)) + 1;
    legs.push({ type: "t", day: lastDay, n: ++n, from: [h.lat, h.lon], to: [a.lat, a.lon], title: tx("dep_leg", h.name, a.id), sub: tx("dep_sub"), ...i }); }
  return legs;
}
function curve(a, b, u, bend = .18) { const [x1, y1] = P(...a), [x2, y2] = P(...b); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1; return `M${x1},${y1} Q${mx - dy * bend},${my + dx * bend} ${x2},${y2}`; }
function routeSvg(u) {
  if (S.tab !== "ruta" && !S.R.tours.length && !S.R.hotel) return "";
  const legs = buildRoute(); let s = "", nums = "";
  legs.forEach(l => {
    if (l.nohotel) return;
    if (l.type === "t") s += `<path class="leg-t" d="${curve(l.from, l.to, u, .12)}" stroke-width="${3 * u}" stroke-dasharray="${6 * u} ${6 * u}"/>`;
    else { for (let i = 1; i < l.pts.length; i++) s += `<path class="leg-x" d="${curve(l.pts[i - 1], l.pts[i], u, .22)}" stroke-width="${3.2 * u}" opacity=".85"/>`;
      s += `<path class="leg-s" d="${curve(l.pts[l.pts.length - 1], l.pts[0], u, .22)}" stroke-width="${2.4 * u}" stroke-dasharray="${2 * u} ${7 * u}"/>`; }
    const [x, y] = P(...l.to); const r = 8 * u; const off = l.type === "t" ? 14 * u : -14 * u;
    nums += `<g class="stopn"><circle cx="${x + off}" cy="${y - off}" r="${r}"/><text x="${x + off}" y="${y - off + 3.6 * u}" font-size="${10 * u}">${l.n}</text></g>`;
  });
  return s + nums;
}
function transferCode(h, ap) {
  const Z = D.zonas, mk = norm(h.muni || "");
  const g = h.zone || Z.grupos_por_municipio[mk] || (M.mdep[mk] === "66" ? "G4" : M.mdep[mk] === "17" ? "G5" : null);
  const rule = Z.reglas[ap];
  return rule && typeof rule === "object" && g ? rule[g] || null : null;
}
function routeTotals() {
  const R = S.R, h = R.hotel, p = R.pax, rows = []; let total = 0, quote = false;
  [[tx("tot_arr"), R.arr], [tx("tot_dep"), R.dep]].forEach(([lbl, a]) => { if (!h || !a) return; const c = transferCode(h, a); const v = c ? svcAt(c, p) : null;
    if (v != null) { total += v; rows.push({ t: lbl, c, v: cop(v) }); } else { quote = true; rows.push({ t: `${lbl} (${a})`, v: tx("quote") }); } });
  R.tours.slice().sort((a, b) => a.day - b.day).forEach(t => { const e = byId[t.id]; const v = priceAt(e.id, p);
    if (v == null) { quote = true; rows.push({ t: tr(e, "name"), v: tx("ask") }); } else { total += v; rows.push({ t: tr(e, "name"), v: cop(v) }); }
    if (e.id === "finca" && R.finca && finById[R.finca] && finById[R.finca].sup) { const f = finById[R.finca]; total += f.sup; rows.push({ t: tx("sup_of", f.name), v: cop(f.sup) }); } });
  return { rows, total, quote };
}
function renderRoute() {
  const R = S.R;
  $r("rn").textContent = R.tours.length;
  $r("rpax").value = R.pax; $r("rstart").value = R.start;
  const v = vehFor(R.pax);
  $r("rveh").innerHTML = `${ic("bus")}<span>${tx("veh_sug")}: <b>${esc(vehName(v))}</b> (${v.min}–${v.max} pax) · <a href="#" data-r="seeveh">${tx("see_fleet")}</a></span>`;
  $r("seeveh").addEventListener("click", ev => { ev.preventDefault(); setTab("trans"); renderTrans(v.id); });
  const ap = D.airports.map(a => `<option value="${a.id}">${a.id} · ${esc(a.name)} (${esc(a.city)})</option>`).join("") + `<option value="">${tx("no_tr")}</option>`;
  $r("rarr").innerHTML = ap; $r("rdep").innerHTML = ap; $r("rarr").value = R.arr; $r("rdep").value = R.dep;
  renderHotelBox();
  const list = R.tours.slice().sort((a, b) => a.day - b.day);
  $r("rtours").innerHTML = list.length ? list.map(t => { const e = byId[t.id], v = priceAt(e.id, R.pax); return `<div class="ti"><span class="th">${e.fotos[0] ? `<img src="${ph640(e.fotos[0])}" alt="">` : `<span class="ph sm"></span>`}</span>
    <div class="ti-t"><b>${esc(tr(e, "name"))}</b><br><span class="sub">${esc(tr(e, "dur"))} · <span class="money">${v == null ? tx("ask_rate") : cop(v) + " pp"}</span></span></div>
    <div class="ti-a"><select data-day="${e.id}" aria-label="${esc(tx("day", ""))}">${[...Array(12)].map((_, i) => `<option ${i + 1 === t.day ? "selected" : ""} value="${i + 1}">${tx("day", i + 1)}</option>`).join("")}</select>
    <button type="button" class="iconbtn" data-rm="${e.id}" aria-label="${esc(tx("remove"))}: ${esc(tr(e, "name"))}">${ic("x", "sm")}</button></div></div>
    ${e.id === "finca" && FINCAS.length ? `<div class="fsel"><label class="field">${tx("which_finca")}<select data-r="rfinca"><option value="">${tx("finca_auto")}</option>${FINCAS.map(x => `<option value="${esc(x.id)}" ${x.id === R.finca ? "selected" : ""}>${esc(x.name)} · ${esc(x.muni)}${x.sup && !S.wl ? ` · +${cop(x.sup)} pp` : ""}</option>`).join("")}</select></label>${R.finca && finById[R.finca] && finById[R.finca].aviso ? `<p class="fnote money">${esc(finById[R.finca].aviso)}</p>` : ""}</div>` : ""}`; }).join("")
    : `<p class="empty">${tx("r_empty")}</p>`;
  $r("radd").innerHTML = `<option value="">${tx("r_choose")}</option>` + Object.keys(D.cats).map(k => `<optgroup label="${esc(catName(k))}">${EXP.filter(e => e.cat === k && !inRoute(e.id)).map(e => `<option value="${e.id}">${esc(tr(e, "name"))}</option>`).join("")}</optgroup>`).join("");
  $r("rtours").querySelectorAll("[data-day]").forEach(s => s.addEventListener("change", () => { S.R.tours.find(t => t.id === s.dataset.day).day = +s.value; saveR(); renderRoute(); }));
  $r("rtours").querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => toggleTour(b.dataset.rm)));
  if ($r("rfinca")) $r("rfinca").addEventListener("change", e => { S.R.finca = e.target.value; saveR(); renderRoute(); fitRoute(); const g = finById[S.R.finca]; if (g && g.aviso && !S.wl) toast(g.aviso); });
  const legs = buildRoute(); let html = "", lastDay = 0;
  legs.forEach(l => { if (l.day !== lastDay) { html += `<div class="daytag">${tx("day", l.day)}</div>`; lastDay = l.day; }
    html += `<div class="leg"><span class="k">${l.n}</span><div><b>${esc(l.title)}</b><br><span class="sub">${esc(l.sub)}</span></div><span class="t">${l.km ? `≈ ${l.km} km<br>${fmtMin(l.min)}${l.type === "x" ? " " + tx("per_leg") : ""}` : ""}</span></div>`; });
  $r("rlegs").innerHTML = html || `<p class="empty">${tx("r_none")}</p>`;
  const T = routeTotals();
  $r("rtot").innerHTML = T.rows.length ? T.rows.map(r => `<div><span>${esc(r.t)}${r.c ? ` <span class="code">${esc(r.c)}</span>` : ""}</span><span>${esc(r.v)}</span></div>`).join("") + `<div class="g"><span>${tx("tot")}${T.quote ? tx("tot_q") : ""}</span><span>${cop(T.total)}</span></div><span class="note">${esc(tx("tot_note", R.pax, vehName(vehFor(R.pax)).toLowerCase(), tarLabel()))}</span>` : "";
  drawOverlay();
}
function itineraryText(forRequest) {
  const R = S.R, legs = buildRoute(), h = R.hotel;
  let t = tx("program", R.pax) + "\n" + (h ? `${tx("r3")}: ${h.name} (${MUNI_LABEL(h.muni)})\n` : "") + `${tx("vehicle")}: ${vehName(vehFor(R.pax))}\n`; let d = 0;
  legs.forEach(l => { if (l.day !== d) { t += `\n${tx("day", l.day)}\n`; d = l.day; } t += `• ${l.title} — ${l.sub}${l.km ? ` (≈ ${l.km} km, ${fmtMin(l.min)})` : ""}\n`; });
  if (!S.wl && !forRequest) { const T = routeTotals(); t += `\n${T.rows.map(r => r.t + (r.c ? " " + r.c : "") + ": " + r.v).join("\n")}\n${tx("tot")}: ${cop(T.total)}\nEspontáneos Travel · RNT 91795`; }
  return t.slice(0, forRequest ? 1900 : 20000);
}
function fitRoute() {
  const legs = buildRoute(); const pts = []; legs.forEach(l => { if (l.from) pts.push(l.from); if (l.to) pts.push(l.to); (l.pts || []).forEach(p => pts.push(p)); });
  if (S.R.hotel) pts.push([S.R.hotel.lat, S.R.hotel.lon]);
  if (pts.length < 2) return; const la = pts.map(p => p[0]), lo = pts.map(p => p[1]);
  const pad = .05; animateTo(boxToVB(Math.min(...la) - pad, Math.max(...la) + pad * 1.6, Math.min(...lo) - pad, Math.max(...lo) + pad));
  if (innerWidth <= 920) $r("mapwrap").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
}

/* ---------- hotel: aliados → usados antes → mapa abierto (OpenStreetMap) → enlace de Google Maps o tocar el mapa ---------- */
function setHotel(h) { S.R.hotel = { id: h.id, name: h.name, muni: h.muni, concept: h.concept || "", zone: h.zone || null, lat: h.lat, lon: h.lon, et: !!h.et }; rememberHotel(h); saveR(); renderRoute(); renderList(); fitRoute(); }
function renderHotelBox() {
  const box = $r("rhbox"), h = S.R.hotel;
  if (h && !S.newName) {
    box.innerHTML = `<div class="hsel">${ic("hotel")}<span><b>${esc(h.name)}</b><br><span class="sub">${esc(MUNI_LABEL(h.muni))}${h.concept ? " · " + esc(h.concept) : ""}${h.et ? ` · <span class="ally">${tx("h_ally")}</span>` : ""}</span></span><button type="button" class="btn ghost sm" data-r="hchange">${tx("h_change")}</button></div>`;
    $r("hchange").addEventListener("click", () => { S.R.hotel = null; saveR(); renderRoute(); setTimeout(() => { const q = $r("hq"); if (q) q.focus(); }, 0); });
    return;
  }
  if (S.newName) {
    box.innerHTML = `<div class="newh"><b>${esc(tx("h_place", S.newName))}</b>
      <label class="field">${tx("h_link")}<div class="inrow"><input data-r="hlink" placeholder="${esc(tx("h_link_ph"))}" inputmode="url"><button type="button" class="btn" data-r="hlinkok">${tx("h_locate")}</button></div></label>
      <span class="note">${tx("h_link_note")}</span>
      <div class="btnrow"><button type="button" class="btn ghost" data-r="htap">${ic("pin", "sm")}${tx("h_tap")}</button><button type="button" class="btn ghost" data-r="hcancel">${tx("cancel")}</button></div></div>`;
    $r("hlinkok").addEventListener("click", () => { const c = parseMaps($r("hlink").value); if (c) finishNewHotel(c[0], c[1]); else toast(tx("h_nolink")); });
    $r("htap").addEventListener("click", startPlacing);
    $r("hcancel").addEventListener("click", () => { S.newName = ""; stopPlacing(); renderHotelBox(); });
    return;
  }
  box.innerHTML = `<div class="combo-in"><label class="field">${tx("r3")}<input data-r="hq" type="search" autocomplete="off" placeholder="${esc(tx("h_ph"))}" role="combobox" aria-expanded="false" aria-controls="pf-hs" aria-autocomplete="list"></label><div class="sugg" id="pf-hs" data-r="hs" role="listbox" hidden></div></div>`;
  const q = $r("hq"), sg = $r("hs");
  let osm = null, osmQ = "";
  const pick = b => {
    if (b.dataset.pick) { const h = HOTELS.find(x => x.id === b.dataset.pick); if (h) setHotel(h); }
    else if (b.dataset.osm != null) { const o = osm[+b.dataset.osm]; setHotel({ id: "osm" + o.id, name: o.name, muni: nearestMuni(o.lat, o.lon), concept: o.type, lat: o.lat, lon: o.lon }); }
    else if (b.dataset.search) searchOsm(q.value.trim());
    else { S.newName = q.value.trim(); renderHotelBox(); }
  };
  const show = () => {
    const v = norm(q.value), raw = q.value.trim();
    const hits = HOTELS.filter(h => !v || norm(h.name).includes(v) || h.muni.includes(v)).slice(0, 8);
    let html = hits.map(h => `<button type="button" role="option" data-pick="${esc(h.id)}"><b>${esc(h.name)}</b>${h.et ? ` <span class="ally">${tx("h_ally")}</span>` : h.recent ? ` <span class="s2">· ${tx("h_recent")}</span>` : ""}<br><span class="s2">${esc(MUNI_LABEL(h.muni))}${h.concept ? " · " + esc(h.concept) : ""}</span></button>`).join("");
    if (osm && osmQ === raw) html += osm.length ? osm.map((o, i) => `<button type="button" role="option" data-osm="${i}"><b>${esc(o.name)}</b> <span class="s2">· OpenStreetMap</span><br><span class="s2">${esc(o.addr)}</span></button>`).join("") : `<p class="s2 pad">${tx("h_none")}</p>`;
    if (raw.length >= 3 && !(osm && osmQ === raw)) html += `<button type="button" class="new" data-search="1">${ic("map", "sm")}${esc(tx("h_osm", raw))}</button>`;
    if (raw) html += `<button type="button" class="new" data-newh="1">${ic("pin", "sm")}${esc(tx("h_new", raw))}</button>`;
    sg.innerHTML = html; sg.hidden = !html; q.setAttribute("aria-expanded", String(!sg.hidden));
    sg.querySelectorAll("button").forEach(b => b.addEventListener("mousedown", ev => { ev.preventDefault(); pick(b); }));
  };
  async function searchOsm(text) {
    if (!text) return; sg.innerHTML = `<p class="s2 pad">${tx("h_searching")}</p>`; sg.hidden = false;
    try {
      const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=co&accept-language=es&viewbox=-76.6,5.7,-74.8,3.3&bounded=1&q=" + encodeURIComponent(text);
      const r = await fetch(u, { headers: { Accept: "application/json" } }); const j = r.ok ? await r.json() : [];
      osm = (j || []).map(x => ({ id: x.place_id, name: x.name || String(x.display_name || "").split(",")[0], addr: String(x.display_name || "").split(",").slice(1, 4).join(","), lat: +x.lat, lon: +x.lon, type: x.type === "hotel" ? "Hotel" : "" })).filter(x => isFinite(x.lat));
    } catch (e) { osm = []; }
    osmQ = text; if (q.isConnected) show();
  }
  q.addEventListener("input", show); q.addEventListener("focus", show); q.addEventListener("blur", () => setTimeout(() => { sg.hidden = true; q.setAttribute("aria-expanded", "false"); }, 150));
  q.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); const f = sg.querySelector("button"); if (f) pick(f); } });
}
function parseMaps(s) {
  try { s = decodeURIComponent(s || ""); } catch (e) { /* tal cual */ }
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
  for (const p of pats) { const m = s.match(p); if (m) { const la = +m[1], lo = +m[2]; if (la > 2 && la < 7 && lo > -78 && lo < -74) return [la, lo]; } }
  return null;
}
function startPlacing() { S.placing = true; svg.classList.add("placing"); if (innerWidth <= 920) $r("mapwrap").scrollIntoView({ behavior: "smooth" });
  $r("banner").innerHTML = `<div class="mapbanner">${ic("pin", "sm")}${esc(tx("h_tap_b", S.newName))} <button type="button" data-r="bx">${tx("cancel")}</button></div>`; $r("bx").addEventListener("click", stopPlacing); }
function stopPlacing() { S.placing = false; svg.classList.remove("placing"); $r("banner").innerHTML = ""; }
function finishNewHotel(lat, lon) {
  const muni = nearestMuni(lat, lon);
  const h = { id: "c" + Date.now(), name: S.newName || "Hotel", muni, concept: tx("h_added"), lat, lon };
  S.newName = ""; stopPlacing(); HOTELS.push(Object.assign({ recent: true }, h)); setHotel(h); toast(tx("h_set", h.name, MUNI_LABEL(muni)));
}
function toggleZone() { /* reservado: edición de municipios con fincas (equipo ET) */ }

/* ---------- transporte ---------- */
function renderTrans(hl) {
  const pane = ROOT.querySelector('[data-pane="trans"]');
  const p = Math.min(30, Math.max(1, S.tpax || S.R.pax || 4)); const cur = hl || vehFor(p).id;
  const en = L() === "en" && I18.en && I18.en.vehicles ? Object.fromEntries(I18.en.vehicles.map(v => [v.id, v])) : {};
  const vf = (v, k) => (en[v.id] && en[v.id][k]) || v[k];
  const vc = v => `<div class="vcard${v.id === cur ? " on" : ""}${v.vip ? " vip" : ""}"><div class="media"><div class="ph">${ic("bus")}${tx("vid_soon")}</div></div>
    <div class="body"><span class="pax">${v.capacidad_max ? tx("tr_pax", v.min, v.max, v.capacidad_max) : tx("tr_upto", v.max)}</span><h4>${esc(vf(v, "name"))}</h4>${v.equipaje ? `<span class="sub">${esc(vf(v, "equipaje"))}</span>` : ""}<span class="sub">${esc(vf(v, "uso"))}</span>
    ${v.vip ? `<span class="sub"><b>${tx("vip")}</b></span>` : ""}${v.suplemento ? `<span class="sub code money">${esc(v.suplemento)}</span>` : ""}</div></div>`;
  const svcRows = pre => [...PR.svc.keys()].filter(c => c.startsWith(pre)).sort();
  const trs = svcRows("ET-"), sups = svcRows("SU-").filter(c => !/^SU-ET0(0[6-9]|1[0-2])$/.test(c)), guides = svcRows("SU-").filter(c => /^SU-ET0(0[6-9]|1[0-2])$/.test(c));
  const nm = c => (D.trayectos && D.trayectos[c]) || String((PR.svc.get(c)[0] || {}).nombre || c);
  const cond = (L() === "en" && CTX.empresa && CTX.empresa.en && CTX.empresa.en.fleet_cond) || (CTX.empresa && CTX.empresa.es && CTX.empresa.es.fleet_cond) || [];
  pane.innerHTML = `<h2>${tx("tr_h")}</h2><p class="lead">${tx("tr_l")}</p>
    <div class="vgrid">${D.vehicles.map(vc).join("")}</div>
    <div class="ccard"><h4>${ic("shield", "sm")}${tx("tr_cond")}</h4><ul>${cond.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>
    <div class="section money"><h3>${tx("tr_tab")}</h3>
      <div class="filters"><label class="field inline">${tx("pax")} <input data-r="tpax" type="number" min="1" max="30" value="${p}" inputmode="numeric"></label></div>
      ${trs.length ? `<div class="tbl-wrap"><table><thead><tr><th>${tx("tr_code")}</th><th>${tx("tr_route")}</th><th class="r">${tx("tr_pp", p)}</th></tr></thead><tbody>${trs.map(c => { const v = svcAt(c, p); return `<tr><td class="code">${esc(c)}</td><td>${esc(nm(c))}</td><td class="r">${v == null ? tx("quote") : cop(v)}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="empty">${tx("none_rates")}</p>`}
      <p class="note">${tx("tr_note")}</p></div>
    ${sups.length ? `<div class="section money"><h3>${tx("sup_tab")}</h3><div class="tbl-wrap"><table><thead><tr><th>${tx("tr_code")}</th><th>${tx("sup_t")}</th><th class="r">${tx("value")}</th></tr></thead><tbody>${sups.map(c => { const v = svcAt(c, p) ?? svcAt(c, 1); return `<tr><td class="code">${esc(c)}</td><td>${esc(nm(c))}</td><td class="r">${v == null ? tx("quote") : cop(v)}</td></tr>`; }).join("")}</tbody></table></div></div>` : ""}
    ${guides.length ? `<div class="section money"><h3>${tx("guide_tab")}</h3><div class="tbl-wrap"><table><thead><tr><th>${tx("tr_code")}</th><th>${tx("sup_t")}</th>${[...new Set(guides.flatMap(c => PR.svc.get(c).map(r => r.temporada)))].map(s => `<th class="r">${esc(s)}</th>`).join("")}</tr></thead><tbody>
      ${guides.map(c => { const rows = PR.svc.get(c), cols = [...new Set(guides.flatMap(g => PR.svc.get(g).map(r => r.temporada)))]; return `<tr><td class="code">${esc(c)}</td><td>${esc(nm(c).split("·").pop().trim())}</td>${cols.map(s => { const r = rows.find(x => x.temporada === s); return `<td class="r">${r ? cop(r.tarifa_neta) : "—"}</td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div></div>` : ""}`;
  const tp = pane.querySelector("[data-r=tpax]"); tp.addEventListener("change", () => { S.tpax = Math.min(30, Math.max(1, Math.round(+tp.value) || 1)); renderTrans(); });
}

/* ---------- condiciones: quiénes somos primero, luego reservas y pagos, menores, sostenibilidad, equipo ---------- */
function renderCond() {
  const pane = ROOT.querySelector('[data-pane="cond"]');
  const C = (L() === "en" && I18.en && I18.en.condiciones) || D.condiciones, E = (CTX.empresa && (CTX.empresa[L()] || CTX.empresa.es)) || null;
  const ul = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const pagos = (CTX.pagos && CTX.pagos.length ? CTX.pagos : (CTX.priv && CTX.priv.pagos)) || [];
  const secs = [["about", tx("c_about"), "info"], ["book", tx("c_book"), "shield"], ["kids", tx("c_kids"), "child"], ["sost", tx("c_sost"), "leaf"], ["team", tx("c_team"), "users"], ["read", tx("c_read"), "file"]];
  const pol = (k) => `<div class="pol"><h4>${k === "fit" ? tx("c_fit") : tx("c_grp")}</h4><dl>
      <div><dt>${tx("c_conf")}</dt><dd>${ul(C[k].conf)}</dd></div><div><dt>${tx("c_pay")}</dt><dd>${ul(C[k].pago)}</dd></div>
      <div><dt>${tx("c_mod")}</dt><dd>${ul(C[k].mod)}</dd></div><div><dt>${tx("c_canc")}</dt><dd>${ul(C[k].canc)}</dd></div></dl></div>`;
  pane.innerHTML = `<h2>${tx("c_h")}</h2><p class="lead">${tx("c_l")}</p>
    <nav class="cnav" aria-label="${esc(tx("c_h"))}">${secs.map(([k, l, i]) => `<a href="#pf-c-${k}" data-cj="${k}">${ic(i, "sm")}${esc(l)}</a>`).join("")}</nav>
    <section class="section" id="pf-c-about"><h3>${ic("info")}${tx("c_about")}</h3>
      ${E ? `<div class="cgrid">${E.pillars.map(([t, x]) => `<div class="ccard"><h4>${esc(t)}</h4><p>${esc(x)}</p></div>`).join("")}</div>` : ""}
      <div class="ccard hl"><h4>${ic("heart", "sm")}${tx("c_access")}</h4><p>${esc(C.accesible)}</p></div>
      ${C.about && C.about.length ? `<details class="ccard"><summary>${tx("c_more")}</summary>${C.about.map(p => `<p>${esc(p)}</p>`).join("")}</details>` : ""}</section>
    <section class="section" id="pf-c-book"><h3>${ic("shield")}${tx("c_book")}</h3><p class="note">${tx("c_2026")}</p>
      <div class="cgrid two">${pol("fit")}${pol("grp")}</div>
      <div class="ccard"><h4>${tx("c_gen")}</h4>${ul(C.gen)}</div>
      <div class="ccard"><h4>${tx("c_paym")}</h4>${pagos.length && !S.wl ? ul(pagos) : `<p>${tx("c_paym_ask")}</p>`}</div></section>
    <section class="section" id="pf-c-kids"><h3>${ic("child")}${tx("c_kids")}</h3><div class="ccard">${ul(C.menores)}</div></section>
    <section class="section" id="pf-c-sost"><h3>${ic("leaf")}${tx("c_sost")}</h3><div class="ccard"><p>${esc(C.sost)}</p><h4>${tx("c_actions")}</h4>${ul(C.acciones)}</div>
      ${E ? `<div class="ccard"><h4>${esc(E.impact_t || tx("c_imp_conv"))}</h4><p class="note">${esc(E.impact_note || "")}</p><div class="cgrid">${E.impacts.map(([i, t, x]) => `<div><h4>${i} ${esc(t)}</h4><p>${esc(x)}</p></div>`).join("")}</div></div>
        <div class="ccard"><h4>${esc(E.cases_t)}</h4><p class="note">${esc(E.cases_sub)}</p>${E.cases.map(([t, items], n) => `<details${n ? "" : " open"}><summary>${n + 1}. ${esc(t)}</summary>${ul(items)}</details>`).join("")}</div>` : ""}
      <div class="ccard"><h4>${tx("c_stories")}</h4><div class="cgrid">${(C.comunidad || []).map(c => `<div><h4>${esc(c.t)}</h4><p>${esc(c.p)}</p></div>`).join("")}</div></div></section>
    <section class="section" id="pf-c-team"><h3>${ic("users")}${tx("c_team")}</h3>
      <div class="team">${(C.equipo || []).map(p => `<div class="ccard person"><span class="av" aria-hidden="true">${esc(p.n.split(" ").map(x => x[0]).join("").slice(0, 2))}</span><div><h4>${esc(p.n)}</h4><p class="sub">${esc(p.r)}</p><p><a href="mailto:${esc(p.m)}">${ic("mail", "sm")}${esc(p.m)}</a></p></div></div>`).join("")}</div>
      ${E ? `<div class="ccard"><h4>${esc(E.drivers_t || tx("c_drivers"))}</h4><div class="team">${E.drivers.map(n => `<div class="person"><span class="av" aria-hidden="true">${esc(n.split(" ").map(x => x[0]).join(""))}</span><div><b>${esc(n)}</b><p class="sub">${esc(E.drivers_note)}</p></div></div>`).join("")}</div>
        <h4>${esc(E.team_t)}</h4><ul>${E.protocols.map(([t, x]) => `<li><b>${esc(t)}:</b> ${esc(x)}</li>`).join("")}</ul></div>` : ""}
      <div class="ccard"><h4>${ic("phone", "sm")}${tx("c_contact")}</h4>${ul(C.contacto)}</div></section>
    <section class="section" id="pf-c-read"><h3>${ic("file")}${tx("c_read")}</h3><div class="ccard">${ul(C.iconos)}</div></section>`;
  pane.querySelectorAll("[data-cj]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); jumpCond(a.dataset.cj); }));
}
function jumpCond(k) { const t = ROOT.querySelector("#pf-c-" + k); if (t) setTimeout(() => t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }), 30); }

/* ---------- pestaña Mapa (bienvenida) ---------- */
function depOf(e) { return DEPNAME[M.mdep[nearestMuni(e.lat, e.lon)]] || ""; }
function renderMapPane() {
  const cnt = {}; EXP.forEach(e => { const d = depOf(e); cnt[d] = (cnt[d] || 0) + 1; });
  const pane = ROOT.querySelector('[data-pane="mapa"]');
  const E = (CTX.empresa && (CTX.empresa[L()] || CTX.empresa.es)) || null;
  const ccount = {}; EXP.forEach(e => { ccount[e.cat] = (ccount[e.cat] || 0) + 1; });
  pane.innerHTML = `<h2>${tx("welcome")}</h2><p class="lead">${esc(tx("welcome_l", EXP.length))}</p>
    <div class="section"><h3>${ic("star")}${tx("conv_t")}</h3>
      ${E && E.impacts ? `<div class="conv">${E.impacts.map(([i, t, x]) => `<div class="ccard"><h4><span aria-hidden="true">${i}</span> ${esc(t)}</h4><p>${esc(x)}</p></div>`).join("")}</div>` : ""}
      <ul class="iconguide">
        <li>${ic("clock", "sm")}<span>${esc(tx("ic_dur"))}</span></li><li>${ic("pin", "sm")}<span>${esc(tx("ic_geo"))}</span></li>
        <li><span class="mini com">${tx("b_com")}</span><span>${esc(tx("ic_com"))}</span></li><li><span class="mini cord">${tx("b_cord")}</span><span>${esc(tx("ic_cord"))}</span></li>
        <li><span class="b2b">${tx("only_ag")}</span><span>${esc(tx("ic_b2b"))}</span></li><li>${ic("tag", "sm")}<span>${esc(tx("ic_code"))}</span></li></ul></div>
    ${E && E.pillars ? `<div class="section"><h3>${ic("info")}${tx("inst_t")}</h3><div class="cgrid">${E.pillars.slice(0, 3).map(([t, x]) => `<div class="ccard"><h4>${esc(t)}</h4><p>${esc(x)}</p></div>`).join("")}</div>
      <div class="btnrow mt"><button type="button" class="btn ghost sm" data-cond-go="about">${ic("info", "sm")}${tx("see_more")}</button></div></div>` : ""}
    <div class="section"><h3>${ic("grid")}${tx("idx_t")}</h3><p class="note">${tx("idx_l")}</p><div class="zbtns">${Object.entries(D.cats).map(([k, c]) => `<button type="button" class="chip" data-idx="${k}"><i style="background:${c.color}"></i>${esc(catName(k))} <span class="sub">${ccount[k] || 0}</span></button>`).join("")}</div></div>
    <div class="section"><h3>${ic("route")}${tx("how_t")}</h3><ol class="howto">${[["map", "how1"], ["file", "how2"], ["route", "how3"], ["download", "how4"]].map(([i, k], n) => `<li><span class="hn">${ic(i)}</span><span><b>${tx(k)}</b> ${tx(k + "b")}</span></li>`).join("")}</ol>
    </div><div class="section"><h3>${tx("go_zone")}</h3><div class="zbtns">${Object.keys(ZONEVIEW).map(z => `<button type="button" class="chip" data-zone="${esc(z)}">${ic("pin", "sm")}${esc(z)}${cnt[z] ? ` <span class="sub">${cnt[z]}</span>` : ""}</button>`).join("")}<button type="button" class="chip" data-zone="">${ic("map", "sm")}${tx("all_eje")} <span class="sub">${EXP.length}</span></button></div></div>
    ${FINCAS.length || HOTELS.length ? `<div class="section"><h3>${tx("layers")}</h3><div class="zbtns">
      ${FINCAS.length ? `<button type="button" class="chip" data-layer="fincas" aria-pressed="${S.fincas}"><svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><ellipse cx="6" cy="7" rx="5" ry="6" fill="var(--bean)"/></svg>${tx("k_fin")}</button>` : ""}
      ${HOTELS.length ? `<button type="button" class="chip" data-layer="hotels" aria-pressed="${S.hotels}"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" rx="3" fill="var(--bean)"/></svg>${tx("k_hot")}</button>` : ""}</div></div>` : ""}
    <div class="section"><h3>${tx("shortcuts")}</h3><div class="zbtns"><button type="button" class="btn ghost" data-go-tab="exp">${ic("grid", "sm")}${tx("sc_exp")}</button><button type="button" class="btn ghost" data-go-tab="ruta">${ic("route", "sm")}${tx("sc_ruta")}</button><button type="button" class="btn ghost" data-go-tab="kit">${ic("file", "sm")}${tx("sc_kit")}</button><button type="button" class="btn ghost" data-go-tab="cond">${ic("info", "sm")}${tx("sc_cond")}</button></div></div>`;
  pane.querySelectorAll("[data-zone]").forEach(b => b.addEventListener("click", () => { animateTo(boxToVB(...(ZONEVIEW[b.dataset.zone] || VIEWS.region))); if (innerWidth <= 920) $r("mapwrap").scrollIntoView({ behavior: "smooth" }); }));
  pane.querySelectorAll("[data-layer]").forEach(b => b.addEventListener("click", () => toggleLayer(b.dataset.layer)));
  pane.querySelectorAll("[data-go-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.goTab)));
  pane.querySelectorAll("[data-cond-go]").forEach(b => b.addEventListener("click", () => { setTab("cond"); jumpCond(b.dataset.condGo); }));
  pane.querySelectorAll("[data-idx]").forEach(b => b.addEventListener("click", () => { S.cats = new Set([b.dataset.idx]); renderLegend(); S.refilter(); setTab("exp"); }));
}

/* ---------- kit de venta (PDF en el navegador con jsPDF, cargado solo al usarlo) ---------- */
const KL = {
  ES: { oper: "Operación", supl: "Suplementos", title: "Paisaje Cultural Cafetero · Experiencias 2027", incl: "Incluye", noIncl: "No incluye", reco: "Recomendaciones", dur: "Duración", langs: "Idiomas", price: "Precio por persona", pax: "pax", note: "Valores en pesos colombianos (COP) por persona. Sujetos a disponibilidad.", consult: "Consultar", exp: "Experiencias incluidas", mod: "Modalidad", age: "Edad", prepared: "Preparado por" },
  EN: { oper: "Operation", supl: "Supplements", title: "Coffee Cultural Landscape · 2027 Experiences", incl: "Includes", noIncl: "Not included", reco: "Recommendations", dur: "Duration", langs: "Languages", price: "Price per person", pax: "pax", note: "Prices in Colombian pesos (COP) per person. Subject to availability.", consult: "On request", exp: "Experiences included", mod: "Format", age: "Age", prepared: "Prepared by" },
  FR: { oper: "Fonctionnement", supl: "Suppléments", title: "Paysage culturel du café · Expériences 2027", incl: "Comprend", noIncl: "Ne comprend pas", reco: "Recommandations", dur: "Durée", langs: "Langues", price: "Prix par personne", pax: "pers.", note: "Prix en pesos colombiens (COP) par personne. Sous réserve de disponibilité.", consult: "Sur demande", exp: "Expériences incluses", mod: "Format", age: "Âge", prepared: "Préparé par" },
  IT: { oper: "Operatività", supl: "Supplementi", title: "Paesaggio Culturale del Caffè · Esperienze 2027", incl: "Include", noIncl: "Non include", reco: "Consigli", dur: "Durata", langs: "Lingue", price: "Prezzo a persona", pax: "pax", note: "Prezzi in pesos colombiani (COP) a persona. Soggetti a disponibilità.", consult: "Su richiesta", exp: "Esperienze incluse", mod: "Modalità", age: "Età", prepared: "A cura di" },
  PT: { oper: "Operação", supl: "Suplementos", title: "Paisagem Cultural do Café · Experiências 2027", incl: "Inclui", noIncl: "Não inclui", reco: "Recomendações", dur: "Duração", langs: "Idiomas", price: "Preço por pessoa", pax: "pax", note: "Valores em pesos colombianos (COP) por pessoa. Sujeitos a disponibilidade.", consult: "Sob consulta", exp: "Experiências incluídas", mod: "Modalidade", age: "Idade", prepared: "Preparado por" }
};
const LNAME = { ES: "Español", EN: "English", FR: "Français", IT: "Italiano", PT: "Português" };
const K = { sel: null, lang: "ES", logo: true, price: "none", markup: 15, agency: "" };
function renderKit() {
  if (!K.sel) K.sel = new Set(S.R.tours.map(t => t.id));
  const logoV = K.logo && !S.wl, priceV = S.wl ? "none" : K.price;
  const pane = ROOT.querySelector('[data-pane="kit"]');
  pane.innerHTML = `<h2>${tx("k_h")}</h2><p class="lead">${tx("k_l")}</p>
   <div class="steps">
    <div class="step"><h3><span class="k">1</span>${tx("k1")} <span class="sub" data-r="kcount"></span></h3><div class="kchk">${Object.entries(D.cats).map(([k, c]) => { const its = EXP.filter(e => e.cat === k); return its.length ? `<fieldset><legend><label><input type="checkbox" data-kc="${k}"> <i style="background:${c.color}"></i>${esc(catName(k))}</label></legend>${its.map(e => `<label><input type="checkbox" data-k="${e.id}" ${K.sel.has(e.id) ? "checked" : ""}> <span class="code">${e.code}</span> ${esc(tr(e, "name"))}</label>`).join("")}</fieldset>` : ""; }).join("")}</div>
      <div class="btnrow"><button type="button" class="btn ghost sm" data-r="kroute">${ic("route", "sm")}${tx("k_route")}</button><button type="button" class="btn ghost sm" data-r="kall">${tx("k_all")}</button><button type="button" class="btn ghost sm" data-r="knone">${tx("k_none")}</button></div></div>
    <div class="step"><h3><span class="k">2</span>${tx("k2")}</h3><div class="row2">
      <label class="field">${tx("k_lang")}<select data-r="klang">${Object.entries(LNAME).map(([k, v]) => `<option value="${k}" ${k === K.lang ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="field">${tx("k_logo")}<select data-r="klogo" ${S.wl ? "disabled" : ""}><option value="1" ${logoV ? "selected" : ""}>${tx("k_with")}</option><option value="0" ${logoV ? "" : "selected"}>${tx("k_without")}</option></select></label></div>
      <label class="field" data-r="kagw">${tx("k_agency")}<input data-r="kag" maxlength="80" value="${esc(K.agency)}"></label>
      <p class="note" data-r="ktr" ${K.lang === "ES" ? "hidden" : ""}>${ic("info", "sm")}${tx("k_trnote")}</p></div>
    <div class="step${S.wl ? " is-off" : ""}"><h3><span class="k">3</span>${tx("k3")}</h3>
      <label class="field">${tx("k_price")}<select data-r="kprice" ${S.wl ? "disabled" : ""}><option value="none">${tx("k_pn")}</option><option value="net">${tx("k_pnet")}</option><option value="sell">${tx("k_psell")}</option></select></label>
      <label class="field" data-r="kmkw">${tx("k_mk")}<input data-r="kmk" type="number" min="0" max="100" step="1" value="${K.markup}" inputmode="numeric"></label>
      <span class="note">${tx("k_pnote")} (${esc(tarLabel())})</span></div>
    <div class="step"><button type="button" class="btn big" data-r="kgo">${ic("download")}${tx("k_go")}</button><p class="note" data-r="kst" aria-live="polite"></p></div>
   </div>`;
  const count = () => { $r("kcount").textContent = tx("k_sel", K.sel.size); pane.querySelectorAll("[data-kc]").forEach(c => { const ids = EXP.filter(e => e.cat === c.dataset.kc).map(e => e.id); const n = ids.filter(i => K.sel.has(i)).length; c.checked = n === ids.length; c.indeterminate = n > 0 && n < ids.length; }); };
  pane.querySelectorAll("[data-k]").forEach(c => c.addEventListener("change", () => { c.checked ? K.sel.add(c.dataset.k) : K.sel.delete(c.dataset.k); count(); }));
  pane.querySelectorAll("[data-kc]").forEach(c => c.addEventListener("change", () => { EXP.filter(e => e.cat === c.dataset.kc).forEach(e => (c.checked ? K.sel.add(e.id) : K.sel.delete(e.id))); pane.querySelectorAll("[data-k]").forEach(x => { x.checked = K.sel.has(x.dataset.k); }); count(); }));
  $r("kroute").addEventListener("click", () => { K.sel = new Set(S.R.tours.map(t => t.id)); renderKit(); });
  $r("kall").addEventListener("click", () => { K.sel = new Set(EXP.map(e => e.id)); renderKit(); });
  $r("knone").addEventListener("click", () => { K.sel = new Set(); renderKit(); });
  const pr = $r("kprice"); pr.value = priceV; $r("kmkw").hidden = priceV !== "sell";
  pr.addEventListener("change", () => { K.price = pr.value; $r("kmkw").hidden = pr.value !== "sell"; });
  $r("kmk").addEventListener("input", e => { K.markup = Math.max(0, Math.min(100, +e.target.value || 0)); });
  $r("klang").addEventListener("change", e => { K.lang = e.target.value; $r("ktr").hidden = K.lang === "ES"; });
  $r("klogo").addEventListener("change", e => { K.logo = e.target.value === "1"; });
  $r("kag").addEventListener("input", e => { K.agency = e.target.value; });
  $r("kgo").addEventListener("click", makePDF);
  count();
}
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = "/js/vendor/jspdf.umd.min.js"; s.onload = () => (window.jspdf ? ok(window.jspdf) : bad(new Error("jspdf"))); s.onerror = bad; document.head.appendChild(s); });
}
const pdfTxt = s => String(s || "").replace(/[‑‐]/g, "-").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/·/g, "·").replace(/[^\x00-\xFF€]/g, "");
async function imgData(url, w = 1400, h = 680) {
  const b = await (await fetch(url)).blob(); const bm = await createImageBitmap(b); const c = document.createElement("canvas"); c.width = w; c.height = h;
  const r = Math.max(w / bm.width, h / bm.height), sw = w / r, sh = h / r; c.getContext("2d").drawImage(bm, (bm.width - sw) / 2, (bm.height - sh) / 2, sw, sh, 0, 0, w, h); return c.toDataURL("image/jpeg", .82);
}
async function logoData() { try { const b = await (await fetch("/assets/img/logo.png")).blob(); const bm = await createImageBitmap(b); const c = document.createElement("canvas"); c.width = 240; c.height = Math.round(240 * bm.height / bm.width); c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height); return { d: c.toDataURL("image/png"), r: c.height / c.width }; } catch (e) { return null; } }
// Suplementos con su valor: en precio de venta, el valor sube con el markup del asesor (redondeado a miles)
const markupMoney = (s, mk) => (!mk ? String(s) : String(s).replace(/\$\s?([\d.]{4,})/g, (m, n) => "$" + (Math.round(+n.replace(/\./g, "") * (1 + mk / 100) / 1000) * 1000).toLocaleString("es-CO")));
// Descarga el archivo; en celulares o navegadores internos (WhatsApp, Instagram) que no descargan, queda el enlace para abrirlo
function savePdf(blob, fname, st) {
  const url = URL.createObjectURL(blob);
  try { const a = document.createElement("a"); a.href = url; a.download = fname; a.rel = "noopener"; a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* queda el enlace */ }
  if (st) st.innerHTML = `${esc(tx("k_done", fname))} · <a href="${url}" target="_blank" rel="noopener" download="${esc(fname)}">${esc(tx("k_open"))}</a>`;
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
}
async function pdfRun(ids, o, st, btn) {
  ids = ids.filter(id => byId[id]);
  if (!ids.length) { if (st) st.textContent = tx("k_need"); return false; }
  if (btn) btn.disabled = true; if (st) st.textContent = tx("k_making");
  try { const r = await buildPdf(ids, o); savePdf(r.blob, r.fname, st); return true; }
  catch (e) { if (st) st.textContent = e && e.code === "lib" ? tx("k_nolib") : tx("k_err"); if (window.console) console.error(e); return false; }
  finally { if (btn) btn.disabled = false; }
}
function makePDF() {
  const wl = !!(S && S.wl);
  return pdfRun([...K.sel], { lang: K.lang, logo: K.logo && !wl, price: wl ? "none" : K.price, markup: K.markup, agency: K.agency }, $r("kst"), $r("kgo"));
}
// o = { lang: ES|EN|FR|IT|PT, logo, price: none|net|sell, markup, agency }. Una sola ficha: sin portada.
async function buildPdf(ids, o) {
  const lang = o.lang || "ES", LB = KL[lang] || KL.ES, lg = lang.toLowerCase(), logo = !!o.logo, price = o.price || "none", mk = price === "sell" ? (+o.markup || 0) : 0;
  if (lang !== "ES") await loadLang(lang);
  const { jsPDF } = await loadJsPDF().catch(() => { throw Object.assign(new Error("lib"), { code: "lib" }); });
  const doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210, Mg = 16, CW = W - 2 * Mg; const OL = [74, 92, 58];
  const agency = pdfTxt(String(o.agency || "").trim());
  const foot = () => { doc.setFontSize(8); doc.setTextColor(120); doc.setFont("helvetica", "normal"); doc.text(pdfTxt(logo ? "Espontáneos Travel SAS · RNT 91795 · info@espontaneostravel.com · WhatsApp +57 318 720 0023" : (agency || "Paisaje Cultural Cafetero") + " · 2027"), Mg, 289); doc.text(String(doc.getNumberOfPages()), W - Mg, 289, { align: "right" }); };
  const lgo = logo ? await logoData() : null;
  let y = Mg, first = true;
  if (ids.length > 1) {
    // portada
    doc.setFillColor(...OL); doc.rect(0, 0, W, 72, "F"); doc.setTextColor(255);
    if (logo) { if (lgo) { try { doc.addImage(lgo.d, "PNG", Mg, 12, 22, 22 * lgo.r); } catch (e) { /* sin logo */ } }
      doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text(pdfTxt("Espontáneos Travel"), Mg + 27, 24); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text(pdfTxt("Armenia, Quindío · Colombia · RNT 91795"), Mg + 27, 31); }
    else if (agency) { doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text(agency, Mg, 28); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(pdfTxt(LB.title), Mg, 60);
    const cover = ids.map(id => byId[id].fotos[0]).find(Boolean);
    y = 80;
    if (cover) { try { doc.addImage(await imgData(ph1600(cover), 1400, 900), "JPEG", Mg, y, CW, CW * 900 / 1400); y += CW * 900 / 1400 + 10; } catch (e) { /* sin foto */ } }
    doc.setTextColor(30); doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.text(pdfTxt(LB.exp), Mg, y); y += 7; doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    ids.forEach((id, i) => { const e = byId[id]; if (y > 275) { foot(); doc.addPage(); y = 20; } doc.text(pdfTxt(`${i + 1}. ${tr(e, "name", lg)} · ${e.deptos} · ${tr(e, "dur", lg)}`), Mg, y); y += 6; });
    if (agency && logo) { y += 4; doc.setTextColor(90); doc.setFontSize(9.5); doc.text(pdfTxt(LB.prepared + ": " + String(o.agency).trim()), Mg, Math.min(y, 280)); }
    foot(); first = false;
  }
  for (const id of ids) {
    const e = byId[id];
    if (!first) doc.addPage();
    y = Mg;
    if (first) {
      // ficha individual: franja con la marca (o la agencia) en vez de portada
      doc.setFillColor(...OL); doc.rect(0, 0, W, 16, "F"); doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      if (logo && lgo) { try { doc.addImage(lgo.d, "PNG", Mg, 2.5, 11, 11 * lgo.r); } catch (err) { /* sin logo */ } }
      doc.text(pdfTxt(logo ? "Espontáneos Travel · " + LB.title : (agency ? agency + " · " : "") + LB.title), logo ? Mg + 14 : Mg, 10);
      y = 22; first = false;
    }
    const fh = ids.length === 1 ? 560 : 680;     // ficha individual: foto un poco más baja para que todo quepa en una página
    const ph = e.fotos[0]; if (ph) { try { doc.addImage(await imgData(ph1600(ph), 1400, fh), "JPEG", Mg, y, CW, CW * fh / 1400); y += CW * fh / 1400 + 7; } catch (err) { /* sin foto */ } }
    doc.setTextColor(...OL); doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.splitTextToSize(pdfTxt(tr(e, "name", lg)), CW).forEach(l => { doc.text(l, Mg, y + 4); y += 8; });
    doc.setTextColor(90); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    const meta = `${logo && price !== "none" ? e.code + " · " : ""}${e.deptos} · ${LB.dur}: ${tr(e, "dur", lg)} · ${LB.mod}: ${tr(e, "modalidad", lg)}${tr(e, "edad", lg) ? " · " + LB.age + ": " + tr(e, "edad", lg) : ""} · ${LB.langs}: ${(e.langs || []).join(" · ")}`;
    doc.splitTextToSize(pdfTxt(meta), CW).forEach(l => { doc.text(l, Mg, y + 2); y += 4.6; }); y += 3;
    doc.setTextColor(30); doc.setFont("helvetica", "italic"); doc.setFontSize(11); doc.splitTextToSize(pdfTxt(tr(e, "tagline", lg)), CW).forEach(l => { doc.text(l, Mg, y); y += 5.5; }); y += 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const para = t => { doc.splitTextToSize(pdfTxt(t), CW).forEach(l => { if (y > 272) { foot(); doc.addPage(); y = Mg; } doc.text(l, Mg, y); y += 5; }); y += 2; };
    (tr(e, "desc", lg) || []).forEach(para);
    const list = (title, arr, x, w) => { let yy = y; doc.setFont("helvetica", "bold"); doc.setTextColor(...OL); doc.text(pdfTxt(title), x, yy); yy += 5.5; doc.setFont("helvetica", "normal"); doc.setTextColor(30);
      (arr || []).forEach(a => doc.splitTextToSize(pdfTxt("- " + a), w).forEach(l => { if (yy > 280) { foot(); doc.addPage(); yy = Mg; } doc.text(l, x, yy); yy += 4.8; })); return yy; };
    const incl = tr(e, "incl", lg) || [], noi = tr(e, "noIncl", lg) || [];
    if (incl.length || noi.length) {
      const nl = (arr, w) => (arr || []).reduce((n, a) => n + doc.splitTextToSize(pdfTxt("- " + a), w).length, 0);
      const need = 6 + Math.max(nl(incl, CW / 2 - 4), nl(noi, CW / 2 - 4)) * 4.8;
      if (y + need > 280 && need <= 280 - Mg) { foot(); doc.addPage(); y = Mg; }
      if (y + need <= 280) { const y1 = list(LB.incl, incl, Mg, CW / 2 - 4), y2 = list(LB.noIncl, noi, Mg + CW / 2 + 4, CW / 2 - 4); y = Math.max(y1, y2) + 3; }
      else { y = list(LB.incl, incl, Mg, CW) + 3; if (y > 270) { foot(); doc.addPage(); y = Mg; } y = list(LB.noIncl, noi, Mg, CW) + 3; }
    }
    if ((tr(e, "oper", lg) || []).length) { if (y > 250) { foot(); doc.addPage(); y = Mg; } y = list(LB.oper, tr(e, "oper", lg), Mg, CW) + 3; }
    const reco = [...(tr(e, "reco", lg) || []), ...(tr(e, "noApto", lg) || [])];
    if (reco.length) { if (y > 250) { foot(); doc.addPage(); y = Mg; } y = list(LB.reco, reco, Mg, CW) + 3; }
    // Suplementos (dato de tarifa): solo con precios y en español (son notas del tarifario)
    if (price !== "none" && lang === "ES" && e.p.supl.length) { if (y > 250) { foot(); doc.addPage(); y = Mg; } y = list(LB.supl, e.p.supl.map(x => markupMoney(x, mk)), Mg, CW) + 3; }
    if (price !== "none") {
      if (y > 258) { foot(); doc.addPage(); y = Mg; }       // el cuadro de precios (≈ 27 mm) cabe hasta antes del pie
      const cells = [2, 4, 6, 10].map(p => { const v = priceAt(e.id, p); return v != null ? "$ " + (mk ? Math.round(v * (1 + mk / 100) / 1000) * 1000 : v).toLocaleString("es-CO") : LB.consult; });
      doc.setFillColor(238, 242, 236); doc.rect(Mg, y, CW, 20, "F"); doc.setFont("helvetica", "bold"); doc.setTextColor(...OL); doc.setFontSize(10); doc.text(pdfTxt(LB.price), Mg + 4, y + 6);
      doc.setFont("helvetica", "normal"); [2, 4, 6, 10].forEach((p, i) => { const x = Mg + 4 + i * (CW - 8) / 4; doc.setFontSize(8.5); doc.setTextColor(90); doc.text(`${p} ${LB.pax}`, x, y + 11); doc.setFontSize(11); doc.setTextColor(30); doc.text(pdfTxt(cells[i]), x, y + 17); });
      y += 24; doc.setFontSize(8); doc.setTextColor(110); doc.text(pdfTxt(LB.note), Mg, y); doc.setFontSize(10);
    }
    foot();
  }
  const base = ids.length === 1 ? `Ficha_${price === "none" ? ids[0] : (byId[ids[0]].code || ids[0])}_2027` : "Portafolio_PCCC_2027";
  const fname = `${base}_${lang}${logo ? "" : "_marca-blanca"}${price === "none" ? "" : price === "net" ? "_neto" : "_venta"}.pdf`;
  return { blob: doc.output("blob"), fname };
}
// Para la pestaña Tarifas del portal: descarga la ficha (con tarifa neta) aunque el portafolio no esté abierto
export async function downloadFichaPdf(id, ctx, o, st) {
  if (!(ROOT && ROOT.isConnected)) { CTX = ctx; await preload(ctx.lang); buildModel(); }
  if (!byId[id]) return false;
  return pdfRun([id], Object.assign({ lang: (ctx.lang === "en" ? "EN" : "ES"), logo: true, price: "net", markup: 0, agency: "" }, o || {}), st, null);
}

/* ---------- copiar y avisos ---------- */
function copy(t, msg) {
  const fallback = () => { const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast(msg); } catch (e) { toast(t.slice(0, 80)); } ta.remove(); };
  try { navigator.clipboard.writeText(t).then(() => toast(msg), fallback); } catch (e) { fallback(); }
}
function toast(m) { const host = $r("toast"); if (!host) return; host.innerHTML = `<div class="toast" role="status">${esc(m)}</div>`; clearTimeout(toastT); toastT = setTimeout(() => { if (host.isConnected) host.innerHTML = ""; }, 2600); }

// Para pruebas y para que portal.js sepa si el portafolio sigue montado
export function portafolioMounted() { return !!(ROOT && ROOT.isConnected); }
