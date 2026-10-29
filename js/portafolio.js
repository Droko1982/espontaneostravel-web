/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
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
let D = null, M = null, V = null; const I18 = {}; // datos públicos (se cargan una vez; cada idioma cuando se necesita); V: vías
let ROOT = null, CTX = null, ac = null;         // instancia montada
let EXP = [], byId = {}, S = null, PR = null, HOTELS = [], FINCAS = [], finById = {};
let VB = { x: 0, y: 0, w: 100, h: 100 }, svg = null, base = null, ov = null, anim = 0, slideTimers = [], toastT = 0;

/* ---------- utilidades ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const cop = n => "$ " + Math.round(n).toLocaleString("es-CO");
const store = st => ({ get(k, d) { try { const v = st().getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { st().setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } });
const ls = store(() => localStorage);
// Ruta y pestaña duran solo la sesión: cada ingreso abre en Inicio con «Arma tu ruta» limpio (portal.js borra pf27-* al cerrar sesión)
const ss = store(() => sessionStorage);
const $r = n => ROOT.querySelector(`[data-r="${n}"]`);
const $$ = s => [...ROOT.querySelectorAll(s)];
const json = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
const ph640 = b => b + "-640.webp", ph1600 = b => b + "-1600.webp";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- textos de la interfaz (es / en) ---------- */
const UI = {
  es: {
    banner_dmc: "Portafolio PCCC Espontáneos Travel 2027 · DMCs", banner_nac: "Portafolio PCCC Espontáneos Travel 2027 · Mayoristas y Mercado Nacional",
    tar_dmc: "Tarifario DMC", tar_nac: "Tarifario Mercado Nacional y Mayoristas", tar_prev: "tarifas {0} vigentes hasta el 31 de marzo de {1} mientras ET publica las nuevas", tar_none: "aún sin tarifas cargadas",
    two_fingers: "Usa dos dedos para mover el mapa", mode: "Vista", m_agency: "Vista agencia", m_wl: "Marca blanca", wl_on: "Marca blanca: sin logo, precios, códigos ni datos solo agencias. Puedes mostrar esta pantalla a tu cliente.",
    t_mapa: "Inicio", map_open: "Ver el mapa del Eje Cafetero", map_close: "Ocultar el mapa", map_tg_s: "{0} experiencias, aeropuertos, capitales y fincas · clic para abrir",
    inst_sost: "Nuestro impacto sostenible", ico_t: "Iconografía", ico_l: "En este portafolio encontrarás información con las siguientes características:",
    ico_acc: "Recorridos accesibles para personas en silla de ruedas, con movilidad reducida o personas ciegas. Consultar tarifas y ajustes.",
    ico_acc2: "Contamos con certificación en Turismo Accesible (CIDCA – ProColombia 2025) y llevamos este enfoque a la práctica mediante el diseño y operación de productos turísticos accesibles. Fuimos pioneros al operar el primer fam trip de turismo accesible en el Eje Cafetero, reafirmando nuestro compromiso con la inclusión regional.",
    ico_com: "Experiencia dirigida con la comunidad local (campesinos, artesanos, productores locales).",
    ico_cord: "Tours o experiencias que hacen parte del proyecto Paisaje Cordillerano. Municipios: Calarcá, Córdoba, Pijao, Buenavista y Génova en Quindío; Caicedonia y Sevilla en Valle del Cauca.",
    ico_lang: "Indica que el recorrido se puede hacer en ese idioma, independiente del guía bilingüe (consultar fincas en las que aplica).",
    ico_shared: "Tour compartido (Shared Tour): salida con horario y puntos de encuentro fijos; el viajero comparte vehículo y guía con otros viajeros.", ico_acc_s: "Accesible (consultar tarifas y ajustes)", b_shared: "Tour compartido",
    map_t: "El Eje Cafetero, punto por punto", map_s: "Arrastra para moverte. Toca un punto para ver la experiencia.", map_aria: "Mapa del Eje Cafetero: departamentos, capitales, aeropuertos y experiencias",
    v_region: "Región", v_eje: "Eje Cafetero", v_quindio: "Quindío", z_in: "Acercar", z_out: "Alejar", k_apt: "Aeropuerto", k_cap: "Capital", k_hot: "Hoteles aliados", k_fin: "Fincas cafeteras",
    t_exp: "Experiencias", t_ruta: "Arma tu ruta", t_trans: "Transporte", t_kit: "Kit de venta", t_cond: "Condiciones",
    welcome: "Bienvenido al portafolio", welcome_l: "Todo el Paisaje Cultural Cafetero en un mapa: {0} experiencias 2027 en ocho líneas de producto, fincas cafeteras, aeropuertos y capitales de Quindío, Risaralda, Caldas y Valle del Cauca.",
    how1: "Explora el mapa.", how1b: "Toca un punto para ver la experiencia en fotos.", how2: "Abre la ficha.", how2b: "Qué incluye, operación, idiomas y tarifa neta según tu tarifario.",
    how3: "Arma tu ruta.", how3b: "Aeropuerto, hotel y tours por día: la ruta se dibuja sola y suma traslados y tours.", how4: "Descarga el kit de venta.", how4b: "PDF en el idioma de tu cliente, con o sin logo y con tu markup.",
    go_zone: "Ir a una zona", all_eje: "Todo el Eje", layers: "Capas del mapa", shortcuts: "Atajos", sc_exp: "Ver todas las experiencias", sc_ruta: "Armar una ruta", sc_kit: "Descargar kit de venta", sc_cond: "Condiciones y quiénes somos",
    exp_h: "Experiencias", q_ph: "Buscar: aves, café, Salento…", f_ideal: "Todo perfil de viajero", f_dur: "Cualquier duración", d_short: "Corta (hasta 2,5 h)", d_half: "Medio día (3 a 6 h)", d_full: "Día completo (7 h o más)",
    f_lang: "Cualquier idioma", f_route: "Rutas sugeridas…", f_clear: "Quitar filtros", n_exp: "{0} experiencias", n_exp1: "1 experiencia", none_match: "Ninguna experiencia coincide con esos filtros.",
    b_new: "Nuevo 2027", b_own: "Experiencia ET", b_com: "Comunitario", b_cord: "Paisaje Cordillerano", from_net: "Neta desde", pax10: "10 pax", ask_rate: "Consultar tarifa", photo_soon: "Material en preparación",
    see_ficha: "Ver ficha completa", add_route: "+ A la ruta", add_route_l: "+ Agregar a la ruta", in_route: "✓ En la ruta", close: "Cerrar", added_day: "Agregado a la ruta · Día {0}",
    f_dur_l: "Duración", f_mod: "Modalidad", f_lunch: "Almuerzo", f_age: "Edad", f_group: "Grupo", f_langs: "Idiomas", f_code: "Código", ask: "Consultar", min_pax: "mín. {0} pax", max_pax: "máx. {0}", upto: "Hasta {0} pax",
    ph_dl: "Descargar las fotos ({0}) en JPG", ph_dl1: "Descargar esta foto", ph_bank: "Banco de imágenes", ph_bank_s: "Más fotos para descargar en Google Drive",
    ph_making: "Preparando foto {0} de {1}…", ph_err: "No se pudieron preparar las fotos. Intenta de nuevo.", ph_note: "Fotos en JPG, listas para tus materiales de venta.",
    comp_intro: "Nuevos y exclusivos 2027. Salidas diarias garantizadas desde 2 pasajeros, con puntos de encuentro en Armenia. Ideal para pasajeros FIT y grupos pequeños.",
    tu_rate: "Tarifa por persona", tu_pp: "COP por persona · 1 a 30 pax", tu_card: "por persona · 1 a 30 pax", tu_vig: "Tarifa {0}: rige desde el 1 de enero de {0}.",
    s_meet: "Puntos de encuentro", dep_from: "Salida desde las {0}", g_en: "Guía en inglés", g_en_v: "COP total por servicio",
    ctr_t: "Suplemento de traslado desde el hotel al punto de encuentro", ctr_s: "Tarifas Round trip, Netas por persona según el número de pasajeros de la reserva. Para más de 12 pasajeros, consultar.",
    ctr_n: "Si el tour tiene punto de encuentro en tu municipio (Montenegro, Quimbaya o Calarcá), no aplica suplemento hasta ese punto.", ctr_srv: "Servicio", ctr_pax: "{0} pax", ctr_go: "Ver suplemento de traslado desde tu hotel",
    imp_t: "Importante", imp_1: "Sostenibilidad: recomendamos al pasajero evitar plásticos de un solo uso. Prestamos capa para la lluvia; en caso de daño, el pasajero paga {0}.", imp_cost: "su valor",
    imp_2: "Los guías llevan uniforme (camisa, chaleco o gorra) con el logo de Tour Compartido.", imp_3: "Recomendaciones: ropa y zapatos cómodos, gorra, gafas de sol, chaqueta impermeable y repelente. No usar perfumes ni cremas con olores dulces.",
    imp_4: "Informar si el pasajero tiene alguna condición física o de salud que debamos tener en cuenta para la operación.", imp_5: "Dudas sobre la dinámica del tour: Operaciones y Reservas, +57 318 720 0023.", imp_wa: "Escribir por WhatsApp",
    s_exp: "La experiencia", s_photos: "Fotos", s_incl: "Incluye", s_noincl: "No incluye", s_oper: "Operación y horarios", s_tech: "Ficha técnica", s_reco: "Recomendaciones", s_noapto: "No apto para",
    s_sell: "Para vender", only_ag: "Solo agencias", why: "Por qué venderla", interesa: "Te interesa saber", where: "Dónde la operamos", menu: "Menú", impact: "Impacto local", s_notes: "Notas de tarifa y operación",
    s_supl: "Suplementos", g_sup: "Suplemento de guianza en otros idiomas", g_lang: "Idioma del guía", g_note: "valor por servicio de guía (no por persona)", s_combo: "Combínalo con", s_rate: "Tarifa neta por pasajero", pax: "Pasajeros", per_pax: "COP por pasajero", s_kit: "Kit de venta", pdf: "Descargar PDF", copy_txt: "Copiar texto", copy_link: "Copiar enlace de la ficha",
    kit_note: "PDF para tu cliente final (sin datos internos), con o sin logo, con o sin precios y en ES, EN, FR, IT o PT.", request: "Solicitar este tour", see_zones: "Ver municipios en el mapa", zones_note: "En «Arma tu ruta» se sugiere el municipio más cercano al hotel; puedes cambiarlo en la lista o tocando su punto en el mapa.",
    kids: "Niños de 0 a 2 años no pagan, pero ocupan silla de bebé en el vehículo; desde los 3 años pagan tarifa.", see_cond: "Políticas de reserva y pago", see_about: "Quiénes somos",
    com_txt: "Experiencia con la comunidad local (campesinos, artesanos, productores).", cord_txt: "Hace parte del proyecto Paisaje Cordillerano.", carry: "Tarifas {0}: aplican hasta el 31 de marzo de {1}", copied: "Copiado", link_copied: "Enlace copiado", txt_copied: "Texto copiado",
    meet_see: "{0} · {1} puntos, ver «Puntos de encuentro»", meet_and: " y ", guide_sup_en: "guía en inglés con suplemento", p_param: "Parámetro operativo", p_det: "Detalle", p_b2b: "Detalle técnico B2B", p_b2c: "Especificación comercial (B2C)", p_sched: "Horario recomendado", am: "Mañana", pm: "Tarde", ampm: "Mañana o tarde", guide_sup: "otros idiomas con suplemento de guianza",
    conv_t: "Convenciones e iconografía", inst_t: "Presentación institucional", idx_t: "Índice de experiencias", idx_l: "Toca una experiencia para abrir su ficha, o el nombre de la línea para verlas todas.", g_open: "Abrir todas", g_close: "Cerrar todas", see_more: "Más sobre nosotros", how_t: "Cómo usar el portafolio",
    ic_dur: "Duración y dificultad: tiempo estimado y exigencia física (baja, media, alta).", ic_geo: "Geolocalización: con el hotel de «Arma tu ruta», cada experiencia muestra su distancia y la finca se asigna en el municipio más cercano.",
    ic_com: "Comunitario: experiencia con la comunidad local (campesinos, artesanos, productores).", ic_cord: "Paisaje Cordillerano: tours del proyecto en Calarcá, Córdoba, Pijao, Buenavista y Génova (Quindío) y Caicedonia y Sevilla (Valle).",
    ic_b2b: "Solo agencias: datos de venta y operación que no salen en Marca blanca ni en el PDF para el cliente.", ic_code: "Códigos: HD medio día (menos de 7 h) · FD día completo (7 h o más) · PT parques temáticos.",
    near: "≈ {0} km de tu hotel", near_sort: "Cercanas a mi hotel primero", near_hint: "Escribe el hotel de tu cliente y ordenamos las experiencias por cercanía. Es el mismo hotel de «Arma tu ruta».", p_diff: "Nivel de dificultad", p_cap: "Capacidad máxima", p_meet: "Punto de encuentro", p_guide: "Idioma de guianza",
    low: "Baja", mid: "Media", high: "Alta", pick: "Recogida en el alojamiento (zona de cobertura según condiciones)", pickC: "Su hotel", onsite: "En el lugar de la experiencia", atHotel: "En el hotel del grupo",
    capB2B: "Tarifa publicada hasta {0} pax; grupos mayores: consultar", capB2C: "Hasta {0} personas", langB2B: "Español / inglés (otros idiomas con suplemento de guianza)", langC: "Español / inglés",
    r_h: "Arma tu ruta", r_l: "Elige aeropuerto, hotel y tours. La ruta se dibuja en el mapa con distancias por carretera, tiempos estimados y el vehículo según el número de pasajeros.",
    r1: "Grupo", r_pax: "Pasajeros", r_start: "Primer día de tours", r_d1: "Día 1 (el de llegada)", r_pick: "Elige…", r_pax_ph: "Número de pasajeros", ap_pick: "Elige el aeropuerto…", veh_need: "Escribe el número de pasajeros y te sugerimos el vehículo.", tot_need: "Escribe el número de pasajeros para calcular el total.", day: "Día {0}", veh_sug: "Vehículo sugerido", see_fleet: "ver flota",
    r2: "Llegada y salida", r_arr: "Aeropuerto de llegada", r_dep: "Aeropuerto de salida", no_tr: "Sin traslado",
    r3: "Hotel", h_ph: "Escribe el nombre del hotel…", h_note: "Primero salen los hoteles aliados de ET. Si no está, búscalo en el mapa abierto (OpenStreetMap), pega su enlace de Google Maps o tócalo en el mapa.",
    h_ally: "Aliado ET", h_recent: "Usado antes", h_osm: "Buscar «{0}» en el mapa abierto", h_new: "Ubicar «{0}» con un enlace o en el mapa", h_change: "Cambiar", h_searching: "Buscando…", h_none: "No encontré ese hotel en el mapa abierto. Pega su enlace de Google Maps o tócalo en el mapa.",
    h_place: "Ubicar «{0}»", h_link: "Pega el enlace de Google Maps del hotel", h_link_ph: "https://www.google.com/maps/place/…", h_locate: "Ubicar", h_link_note: "Abre el hotel en Google Maps y copia la dirección completa de la barra del navegador. Los enlaces cortos (maps.app.goo.gl) no traen coordenadas.",
    h_tap: "Tocar en el mapa", cancel: "Cancelar", h_tap_b: "Toca el mapa donde queda «{0}»", h_nolink: "No encontré coordenadas en ese enlace", h_set: "{0} ubicado en {1}", h_chosen: "Hotel elegido: {0}", h_added: "Agregado por el asesor",
    r4: "Tours por día", r_add: "Agregar tour", r_choose: "Elige un tour…", r_empty: "Agrega tours desde esta lista, desde el mapa o desde cada ficha.", remove: "Quitar", which_finca: "¿En qué finca?", where_q: "¿Dónde?", z_auto: "La más cercana al hotel{0}", z_munis: "Municipios donde opera", z_fincas: "Fincas aliadas", z_hint: "También puedes tocar su punto en el mapa.", z_pick: "toca para elegir", z_set: "{0}: {1}", op_in: "En {0}", fl_pick: "toca un punto para elegir dónde", finca_auto: "La más cercana al hotel (asignada por ET)",
    r5: "Recorrido", r_none: "Elige hotel y tours para ver el recorrido.", arr_leg: "Llegada {0} → {1}", arr_sub: "Traslado de llegada", dep_leg: "{0} → {1}", dep_sub: "Traslado de salida", go_back: "ida y regreso al hotel", per_leg: "c/trayecto",
    choose_hotel: "elige un hotel para calcular el trayecto", in_hotel: "En el hotel", finca_in: "Finca en {0}",
    tot_arr: "Traslado de llegada", tot_dep: "Traslado de salida", quote: "Cotizar", sup_of: "Suplemento {0}", tot: "Total neto por pasajero", tot_q: " (sin lo que está por cotizar)", tot_note: "{0} pax en {1}. No incluye hotel. {2}.",
    fit: "Ver ruta completa en el mapa", fl_t: "Tu ruta", fl_n: "{0} tours", fl_n1: "1 tour", fl_big: "Mapa grande", fl_show: "Ver mi ruta en el mapa", fl_exp: "Ver la ruta en el mapa grande", copy_it: "Copiar itinerario", send_req: "Enviar como solicitud de reserva", kit_route: "Kit de venta con estos tours", reset: "Empezar de nuevo", it_copied: "Itinerario copiado", program: "Programa Paisaje Cultural Cafetero · {0} pasajeros", program0: "Programa Paisaje Cultural Cafetero", vehicle: "Vehículo",
    tr_h: "Transporte", tr_l: "Vehículos habilitados para servicio especial que se adaptan a cada necesidad de viaje. Seguridad · comodidad · confianza. Capacidad recomendada para mayor comodidad y capacidad máxima autorizada.",
    tr_pax: "{0} a {1} pasajeros · máx. {2}", tr_upto: "Hasta {0} pasajeros", vip: "Plus de confort bajo solicitud", photo_of: "{0}: foto {1} de {2}", vid_soon: "Video en preparación", tr_cond: "Condiciones de transporte",
    tr_tab: "Traslados aeropuerto – hotel", tr_pp: "{0} pax · por persona", tr_code: "Código", tr_route: "Trayecto", tr_note: "Tarifa neta por persona y por trayecto, según tu tarifario. Manizales (MZL) y Cali (CLO): cotización a la medida.",
    sup_tab: "Suplementos", sup_t: "Suplemento", value: "Valor", guide_tab: "Guianza en otros idiomas", none_rates: "Tu tarifario aún no tiene estos valores: consulta a tu asesor.",
    k_h: "Kit de venta", k_l: "Descarga un PDF con las experiencias que elijas, en el idioma de tu cliente. Puedes poner el logo de tu agencia, quitar el de Espontáneos y agregar tu markup.",
    k1: "Experiencias", k_route: "Solo los tours de mi ruta", k_all: "Todo el portafolio", k_none: "Quitar todos", k_sel: "{0} seleccionadas", k2: "Idioma y marca", k_lang: "Idioma del PDF", k_logo: "Marca", k_with: "Con logo Espontáneos Travel", k_without: "Sin logo (marca blanca)", k_own: "Con el logo de mi agencia", k_up: "Subir logo", k_up2: "Cambiar logo", k_rm: "Quitar logo", k_nologo: "Aún no has subido el logo de tu agencia.", k_own_alt: "Logo de tu agencia", k_up_l: "PNG, JPG, WebP, SVG o GIF, hasta 5 MB. Se guarda en tu usuario con el nombre de tu agencia y queda listo para tus próximos PDF.", k_saving: "Guardando en tu usuario…", k_saved: "Guardado en tu usuario.", k_nosave: "No se pudo guardar en tu usuario: por ahora se usa solo en esta sesión.", k_big: "La imagen pesa más de 5 MB.", k_badimg: "No pude leer esa imagen. Prueba con PNG o JPG.",
    k_agency: "Nombre de tu agencia en la portada (opcional)", k3: "Precios", k_price: "¿Qué precio mostrar?", k_pn: "Sin precios", k_pnet: "Con tarifa neta", k_psell: "Con precio de venta (neta + mi markup)", k_mk: "Mi markup (%)",
    k_pnote: "El PDF muestra el precio por persona para 2, 4, 6 y 10 pasajeros, según tu tarifario.", k_go: "Descargar PDF", k_need: "Elige al menos una experiencia.", k_making: "Armando el PDF…", k_done: "Listo: {0}", k_err: "No se pudo crear el PDF. Intenta de nuevo.",
    k_open: "Si no se descargó, ábrelo aquí", pdf_client: "PDF para tu cliente", pdf_net: "PDF con tarifa neta", pdf_more: "Más opciones (idioma, marca, markup)", pdf_note: "El PDF para el cliente no lleva tarifas ni datos internos. El de tarifa neta es solo para tu agencia.",
    k_trnote: "Traducción por validar por el equipo de Espontáneos Travel.", k_pax: "Pasajeros de la cotización", k_nolib: "No se pudo cargar el generador de PDF. Revisa tu conexión y vuelve a intentar.",
    c_h: "Condiciones 2027", c_l: "Más sobre nosotros, políticas de reserva y pago, niños y menores, sostenibilidad, casos de impacto comunitario y equipo. Información para agencias, DMCs y mayoristas.", c_about: "Más sobre nosotros", c_cases: "Casos de impacto comunitario", c_book: "Reservas y pagos", c_kids: "Niños y menores", c_sost: "Sostenibilidad", c_team: "Equipo y contacto", c_read: "Cómo leer las fichas",
    c_fit: "Servicios individuales (FIT)", c_grp: "Grupos (más de 20 pasajeros, incentivos, corporativos, estudiantiles o series)", c_conf: "Confirmación", c_pay: "Pagos", c_mod: "Modificaciones", c_canc: "Cancelaciones", c_gen: "Consideraciones generales", c_paym: "Formas de pago",
    c_paym_ask: "Tu asesor te envía las cuentas y el enlace de pago con cada confirmación.", c_2026: "Políticas del portafolio 2026: el equipo de ET confirma las de 2027.", c_access: "Turismo accesible", c_more: "Más sobre nosotros", c_actions: "Nuestras acciones", c_stories: "Historias de comunidad",
    c_drivers: "Conductores", c_contact: "Contacto", c_imp_conv: "Convenciones de impacto"
  },
  en: {
    banner_dmc: "Espontáneos Travel PCCC Portfolio 2027 · DMCs", banner_nac: "Espontáneos Travel PCCC Portfolio 2027 · Wholesalers & Domestic Market",
    tar_dmc: "DMC rate sheet", tar_nac: "Domestic Market & Wholesalers rate sheet", tar_prev: "{0} rates valid until March 31, {1}, while ET publishes the new ones", tar_none: "no rates loaded yet",
    two_fingers: "Use two fingers to move the map", mode: "View", m_agency: "Agency view", m_wl: "White label", wl_on: "White label: no logo, prices, codes or agency-only data. You can show this screen to your client.",
    t_mapa: "Home", map_open: "Show the Coffee Region map", map_close: "Hide the map", map_tg_s: "{0} experiences, airports, capitals and farms · click to open",
    inst_sost: "Our sustainable impact", ico_t: "Icons", ico_l: "In this portfolio you will find information with the following features:",
    ico_acc: "Tours accessible for wheelchair users, people with reduced mobility or blind people. Ask about rates and adjustments.",
    ico_acc2: "We are certified in Accessible Tourism (CIDCA – ProColombia 2025) and put this approach into practice by designing and operating accessible tourism products. We were pioneers in running the first accessible-tourism fam trip in the Coffee Region, reaffirming our commitment to regional inclusion.",
    ico_com: "Experience led together with the local community (farmers, artisans, local producers).",
    ico_cord: "Tours or experiences that are part of the Paisaje Cordillerano project. Towns: Calarcá, Córdoba, Pijao, Buenavista and Génova in Quindío; Caicedonia and Sevilla in Valle del Cauca.",
    ico_lang: "Shows that the tour can be done in that language, regardless of the bilingual guide (ask which farms this applies to).",
    ico_shared: "Shared tour: fixed departure time and meeting points; travellers share the vehicle and guide with other travellers.", ico_acc_s: "Accessible (ask about rates and adjustments)", b_shared: "Shared tour",
    map_t: "The Coffee Region, point by point", map_s: "Drag to move. Tap a point to see the experience.", map_aria: "Map of the Coffee Region: departments, capitals, airports and experiences",
    v_region: "Region", v_eje: "Coffee Region", v_quindio: "Quindío", z_in: "Zoom in", z_out: "Zoom out", k_apt: "Airport", k_cap: "Capital", k_hot: "Partner hotels", k_fin: "Coffee farms",
    t_exp: "Experiences", t_ruta: "Build a route", t_trans: "Transport", t_kit: "Sales kit", t_cond: "Conditions",
    welcome: "Welcome to the portfolio", welcome_l: "The whole Coffee Cultural Landscape on one map: {0} 2027 experiences in eight product lines, coffee farms, airports and capitals of Quindío, Risaralda, Caldas and Valle del Cauca.",
    how1: "Explore the map.", how1b: "Tap a point to see the experience in photos.", how2: "Open the sheet.", how2b: "What's included, operation, languages and net rate for your rate sheet.",
    how3: "Build a route.", how3b: "Airport, hotel and tours per day: the route draws itself and adds transfers and tours.", how4: "Download the sales kit.", how4b: "PDF in your client's language, with or without logo and with your markup.",
    go_zone: "Go to an area", all_eje: "Whole region", layers: "Map layers", shortcuts: "Shortcuts", sc_exp: "See all experiences", sc_ruta: "Build a route", sc_kit: "Download sales kit", sc_cond: "Conditions and about us",
    exp_h: "Experiences", q_ph: "Search: birds, coffee, Salento…", f_ideal: "Any traveller profile", f_dur: "Any duration", d_short: "Short (up to 2.5 h)", d_half: "Half day (3 to 6 h)", d_full: "Full day (7 h or more)",
    f_lang: "Any language", f_route: "Suggested routes…", f_clear: "Clear filters", n_exp: "{0} experiences", n_exp1: "1 experience", none_match: "No experience matches those filters.",
    b_new: "New 2027", b_own: "ET experience", b_com: "Community", b_cord: "Paisaje Cordillerano", from_net: "Net from", pax10: "10 pax", ask_rate: "Rate on request", photo_soon: "Material in preparation",
    see_ficha: "See full sheet", add_route: "+ To route", add_route_l: "+ Add to route", in_route: "✓ In route", close: "Close", added_day: "Added to route · Day {0}",
    f_dur_l: "Duration", f_mod: "Format", f_lunch: "Lunch", f_age: "Age", f_group: "Group", f_langs: "Languages", f_code: "Code", ask: "Ask us", min_pax: "min. {0} pax", max_pax: "max. {0}", upto: "Up to {0} pax",
    ph_dl: "Download the photos ({0}) as JPG", ph_dl1: "Download this photo", ph_bank: "Image bank", ph_bank_s: "More photos to download on Google Drive",
    ph_making: "Preparing photo {0} of {1}…", ph_err: "The photos could not be prepared. Please try again.", ph_note: "JPG photos, ready for your sales materials.",
    comp_intro: "New and exclusive for 2027. Guaranteed daily departures from 2 passengers, with meeting points in Armenia. Ideal for FIT travellers and small groups.",
    tu_rate: "Rate per person", tu_pp: "COP per person · 1 to 30 pax", tu_card: "per person · 1 to 30 pax", tu_vig: "{0} rate: valid from January 1, {0}.",
    s_meet: "Meeting points", dep_from: "Departures from {0}", g_en: "English-speaking guide", g_en_v: "COP total per service",
    ctr_t: "Transfer supplement from the hotel to the meeting point", ctr_s: "Round-trip rates, net per person by number of passengers in the booking. For more than 12 passengers, ask us.",
    ctr_n: "If the tour has a meeting point in your town (Montenegro, Quimbaya or Calarcá), no supplement applies to that point.", ctr_srv: "Service", ctr_pax: "{0} pax", ctr_go: "See the transfer supplement from your hotel",
    imp_t: "Important", imp_1: "Sustainability: we recommend passengers avoid single-use plastics. We lend rain ponchos; if one is damaged, the passenger pays {0}.", imp_cost: "its cost",
    imp_2: "Guides wear a uniform (shirt, vest or cap) with the Shared Tour logo.", imp_3: "Recommendations: comfortable clothes and shoes, a cap, sunglasses, a waterproof jacket and insect repellent. Do not wear perfumes or creams with sweet scents.",
    imp_4: "Let us know if the passenger has any physical or health condition we should take into account for the operation.", imp_5: "Questions about how the tour works: Operations and Reservations, +57 318 720 0023.", imp_wa: "Message on WhatsApp",
    s_exp: "The experience", s_photos: "Photos", s_incl: "Includes", s_noincl: "Not included", s_oper: "Operation and schedules", s_tech: "Technical sheet", s_reco: "Recommendations", s_noapto: "Not suitable for",
    s_sell: "To sell it", only_ag: "Agencies only", why: "Why sell it", interesa: "Good to know", where: "Where we operate it", menu: "Menu", impact: "Local impact", s_notes: "Rate and operation notes",
    s_supl: "Supplements", g_sup: "Guiding supplement in other languages", g_lang: "Guide language", g_note: "rate per guide service (not per person)", s_combo: "Pair it with", s_rate: "Net rate per passenger", pax: "Passengers", per_pax: "COP per passenger", s_kit: "Sales kit", pdf: "Download PDF", copy_txt: "Copy text", copy_link: "Copy sheet link",
    kit_note: "PDF for your final client (no internal data), with or without logo, with or without prices, in ES, EN, FR, IT or PT.", request: "Request this tour", see_zones: "See municipalities on the map", zones_note: "In «Build a route» the municipality closest to the hotel is suggested; you can change it in the list or by tapping its point on the map.",
    kids: "Children aged 0–2 travel free but occupy a baby seat in the vehicle; from age 3 they pay the rate.", see_cond: "Booking and payment policies", see_about: "About us",
    com_txt: "Experience with the local community (farmers, artisans, producers).", cord_txt: "Part of the Paisaje Cordillerano project.", carry: "{0} rates: valid until March 31, {1}", copied: "Copied", link_copied: "Link copied", txt_copied: "Text copied",
    meet_see: "{0} · {1} points, see “Meeting points”", meet_and: " and ", guide_sup_en: "English-speaking guide with supplement", p_param: "Operating parameter", p_det: "Detail", p_b2b: "B2B technical detail", p_b2c: "Commercial specification (B2C)", p_sched: "Recommended schedule", am: "Morning", pm: "Afternoon", ampm: "Morning or afternoon", guide_sup: "other languages with guiding supplement",
    conv_t: "Conventions and icons", inst_t: "Who we are", idx_t: "Experience index", idx_l: "Tap an experience to open its sheet, or a line name to see them all.", g_open: "Open all", g_close: "Close all", see_more: "More about us", how_t: "How to use the portfolio",
    ic_dur: "Duration and difficulty: estimated time and physical effort (low, medium, high).", ic_geo: "Geolocation: with the hotel from «Build a route», each experience shows its distance and the farm is assigned in the closest municipality.",
    ic_com: "Community: experience with the local community (farmers, artisans, producers).", ic_cord: "Paisaje Cordillerano: tours of the project in Calarcá, Córdoba, Pijao, Buenavista and Génova (Quindío) and Caicedonia and Sevilla (Valle).",
    ic_b2b: "Agencies only: sales and operation data never shown in White label or in the client PDF.", ic_code: "Codes: HD half day (under 7 h) · FD full day (7 h or more) · PT theme parks.",
    near: "≈ {0} km from your hotel", near_sort: "Closest to my hotel first", near_hint: "Type your client's hotel and we sort the experiences by distance. It is the same hotel used in «Build a route».", p_diff: "Difficulty level", p_cap: "Maximum capacity", p_meet: "Meeting point", p_guide: "Guiding language",
    low: "Low", mid: "Medium", high: "High", pick: "Pick-up at the accommodation (coverage area as per conditions)", pickC: "Your hotel", onsite: "At the experience site", atHotel: "At the group's hotel",
    capB2B: "Rate published up to {0} pax; larger groups: ask us", capB2C: "Up to {0} people", langB2B: "Spanish / English (other languages with guiding supplement)", langC: "Spanish / English",
    r_h: "Build a route", r_l: "Choose airport, hotel and tours. The route is drawn on the map with road distances, estimated times and the vehicle for your group size.",
    r1: "Group", r_pax: "Passengers", r_start: "First tour day", r_d1: "Day 1 (arrival day)", r_pick: "Choose…", r_pax_ph: "Number of passengers", ap_pick: "Choose the airport…", veh_need: "Enter the number of passengers to get a vehicle suggestion.", tot_need: "Enter the number of passengers to calculate the total.", day: "Day {0}", veh_sug: "Suggested vehicle", see_fleet: "see fleet",
    r2: "Arrival and departure", r_arr: "Arrival airport", r_dep: "Departure airport", no_tr: "No transfer",
    r3: "Hotel", h_ph: "Type the hotel name…", h_note: "ET partner hotels come first. If it isn't there, search the open map (OpenStreetMap), paste its Google Maps link or tap it on the map.",
    h_ally: "ET partner", h_recent: "Used before", h_osm: "Search «{0}» on the open map", h_new: "Locate «{0}» with a link or on the map", h_change: "Change", h_searching: "Searching…", h_none: "I couldn't find that hotel on the open map. Paste its Google Maps link or tap it on the map.",
    h_place: "Locate «{0}»", h_link: "Paste the hotel's Google Maps link", h_link_ph: "https://www.google.com/maps/place/…", h_locate: "Locate", h_link_note: "Open the hotel in Google Maps and copy the full address from the browser bar. Short links (maps.app.goo.gl) carry no coordinates.",
    h_tap: "Tap on the map", cancel: "Cancel", h_tap_b: "Tap the map where «{0}» is", h_nolink: "No coordinates found in that link", h_set: "{0} located in {1}", h_chosen: "Hotel chosen: {0}", h_added: "Added by the agent",
    r4: "Tours per day", r_add: "Add tour", r_choose: "Choose a tour…", r_empty: "Add tours from this list, from the map or from each sheet.", remove: "Remove", which_finca: "Which farm?", where_q: "Where?", z_auto: "Closest to the hotel{0}", z_munis: "Municipalities where it operates", z_fincas: "Partner farms", z_hint: "You can also tap its point on the map.", z_pick: "tap to choose", z_set: "{0}: {1}", op_in: "In {0}", fl_pick: "tap a point to choose where", finca_auto: "The closest to the hotel (assigned by ET)",
    r5: "Itinerary", r_none: "Choose a hotel and tours to see the itinerary.", arr_leg: "Arrival {0} → {1}", arr_sub: "Arrival transfer", dep_leg: "{0} → {1}", dep_sub: "Departure transfer", go_back: "return trip from the hotel", per_leg: "each way",
    choose_hotel: "choose a hotel to calculate the trip", in_hotel: "At the hotel", finca_in: "Farm in {0}",
    tot_arr: "Arrival transfer", tot_dep: "Departure transfer", quote: "Quote", sup_of: "Supplement {0}", tot: "Net total per passenger", tot_q: " (excluding items to quote)", tot_note: "{0} pax in {1}. Hotel not included. {2}.",
    fit: "See full route on the map", fl_t: "Your route", fl_n: "{0} tours", fl_n1: "1 tour", fl_big: "Full map", fl_show: "See my route on the map", fl_exp: "Open the route on the full map", copy_it: "Copy itinerary", send_req: "Send as booking request", kit_route: "Sales kit with these tours", reset: "Start over", it_copied: "Itinerary copied", program: "Coffee Cultural Landscape programme · {0} passengers", program0: "Coffee Cultural Landscape programme", vehicle: "Vehicle",
    tr_h: "Transport", tr_l: "Vehicles licensed for special service, adapted to every travel need. Safety · comfort · trust. Recommended capacity for comfort and maximum authorised capacity.",
    tr_pax: "{0} to {1} passengers · max. {2}", tr_upto: "Up to {0} passengers", vip: "Comfort upgrade on request", photo_of: "{0}: photo {1} of {2}", vid_soon: "Video in preparation", tr_cond: "Transport conditions",
    tr_tab: "Airport – hotel transfers", tr_pp: "{0} pax · per person", tr_code: "Code", tr_route: "Route", tr_note: "Net rate per person, each way, from your rate sheet. Manizales (MZL) and Cali (CLO): tailor-made quote.",
    sup_tab: "Supplements", sup_t: "Supplement", value: "Value", guide_tab: "Guiding in other languages", none_rates: "Your rate sheet doesn't have these values yet: ask your advisor.",
    k_h: "Sales kit", k_l: "Download a PDF with the experiences you choose, in your client's language. You can use your agency's logo, remove the Espontáneos logo and add your markup.",
    k1: "Experiences", k_route: "Only the tours in my route", k_all: "Whole portfolio", k_none: "Clear all", k_sel: "{0} selected", k2: "Language and brand", k_lang: "PDF language", k_logo: "Brand", k_with: "With Espontáneos Travel logo", k_without: "No logo (white label)", k_own: "With my agency's logo", k_up: "Upload logo", k_up2: "Change logo", k_rm: "Remove logo", k_nologo: "You haven't uploaded your agency's logo yet.", k_own_alt: "Your agency's logo", k_up_l: "PNG, JPG, WebP, SVG or GIF, up to 5 MB. It is saved to your user together with your agency name, ready for your next PDFs.", k_saving: "Saving to your user…", k_saved: "Saved to your user.", k_nosave: "Couldn't save to your user: for now it is used in this session only.", k_big: "The image is larger than 5 MB.", k_badimg: "I couldn't read that image. Try PNG or JPG.",
    k_agency: "Your agency name on the cover (optional)", k3: "Prices", k_price: "Which price to show?", k_pn: "No prices", k_pnet: "With net rate", k_psell: "With selling price (net + my markup)", k_mk: "My markup (%)",
    k_pnote: "The PDF shows the price per person for 2, 4, 6 and 10 passengers, from your rate sheet.", k_go: "Download PDF", k_need: "Choose at least one experience.", k_making: "Building the PDF…", k_done: "Done: {0}", k_err: "The PDF could not be created. Please try again.",
    k_open: "If it didn't download, open it here", pdf_client: "PDF for your client", pdf_net: "PDF with net rate", pdf_more: "More options (language, brand, markup)", pdf_note: "The client PDF has no rates or internal data. The net-rate PDF is for your agency only.",
    k_trnote: "Translation pending validation by the Espontáneos Travel team.", k_pax: "Passengers in the quote", k_nolib: "The PDF generator could not be loaded. Check your connection and try again.",
    c_h: "Conditions 2027", c_l: "More about us, booking and payment policies, children and minors, sustainability, community impact stories and team. Information for agencies, DMCs and wholesalers.", c_about: "More about us", c_cases: "Community impact stories", c_book: "Bookings and payments", c_kids: "Children and minors", c_sost: "Sustainability", c_team: "Team and contact", c_read: "How to read the sheets",
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
// Nombre de la línea como en el índice del portafolio en PDF que ya conocen las agencias («Experiencias rurales»…)
const LINE = { es: { rur: "Experiencias rurales", nat: "Experiencias de naturaleza", bien: "Experiencias de bienestar", compartidos: "Tours Compartidos 2027" }, en: { rur: "Rural experiences", nat: "Nature experiences", bien: "Wellness experiences", compartidos: "Shared Tours 2027" } };
// El capítulo «Tours Compartidos 2027» lleva su sello junto al título
const lineSeal = k => (k === "compartidos" ? `<img class="ico seal-i lseal" src="${SEAL}" alt="${esc(tx("b_shared"))}" width="22" height="22" decoding="async">` : "");
const lineName = k => (LINE[L()] || LINE.es)[k] || catName(k);

/* ---------- íconos (trazo, 24×24) ---------- */
const ICONS = {
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>', chev: '<path d="m6 9 6 6 6-6"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  route: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/>', bus: '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M3 11h18M7 17v2.5M17 17v2.5"/><circle cx="7.5" cy="14" r=".9"/><circle cx="16.5" cy="14" r=".9"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.2M17.5 14.2A6 6 0 0 1 21 20"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 6h3v12"/>', child: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11l4-2 4 2M9.5 21l2.5-6 2.5 6"/>', tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', hotel: '<path d="M3 20V6M21 20v-6a3 3 0 0 0-3-3h-8v9M3 15h18"/><circle cx="7" cy="10.5" r="2"/>',
  plane: '<path d="M10.5 21 12 15l-7-3 1.5-1.5 7 1.5 4.5-6a2 2 0 0 1 3 2.5l-5 5.5 1 7-1.5 1.5-3-6"/>', download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
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
  inc: '<path d="M0-5 5 0 0 5-5 0z" fill="#fff"/>',
  compartidos: '<circle cx="-2.3" cy="-2.3" r="1.8" fill="#fff"/><circle cx="2.5" cy="-1.7" r="1.5" fill="#fff"/><path d="M-5.3 4.6c.2-2.7 1.3-4.2 3-4.2s2.8 1.5 3 4.2zM.9 4.6c.2-2.2 1.1-3.5 2.6-3.5S5.4 2.4 5.6 4.6z" fill="#fff"/>'
};

// Iconografía del portafolio (la del PDF 2027): turismo accesible, comunitario, Paisaje Cordillerano, tour compartido e idiomas
// El del tour compartido es el sello oficial «Shared Tour · Tour Compartido · Quindío» (tools/make_brand_assets.py --sello)
const SEAL = "/assets/img/brand/tour-compartido.webp";
const ICO = {
  acc: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="#E8762D"><circle cx="12" cy="4" r="2"/><path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/></g></svg>',
  com: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11.4" fill="#2F3B22"/><circle cx="12" cy="12" r="9.4" fill="none" stroke="#fff" stroke-width=".7" stroke-dasharray="1.2 1"/><g fill="#8DBF4A"><circle cx="7.7" cy="10.2" r="1.45"/><path d="M5.5 16.3c0-1.7 1-3.1 2.2-3.1s2.2 1.4 2.2 3.1z"/><circle cx="16.3" cy="10.2" r="1.45"/><path d="M14.1 16.3c0-1.7 1-3.1 2.2-3.1s2.2 1.4 2.2 3.1z"/></g><g fill="#F2A33A"><circle cx="12" cy="8.6" r="1.75"/><path d="M9.4 16.3c0-2.1 1.2-3.8 2.6-3.8s2.6 1.7 2.6 3.8z"/></g></svg>',
  cord: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21.6 3.4 13.1A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 8.6 6.7z" fill="#fff" stroke="#E8762D" stroke-width="1.7" stroke-linejoin="round"/><path d="M4.9 13.9 8.8 9.8l3.2 3.3 3.3-3.4 3.8 4.1L12 20.3z" fill="#3E8E4A"/><path d="m8.8 9.8 3.2 3.3-2.1 2.2-3.1-3.1z" fill="#8DBF4A"/><path d="m12 20.3-3.6-3.6h7.2z" fill="#D9338E"/></svg>',
  shared: `<img class="ico seal-i" src="${SEAL}" alt="" width="22" height="22" decoding="async">`
};
const FLAGS = {
  ES: '<rect width="24" height="24" fill="#AA151B"/><rect y="6" width="24" height="12" fill="#F1BF00"/>',
  EN: '<rect width="24" height="24" fill="#fff"/><g fill="#B22234"><rect width="24" height="1.85"/><rect y="3.69" width="24" height="1.85"/><rect y="7.38" width="24" height="1.85"/><rect y="11.08" width="24" height="1.85"/><rect y="14.77" width="24" height="1.85"/><rect y="18.46" width="24" height="1.85"/><rect y="22.15" width="24" height="1.85"/></g><rect width="11" height="12.9" fill="#3C3B6E"/>',
  FR: '<rect width="8" height="24" fill="#0055A4"/><rect x="8" width="8" height="24" fill="#fff"/><rect x="16" width="8" height="24" fill="#EF4135"/>',
  IT: '<rect width="8" height="24" fill="#009246"/><rect x="8" width="8" height="24" fill="#fff"/><rect x="16" width="8" height="24" fill="#CE2B37"/>',
  PT: '<rect width="24" height="24" fill="#009C3B"/><path d="M12 3.5 22.5 12 12 20.5 1.5 12z" fill="#FFDF00"/><circle cx="12" cy="12" r="4.6" fill="#002776"/>'
};
const flag = l => FLAGS[l] ? `<span class="flag" title="${esc(langName(l))}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${FLAGS[l]}</svg></span>` : "";
// Íconos de una ficha, junto al código: accesible, comunitario, Paisaje Cordillerano, compartido e idiomas
function icoRow(e, cls) {
  const it = [];
  if (e.acc) it.push(`<span class="ic2" title="${esc(tx("ico_acc_s"))}">${ICO.acc}</span>`);
  if (e.com) it.push(`<span class="ic2" title="${esc(tx("b_com"))}">${ICO.com}</span>`);
  if (e.cord) it.push(`<span class="ic2" title="${esc(tx("b_cord"))}">${ICO.cord}</span>`);
  if (e.shared) it.push(`<span class="ic2" title="${esc(tx("b_shared"))}">${ICO.shared}</span>`);
  (e.langs || []).forEach(l => it.push(flag(l)));
  return it.length ? `<span class="icorow${cls ? " " + cls : ""}" role="img" aria-label="${esc([e.acc && tx("ico_acc_s"), e.com && tx("b_com"), e.cord && tx("b_cord"), e.shared && tx("b_shared"), (e.langs || []).map(langName).join(", ")].filter(Boolean).join(" · "))}">${it.join("")}</span>` : "";
}
// Medidas del mapa; cerrado (display: none) se usan las que tendrá al abrirse, así la vista queda lista
const mapW = () => (svg && svg.clientWidth) || (ROOT && ROOT.clientWidth) || 800;
const mapH = () => (svg && svg.clientHeight) || Math.round(Math.min(680, Math.max(400, (window.innerHeight || 800) * .68)));
// Mapa plegable: cerrado al entrar; se abre con clic o cuando una acción lo necesita (ver zonas, ruta, ubicar un hotel)
function mapShow(on, scroll) {
  const b = $r("mapblk"); if (!b) return;
  if (on) closeFloat();
  if (on === b.classList.contains("closed")) {
    b.classList.toggle("closed", !on); S.mapOpen = on;
    $r("maptg").setAttribute("aria-expanded", String(on)); $r("maptgl").textContent = tx(on ? "map_close" : "map_open");
    if (on) { VB = fitAspect(VB); commitVB(); } else if (S.active || S.popLL) closePop();
  }
  if (on && scroll) $r("mapwrap").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
}

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
  .replace("Calarca", "Calarcá").replace("Cordoba", "Córdoba").replace("Genova", "Génova").replace("Alcala", "Alcalá").replace("Quindio", "Quindío").replace("Chinchina", "Chinchiná").replace("Ibague", "Ibagué").replace("Villamaria", "Villamaría");

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
    e.acc = /\bapto\b[^.]{0,40}(movilidad reducida|silla de ruedas)/i.test((e.reco || []).join(" "));   // accesible según su ficha
    e.shared = !!e.compartido || e.modalidad === "Compartido";      // el sello sale solo con «compartido» (data/portafolio.json)
    const sp = privFicha(e.id);
    e.p = { why: fv(sp, "Por qué venderla"), interesa: fv(sp, "Te interesa"), where: fv(sp, "Punto de operación"), menu: fv(sp, "Menú"),
      supl: bullets(fv(sp, "Suplementos")), notes: sp.cond, impacto: sp.imp, team: fv(sp, "Nota del equipo"), diff: fv(sp, "Dificultad"), cap: fv(sp, "Capacidad máxima") };
    if (!e.zones && ZONE_CATS.has(e.cat)) { const z = zonesOf(e.p.where); if (z.length > 1) e.zones = z; }
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
// Guianza en otros idiomas (SU-ET006…SU-ET012): valor por servicio de guía según la duración, del tarifario de la cuenta
const GUIDE_RE = /^SU-ET0(0[6-9]|1[0-2])$/;
const GUIDES = () => [...PR.svc.keys()].filter(c => GUIDE_RE.test(c)).sort();
const G_NAMES = { es: ["Español", "Inglés", "Francés", "Italiano", "Alemán", "Portugués", "Guía para invidentes"], en: ["Spanish", "English", "French", "Italian", "German", "Portuguese", "Guide for blind travelers"] };
const guideName = c => (G_NAMES[L()] || G_NAMES.es)[+c.slice(-3) - 6] || String((PR.svc.get(c)[0] || {}).nombre || c).split("·").pop().trim();
const guideCols = () => [...new Set(GUIDES().flatMap(g => PR.svc.get(g).map(r => r.temporada)))];
const guideCol = t => (L() === "en" ? String(t).replace(/horas/, "hours") : t);
// En la ficha: «Suplemento de guianza en otros idiomas» se abre, se elige el idioma y salen sus valores
function guideSup() {
  const g = GUIDES(); if (!g.length) return "";
  const def = g.includes("SU-ET007") ? "SU-ET007" : g[0];
  return `<details class="gsup"><summary>${tx("g_sup")}</summary>
    <label class="field">${tx("g_lang")}<select data-r="gsel">${g.map(c => `<option value="${c}"${c === def ? " selected" : ""}>${esc(guideName(c))}</option>`).join("")}</select></label>
    <div data-r="gvals" aria-live="polite">${guideVals(def)}</div></details>`;
}
function guideVals(c) {
  const rows = PR.svc.get(c) || [];
  return `<dl class="gvals">${guideCols().map(t => { const r = rows.find(x => x.temporada === t); return `<div><dt>${esc(guideCol(t))}</dt><dd>${r ? cop(r.tarifa_neta) : "N/A"}</dd></div>`; }).join("")}</dl>
    <small class="sub"><span class="code">${esc(c)}</span> · ${tx("g_note")}</small>`;
}
function bindGuideSup(f) { const s = f.querySelector("[data-r=gsel]"); if (s) s.addEventListener("change", () => { f.querySelector("[data-r=gvals]").innerHTML = guideVals(s.value); }); }
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
  R.pax = Math.round(+R.pax) >= 1 ? Math.min(30, Math.round(+R.pax)) : 0;
  R.start = +R.start === 1 || +R.start === 2 ? +R.start : 0;
  const apOk = a => a === "" || D.airports.some(x => x.id === a);
  if (!apOk(R.arr)) R.arr = null; if (!apOk(R.dep)) R.dep = null;
  R.tours = (Array.isArray(R.tours) ? R.tours : []).filter(t => t && byId[t.id]).map(t => ({ id: t.id, day: Math.min(12, Math.max(1, Math.round(+t.day) || 2)), z: typeof t.z === "string" && (byId[t.id].zones || []).includes(t.z) ? t.z : "" }));
  R.hotel = okHotel(R.hotel) ? Object.assign({}, R.hotel, { muni: String(R.hotel.muni || ""), name: String(R.hotel.name) }) : null;
  if (typeof R.finca !== "string" || (R.finca && !finById[R.finca])) R.finca = "";
  return R;
}

/* ---------- montaje ---------- */
// Descarga los datos públicos (y el idioma) mientras el portal lee las tarifas: así el portafolio abre más rápido
export async function preload(lang) {
  if (!D) [D, M, V] = await Promise.all([json("/data/portafolio.json"), json("/data/mapa-eje.json"), json("/data/vias-eje.json").catch(() => null)]);
  if (lang === "en") await loadLang("en");
}
export async function mountPortafolio(host, ctx) {
  if (ac) ac.abort();
  ac = new AbortController();
  CTX = ctx;
  if (K.who !== (ctx.who || "")) Object.assign(K, { who: ctx.who || "", sel: null, lang: "ES", brand: "et", own: null, price: "none", markup: 15, agency: "", pax: 0, loaded: false });
  loadFonts();
  await preload(L());
  buildModel();
  try { localStorage.removeItem("pf27-ruta"); localStorage.removeItem("pf27-tab"); } catch (e) { /* versiones anteriores las guardaban sin vencer */ }
  const saved = ss.get("pf27-ruta", null);
  S = { cats: new Set(Object.keys(D.cats)), q: "", ideal: "", dur: "", lang: "", sugg: "", active: null, popLL: null, wl: false, hotels: false, fincas: true,
    tab: ss.get("pf27-tab", "mapa"), placing: false, editing: false, newName: "", newFor: "", near: false, open: {},
    R: Object.assign(EMPTY_R(), saved || {}) };
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
    else if (/^#tours-compartidos$/i.test(location.hash)) goComp(false);
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
   <div class="mapblk closed" data-r="mapblk">
    <button type="button" class="maptg" data-r="maptg" aria-expanded="false" aria-controls="pf-mapwrap">${ic("map")}<span class="mt"><b data-r="maptgl">${tx("map_open")}</b><span class="sub">${esc(tx("map_tg_s", EXP.length))}</span></span>${ic("chev", "chev")}</button>
    <div class="map-wrap" id="pf-mapwrap" data-r="mapwrap">
      <svg class="mapsvg" data-r="svg" role="img" aria-label="${esc(tx("map_aria"))}"><g data-r="base"></g><g data-r="ov"></g></svg>
      <div class="map-title"><h2>${esc(tx("map_t"))}</h2><p>${esc(tx("map_s"))}</p></div>
      <div class="ctrl"><div class="seg" role="group" aria-label="Zoom"><button type="button" data-view="region">${tx("v_region")}</button><button type="button" data-view="eje" aria-pressed="true">${tx("v_eje")}</button><button type="button" data-view="quindio">${tx("v_quindio")}</button></div>
        <div class="zoom"><button type="button" data-z="in" aria-label="${esc(tx("z_in"))}">+</button><button type="button" data-z="out" aria-label="${esc(tx("z_out"))}">−</button></div></div>
      <div class="legend" data-r="legend"></div>
      <div data-r="banner"></div>
      <div class="keyrow">
        <span class="chip key"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" rx="3" fill="var(--sky)"/></svg>${tx("k_apt")}</span>
        <span class="chip key"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l1.8 3.9 4.2.4-3.2 2.8 1 4.1L7 10 3.2 12.2l1-4.1L1 5.3l4.2-.4z" fill="var(--fg)"/></svg>${tx("k_cap")}</span>
      </div>
    </div>
    <div class="mapfoot">${mapFoot()}</div>
   </div>
    <div class="panel">
      <div class="tabs" role="tablist">${tab("mapa", "home")}${tab("exp", "grid")}${tab("ruta", "route", `<span class="n" data-r="rn">0</span>`)}${tab("trans", "bus")}${tab("kit", "file")}${tab("cond", "info")}</div>
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
        <label class="nearsort" data-r="nearw"><input type="checkbox" data-r="near"> ${ic("pin", "sm")}<span>${tx("near_sort")}</span></label>
        <div class="nearbox" data-r="nearbox" hidden></div>
        <div class="listbar"><div class="count" data-r="count" role="status"></div><button type="button" class="btn ghost sm" data-r="gall" hidden></button></div>
        <div data-r="groups"></div>
      </section>
      <section class="pane" id="pf-pane-ruta" data-pane="ruta" role="tabpanel" aria-labelledby="pf-tab-ruta" hidden>
        <div class="rhead"><div><h2>${tx("r_h")}</h2><p class="lead">${tx("r_l")}</p></div><button type="button" class="btn ghost sm" data-r="rshow">${ic("map", "sm")}${tx("fl_show")}</button></div>
        <div class="rlay" data-r="rlay">
        <aside class="rfloat" data-r="rfloat" hidden aria-label="${esc(tx("fl_t"))}"><div class="fl-head"><b>${ic("route", "sm")}${tx("fl_t")}</b><span class="sub" data-r="flsub"></span><button type="button" class="btn ghost sm" data-r="flbig">${ic("map", "sm")}${tx("fl_big")}</button><button type="button" class="iconbtn" data-r="flx" aria-label="${esc(tx("close"))}">${ic("x", "sm")}</button></div>
          <div class="fl-body"><div class="fl-map" data-r="flmap" title="${esc(tx("fl_exp"))}"></div></div></aside>
        <div class="steps">
          <div class="step"><h3><span class="k">1</span>${tx("r1")}</h3>
            <div class="row2"><label class="field">${tx("r_pax")}<input data-r="rpax" type="number" min="1" max="30" inputmode="numeric" placeholder="${esc(tx("r_pax_ph"))}"></label>
            <label class="field">${tx("r_start")}<select data-r="rstart"><option value="">${tx("r_pick")}</option><option value="1">${tx("r_d1")}</option><option value="2">${tx("day", 2)}</option></select></label></div>
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
  const refilter = () => { S.open = {}; drawOverlay(); renderList(); $r("fclear").hidden = !(S.q || S.ideal || S.dur || S.lang || S.sugg || S.cats.size < Object.keys(D.cats).length); };
  let qt = 0;
  f("q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; refilter(); }, 120); });
  ["ideal", "dur", "lang"].forEach(k => f(k).addEventListener("change", e => { S[k] = e.target.value; refilter(); }));
  f("sugg").addEventListener("change", e => {
    S.sugg = e.target.value; refilter();
    if (S.sugg) { const ids = D.sugg[S.sugg].filter(i => byId[i]); const la = ids.map(i => byId[i].lat), lo = ids.map(i => byId[i].lon); if (la.length) animateTo(boxToVB(Math.min(...la) - .06, Math.max(...la) + .08, Math.min(...lo) - .06, Math.max(...lo) + .06)); }
  });
  $r("near").addEventListener("change", e => {
    S.near = e.target.checked; renderList();
    const q = S.near && !S.R.hotel && $r("nearbox").querySelector('[data-h="q"]'); if (q) q.focus();
  });
  $r("gall").addEventListener("click", () => {
    const ds = $r("groups").querySelectorAll("details.group"), open = ![...ds].every(d => d.open);
    ds.forEach(d => { d.open = open; S.open[d.dataset.g] = open; }); syncGall();
  });
  $r("fclear").addEventListener("click", () => { S.q = S.ideal = S.dur = S.lang = S.sugg = ""; ["q", "ideal", "dur", "lang", "sugg"].forEach(k => { f(k).value = ""; }); S.cats = new Set(Object.keys(D.cats)); renderLegend(); refilter(); });
  S.refilter = refilter;
  // mapa
  $$("[data-view]").forEach(b => b.addEventListener("click", () => { animateTo(boxToVB(...VIEWS[b.dataset.view])); $$("[data-view]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }));
  $$("[data-z]").forEach(b => b.addEventListener("click", () => { const r = wrapRect(); zoomAt(b.dataset.z === "in" ? 1 / 1.45 : 1.45, r.left + r.width / 2, r.top + r.height / 2); }));
  $$("[data-layer]").forEach(b => b.addEventListener("click", () => toggleLayer(b.dataset.layer)));
  $r("maptg").addEventListener("click", () => mapShow($r("mapblk").classList.contains("closed")));
  $$("[data-zone]").forEach(b => b.addEventListener("click", () => { animateTo(boxToVB(...(ZONEVIEW[b.dataset.zone] || VIEWS.region))); $$("[data-view]").forEach(x => x.setAttribute("aria-pressed", "false")); }));
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
  addEventListener("keydown", ev => { if (ev.key !== "Escape" || !ROOT.isConnected) return; if ($r("lb").firstChild) $r("lb").innerHTML = ""; else if ($r("ficha").firstChild) closeFicha(); else if (S.placing) stopPlacing(); else if (!$r("rfloat").hidden) closeFloat(); else if (S.active) closePop(); }, sig);
  // ruta
  $r("rpax").addEventListener("change", e => { const n = Math.round(+e.target.value); S.R.pax = n >= 1 ? Math.min(30, n) : 0; S.tpax = 0; saveR(); renderRoute(); });
  $r("rstart").addEventListener("change", e => { S.R.start = +e.target.value || 0; saveR(); renderRoute(); });
  const apVal = v => (v === "?" ? null : v);
  $r("rarr").addEventListener("change", e => { S.R.arr = apVal(e.target.value); saveR(); renderRoute(); floatRoute(); });
  $r("rdep").addEventListener("change", e => { S.R.dep = apVal(e.target.value); saveR(); renderRoute(); floatRoute(); });
  $r("radd").addEventListener("change", e => { if (e.target.value) { toggleTour(e.target.value); floatRoute(); } });
  $r("rfit").addEventListener("click", () => floatRoute(true));
  $r("flx").addEventListener("click", closeFloat);
  const bigMap = () => { closeFloat(); mapShow(true, true); fitRoute(); };
  $r("flbig").addEventListener("click", bigMap);
  $r("flmap").addEventListener("click", ev => { if (!ev.target.closest(".zopt")) bigMap(); });
  $r("rshow").addEventListener("click", () => floatRoute(true));
  $r("rclear").addEventListener("click", () => { S.newName = ""; stopPlacing(); closeFloat(); S.R = EMPTY_R(); saveR(); renderRoute(); animateTo(boxToVB(...VIEWS.eje)); });
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
  if (t !== "ruta") closeFloat();
  S.tab = t; ss.set("pf27-tab", t);
  $$("[data-tab]").forEach(b => { const on = b.dataset.tab === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  $$("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== t; });
  if (t === "exp" && S.listDirty) renderList();
  if (t !== "exp") S.listDirty = true;
  if (t === "ruta") { renderRoute(); if (!first) fitRoute(); } else drawOverlay();
  if (t === "kit") renderKit();
  if (t === "cond") renderCond();
  if (t === "trans") renderTrans();
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
  // Márgenes para no tapar la ruta con el título y los controles del mapa grande; la vista flotante no los tiene
  const W = Math.max(1, mapW()), H = Math.max(1, mapH()), mob = W < 640, fl = !!(svg && svg.closest(".rfloat")), top = fl ? 18 : mob ? 64 : 96, bot = fl ? 18 : mob ? 110 : 96, side = fl ? 18 : 24;
  const s = Math.max(w / Math.max(50, W - 2 * side), h / Math.max(50, H - top - bot));
  return { x: x0 - (W * s - w) / 2, y: y0 - top * s - ((H - top - bot) * s - h) / 2, w: W * s, h: H * s };
}
function fitAspect(b) { const r = mapW() / Math.max(1, mapH()); let { x, y, w, h } = b; if (w / h < r) { const nw = h * r; x -= (nw - w) / 2; w = nw; } else { const nh = w / r; y -= (nh - h) / 2; h = nh; } return { x, y, w, h }; }
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
    const W = Math.max(1, mapW()), k = VBc.w / VB.w, f = W / VB.w;
    svg.classList.add("moving");
    svg.style.transform = `translate(${(VBc.x - VB.x) * f}px, ${(VBc.y - VB.y) * f}px) scale(${k})`;
    placePop();
    clearTimeout(vbT); vbT = setTimeout(commitVB, 160);
    return;
  }
  if (!vbRaf) vbRaf = requestAnimationFrame(() => { vbRaf = 0; commitVB(); });
}
const px = () => VB.w / Math.max(1, mapW());
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
  const selH = S.R.hotel, fl = !!svg.closest(".rfloat");   // vista flotante: solo lo que está en la ruta
  if (S.hotels && !fl) HOTELS.forEach(h => { if (selH && norm(h.name) === norm(selH.name)) return; s += hotelSvg(h, false, u, veryIn); });
  if (selH) s += hotelSvg(selH, true, u, true);
  if (!fl || inRoute("finca")) s += fincasSvg(u);
  s += zoneOptsSvg(u);
  s += routeSvg(u);
  D.airports.forEach(a => { const [x, y] = P(a.lat, a.lon), w = 30 * u, hh = 17 * u;
    s += `<g class="apt"><rect x="${x - w / 2}" y="${y - hh / 2}" width="${w}" height="${hh}" rx="${3 * u}"/><text class="iata" x="${x}" y="${y + 4 * u}" font-size="${10.5 * u}" text-anchor="middle">${a.id}</text>
      <text class="nm" x="${x}" y="${y + hh / 2 + 12 * u}" font-size="${10.5 * u}" stroke-width="${3.5 * u}" text-anchor="middle">✈ ${esc(a.name)}</text></g>`; });
  // Puntos: al alejar, los que se tocan (< 18 px) se agrupan en un círculo con el número; tocarlo acerca el mapa
  // En el pequeño, los tours con varios municipios se ven en su punto de la ruta (no en el punto general)
  const vis = fl ? new Set(S.R.tours.map(t => t.id).filter(id => !(byId[id] || {}).zones)) : visible(), R = 18 * u, items = EXP.filter(e => vis.has(e.id)).map(e => { const [x, y] = P(...llOf(e)); return { e, x, y }; });
  const clusters = []; S.clusters = {};
  if (!veryIn) {
    items.forEach(it => { if (it.e.id === S.active) return; const c = clusters.find(c => Math.hypot(c.x - it.x, c.y - it.y) < R); if (c) { c.items.push(it); c.x = (c.x * (c.items.length - 1) + it.x) / c.items.length; c.y = (c.y * (c.items.length - 1) + it.y) / c.items.length; } else clusters.push({ x: it.x, y: it.y, items: [it] }); });
    const act = items.find(it => it.e.id === S.active); if (act) clusters.push({ x: act.x, y: act.y, items: [act] });
  } else items.forEach(it => clusters.push({ x: it.x, y: it.y, items: [it] }));
  if (!fl) EXP.forEach(e => { if (!vis.has(e.id)) { const [x, y] = P(...llOf(e)); s += `<circle class="pin-dim" cx="${x}" cy="${y}" r="${3 * u}"/>`; } });
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
  if (fl) ov.querySelectorAll("[tabindex]").forEach(n => n.removeAttribute("tabindex"));   // en el pequeño solo se mira y se toca
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
  const zo = ev.target.closest(".zopt"); if (zo) { pickZone(zo.dataset.t, zo.dataset.z); return; }
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
const seal = (e, cls) => (e.shared ? `<img class="seal${cls ? " " + cls : ""}" src="${SEAL}" alt="${esc(tx("b_shared"))}" width="132" height="132" decoding="async">` : "");
/* ---------- Tours Compartidos 2027: tarifa única por persona, puntos de encuentro, traslados e «Importante» ----------
   La tarifa, la comisión y la nota de 1 pasajero (en «notas» de la fila) y los traslados (ET-TC-…), la guía en inglés y la capa
   (SU-TC-…) llegan del tarifario de la cuenta (privado/tarifas-compartidos-2027.json, Tarifas → Importar): nunca en archivos públicos. */
const TC_ROWS = [["ET-TC-CIRCASIA", "Hoteles en Circasia → punto de encuentro en Armenia", "Hotels in Circasia → meeting point in Armenia"],
  ["ET-TC-FIL-QUIMBAYA", "Hoteles en Filandia → punto de encuentro en Quimbaya", "Hotels in Filandia → meeting point in Quimbaya"],
  ["ET-TC-MONTENEGRO", "Hoteles en Montenegro → punto de encuentro en Armenia", "Hotels in Montenegro → meeting point in Armenia"],
  ["ET-TC-QUIMBAYA", "Hoteles en Quimbaya → punto de encuentro en Armenia", "Hotels in Quimbaya → meeting point in Armenia"],
  ["ET-TC-CALARCA", "Hoteles en Calarcá o La Tebaida → punto de encuentro en Armenia", "Hotels in Calarcá or La Tebaida → meeting point in Armenia"],
  ["ET-TC-CORDILLERA", "Hoteles en Córdoba, Buenavista y Pijao → punto de encuentro en Armenia", "Hotels in Córdoba, Buenavista and Pijao → meeting point in Armenia"],
  ["ET-TC-FILANDIA", "Hoteles en Filandia → punto de encuentro en Armenia", "Hotels in Filandia → meeting point in Armenia"]];
const hm12 = h => { const [a, b] = String(h).split(":").map(Number); const pm = a >= 12, en = L() === "en"; return `${a % 12 || 12}:${String(b || 0).padStart(2, "0")} ${pm ? (en ? "p.m." : "p. m.") : (en ? "a.m." : "a. m.")}`; };
const meetOf = e => tr(e, "meet") || [];
function compTraslados() {
  if (S.wl) return "";
  const rows = TC_ROWS.filter(([c]) => PR.svc.has(c)); if (!rows.length) return "";
  const pax = Array.from({ length: 12 }, (_, i) => i + 1);
  return `<div class="section money comp-tr" id="pf-comp-traslados"><h3>${ic("bus")}${tx("ctr_t")}</h3><p class="note">${tx("ctr_s")}</p>
    <div class="tbl-wrap ctr" tabindex="0" role="region" aria-label="${esc(tx("ctr_t"))}"><table><thead><tr><th scope="col">${tx("ctr_srv")}</th>${pax.map(n => `<th scope="col" class="r">${tx("ctr_pax", n)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(([c, es, en]) => `<tr><th scope="row">${esc(L() === "en" ? en : es)}</th>${pax.map(n => { const v = svcAt(c, n); return `<td class="r">${v != null ? "$" + Math.round(v).toLocaleString("es-CO") : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="note">${tx("ctr_n")}</p></div>`;
}
function compImportante() {
  const capa = S.wl ? null : svcAt("SU-TC-CAPA", 1);
  return `<div class="ccard comp-imp"><h4>${ic("info", "sm")}${tx("imp_t")}</h4><ul>${[tx("imp_1", capa != null ? cop(capa) : tx("imp_cost")), tx("imp_2"), tx("imp_3"), tx("imp_4")].map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <p>${esc(tx("imp_5"))}</p><div class="btnrow"><a class="btn sm" href="https://wa.me/573187200023" target="_blank" rel="noopener">${ic("phone", "sm")}${tx("imp_wa")}</a></div></div>`;
}
// Tarifa única: valor por persona igual de 1 a 30 pax; debajo, la comisión y la nota de 1 pasajero (de «notas» de la fila)
function uniBox(e, r) {
  const notes = String(r.notas || "").split(/\s*\|\s*/).filter(Boolean).map(x => { const m = /^([^:]{2,30}):\s*(.+)$/.exec(x); return `<li>${m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(x)}</li>`; }).join("");
  const g = svcAt("SU-TC-GUIAEN", 1);
  return `<div class="box netbox uni" id="pf-f-rate"><span class="eyebrow">${tx("tu_rate")}</span><div class="big" data-r="net">${cop(r.tarifa_neta)}</div>
    <small>${tx("tu_pp")}</small>${notes ? `<ul class="rnotes">${notes}</ul>` : ""}<small>${esc(tx("tu_vig", e.anio || VIG))}</small>
    <div class="supl"><span class="eyebrow">${tx("s_supl")}</span>${g != null ? `<ul><li>${tx("g_en")}: ${cop(g)} ${tx("g_en_v")}</li></ul>` : ""}
      <button type="button" class="btn ghost sm" data-r="ctrgo">${ic("bus", "sm")}${tx("ctr_go")}</button></div></div>`;
}
// Ir al capítulo (y a su tabla de traslados): desde la ficha o con portal.html#tours-compartidos
function goComp(toTable) {
  if ($r("ficha") && $r("ficha").firstChild) closeFicha();
  S.cats.add("compartidos"); S.open.compartidos = true; S.listDirty = true; setTab("exp");
  requestAnimationFrame(() => { const t = (toTable && ROOT.querySelector("#pf-comp-traslados")) || ROOT.querySelector("#tours-compartidos"); if (t) t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); });
}
function badges(e) {
  const b = [];
  if (e.nuevo) b.push(`<span class="new">${tx("b_new")}</span>`); if (e.propio) b.push(`<span class="own">${tx("b_own")}</span>`);
  if (e.com) b.push(`<span class="com">${tx("b_com")}</span>`); if (e.cord) b.push(`<span class="cord">${tx("b_cord")}</span>`);
  return b.length ? `<div class="badge">${b.join("")}</div>` : "";
}
// Distancia por carretera desde el hotel de «Arma tu ruta» (la finca, al municipio con finca más cercano)
function distKm(e) { const h = S.R && S.R.hotel; if (!h) return null; const tp = tourPoint(e, h); return Math.max(1, legInfo([h.lat, h.lon], [tp.lat, tp.lon], 1).km); }
const nearLine = e => { const k = distKm(e); return k == null ? "" : `<div class="near">${ic("pin", "sm")}${tx("near", k)}</div>`; };
const priceLine = e => { const u = e.tarifa_unica && rateRow(e.id, 2); if (u) return `<b>${cop(u.tarifa_neta)}</b> <span class="pu">${tx("tu_card")}</span>`; const f = fromPrice(e.id); return f ? `${tx("from_net")} <b>${cop(f.v)}</b> <span class="code">· ${f.pax} pax</span>` : tx("ask_rate"); };

/* ---------- lista de experiencias ---------- */
function renderList() {
  if (S.tab !== "exp") { S.listDirty = true; return; }      // se pinta al abrir «Experiencias»
  S.listDirty = false;
  const vis = visible(); let html = "", n = 0;
  renderNear();
  // Cada línea se abre y se cierra con un clic; cerradas al entrar, abiertas al buscar o filtrar (o si queda una sola)
  const groups = Object.entries(D.cats).map(([k, c]) => [k, c, EXP.filter(e => e.cat === k && vis.has(e.id))]).filter(g => g[2].length);
  const auto = !!(S.q || S.ideal || S.dur || S.lang || S.sugg) || groups.length === 1;
  for (const [k, c, items] of groups) {
    n += items.length;
    if (S.near && S.R.hotel) items.sort((a, b) => distKm(a) - distKm(b));
    const isComp = k === "compartidos";
    html += `<details class="group" data-g="${k}"${isComp ? ' id="tours-compartidos"' : ""}${(k in S.open ? S.open[k] : auto) ? " open" : ""}><summary><i style="background:${c.color}"></i><span class="gname">${esc(lineName(k))}</span>${lineSeal(k)}<span class="gn">${items.length}</span><span class="sub">${[...new Set(items.map(e => e.sub))].map(esc).join(" · ")}</span>${ic("chev", "sm")}</summary>${isComp ? `<p class="gintro">${esc(tx("comp_intro"))}</p>` : ""}<div class="cards">` +
      items.map(e => `<button type="button" class="card${S.active === e.id ? " on" : ""}" data-card="${e.id}">
        <div class="media">${mediaBlock(e, { video: false, one: true })}${badges(e)}${seal(e)}${videosOf(e.id).length ? '<span class="vid-tag">▶ Video</span>' : ""}</div>
        <div class="body"><h4>${esc(tr(e, "name"))}</h4><div class="meta"><span class="code">${e.code}</span>${e.code ? " · " : ""}${esc(e.deptos)} · ${ic("clock", "sm")}${esc(tr(e, "dur"))}</div>
        ${icoRow(e, "sm")}${nearLine(e)}<div class="meta tl">${esc(tr(e, "tagline"))}</div>
        <div class="price">${priceLine(e)}</div></div></button>`).join("") + `</div>${isComp ? `<div class="gextra">${compTraslados()}${compImportante()}</div>` : ""}</details>`;
  }
  $r("groups").innerHTML = html || `<p class="empty">${tx("none_match")}</p>`;
  $r("count").textContent = n === 1 ? tx("n_exp1") : tx("n_exp", n);
  $r("groups").querySelectorAll("[data-card]").forEach(c => c.addEventListener("click", () => openFicha(c.dataset.card)));
  $r("groups").querySelectorAll("details.group").forEach(d => d.addEventListener("toggle", () => { if (d.isConnected) { S.open[d.dataset.g] = d.open; syncGall(); } }));
  syncGall();
}
function syncGall() {
  const ds = [...$r("groups").querySelectorAll("details.group")], b = $r("gall");
  b.hidden = ds.length < 2; b.textContent = ds.length && ds.every(d => d.open) ? tx("g_close") : tx("g_open");
}
// «Cercanas a mi hotel»: el hotel se busca aquí mismo (es el de «Arma tu ruta») y nada viene preseleccionado de otra sesión
function renderNear() {
  const box = $r("nearbox"); if (!box) return;
  $r("near").checked = !!S.near; box.hidden = !S.near;
  if (S.near) { renderHotelBox(box, "n"); if (!S.R.hotel) box.insertAdjacentHTML("beforeend", `<span class="note">${tx("near_hint")}</span>`); }
}

/* ---------- tarjeta flotante en el mapa ---------- */
const inRoute = id => S.R.tours.some(t => t.id === id);
function openPop(id, fromList) {
  S.active = id; S.popLL = null; const e = byId[id]; setZones(S.wl ? null : e.zones);
  if (fromList) { const [x, y] = P(...llOf(e)); if (x < VB.x || x > VB.x + VB.w || y < VB.y || y > VB.y + VB.h) animateTo(boxToVB(...VIEWS.eje)); mapShow(true, true); }
  drawOverlay(); markActive();
  $r("pop").innerHTML = `<div class="pop" role="dialog" aria-label="${esc(tr(e, "name"))}">
    <button type="button" class="x" data-r="popx" aria-label="${esc(tx("close"))}">×</button><div class="media">${mediaBlock(e)}${badges(e)}${seal(e, "lg")}</div>
    <div class="body"><span class="eyebrow">${esc(catName(e.cat))} · ${esc(e.sub)}</span><h3>${esc(tr(e, "name"))}</h3>
      <div class="row"><span><span class="code">${esc(e.code)}</span> ${icoRow(e, "sm")} · ${esc(e.deptos)}</span><span>${ic("clock", "sm")}${esc(tr(e, "dur"))}</span></div>
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
  const nav = [["exp", tx("s_exp")], ["tech", tx("s_tech")], ["incl", tx("s_incl")], ["oper", tx("s_oper")], ...(meetOf(e).length ? [["meet", tx("s_meet")]] : []), ...(sell ? [["sell", tx("s_sell")]] : []), ...(!wl ? [["rate", tx("s_rate").split(" ")[0] === "Tarifa" ? "Tarifa" : "Rate"]] : [])];
  $r("ficha").innerHTML = `<div class="ficha" role="dialog" aria-modal="true" aria-label="${esc(tr(e, "name"))}" data-fid="${id}"><article class="sheet">
    <div class="hero"><div class="media">${mediaBlock(e, { label: false, big: true })}</div>${badges(e)}${seal(e, "xl")}<button type="button" class="close" data-r="fx">${ic("x", "sm")}${tx("close")}</button>
      <div class="hero-txt"><span class="eyebrow">${esc(catName(e.cat))} · ${esc(e.sub)} · ${esc(e.deptos)}</span><h2>${esc(tr(e, "name"))}</h2><p>${esc(tr(e, "tagline"))}</p></div></div>
    <dl class="facts">${fact("clock", tx("f_dur_l"), tr(e, "dur"))}${fact("users", tx("f_mod"), tr(e, "modalidad"))}${fact("food", tx("f_lunch"), tr(e, "almuerzo"))}${fact("child", tx("f_age"), tr(e, "edad") || tx("ask"))}${fact("users", tx("f_group"), grp)}
      <div><dt>${ic("globe", "sm")}${tx("f_langs")}</dt><dd>${(e.langs || []).map(langName).map(esc).join(", ")}</dd></div><div class="code-wrap"><dt>${ic("tag", "sm")}${tx("f_code")}</dt><dd><span class="code">${esc(e.code)}</span> ${icoRow(e)}</dd></div></dl>
    <nav class="fnav" aria-label="${esc(tr(e, "name"))}">${nav.map(([k, l]) => `<a href="#pf-f-${k}" data-jump="${k}">${esc(l)}</a>`).join("")}</nav>
    <div class="f-body"><div class="f-main">
      <section id="pf-f-exp"><h3>${tx("s_exp")}</h3>${(tr(e, "desc") || []).map(x => `<p>${esc(x)}</p>`).join("")}</section>
      <section id="pf-f-tech"><h3>${tx("s_tech")}</h3>${techTable(e)}</section>
      ${(e.fotos || []).length || gal.length > 1 ? `<section id="pf-f-photos"><h3>${tx("s_photos")}</h3>${gal.length > 1 ? `<div class="gallery">${gal.map((g, i) => `<button type="button" data-g="${i}" aria-label="${esc(tx("s_photos"))} ${i + 1}">${g.v ? `${g.p ? `<img src="${esc(g.p)}" alt="" loading="lazy">` : ""}<span class="play">▶ Video</span>` : `<img src="${ph640(g.i)}" alt="${esc(tr(e, "name"))} ${i + 1}" loading="lazy">`}</button>`).join("")}</div>` : ""}
        <div class="btnrow phdl">${(e.fotos || []).length ? `<button type="button" class="btn ghost sm" data-r="phdl">${ic("download", "sm")}${tx("ph_dl", e.fotos.length)}</button>` : ""}${!wl && BANK ? `<a class="btn ghost sm" href="${BANK}" target="_blank" rel="noopener" title="${esc(tx("ph_bank_s"))}">${ic("grid", "sm")}${tx("ph_bank")} ↗</a>` : ""}</div>
        <p class="note" data-r="phst" aria-live="polite">${(e.fotos || []).length ? esc(tx("ph_note")) : ""}</p></section>` : ""}
      <section id="pf-f-incl" class="lists"><div><h3>${ic("check")}${tx("s_incl")}</h3>${L1("", tr(e, "incl"), "yes")}</div><div><h3>${ic("x")}${tx("s_noincl")}</h3>${L1("", tr(e, "noIncl"), "no")}</div></section>
      <section id="pf-f-oper"><h3>${tx("s_oper")}</h3>${L1("", tr(e, "oper")) || `<p>${tx("ask")}</p>`}</section>
      ${meetOf(e).length ? `<section id="pf-f-meet"><h3>${tx("s_meet")}</h3><ul class="ul meet">${meetOf(e).map(m => `<li><b>${esc(hm12(m.h))}</b> · ${esc(m.l)}</li>`).join("")}</ul></section>` : ""}
      ${(tr(e, "reco") || []).length || (tr(e, "noApto") || []).length ? `<section><h3>${tx("s_reco")}</h3>${L1("", tr(e, "reco"))}${(tr(e, "noApto") || []).length ? `<p class="fnote">${ic("info", "sm")}${esc(tx("s_noapto"))}: ${tr(e, "noApto").map(esc).join(" ")}</p>` : ""}</section>` : ""}
      ${sell ? `<section id="pf-f-sell" class="sellbox"><h3>${tx("s_sell")} <span class="b2b">${tx("only_ag")}</span></h3>
        ${p.why ? `<div><h4>${tx("why")}</h4><p>${esc(p.why)}</p></div>` : ""}${p.interesa ? `<div><h4>${tx("interesa")}</h4><p>${esc(p.interesa)}</p></div>` : ""}
        ${p.where ? `<div><h4>${tx("where")}</h4><p>${esc(p.where)}</p>${e.zones ? `<div class="tags">${e.zones.map(z => `<span class="tag z">${esc(MUNI_LABEL(z))}</span>`).join("")}</div><p class="note">${tx("zones_note")}</p><div><button type="button" class="btn ghost sm" data-r="seez">${ic("map", "sm")}${tx("see_zones")}</button></div>` : ""}</div>` : ""}
        ${p.menu ? `<div><h4>${tx("menu")}</h4>${menuHtml(p.menu)}</div>` : ""}
        ${p.team ? `<div><h4>${L() === "en" ? "Team note" : "Nota del equipo"}</h4><p>${esc(p.team)}</p></div>` : ""}</section>` : ""}
      ${notes ? `<section><h3>${tx("s_notes")} <span class="b2b">${tx("only_ag")}</span></h3><ul class="fnotes">${p.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
      <section class="f-foot"><p class="note">${ic("child", "sm")}${esc(tx("kids"))}</p><div class="btnrow"><button type="button" class="btn ghost sm" data-cond="book">${ic("shield", "sm")}${tx("see_cond")}</button><button type="button" class="btn ghost sm" data-cond="about">${ic("info", "sm")}${tx("see_about")}</button></div></section>
    </div><aside class="aside">
      ${!wl && e.tarifa_unica && rate ? uniBox(e, rate) : ""}${!wl && !(e.tarifa_unica && rate) ? `<div class="box netbox" id="pf-f-rate"><span class="eyebrow">${tx("s_rate")}</span><div class="big" data-r="net">${rate ? cop(rate.tarifa_neta) : tx("ask")}</div>
        <label>${tx("pax")} <input type="range" data-r="paxr" min="1" max="30" value="${pax0}"> <b data-r="paxn">${pax0}</b></label>
        <small>${esc(tarLabel())}. ${tx("per_pax")}.${rate && rate.temporada ? " " + esc(rate.temporada) + "." : ""}</small>${rate && rate._de ? `<span class="pill">${esc(tx("carry", rate._de, VIG))}</span>` : ""}
        ${p.supl.length || GUIDES().length ? `<div class="supl"><span class="eyebrow">${tx("s_supl")}</span>${p.supl.length ? `<ul>${p.supl.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${guideSup()}</div>` : ""}</div>` : ""}
      <div class="btnrow col"><button type="button" class="btn add" data-add="${id}" aria-pressed="${inRoute(id)}">${inRoute(id) ? tx("in_route") : tx("add_route_l")}</button>
        ${CTX.onRequest && !wl ? `<button type="button" class="btn ghost" data-r="freq">${ic("send", "sm")}${tx("request")}</button>` : ""}</div>
      ${(!wl && p.impacto) || e.com || e.cord ? `<div class="box impact"><span class="eyebrow">${tx("impact")}${p.impacto && !wl ? ` <span class="b2b">${tx("only_ag")}</span>` : ""}</span><p>${!wl && p.impacto ? `<b>${esc(impName(p.impacto))}</b>` : ""}${e.com ? `<span>${esc(tx("com_txt"))}</span>` : ""}${e.cord ? `<span>${esc(tx("cord_txt"))}</span>` : ""}</p></div>` : ""}
      ${comb ? `<div class="box"><span class="eyebrow">${tx("s_combo")}</span><div class="combo">${comb}</div></div>` : ""}
    </aside></div></article></div>`;
  document.body.style.overflow = "hidden";
  const f = $r("ficha").firstChild; startSlides(f); hydrate(f);
  $r("fx").addEventListener("click", closeFicha); f.addEventListener("click", ev => { if (ev.target === f) closeFicha(); });
  const pax = $r("paxr"); if (pax) pax.addEventListener("input", () => { $r("paxn").textContent = pax.value; const v = priceAt(id, +pax.value); $r("net").textContent = v != null ? cop(v) : tx("ask"); });
  f.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => lightbox(gal[+b.dataset.g], e)));
  if ($r("phdl")) $r("phdl").addEventListener("click", () => photosZip(e, $r("phst"), $r("phdl")));
  if ($r("ctrgo")) $r("ctrgo").addEventListener("click", () => goComp(true));
  f.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => openFicha(b.dataset.go)));
  f.querySelectorAll("[data-jump]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); const t = f.querySelector("#pf-f-" + a.dataset.jump); if (t) t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); }));
  f.querySelectorAll("[data-cond]").forEach(b => b.addEventListener("click", () => { closeFicha(); setTab("cond"); jumpCond(b.dataset.cond); }));
  const sz = $r("seez"); if (sz) sz.addEventListener("click", () => { closeFicha(); mapShow(true, true); animateTo(boxToVB(...VIEWS.eje)); openPop(id); });
  if ($r("freq")) $r("freq").addEventListener("click", () => { closeFicha(); CTX.onRequest({ tours: [{ tour_id: e.id, codigo: e.code, nombre: e.name }] }); });
  bindAdd(f);
  bindGuideSup(f);
  try { history.replaceState(null, "", location.pathname + location.search + "#ficha=" + id); } catch (err) { /* sin historial */ }
  f.querySelector("[data-r=fx]").focus({ preventScroll: true });
}
function closeFicha() {
  $r("ficha").innerHTML = ""; document.body.style.overflow = "";
  if (/#ficha=/.test(location.hash)) { try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* sin historial */ } }
}
function lightbox(g, e) {
  $r("lb").innerHTML = `<div class="lb" role="dialog" aria-modal="true"><button type="button" class="close">${ic("x", "sm")}${tx("close")}</button>${g.v ? `<video data-vid="${esc(g.v.id)}" data-partes="${+g.v.partes}" ${g.p ? `poster="${esc(g.p)}"` : ""} data-auto="1" controls muted loop playsinline></video>` : `<img src="${ph1600(g.i)}" alt="">`}${!g.v && e ? `<button type="button" class="btn sm lb-dl">${ic("download", "sm")}${tx("ph_dl1")}</button>` : ""}</div>`;
  const lb = $r("lb").firstChild; hydrate(lb); lb.addEventListener("click", ev => { if (ev.target === lb || ev.target.closest(".close")) $r("lb").innerHTML = ""; });
  const dl = lb.querySelector(".lb-dl");
  if (dl) dl.addEventListener("click", async () => {
    dl.disabled = true;
    try { const n = (e.fotos || []).indexOf(g.i) + 1; savePdf(new Blob([await jpgOf(ph1600(g.i))], { type: "image/jpeg" }), photoName(e, n > 0 ? n : 1), null); }
    catch (err) { toast(tx("ph_err")); } finally { dl.disabled = false; }
  });
}
/* ---------- fotos de la ficha para las agencias: en JPG (la versión grande de la web), todas en un .zip ---------- */
// Banco de imágenes adicional: la carpeta pública del Drive del portafolio (la misma de donde salen las fotos de la web)
const BANK = "https://drive.google.com/drive/folders/1W7NduWZYekGmVh9JrxO07jpV8Jq8NTEU";
const slugTxt = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
const photoName = (e, n) => `${e.code || e.id}_${slugTxt(tr(e, "name"))}_${String(n).padStart(2, "0")}.jpg`;
async function jpgOf(url) {
  const bm = await createImageBitmap(await (await fetch(url)).blob()); const c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0);
  const b = await new Promise((ok, bad) => c.toBlob(x => (x ? ok(x) : bad(new Error("jpg"))), "image/jpeg", .9));
  return new Uint8Array(await b.arrayBuffer());
}
// ZIP sin compresión (las fotos ya vienen comprimidas): encabezado local + directorio central + fin, con CRC-32
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipBlob(files) {
  const enc = new TextEncoder(), parts = [], cd = [], d = new Date(); let off = 0;
  const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [10, tm, 2], [12, dt, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, nm.length, 2]].forEach(([o, v, z]) => (z === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true)));
    const c = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [12, tm, 2], [14, dt, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, nm.length, 2], [42, off, 4]].forEach(([o, v, z]) => (z === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true)));
    parts.push(h, nm, f.data); cd.push(c, nm); off += 30 + nm.length + n;
  }
  const size = cd.reduce((s, x) => s + x.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, off, 4]].forEach(([o, v, z]) => (z === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
  return new Blob([...parts, ...cd, end], { type: "application/zip" });
}
async function photosZip(e, st, btn) {
  const fotos = (e.fotos || []).slice(0, 20); if (!fotos.length) return;
  if (btn) btn.disabled = true;
  try {
    const files = [];
    for (let i = 0; i < fotos.length; i++) { if (st) st.textContent = tx("ph_making", i + 1, fotos.length); files.push({ name: photoName(e, i + 1), data: await jpgOf(ph1600(fotos[i])) }); }
    savePdf(zipBlob(files), `Fotos_${e.code || e.id}_${slugTxt(tr(e, "name"))}.zip`, st);
  } catch (err) { if (st) st.textContent = tx("ph_err"); if (window.console) console.error(err); }
  finally { if (btn) btn.disabled = false; }
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
  const mt = meetOf(e);
  const towns = [...new Set(mt.map(m => String(m.l).split(/\s*:\s*/)[0]))], tw = towns.length > 1 ? towns.slice(0, -1).join(", ") + tx("meet_and") + towns[towns.length - 1] : towns[0];
  const meet = mt.length ? [tx("meet_see", tw, mt.length), tw] : e.athotel ? [tx("atHotel"), tx("atHotel")] : /transporte/.test(incl) ? [tx("pick"), tx("pickC")] : [tx("onsite"), tx("onsite")];
  const langs = (e.langs || []).map(langName).join(" / ") || tx("langC");
  const sched = mt.length ? [tx("dep_from", hm12(mt[0].h)), tx("dep_from", hm12(mt[0].h))] : [oper[0] || tx("ask"), franja(oper.join(" ")) || oper[0] || tx("ask")];
  const rows = [[tx("f_dur_l"), durB, durC], [tx("p_sched"), sched[0], sched[1]], [tx("p_diff"), diff, diff],
    [tx("p_cap"), capN ? tx("capB2B", capN) : tx("ask"), capN ? tx("capB2C", capN) : tx("ask")], [tx("p_meet"), meet[0], meet[1]], [tx("p_guide"), `${langs} (${tx(e.compartido ? "guide_sup_en" : "guide_sup")})`, langs]];
  // Portal de agencias: solo el detalle B2B (sin columna B2C, pedido de ET 29-oct-2026); en Marca blanca, una columna con la versión para el viajero
  return `<div class="tbl-wrap tech"><table><thead><tr><th>${tx("p_param")}</th><th>${S.wl ? tx("p_det") : tx("p_b2b")}</th></tr></thead><tbody>
    ${rows.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(S.wl ? r[2] : r[1])}</td></tr>`).join("")}</tbody></table></div>`;
}
function bindAdd(root) {
  root.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => { toggleTour(b.dataset.add); const on = inRoute(b.dataset.add); b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? tx("in_route") : (b.closest(".pop") ? tx("add_route") : tx("add_route_l")); }));
}

/* ---------- arma tu ruta ---------- */
// Ruta vacía: pasajeros y primer día sin elegir (0), aeropuertos sin elegir (null; "" es «Sin traslado»)
const EMPTY_R = () => ({ pax: 0, start: 0, arr: null, dep: null, hotel: null, finca: "", tours: [] });
const saveR = () => { ss.set("pf27-ruta", S.R); S.listDirty = true; };
function toggleTour(id) {
  if (inRoute(id)) S.R.tours = S.R.tours.filter(t => t.id !== id);
  else { const used = new Set(S.R.tours.map(t => t.day)); let d = +S.R.start || 2; while (used.has(d) && d < 12) d++; S.R.tours.push({ id, day: d }); toast(tx("added_day", d)); }
  if (id === "finca" && !inRoute("finca")) S.R.finca = "";
  saveR(); renderRoute();
}
const hav = (a, b) => { const R = 6371, t = x => x * Math.PI / 180, dl = t(b[0] - a[0]), dn = t(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
// Tramo por carretera: vías reales entre cabeceras y aeropuertos (data/vias-eje.json, tools/build-vias.js) más el
// trecho de cada punto a su cabecera; si están cerca, o sin datos de vías, línea recta × 1,4. Tiempos con margen de van.
const nearV = p => { let b = null; V.pts.forEach((c, i) => { const d = hav(p, c); if (!b || d < b.d) b = { i, d }; }); return b; };
function legInfo(a, b, lo = 3) {
  const local = () => { const km = Math.max(lo, hav(a, b) * 1.4); return { km: Math.round(km), min: Math.round((km / 36 * 60 + 5) / 5) * 5 }; };
  if (!V) return local();
  const va = nearV(a), vb = nearV(b); if (va.i === vb.i || hav(a, b) <= va.d + vb.d) return local();
  const [i, j] = va.i < vb.i ? [va.i, vb.i] : [vb.i, va.i], k = i * V.n.length - i * (i + 1) / 2 + (j - i - 1);
  if (!(V.km[k] >= 0)) return local();
  const acc = (va.d + vb.d) * 1.4, km = Math.max(lo, V.km[k] + acc);
  return { km: Math.round(km), min: Math.round((V.min[k] * 1.2 + acc / 30 * 60 + 5) / 5) * 5 };
}
const fmtMin = m => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? String(m % 60).padStart(2, "0") : ""}`.trim() : `${m} min`);
const vehFor = p => D.vehicles.filter(v => !v.vip && !v.suplemento).find(v => p >= v.min && p <= v.max) || D.vehicles.filter(v => !v.vip && !v.suplemento).slice(-1)[0];
const vehName = v => { const x = L() === "en" && I18.en && I18.en.vehicles && I18.en.vehicles.find(y => y.id === v.id); return (x && x.name) || v.name; };
// Municipios donde opera un tour, leídos de «Punto de operación» de su ficha técnica (solo agencias).
// Solo en las líneas donde la lista son alternativas (en tours tradicionales, ciudades y parques suelen ser paradas del mismo día).
const ZONE_CATS = new Set(["rur", "nat", "bien", "inc"]);
let MK = null;
const muniKeys = () => MK || (MK = Object.keys(M.mc).sort((a, b) => b.length - a.length));
function zonesOf(txt) {
  let t = String(txt || "").replace(/\([^)]*\)/g, " ").replace(/[A-Za-zÀ-ÿ]+\s*:/g, " ").replace(/\b(desde|de|del|a)\s+(Armenia|Pereira|Manizales)\b/gi, " ");
  t = " " + norm(t).replace(/MANIZALEZ/g, "MANIZALES").replace(/BUENA VISTA/g, "BUENAVISTA").replace(/[^A-Z ]+/g, " ") + " ";
  const out = [];
  for (const k of muniKeys()) {
    if (/^(RISARALDA|CALDAS|QUINDIO|TOLIMA|VALLE)$/.test(k)) continue;           // departamentos, no municipios
    const i = t.indexOf(" " + k + " "); if (i < 0) continue;
    out.push([i, k]); t = t.split(" " + k + " ").join(" " + "#".repeat(k.length) + " ");
  }
  return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
function nearestZone(e, h) {
  let best = null;
  e.zones.forEach(z => { const c = M.mc[norm(z)]; if (!c) return; const d = hav([h.lat, h.lon], c); if (!best || d < best.d) best = { d, z }; });
  return best ? best.z : null;
}
// «¿Dónde?» en Arma tu ruta: sugerido (el más cercano al hotel), fincas aliadas (visita a finca) o un municipio de la lista
function whereSel(e, t) {
  const h = S.R.hotel, near = e.zones && h ? nearestZone(e, h) : null;
  const cur = e.id === "finca" && S.R.finca && finById[S.R.finca] ? "f:" + S.R.finca : t.z ? "z:" + t.z : "";
  const fin = e.id === "finca" && FINCAS.length ? `<optgroup label="${esc(tx("z_fincas"))}">${FINCAS.map(x => `<option value="f:${esc(x.id)}">${esc(x.name)} · ${esc(x.muni)}${x.sup ? ` · +${cop(x.sup)} pp` : ""}</option>`).join("")}</optgroup>` : "";
  const mun = e.zones ? `<optgroup label="${esc(tx("z_munis"))}">${e.zones.map(z => `<option value="z:${esc(z)}">${esc(MUNI_LABEL(z))}</option>`).join("")}</optgroup>` : "";
  const g = e.id === "finca" && finById[S.R.finca];
  return `<div class="fsel"><label class="field">${tx(e.id === "finca" ? "which_finca" : "where_q")}<select data-zsel="${e.id}" data-cur="${esc(cur)}"><option value="">${esc(tx("z_auto", near ? " (" + MUNI_LABEL(near) + ")" : ""))}</option>${fin}${mun}</select></label>${g && g.aviso ? `<p class="fnote money">${esc(g.aviso)}</p>` : ""}${e.zones ? `<span class="note">${tx("z_hint")}</span>` : ""}</div>`;
}
// En el mapa (grande o pequeño): los otros municipios de cada tour de la ruta; tocar uno lo elige
function zoneOptsSvg(u) {
  if (S.wl || S.tab !== "ruta") return "";
  const h = S.R.hotel; let s = "";
  S.R.tours.forEach((t, k) => {
    const e = byId[t.id]; if (!e || !e.zones) return;
    const cur = (e.id === "finca" && S.R.finca) ? "" : (tourPoint(e, h, t.z).z || "");
    const col = (D.cats[e.cat] || {}).color || "var(--olive)", off = (k % 4) * 4 * u;
    e.zones.forEach(z => {
      const c = M.mc[norm(z)]; if (!c || z === cur) return;
      const [x0, y0] = P(c[0], c[1]), x = x0 + off, y = y0 - off;
      const mark = e.id === "finca"
        ? `<ellipse cx="${x}" cy="${y}" rx="${5 * u}" ry="${7 * u}" fill="#6B4528" stroke="#fff" stroke-width="${1.4 * u}" transform="rotate(-25 ${x} ${y})"/><path d="M${x - 1.2 * u},${y - 5 * u} q${3 * u},${5 * u} 0 ${10 * u}" stroke="#E7D3B5" stroke-width="${1.2 * u}" fill="none" transform="rotate(-25 ${x} ${y})"/>`
        : `<circle cx="${x}" cy="${y}" r="${6.5 * u}" fill="#fff" stroke="${col}" stroke-width="${2.6 * u}"/><circle cx="${x}" cy="${y}" r="${2.4 * u}" fill="${col}"/>`;
      s += `<g class="zopt" data-t="${esc(e.id)}" data-z="${esc(z)}"><title>${esc(tr(e, "name"))} · ${esc(MUNI_LABEL(z))} — ${esc(tx("z_pick"))}</title><circle cx="${x}" cy="${y}" r="${13 * u}" fill="transparent"/>${mark}</g>`;
    });
  });
  return s;
}
function pickZone(id, z) {
  const t = S.R.tours.find(x => x.id === id), e = byId[id]; if (!t || !e || !e.zones || !e.zones.includes(z)) return;
  t.z = z; if (id === "finca") S.R.finca = "";
  saveR(); renderRoute(); floatRoute(); toast(tx("z_set", tr(e, "name"), MUNI_LABEL(z)));
}
function tourPoint(e, h, z) {
  if (e.id === "finca" && S.R.finca && finById[S.R.finca]) { const f = finById[S.R.finca]; return { lat: f.lat, lon: f.lon, label: f.name + " · " + f.muni }; }
  if (e.athotel && h) return { lat: h.lat, lon: h.lon, label: tx("in_hotel") };
  // Municipio elegido (lista o mapa) o, si no, el más cercano al hotel
  if (e.zones) { const pick = z && e.zones.includes(z) && M.mc[norm(z)] ? z : h ? nearestZone(e, h) : null;
    if (pick) { const c = M.mc[norm(pick)]; return { lat: c[0], lon: c[1], label: tx(e.id === "finca" ? "finca_in" : "op_in", MUNI_LABEL(pick)), z: pick }; } }
  const [la, lo] = llOf(e); return { lat: la, lon: lo, label: e.deptos };
}
const apById = id => D.airports.find(a => a.id === id);
function buildRoute() {
  const R = S.R, h = R.hotel, legs = []; let n = 0;
  if (h && apById(R.arr)) { const a = apById(R.arr), i = legInfo([a.lat, a.lon], [h.lat, h.lon]); legs.push({ type: "t", day: 1, n: ++n, from: [a.lat, a.lon], to: [h.lat, h.lon], title: tx("arr_leg", a.id, h.name), sub: tx("arr_sub"), ...i }); }
  const tours = R.tours.slice().sort((x, y) => x.day - y.day);
  tours.forEach(t => { const e = byId[t.id]; if (!h) { const p0 = tourPoint(e, null, t.z); legs.push({ type: "x", day: t.day, n: ++n, title: tr(e, "name"), sub: e.deptos + " · " + tx("choose_hotel"), nohotel: true, to: [p0.lat, p0.lon] }); return; }
    const tp = tourPoint(e, h, t.z); const pts = [[h.lat, h.lon], ...(e.stops || []).map(s => [s[0], s[1]]), [tp.lat, tp.lon]];
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
  $r("rpax").value = R.pax || ""; $r("rstart").value = R.start ? String(R.start) : "";
  const v = R.pax ? vehFor(R.pax) : null;
  $r("rveh").innerHTML = v ? `${ic("bus")}<span>${tx("veh_sug")}: <b>${esc(vehName(v))}</b> (${v.min}–${v.max} pax) · <a href="#" data-r="seeveh">${tx("see_fleet")}</a></span>` : `${ic("bus")}<span>${tx("veh_need")}</span>`;
  if (v) $r("seeveh").addEventListener("click", ev => { ev.preventDefault(); setTab("trans"); renderTrans(v.id); });
  const ap = `<option value="?">${tx("ap_pick")}</option>` + D.airports.map(a => `<option value="${a.id}">${a.id} · ${esc(a.name)} (${esc(a.city)})</option>`).join("") + `<option value="">${tx("no_tr")}</option>`;
  $r("rarr").innerHTML = ap; $r("rdep").innerHTML = ap; $r("rarr").value = R.arr == null ? "?" : R.arr; $r("rdep").value = R.dep == null ? "?" : R.dep;
  renderHotelBox();
  const list = R.tours.slice().sort((a, b) => a.day - b.day);
  $r("rtours").innerHTML = list.length ? list.map(t => { const e = byId[t.id], v = priceAt(e.id, R.pax); return `<div class="ti"><span class="th">${e.fotos[0] ? `<img src="${ph640(e.fotos[0])}" alt="">` : `<span class="ph sm"></span>`}</span>
    <div class="ti-t"><b>${esc(tr(e, "name"))}</b><br><span class="sub">${esc(tr(e, "dur"))} · <span class="money">${v == null ? (R.pax ? tx("ask_rate") : "—") : cop(v) + " pp"}</span></span></div>
    <div class="ti-a"><select data-day="${e.id}" aria-label="${esc(tx("day", ""))}">${[...Array(12)].map((_, i) => `<option ${i + 1 === t.day ? "selected" : ""} value="${i + 1}">${tx("day", i + 1)}</option>`).join("")}</select>
    <button type="button" class="iconbtn" data-rm="${e.id}" aria-label="${esc(tx("remove"))}: ${esc(tr(e, "name"))}">${ic("x", "sm")}</button></div></div>
    ${!S.wl && (e.zones || (e.id === "finca" && FINCAS.length)) ? whereSel(e, t) : ""}`; }).join("")
    : `<p class="empty">${tx("r_empty")}</p>`;
  $r("radd").innerHTML = `<option value="">${tx("r_choose")}</option>` + Object.keys(D.cats).map(k => `<optgroup label="${esc(catName(k))}">${EXP.filter(e => e.cat === k && !inRoute(e.id)).map(e => `<option value="${e.id}">${esc(tr(e, "name"))}</option>`).join("")}</optgroup>`).join("");
  $r("rtours").querySelectorAll("[data-day]").forEach(s => s.addEventListener("change", () => { S.R.tours.find(t => t.id === s.dataset.day).day = +s.value; saveR(); renderRoute(); floatRoute(); }));
  $r("rtours").querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { toggleTour(b.dataset.rm); floatRoute(); }));
  $r("rtours").querySelectorAll("[data-zsel]").forEach(sel => { sel.value = sel.dataset.cur; sel.addEventListener("change", () => {
    const id = sel.dataset.zsel, t = S.R.tours.find(x => x.id === id), v = sel.value; if (!t) return;
    if (id === "finca") S.R.finca = v.startsWith("f:") ? v.slice(2) : "";
    t.z = v.startsWith("z:") ? v.slice(2) : "";
    saveR(); renderRoute(); floatRoute();
    const g = id === "finca" && finById[S.R.finca]; if (g && g.aviso && !S.wl) toast(g.aviso);
  }); });
  const legs = buildRoute(); let html = "", lastDay = 0;
  legs.forEach(l => { if (l.day !== lastDay) { html += `<div class="daytag">${tx("day", l.day)}</div>`; lastDay = l.day; }
    html += `<div class="leg"><span class="k">${l.n}</span><div><b>${esc(l.title)}</b><br><span class="sub">${esc(l.sub)}</span></div><span class="t">${l.km ? `≈ ${l.km} km<br>${fmtMin(l.min)}${l.type === "x" ? " " + tx("per_leg") : ""}` : ""}</span></div>`; });
  $r("rlegs").innerHTML = html || `<p class="empty">${tx("r_none")}</p>`;
  const T = routeTotals();
  $r("rtot").innerHTML = !R.pax ? (R.tours.length || R.hotel ? `<p class="note">${tx("tot_need")}</p>` : "") : T.rows.length ? T.rows.map(r => `<div><span>${esc(r.t)}${r.c ? ` <span class="code">${esc(r.c)}</span>` : ""}</span><span>${esc(r.v)}</span></div>`).join("") + `<div class="g"><span>${tx("tot")}${T.quote ? tx("tot_q") : ""}</span><span>${cop(T.total)}</span></div><span class="note">${esc(tx("tot_note", R.pax, vehName(vehFor(R.pax)).toLowerCase(), tarLabel()))}</span>` : "";
  drawOverlay();
}
function itineraryText(forRequest) {
  const R = S.R, legs = buildRoute(), h = R.hotel;
  let t = (R.pax ? tx("program", R.pax) : tx("program0")) + "\n" + (h ? `${tx("r3")}: ${h.name} (${MUNI_LABEL(h.muni)})\n` : "") + (R.pax ? `${tx("vehicle")}: ${vehName(vehFor(R.pax))}\n` : ""); let d = 0;
  legs.forEach(l => { if (l.day !== d) { t += `\n${tx("day", l.day)}\n`; d = l.day; } t += `• ${l.title} — ${l.sub}${l.km ? ` (≈ ${l.km} km, ${fmtMin(l.min)})` : ""}\n`; });
  if (!S.wl && !forRequest && R.pax) { const T = routeTotals(); t += `\n${T.rows.map(r => r.t + (r.c ? " " + r.c : "") + ": " + r.v).join("\n")}\n${tx("tot")}: ${cop(T.total)}\nEspontáneos Travel · RNT 91795`; }
  return t.slice(0, forRequest ? 1900 : 20000);
}
function fitRoute(show) {
  const legs = buildRoute(); const pts = []; legs.forEach(l => { if (l.from) pts.push(l.from); if (l.to) pts.push(l.to); (l.pts || []).forEach(p => pts.push(p)); });
  if (S.R.hotel) pts.push([S.R.hotel.lat, S.R.hotel.lon]);
  if (pts.length < 2) return; const la = pts.map(p => p[0]), lo = pts.map(p => p[1]);
  const pad = .05; animateTo(boxToVB(Math.min(...la) - pad, Math.max(...la) + pad * 1.6, Math.min(...lo) - pad, Math.max(...lo) + pad));
  if (show) mapShow(true, true);
}
// Mapa pequeño de la ruta: cada cambio en «Arma tu ruta» se ve a la izquierda del formulario (abajo en el celular),
// sin abrir el mapa grande. Usa el mismo mapa (svg), prestado, y lo devuelve al cerrarse: X, Escape u otra pestaña.
function floatRoute(scroll) {
  if (S.tab !== "ruta") return;
  if (S.mapOpen) {
    const r = $r("mapwrap").getBoundingClientRect();
    if (r.bottom > 140 && r.top < innerHeight - 140) { fitRoute(scroll); return; }   // el mapa grande está a la vista
    // Abierto pero fuera de la vista: se pliega sin mover lo que se está mirando y se usa el pequeño
    const pane = ROOT.querySelector('[data-pane="ruta"]'), t0 = pane.getBoundingClientRect().top;
    mapShow(false); scrollBy(0, pane.getBoundingClientRect().top - t0);
  }
  const fl = $r("rfloat");
  if (fl.hidden) { fl.hidden = false; $r("rlay").classList.add("dock"); $r("rlay").parentElement.classList.add("docked"); $r("flmap").appendChild(svg); svg.setAttribute("aria-hidden", "true"); }
  const n = S.R.tours.length; $r("flsub").textContent = (n === 1 ? tx("fl_n1") : tx("fl_n", n)) + (!S.wl && S.R.tours.some(t => (byId[t.id] || {}).zones) ? " · " + tx("fl_pick") : "");
  VB = fitAspect(VB); commitVB(); fitRoute();
}
function closeFloat() {
  const fl = $r("rfloat"); if (!fl || fl.hidden) return;
  fl.hidden = true; $r("rlay").classList.remove("dock"); $r("rlay").parentElement.classList.remove("docked"); svg.removeAttribute("aria-hidden"); $r("mapwrap").prepend(svg); VB = fitAspect(VB); commitVB();
}

/* ---------- hotel: aliados → usados antes → mapa abierto (OpenStreetMap) → enlace de Google Maps o tocar el mapa ---------- */
function setHotel(h) { S.R.hotel = { id: h.id, name: h.name, muni: h.muni, concept: h.concept || "", zone: h.zone || null, lat: h.lat, lon: h.lon, et: !!h.et }; rememberHotel(h); saveR(); hotelBoxes(); floatRoute(); }
// Dos buscadores con el mismo hotel: «Arma tu ruta» (key "r") y «Cercanas a mi hotel» en Experiencias (key "n")
const hotelBoxes = () => { renderRoute(); renderList(); };
function renderHotelBox(box = $r("rhbox"), key = "r") {
  const h = S.R.hotel, $h = n => box.querySelector(`[data-h="${n}"]`), placing = S.newName && S.newFor === key;
  if (h && !placing) {
    box.innerHTML = `<div class="hsel">${ic("hotel")}<span><b>${esc(h.name)}</b><br><span class="sub">${esc(MUNI_LABEL(h.muni))}${h.concept ? " · " + esc(h.concept) : ""}${h.et ? ` · <span class="ally">${tx("h_ally")}</span>` : ""}</span></span><button type="button" class="btn ghost sm" data-h="change">${tx("h_change")}</button></div>`;
    $h("change").addEventListener("click", () => { S.R.hotel = null; saveR(); hotelBoxes(); setTimeout(() => { const q = $h("q"); if (q) q.focus(); }, 0); });
    return;
  }
  if (placing) {
    box.innerHTML = `<div class="newh"><b>${esc(tx("h_place", S.newName))}</b>
      <label class="field">${tx("h_link")}<div class="inrow"><input data-h="link" placeholder="${esc(tx("h_link_ph"))}" inputmode="url"><button type="button" class="btn" data-h="linkok">${tx("h_locate")}</button></div></label>
      <span class="note">${tx("h_link_note")}</span>
      <div class="btnrow"><button type="button" class="btn ghost" data-h="tap">${ic("pin", "sm")}${tx("h_tap")}</button><button type="button" class="btn ghost" data-h="cancel">${tx("cancel")}</button></div></div>`;
    $h("linkok").addEventListener("click", () => { const c = parseMaps($h("link").value); if (c) finishNewHotel(c[0], c[1]); else toast(tx("h_nolink")); });
    $h("tap").addEventListener("click", startPlacing);
    $h("cancel").addEventListener("click", () => { S.newName = ""; stopPlacing(); renderHotelBox(box, key); });
    return;
  }
  box.innerHTML = `<div class="combo-in"><label class="field">${tx("r3")}<input data-h="q" type="search" autocomplete="off" placeholder="${esc(tx("h_ph"))}" role="combobox" aria-expanded="false" aria-controls="pf-hs-${key}" aria-autocomplete="list"></label><div class="sugg" id="pf-hs-${key}" data-h="s" role="listbox" hidden></div></div>`;
  const q = $h("q"), sg = $h("s");
  let osm = null, osmQ = "";
  const pick = b => {
    if (b.dataset.pick) { const h = HOTELS.find(x => x.id === b.dataset.pick); if (h) setHotel(h); }
    else if (b.dataset.osm != null) { const o = osm[+b.dataset.osm]; setHotel({ id: "osm" + o.id, name: o.name, muni: nearestMuni(o.lat, o.lon), concept: o.type, lat: o.lat, lon: o.lon }); }
    else if (b.dataset.search) searchOsm(q.value.trim());
    else { S.newName = q.value.trim(); S.newFor = key; renderHotelBox(box, key); }
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
function startPlacing() { S.placing = true; svg.classList.add("placing"); mapShow(true, true);
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
  // Fotos del vehículo (data/portafolio.json → vehicles[].fotos): la principal y debajo hasta 3 más; clic = foto grande
  const vph = (v, k, cls) => `<button type="button" class="${cls}" data-vf="${esc(v.id)}" data-k="${k}" aria-label="${esc(tx("photo_of", vf(v, "name"), k + 1, v.fotos.length))}"><img src="${ph640(v.fotos[k])}" alt="" loading="lazy" decoding="async"></button>`;
  const vm = v => (v.fotos || []).length ? `<div class="vph">${vph(v, 0, "vmain")}${v.fotos.length > 1 ? `<div class="vthumbs">${v.fotos.slice(1, 4).map((x, i) => vph(v, i + 1, "vth")).join("")}</div>` : ""}</div>` : `<div class="media"><div class="ph">${ic("bus")}${tx("vid_soon")}</div></div>`;
  const vc = v => `<div class="vcard${v.id === cur ? " on" : ""}${v.vip ? " vip" : ""}">${vm(v)}
    <div class="body"><span class="pax">${v.capacidad_max ? tx("tr_pax", v.min, v.max, v.capacidad_max) : tx("tr_upto", v.max)}</span><h4>${esc(vf(v, "name"))}</h4>${v.equipaje ? `<span class="sub">${esc(vf(v, "equipaje"))}</span>` : ""}<span class="sub">${esc(vf(v, "uso"))}</span>
    ${v.vip ? `<span class="sub"><b>${tx("vip")}</b></span>` : ""}${v.suplemento ? `<span class="sub code money">${esc(v.suplemento)}</span>` : ""}</div></div>`;
  const svcRows = pre => [...PR.svc.keys()].filter(c => c.startsWith(pre)).sort();
  const trs = svcRows("ET-"), sups = svcRows("SU-").filter(c => !GUIDE_RE.test(c)), guides = GUIDES();
  const nm = c => (D.trayectos && D.trayectos[c]) || String((PR.svc.get(c)[0] || {}).nombre || c);
  const cond = (L() === "en" && CTX.empresa && CTX.empresa.en && CTX.empresa.en.fleet_cond) || (CTX.empresa && CTX.empresa.es && CTX.empresa.es.fleet_cond) || [];
  pane.innerHTML = `<h2>${tx("tr_h")}</h2><p class="lead">${tx("tr_l")}</p>
    ${(D.flota || []).length ? `<button type="button" class="fleet" data-fleet="0" aria-label="${esc(tx("tr_h"))}"><img src="${ph640(D.flota[0])}" srcset="${ph640(D.flota[0])} 640w, ${ph1600(D.flota[0])} 1600w" sizes="(max-width: 1180px) 100vw, 1180px" alt="${esc(tx("tr_h"))}" loading="lazy" decoding="async"></button>` : ""}
    <div class="vgrid">${D.vehicles.map(vc).join("")}</div>
    <div class="ccard"><h4>${ic("shield", "sm")}${tx("tr_cond")}</h4><ul>${cond.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>
    <div class="section money"><h3>${tx("tr_tab")}</h3>
      <div class="filters"><label class="field inline">${tx("pax")} <input data-r="tpax" type="number" min="1" max="30" value="${p}" inputmode="numeric"></label></div>
      ${trs.length ? `<div class="tbl-wrap"><table><thead><tr><th>${tx("tr_code")}</th><th>${tx("tr_route")}</th><th class="r">${tx("tr_pp", p)}</th></tr></thead><tbody>${trs.map(c => { const v = svcAt(c, p); return `<tr><td class="code">${esc(c)}</td><td>${esc(nm(c))}</td><td class="r">${v == null ? tx("quote") : cop(v)}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="empty">${tx("none_rates")}</p>`}
      <p class="note">${tx("tr_note")}</p></div>
    ${sups.length ? `<div class="section money"><h3>${tx("sup_tab")}</h3><div class="tbl-wrap"><table><thead><tr><th>${tx("tr_code")}</th><th>${tx("sup_t")}</th><th class="r">${tx("value")}</th></tr></thead><tbody>${sups.map(c => { const v = svcAt(c, p) ?? svcAt(c, 1); return `<tr><td class="code">${esc(c)}</td><td>${esc(nm(c))}</td><td class="r">${v == null ? tx("quote") : cop(v)}</td></tr>`; }).join("")}</tbody></table></div></div>` : ""}
    ${guides.length ? `<div class="section money"><h3>${tx("guide_tab")}</h3><div class="tbl-wrap"><table><thead><tr><th>${tx("tr_code")}</th><th>${tx("sup_t")}</th>${guideCols().map(t => `<th class="r">${esc(guideCol(t))}</th>`).join("")}</tr></thead><tbody>
      ${guides.map(c => { const rows = PR.svc.get(c), cols = guideCols(); return `<tr><td class="code">${esc(c)}</td><td>${esc(guideName(c))}</td>${cols.map(s => { const r = rows.find(x => x.temporada === s); return `<td class="r">${r ? cop(r.tarifa_neta) : "—"}</td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div></div>` : ""}`;
  const tp = pane.querySelector("[data-r=tpax]"); tp.addEventListener("change", () => { S.tpax = Math.min(30, Math.max(1, Math.round(+tp.value) || 1)); renderTrans(); });
  startSlides(pane);
  pane.querySelectorAll("[data-vf]").forEach(b => b.addEventListener("click", () => { const v = D.vehicles.find(x => x.id === b.dataset.vf); if (v) lightbox({ i: v.fotos[+b.dataset.k || 0] }); }));
  const fl = pane.querySelector("[data-fleet]"); if (fl) fl.addEventListener("click", () => lightbox({ i: D.flota[0] }));
}

/* ---------- condiciones: más sobre nosotros, reservas y pagos, menores, sostenibilidad, casos de impacto, equipo ----------
   Quiénes somos / cómo trabajamos / qué hacemos van solo en la presentación institucional (pestaña Mapa). */
function renderCond() {
  const pane = ROOT.querySelector('[data-pane="cond"]');
  const C = (L() === "en" && I18.en && I18.en.condiciones) || D.condiciones, E = (CTX.empresa && (CTX.empresa[L()] || CTX.empresa.es)) || null;
  const ul = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const pagos = (CTX.pagos && CTX.pagos.length ? CTX.pagos : (CTX.priv && CTX.priv.pagos)) || [];
  const secs = [["about", tx("c_about"), "info"], ["book", tx("c_book"), "shield"], ["kids", tx("c_kids"), "child"], ["sost", tx("c_sost"), "leaf"], ["cases", tx("c_cases"), "heart"], ["team", tx("c_team"), "users"], ["read", tx("c_read"), "file"]];
  const pol = (k) => `<div class="pol"><h4>${k === "fit" ? tx("c_fit") : tx("c_grp")}</h4><dl>
      <div><dt>${tx("c_conf")}</dt><dd>${ul(C[k].conf)}</dd></div><div><dt>${tx("c_pay")}</dt><dd>${ul(C[k].pago)}</dd></div>
      <div><dt>${tx("c_mod")}</dt><dd>${ul(C[k].mod)}</dd></div><div><dt>${tx("c_canc")}</dt><dd>${ul(C[k].canc)}</dd></div></dl></div>`;
  pane.innerHTML = `<h2>${tx("c_h")}</h2><p class="lead">${tx("c_l")}</p>
    <nav class="cnav" aria-label="${esc(tx("c_h"))}">${secs.map(([k, l, i]) => `<a href="#pf-c-${k}" data-cj="${k}">${ic(i, "sm")}${esc(l)}</a>`).join("")}</nav>
    <section class="section" id="pf-c-about"><h3>${ic("info")}${tx("c_about")}</h3>
      ${C.about && C.about.length ? `<div class="ccard">${C.about.map(p => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
      <div class="ccard hl"><h4>${ic("heart", "sm")}${tx("c_access")}</h4><p>${esc(C.accesible)}</p></div></section>
    <section class="section" id="pf-c-book"><h3>${ic("shield")}${tx("c_book")}</h3><p class="note">${tx("c_2026")}</p>
      <div class="cgrid two">${pol("fit")}${pol("grp")}</div>
      <div class="ccard"><h4>${tx("c_gen")}</h4>${ul(C.gen)}</div>
      <div class="ccard"><h4>${tx("c_paym")}</h4>${pagos.length && !S.wl ? ul(pagos) : `<p>${tx("c_paym_ask")}</p>`}</div></section>
    <section class="section" id="pf-c-kids"><h3>${ic("child")}${tx("c_kids")}</h3><div class="ccard">${ul(C.menores)}</div></section>
    <section class="section" id="pf-c-sost"><h3>${ic("leaf")}${tx("c_sost")}</h3><div class="ccard"><p>${esc(C.sost)}</p><h4>${tx("c_actions")}</h4>${ul(C.acciones)}</div></section>
    <section class="section" id="pf-c-cases"><h3>${ic("heart")}${tx("c_cases")}</h3>
      ${E ? `<div class="ccard"><p class="note">${esc(E.cases_sub)}</p>${E.cases.map(([t, items], n) => `<details${n ? "" : " open"}><summary>${n + 1}. ${esc(t)}</summary>${ul(items)}</details>`).join("")}</div>` : ""}
      <div class="ccard"><h4>${tx("c_stories")}</h4><div class="cgrid">${(C.comunidad || []).map(c => `<div><h4>${esc(c.t)}</h4><p>${esc(c.p)}</p></div>`).join("")}</div></div></section>
    <section class="section" id="pf-c-team"><h3>${ic("users")}${tx("c_team")}</h3>
      <div class="team">${(C.equipo || []).map(p => `<div class="ccard person">${p.f ? `<img class="av" src="${esc(p.f)}" alt="" width="44" height="44" loading="lazy" decoding="async">` : `<span class="av" aria-hidden="true">${esc(p.n.replace(/^(Dr|Dra)\.\s+/, "").split(" ").map(x => x[0]).join("").slice(0, 2))}</span>`}<div><h4>${esc(p.n)}</h4><p class="sub">${esc(p.r)}</p>${p.q ? `<p class="quote">«${esc(p.q)}»</p>` : ""}${p.m ? `<p><a href="mailto:${esc(p.m)}">${ic("mail", "sm")}${esc(p.m).replace("@", "@<wbr>")}</a></p>` : ""}</div></div>`).join("")}</div>
      ${E ? `<div class="ccard"><h4>${esc(E.drivers_t || tx("c_drivers"))}</h4><div class="team">${E.drivers.map(n => `<div class="person"><span class="av" aria-hidden="true">${esc(n.split(" ").map(x => x[0]).join(""))}</span><div><b>${esc(n)}</b>${E.drivers_note ? `<p class="sub">${esc(E.drivers_note)}</p>` : ""}</div></div>`).join("")}</div>
        <h4>${esc(E.team_t)}</h4><ul>${E.protocols.map(([t, x]) => `<li><b>${esc(t)}:</b> ${esc(x)}</li>`).join("")}</ul></div>` : ""}
      <div class="ccard"><h4>${ic("phone", "sm")}${tx("c_contact")}</h4>${ul(C.contacto)}</div></section>
    <section class="section" id="pf-c-read"><h3>${ic("file")}${tx("c_read")}</h3><div class="ccard">${ul(C.iconos)}</div></section>`;
  pane.querySelectorAll("[data-cj]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); jumpCond(a.dataset.cj); }));
}
function jumpCond(k) { const t = ROOT.querySelector("#pf-c-" + k); if (t) setTimeout(() => t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }), 30); }

/* ---------- pestaña Inicio: bienvenida → presentación institucional → cómo usar → índice → atajos ---------- */
// Debajo del mapa: ir a una zona y capas
function mapFoot() {
  const cnt = {}; EXP.forEach(e => { const d = depOf(e); cnt[d] = (cnt[d] || 0) + 1; });
  return `<div class="mf"><span class="mfl">${tx("go_zone")}</span><div class="zbtns">${Object.keys(ZONEVIEW).map(z => `<button type="button" class="chip" data-zone="${esc(z)}">${ic("pin", "sm")}${esc(z)}${cnt[z] ? ` <span class="sub">${cnt[z]}</span>` : ""}</button>`).join("")}<button type="button" class="chip" data-zone="">${ic("map", "sm")}${tx("all_eje")} <span class="sub">${EXP.length}</span></button></div></div>
    ${FINCAS.length || HOTELS.length ? `<div class="mf"><span class="mfl">${tx("layers")}</span><div class="zbtns">
      ${FINCAS.length ? `<button type="button" class="chip" data-layer="fincas" aria-pressed="true"><svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><ellipse cx="6" cy="7" rx="5" ry="6" fill="var(--bean)"/></svg>${tx("k_fin")}</button>` : ""}
      ${HOTELS.length ? `<button type="button" class="chip" data-layer="hotels" aria-pressed="false"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" rx="3" fill="var(--bean)"/></svg>${tx("k_hot")}</button>` : ""}</div></div>` : ""}`;
}
function depOf(e) { return DEPNAME[M.mdep[nearestMuni(e.lat, e.lon)]] || ""; }
function renderMapPane() {
  const pane = ROOT.querySelector('[data-pane="mapa"]');
  const E = (CTX.empresa && (CTX.empresa[L()] || CTX.empresa.es)) || null;
  const ccount = {}; EXP.forEach(e => { ccount[e.cat] = (ccount[e.cat] || 0) + 1; });
  const sost = E && E.impacts ? `<div class="ccard sostc"><h4>${ic("leaf", "sm")}${esc(tx("inst_sost"))}</h4><ul class="impl">${E.impacts.map(([i, t, x]) => `<li><span class="ii" aria-hidden="true">${i}</span><span><b>${esc(t)}.</b> ${esc(x)}</span></li>`).join("")}</ul></div>` : "";
  pane.innerHTML = `<h2>${tx("welcome")}</h2><p class="lead">${esc(tx("welcome_l", EXP.length))}</p>
    ${E && E.pillars ? `<div class="section"><h3>${ic("info")}${tx("inst_t")}</h3><div class="cgrid inst">${E.pillars.slice(0, 3).map(([t, x]) => `<div class="ccard"><h4>${esc(t)}</h4><p>${esc(x)}</p></div>`).join("")}${sost}</div>
      <div class="ccard icog"><h4>${tx("ico_t")}</h4><p class="note">${tx("ico_l")}</p><ul class="icolist">
        <li>${ICO.acc}<div><p>${esc(tx("ico_acc"))}</p><p class="sub">${esc(tx("ico_acc2"))}</p></div></li>
        <li>${ICO.com}<p>${esc(tx("ico_com"))}</p></li><li>${ICO.cord}<p>${esc(tx("ico_cord"))}</p></li>
        <li><span class="flags">${["ES", "EN", "PT", "FR"].map(flag).join("")}</span><p>${esc(tx("ico_lang"))}</p></li><li>${ICO.shared}<p>${esc(tx("ico_shared"))}</p></li></ul></div>
      <div class="btnrow mt"><button type="button" class="btn ghost sm" data-cond-go="about">${ic("info", "sm")}${tx("see_more")}</button></div></div>` : ""}
    <div class="section"><h3>${ic("route")}${tx("how_t")}</h3><ol class="howto">${[["map", "how1"], ["file", "how2"], ["route", "how3"], ["download", "how4"]].map(([i, k], n) => `<li><span class="hn">${ic(i)}</span><span><b>${tx(k)}</b> ${tx(k + "b")}</span></li>`).join("")}</ol>
      <h4 class="mt">${tx("conv_t")}</h4>
      <ul class="iconguide">
        <li>${ic("clock", "sm")}<span>${esc(tx("ic_dur"))}</span></li><li>${ic("pin", "sm")}<span>${esc(tx("ic_geo"))}</span></li>
        <li><span class="mini com">${tx("b_com")}</span><span>${esc(tx("ic_com"))}</span></li><li><span class="mini cord">${tx("b_cord")}</span><span>${esc(tx("ic_cord"))}</span></li>
        <li><span class="b2b">${tx("only_ag")}</span><span>${esc(tx("ic_b2b"))}</span></li><li>${ic("tag", "sm")}<span>${esc(tx("ic_code"))}</span></li></ul></div>
    <div class="section"><h3>${ic("grid")}${tx("idx_t")}</h3><p class="note">${tx("idx_l")}</p><div class="pidx">${Object.entries(D.cats).filter(([k]) => ccount[k]).map(([k, c]) => `<div class="pidx-g">
      <button type="button" class="pidx-h" data-idx="${k}"><i style="background:${c.color}"></i>${esc(lineName(k))}${lineSeal(k)} <span class="sub">${ccount[k]}</span></button>
      <ul>${EXP.filter(e => e.cat === k).map(e => `<li><button type="button" data-idx-e="${e.id}">${e.code ? `<span class="code">${esc(e.code)}</span><span class="code dash" aria-hidden="true">-</span>` : ""}<span class="nm">${esc(tr(e, "name"))}</span>${icoRow(e, "sm")}${e.nuevo ? `<span class="new">${tx("b_new")}</span>` : ""}</button></li>`).join("")}</ul></div>`).join("")}</div></div>
    <div class="section"><h3>${ic("star")}${tx("shortcuts")}</h3><div class="zbtns"><button type="button" class="btn ghost" data-go-tab="exp">${ic("grid", "sm")}${tx("sc_exp")}</button><button type="button" class="btn ghost" data-go-tab="ruta">${ic("route", "sm")}${tx("sc_ruta")}</button><button type="button" class="btn ghost" data-go-tab="kit">${ic("file", "sm")}${tx("sc_kit")}</button><button type="button" class="btn ghost" data-go-tab="cond">${ic("info", "sm")}${tx("sc_cond")}</button></div></div>`;
  pane.querySelectorAll("[data-go-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.goTab)));
  pane.querySelectorAll("[data-cond-go]").forEach(b => b.addEventListener("click", () => { setTab("cond"); jumpCond(b.dataset.condGo); }));
  pane.querySelectorAll("[data-idx]").forEach(b => b.addEventListener("click", () => { S.cats = new Set([b.dataset.idx]); renderLegend(); S.refilter(); setTab("exp"); }));
  pane.querySelectorAll("[data-idx-e]").forEach(b => b.addEventListener("click", () => openFicha(b.dataset.idxE)));
}

/* ---------- kit de venta (PDF en el navegador con jsPDF, cargado solo al usarlo) ---------- */
const KL = {
  ES: { meet: "Puntos de encuentro", oper: "Operación", supl: "Suplementos", title: "Paisaje Cultural Cafetero · Experiencias 2027", incl: "Incluye", noIncl: "No incluye", reco: "Recomendaciones", dur: "Duración", langs: "Idiomas", price: "Precio por persona", pax: "pax", note: "Valores en pesos colombianos (COP) por persona. Sujetos a disponibilidad.", consult: "Consultar", exp: "Experiencias incluidas", mod: "Modalidad", age: "Edad", prepared: "Preparado por" },
  EN: { meet: "Meeting points", oper: "Operation", supl: "Supplements", title: "Coffee Cultural Landscape · 2027 Experiences", incl: "Includes", noIncl: "Not included", reco: "Recommendations", dur: "Duration", langs: "Languages", price: "Price per person", pax: "pax", note: "Prices in Colombian pesos (COP) per person. Subject to availability.", consult: "On request", exp: "Experiences included", mod: "Format", age: "Age", prepared: "Prepared by" },
  FR: { meet: "Points de rendez-vous", oper: "Fonctionnement", supl: "Suppléments", title: "Paysage culturel du café · Expériences 2027", incl: "Comprend", noIncl: "Ne comprend pas", reco: "Recommandations", dur: "Durée", langs: "Langues", price: "Prix par personne", pax: "pers.", note: "Prix en pesos colombiens (COP) par personne. Sous réserve de disponibilité.", consult: "Sur demande", exp: "Expériences incluses", mod: "Format", age: "Âge", prepared: "Préparé par" },
  IT: { meet: "Punti d'incontro", oper: "Operatività", supl: "Supplementi", title: "Paesaggio Culturale del Caffè · Esperienze 2027", incl: "Include", noIncl: "Non include", reco: "Consigli", dur: "Durata", langs: "Lingue", price: "Prezzo a persona", pax: "pax", note: "Prezzi in pesos colombiani (COP) a persona. Soggetti a disponibilità.", consult: "Su richiesta", exp: "Esperienze incluse", mod: "Modalità", age: "Età", prepared: "A cura di" },
  PT: { meet: "Pontos de encontro", oper: "Operação", supl: "Suplementos", title: "Paisagem Cultural do Café · Experiências 2027", incl: "Inclui", noIncl: "Não inclui", reco: "Recomendações", dur: "Duração", langs: "Idiomas", price: "Preço por pessoa", pax: "pax", note: "Valores em pesos colombianos (COP) por pessoa. Sujeitos a disponibilidade.", consult: "Sob consulta", exp: "Experiências incluídas", mod: "Modalidade", age: "Idade", prepared: "Preparado por" }
};
const LNAME = { ES: "Español", EN: "English", FR: "Français", IT: "Italiano", PT: "Português" };
const K = { sel: null, lang: "ES", brand: "et", own: null, price: "none", markup: 15, agency: "", pax: 0, who: "", loaded: false };
const okLogo = v => typeof v === "string" && v.length <= 400000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);
// Marca efectiva: en «Marca blanca» nunca va el logo de Espontáneos (sí el de la agencia, si lo subió)
const kitBrand = () => (S.wl ? (K.brand === "own" && K.own ? "own" : "none") : K.brand);
function renderKit() {
  if (!K.sel) K.sel = new Set(S.R.tours.map(t => t.id));
  // Logo y nombre guardados en el usuario: se leen una vez por sesión
  if (!K.loaded && CTX.kitLoad) {
    K.loaded = true;
    CTX.kitLoad().then(k => {
      if (!k) return;
      if (okLogo(k.logo)) { K.own = { logo: k.logo, ratio: Math.min(10, Math.max(.05, +k.ratio || .5)) }; if (K.brand === "et") K.brand = "own"; }
      if (!K.agency && typeof k.agencia === "string") K.agency = k.agencia.slice(0, 80);
      if (S.tab === "kit") renderKit();
    }).catch(() => { /* sin datos guardados */ });
  }
  const brandV = kitBrand(), priceV = S.wl ? "none" : K.price;
  const pane = ROOT.querySelector('[data-pane="kit"]');
  pane.innerHTML = `<h2>${tx("k_h")}</h2><p class="lead">${tx("k_l")}</p>
   <div class="steps">
    <div class="step"><h3><span class="k">1</span>${tx("k1")} <span class="sub" data-r="kcount"></span></h3><div class="kchk">${Object.entries(D.cats).map(([k, c]) => { const its = EXP.filter(e => e.cat === k); return its.length ? `<fieldset><legend><label><input type="checkbox" data-kc="${k}"> <i style="background:${c.color}"></i>${esc(catName(k))}</label></legend>${its.map(e => `<label><input type="checkbox" data-k="${e.id}" ${K.sel.has(e.id) ? "checked" : ""}> <span class="code">${e.code}</span> ${esc(tr(e, "name"))}</label>`).join("")}</fieldset>` : ""; }).join("")}</div>
      <div class="btnrow"><button type="button" class="btn ghost sm" data-r="kroute">${ic("route", "sm")}${tx("k_route")}</button><button type="button" class="btn ghost sm" data-r="kall">${tx("k_all")}</button><button type="button" class="btn ghost sm" data-r="knone">${tx("k_none")}</button></div></div>
    <div class="step"><h3><span class="k">2</span>${tx("k2")}</h3><div class="row2">
      <label class="field">${tx("k_lang")}<select data-r="klang">${Object.entries(LNAME).map(([k, v]) => `<option value="${k}" ${k === K.lang ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="field">${tx("k_logo")}<select data-r="klogo" ${S.wl ? "disabled" : ""}><option value="et">${tx("k_with")}</option><option value="own">${tx("k_own")}</option><option value="none">${tx("k_without")}</option></select></label></div>
      <div class="kown" data-r="kown" ${brandV === "own" ? "" : "hidden"}>
        <div class="kprev">${K.own ? `<img src="${K.own.logo}" alt="${esc(tx("k_own_alt"))}">` : `<span class="sub">${tx("k_nologo")}</span>`}</div>
        <div class="btnrow"><button type="button" class="btn ghost sm" data-r="kupb">${ic("upload", "sm")}${tx(K.own ? "k_up2" : "k_up")}</button>${K.own ? `<button type="button" class="btn ghost sm" data-r="krm">${ic("x", "sm")}${tx("k_rm")}</button>` : ""}
          <input type="file" data-r="kfile" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden></div>
        <span class="note">${tx("k_up_l")}</span></div>
      <label class="field" data-r="kagw">${tx("k_agency")}<input data-r="kag" maxlength="80" value="${esc(K.agency)}"></label>
      <p class="note" data-r="ksv" aria-live="polite"></p>
      <p class="note" data-r="ktr" ${K.lang === "ES" ? "hidden" : ""}>${ic("info", "sm")}${tx("k_trnote")}</p></div>
    <div class="step${S.wl ? " is-off" : ""}"><h3><span class="k">3</span>${tx("k3")}</h3>
      <label class="field">${tx("k_price")}<select data-r="kprice" ${S.wl ? "disabled" : ""}><option value="none">${tx("k_pn")}</option><option value="net">${tx("k_pnet")}</option><option value="sell">${tx("k_psell")}</option></select></label>
      <label class="field" data-r="kpaxw">${tx("k_pax")}<input data-r="kpax" type="number" min="1" max="30" step="1" value="${K.pax || S.R.pax || 2}" inputmode="numeric"></label>
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
  const pr = $r("kprice"); pr.value = priceV; $r("kmkw").hidden = priceV !== "sell"; $r("kpaxw").hidden = priceV === "none";
  pr.addEventListener("change", () => { K.price = pr.value; $r("kmkw").hidden = pr.value !== "sell"; $r("kpaxw").hidden = pr.value === "none"; });
  $r("kpax").addEventListener("input", e => { K.pax = Math.min(30, Math.max(1, Math.round(+e.target.value) || 1)); });
  $r("kmk").addEventListener("input", e => { K.markup = Math.max(0, Math.min(100, +e.target.value || 0)); });
  $r("klang").addEventListener("change", e => { K.lang = e.target.value; $r("ktr").hidden = K.lang === "ES"; });
  const kl = $r("klogo"); kl.value = brandV;
  kl.addEventListener("change", e => { K.brand = e.target.value; $r("kown").hidden = K.brand !== "own"; });
  $r("kupb").addEventListener("click", () => $r("kfile").click());
  $r("kfile").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    if (f.size > 5e6) { kitMsg(tx("k_big")); return; }
    try { K.own = await logoFromFile(f); } catch (err) { kitMsg(tx("k_badimg")); return; }
    K.brand = "own"; renderKit(); saveKit();
  });
  if ($r("krm")) $r("krm").addEventListener("click", () => { K.own = null; renderKit(); saveKit(); });
  $r("kag").addEventListener("input", e => { K.agency = e.target.value; clearTimeout(K.t); K.t = setTimeout(saveKit, 900); });
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
// Sello del tour compartido para el PDF (PNG sin fondo, con el mismo halo suave de la web para leerse sobre la foto; se pide una sola vez)
let sealPng = null;
async function sealData() {
  if (sealPng !== null) return sealPng;
  try {
    const bm = await createImageBitmap(await (await fetch(SEAL)).blob()); const c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height;
    const g = c.getContext("2d"); g.shadowColor = "rgba(255,255,255,.95)"; g.shadowBlur = 6; g.drawImage(bm, 0, 0); g.drawImage(bm, 0, 0);
    g.shadowColor = "transparent"; g.drawImage(bm, 0, 0); sealPng = c.toDataURL("image/png");
  }
  catch (e) { sealPng = ""; }
  return sealPng;
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
const kitMsg = m => { const el = $r("ksv"); if (el) el.textContent = m; };
function saveKit() {
  if (!CTX.kitSave) return;
  const d = { agencia: String(K.agency || "").trim().slice(0, 80) }; if (K.own) { d.logo = K.own.logo; d.ratio = K.own.ratio; }
  kitMsg(tx("k_saving"));
  CTX.kitSave(d).then(() => kitMsg(tx("k_saved")), () => kitMsg(tx("k_nosave")));
}
// Logo de la agencia: cualquier imagen se reduce en el navegador a PNG de hasta 600 × 300 px (JPEG con fondo blanco si pesa mucho)
function logoFromFile(f) {
  return new Promise((ok, bad) => {
    const u = URL.createObjectURL(f), im = new Image();
    const fail = e => { URL.revokeObjectURL(u); bad(e); };
    im.onload = () => {
      try {
        let w = im.naturalWidth || 600, h = im.naturalHeight || 300;
        const k = Math.min(/svg/.test(f.type) ? Infinity : 1, 600 / w, 300 / h); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
        const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h);
        let d = c.toDataURL("image/png");
        if (d.length > 380000) { const c2 = document.createElement("canvas"); c2.width = w; c2.height = h; const g = c2.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(c, 0, 0); d = c2.toDataURL("image/jpeg", .85); }
        URL.revokeObjectURL(u);
        if (!okLogo(d)) throw new Error("logo");
        ok({ logo: d, ratio: Math.min(10, Math.max(.05, h / w)) });
      } catch (e) { fail(e); }
    };
    im.onerror = () => fail(new Error("img"));
    im.src = u;
  });
}
function makePDF() {
  const wl = !!(S && S.wl), b = kitBrand();
  return pdfRun([...K.sel], { lang: K.lang, logo: b === "et", own: b === "own" ? K.own : null, price: wl ? "none" : K.price, markup: K.markup, agency: K.agency, pax: K.pax || S.R.pax }, $r("kst"), $r("kgo"));
}
// o = { lang: ES|EN|FR|IT|PT, logo (Espontáneos), own ({ logo, ratio } de la agencia), price: none|net|sell, markup, agency, pax }. Una sola ficha: sin portada.
// Con precio, cada ficha muestra solo la tarifa por persona de los pasajeros cotizados (o.pax).
async function buildPdf(ids, o) {
  const lang = o.lang || "ES", LB = KL[lang] || KL.ES, lg = lang.toLowerCase(), logo = !!o.logo, price = o.price || "none", mk = price === "sell" ? (+o.markup || 0) : 0;
  const qp = Math.min(30, Math.max(1, Math.round(+o.pax) || 2));
  if (lang !== "ES") await loadLang(lang);
  const { jsPDF } = await loadJsPDF().catch(() => { throw Object.assign(new Error("lib"), { code: "lib" }); });
  const doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210, Mg = 16, CW = W - 2 * Mg; const OL = [74, 92, 58];
  const agency = pdfTxt(String(o.agency || "").trim());
  const own = !logo && o.own && okLogo(o.own.logo) ? o.own : null, ofmt = own && /^data:image\/jpeg/.test(own.logo) ? "JPEG" : "PNG";
  // Encabezado: verde solo con la marca Espontáneos Travel; con el logo de la agencia o sin logo, fondo blanco y línea fina
  const head = h => {
    if (logo) { doc.setFillColor(...OL); doc.rect(0, 0, W, h, "F"); doc.setTextColor(255); return; }
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, h, "F"); doc.setDrawColor(215, 220, 208); doc.setLineWidth(.4); doc.line(0, h, W, h); doc.setTextColor(35);
  };
  const ownLogo = (x, y, maxW, maxH) => { const w = Math.min(maxW, maxH / own.ratio), h = w * own.ratio;
    try { doc.addImage(own.logo, ofmt, x, y + (maxH - h) / 2, w, h); } catch (e) { /* sin logo */ } return w; };
  const foot = () => { doc.setFontSize(8); doc.setTextColor(120); doc.setFont("helvetica", "normal"); doc.text(pdfTxt(logo ? "Espontáneos Travel SAS · RNT 91795 · info@espontaneostravel.com · WhatsApp +57 318 720 0023" : (agency || "Paisaje Cultural Cafetero") + " · 2027"), Mg, 289); doc.text(String(doc.getNumberOfPages()), W - Mg, 289, { align: "right" }); };
  const lgo = logo ? await logoData() : null;
  let y = Mg, first = true;
  if (ids.length > 1) {
    // portada
    head(72);
    if (logo) { if (lgo) { try { doc.addImage(lgo.d, "PNG", Mg, 12, 22, 22 * lgo.r); } catch (e) { /* sin logo */ } }
      doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text(pdfTxt("Espontáneos Travel"), Mg + 27, 24); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text(pdfTxt("Armenia, Quindío · Colombia · RNT 91795"), Mg + 27, 31); }
    else if (own || agency) { const x = own ? Mg + ownLogo(Mg, 10, 64, 26) + 8 : Mg;
      if (agency) { doc.setFont("helvetica", "bold"); doc.setFontSize(own ? 18 : 22); doc.text(doc.splitTextToSize(agency, W - x - Mg).slice(0, 2), x, own ? 22 : 28); } }
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
      head(16); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      if (logo && lgo) { try { doc.addImage(lgo.d, "PNG", Mg, 2.5, 11, 11 * lgo.r); } catch (err) { /* sin logo */ } }
      const hx = logo ? Mg + 14 : own ? Mg + ownLogo(Mg, 2.5, 40, 11) + 4 : Mg;
      doc.text(pdfTxt(logo ? "Espontáneos Travel · " + LB.title : (agency ? agency + " · " : "") + LB.title), hx, 10);
      y = 22; first = false;
    }
    const fh = ids.length === 1 ? 560 : 680;     // ficha individual: foto un poco más baja para que todo quepa en una página
    const ph = e.fotos[0]; if (ph) { try { doc.addImage(await imgData(ph1600(ph), 1400, fh), "JPEG", Mg, y, CW, CW * fh / 1400);
      if (e.shared) { const sd = await sealData(); if (sd) { try { doc.addImage(sd, "PNG", Mg + CW - 28, y + 4, 24, 24); } catch (err) { /* sin sello */ } } }   // sello en la esquina de la foto
      y += CW * fh / 1400 + 7; } catch (err) { /* sin foto */ } }
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
    if ((tr(e, "meet", lg) || []).length) { if (y > 250) { foot(); doc.addPage(); y = Mg; } y = list(LB.meet, tr(e, "meet", lg).map(m => `${m.h} · ${m.l}`), Mg, CW) + 3; }
    const reco = [...(tr(e, "reco", lg) || []), ...(tr(e, "noApto", lg) || [])];
    if (reco.length) { if (y > 250) { foot(); doc.addPage(); y = Mg; } y = list(LB.reco, reco, Mg, CW) + 3; }
    // Suplementos (dato de tarifa): solo con precios y en español (son notas del tarifario)
    if (price !== "none" && lang === "ES" && e.p.supl.length) { if (y > 250) { foot(); doc.addPage(); y = Mg; } y = list(LB.supl, e.p.supl.map(x => markupMoney(x, mk)), Mg, CW) + 3; }
    if (price !== "none") {
      if (y > 262) { foot(); doc.addPage(); y = Mg; }       // el cuadro de precio (≈ 22 mm) cabe hasta antes del pie
      const v = priceAt(e.id, qp), cell = v != null ? "$ " + (mk ? Math.round(v * (1 + mk / 100) / 1000) * 1000 : v).toLocaleString("es-CO") : LB.consult;
      doc.setFillColor(238, 242, 236); doc.rect(Mg, y, CW, 15, "F"); doc.setFont("helvetica", "bold"); doc.setTextColor(...OL); doc.setFontSize(10.5); doc.text(pdfTxt(`${LB.price} · ${qp} ${LB.pax}`), Mg + 4, y + 9.5);
      doc.setFontSize(14); doc.setTextColor(30); doc.text(pdfTxt(cell), W - Mg - 4, y + 10, { align: "right" });
      y += 19; doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110); doc.text(pdfTxt(LB.note), Mg, y); doc.setFontSize(10);
    }
    foot();
  }
  const base = ids.length === 1 ? `Ficha_${price === "none" ? ids[0] : (byId[ids[0]].code || ids[0])}_2027` : "Portafolio_PCCC_2027";
  const fname = `${base}_${lang}${logo ? "" : own ? "_agencia" : "_marca-blanca"}${price === "none" ? "" : price === "net" ? "_neto" : "_venta"}.pdf`;
  return { blob: doc.output("blob"), fname };
}
// Para la pestaña Tarifas del portal: descarga la ficha (con tarifa neta) aunque el portafolio no esté abierto
export async function downloadFichaPdf(id, ctx, o, st) {
  if (!(ROOT && ROOT.isConnected)) { CTX = ctx; await preload(ctx.lang); buildModel(); }
  if (!byId[id]) return false;
  const rp = (S && S.R && S.R.pax) || (ss.get("pf27-ruta", null) || {}).pax || 2;
  return pdfRun([id], Object.assign({ lang: (ctx.lang === "en" ? "EN" : "ES"), logo: true, price: "net", markup: 0, agency: "", pax: rp }, o || {}), st, null);
}

/* ---------- copiar y avisos ---------- */
function copy(t, msg) {
  const fallback = () => { const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast(msg); } catch (e) { toast(t.slice(0, 80)); } ta.remove(); };
  try { navigator.clipboard.writeText(t).then(() => toast(msg), fallback); } catch (e) { fallback(); }
}
function toast(m) { const host = $r("toast"); if (!host) return; host.innerHTML = `<div class="toast" role="status">${esc(m)}</div>`; clearTimeout(toastT); toastT = setTimeout(() => { if (host.isConnected) host.innerHTML = ""; }, 2600); }

// Para pruebas y para que portal.js sepa si el portafolio sigue montado
export function portafolioMounted() { return !!(ROOT && ROOT.isConnected); }
