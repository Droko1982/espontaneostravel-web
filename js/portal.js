/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Portal B2B (agencias / DMC, asesores y administración)
   Firebase Auth + Cloud Firestore (plan gratuito Spark). Sin build: ES module.

   - Seguridad: TODO dato de usuario se pinta con textContent (helper h()).
     Nunca se usa innerHTML con datos. Los enlaces pasan por safeUrl().
   - Los permisos reales los imponen firestore.rules; aquí solo está la interfaz.
     Las consultas están escritas para cumplir esas reglas (p. ej. una agencia
     consulta tarifas con dmcId == null y con dmcId == suAgencia).
   - Guía de instalación y operación: docs/BACKEND.md
   ========================================================================== */
import { firebaseConfig, enabled, appCheckSiteKey } from "./firebase-config.js";

/* ---------- Ajustes (EDITAR AQUÍ si hace falta) ---------- */
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
// Enlace a la Política de Tratamiento de Datos Personales (Ley 1581 de 2012). Vacío = no se muestra enlace.
const PRIVACY_URL = "privacidad.html";
// Versión del texto de autorización de datos. Cámbiala cuando cambies la política (se guarda con cada cliente).
const CONSENT_VERSION = "2026-10";
// Escrituras por lote al importar (Firestore permite máx. 500). Si un lote es rechazado, se reintenta en lotes más pequeños.
const BATCH_SIZE = 400;
const DOCS_URL = "https://github.com/Droko1982/espontaneos-travel/blob/main/docs/BACKEND.md";
// Aviso por correo de cada solicitud de acceso, con enlaces para aprobarla (FormSubmit, el mismo servicio del
// formulario de contacto del sitio). "" = desactivado. Los enlaces no cambian nada sin sesión de administrador.
const REQUESTS_EMAIL = "https://formsubmit.co/ajax/info@espontaneostravel.com";
const PORTAL_URL = "https://www.espontaneostravel.com/portal.html";
// Dominios propios: el enlace de un lead solo se abre si es viaje.html en uno de estos sitios.
const OWN_HOSTS = ["droko1982.github.io", "www.espontaneostravel.com", "espontaneostravel.com"];
const MAX_ITIN = 25;  // actividades por reserva (igual que firestore.rules)
const MAX_TOURS = 10; // tours por solicitud (igual que firestore.rules)
const TRAVEL_LANGS = [["es", "Español"], ["en", "English"], ["fr", "Français"], ["de", "Deutsch"], ["pt", "Português"], ["it", "Italiano"]];
const ORIGENES = [["web", "Sitio web"], ["qr", "QR"], ["dmc", "DMC"], ["referido", "Referido"], ["whatsapp", "WhatsApp"]];
const MEDIOS = [["whatsapp", "WhatsApp"], ["web", "Formulario web"], ["correo", "Correo electrónico"], ["telefono", "Llamada"], ["presencial", "Presencial"], ["agencia", "DMC"]];
const ESTADOS_RESERVA = ["borrador", "pendiente", "confirmada", "en_curso", "finalizada", "cancelada"];
const ESTADOS_SOLICITUD = ["nueva", "en_proceso", "confirmada", "rechazada", "cancelada"];
const STAGES = [["qr_visita", "Visita por QR"], ["resumen", "Dejó sus datos"], ["whatsapp", "Pasó a WhatsApp"]];
// CRM: etapas del cliente, medios de contacto y tope del registro de contactos (igual que firestore.rules)
const ETAPAS = [["nuevo", "Nuevo"], ["contactado", "Contactado"], ["cotizado", "Cotizado"], ["reservado", "Reservado"], ["viajo", "Ya viajó"], ["perdido", "No siguió"]];
const ETAPA_KIND = { nuevo: "warn", contactado: "", cotizado: "warn", reservado: "ok", viajo: "ok", perdido: "bad" };
const MEDIOS_CONTACTO = [["whatsapp", "WhatsApp"], ["llamada", "Llamada"], ["correo", "Correo"], ["presencial", "En persona"], ["otro", "Otro"]];
const MAX_BITACORA = 60;
const MONEDAS = [["COP", "COP — peso colombiano"], ["USD", "USD — dólar"], ["EUR", "EUR — euro"]];
const COLECCIONES = ["users", "dmcs", "dmcs_privado", "tarifas", "condiciones", "clientes", "clientes_privado", "reservas", "reservas_publicas", "solicitudes", "leads", "config"];
const TARIFA_COLS = ["vigencia", "codigo", "tour_id", "nombre", "temporada", "pax_desde", "pax_hasta", "moneda", "tarifa_neta", "dmc_id", "notas"];

/* ---------- Textos (ES/EN) para pantallas de acceso y de agencias ---------- */
const I18N = {
  es: {
    skip: "Saltar al contenido", lang_label: "Idioma", logout: "Cerrar sesión", loading: "Cargando…", retry: "Reintentar",
    close: "Cerrar", save: "Guardar", cancel: "Cancelar", edit: "Editar", remove: "Quitar", saved: "Cambios guardados.",
    none: "— Ninguno —", required_note: "Los campos con * son obligatorios.", err_generic: "Algo salió mal. Inténtalo de nuevo.",
    portal_tag: "Portal de agencias", role_admin: "Administración", role_asesor: "Asesor", role_dmc: "DMC",
    login_title: "Ingresa al portal", login_sub: "Para agencias y DMC aliadas y el equipo de Espontáneos Travel.",
    email: "Correo electrónico", password: "Contraseña", login_btn: "Ingresar", forgot: "¿Olvidaste tu contraseña?",
    no_account: "¿Tu agencia aún no tiene acceso?", request_access: "Solicitar acceso", back_login: "Volver a ingresar",
    staff_note: "¿Eres del equipo de Espontáneos? El administrador crea tu cuenta.",
    back_site: "Volver a la web", traveler_title: "¿Eres viajero?", traveler_body: "Este portal es solo para agencias. Mira nuestras experiencias y reserva por WhatsApp.", traveler_btn: "Ver experiencias →",
    reset_title: "Recupera tu contraseña", reset_sub: "Escribe tu correo y te enviamos un enlace para crear una nueva.",
    reset_btn: "Enviar enlace", reset_done: "Si el correo está registrado, te llegará un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.",
    signup_title: "Solicita acceso para tu agencia", signup_sub: "Revisamos cada solicitud y activamos las cuentas manualmente. Al aprobarla podrás ver tarifas netas y solicitar reservas.",
    sec_you: "Tus datos", sec_agency: "Tu agencia", name: "Nombre completo", whatsapp: "WhatsApp (con indicativo)",
    password_new: "Crea una contraseña", password_hint: "Mínimo 8 caracteres.", password_confirm: "Repite la contraseña",
    pw_mismatch: "Las contraseñas no coinciden.", pw_short: "La contraseña debe tener al menos 8 caracteres.",
    agency_name: "Nombre de la agencia", nit: "NIT o identificación tributaria", nit_hint: "Agencias del exterior: Tax ID, VAT, EIN…",
    country: "País", city: "Ciudad", contact: "Persona de contacto", phone: "Teléfono", website: "Sitio web",
    message: "Cuéntanos de tu agencia (opcional)",
    consent_signup: "Autorizo a Espontáneos Travel SAS a tratar mis datos personales para gestionar esta solicitud y la relación comercial, según la Ley 1581 de 2012.",
    privacy_link: "Leer la Política de Tratamiento de Datos", consent_required: "Debes aceptar la autorización de tratamiento de datos.",
    signup_btn: "Enviar solicitud", complete_title: "Completa tu solicitud", complete_sub: "Tu cuenta ya existe, pero faltan los datos de tu agencia.",
    pending_title: "Tu solicitud está en revisión", pending_body: "Gracias por escribirnos. Un administrador revisará los datos de tu agencia y activará tu acceso. Si tienes prisa, escríbenos por WhatsApp.",
    verify_note: "Confirma tu correo con el enlace que te enviamos a:", verify_title: "Confirma tu correo para entrar", verify_body: "Por seguridad, el portal solo abre con el correo verificado. Abre el enlace que te enviamos (revisa spam) y luego pulsa «Ya lo confirmé».", verify_done: "Ya lo confirmé", download_qr: "Descargar QR", notes_agency: "Notas (las ve tu agencia y el equipo de Espontáneos)", verify_resend: "Reenviar correo de confirmación", verify_sent: "Te enviamos de nuevo el correo de confirmación.",
    check_again: "Revisar de nuevo", wa_us: "Escríbenos por WhatsApp", wa_pending_msg: "Hola Espontáneos Travel, solicité acceso al portal de agencias para: ",
    blocked_title: "Tu acceso está bloqueado", blocked_body: "Si crees que es un error, escríbenos y lo revisamos.",
    noagency_title: "Tu cuenta aún no tiene una agencia activa", noagency_body: "Tu usuario está aprobado, pero no está vinculado a una agencia activa. Escríbenos para revisarlo.",
    hello: "Hola, {0}", agency: "Agencia",
    tab_rates: "Tarifas", tab_request: "Reservar", tab_mine: "Mis reservas", tab_clients: "Clientes", tab_account: "Cuenta",
    tab_company: "Nosotros", tab_portfolio: "Portafolio", ficha_t: "Ficha técnica", pdf_btn: "Descargar ficha (PDF)", cat_label: "Categoría", all_cats: "Todas", pending_badge: "Tarifa en preparación",
    print_title: "Ficha técnica para agencias", imp_label: "Impacto", excludes: "No incluye", operation: "Operación",
    p_param: "Parámetro operativo", p_b2b: "Detalle técnico B2B", p_b2c: "Especificación comercial (B2C)",
    geo_ph: "Hotel o dirección del pasajero (ej.: Mocawa Resort, La Tebaida)", geo_btn: "Calcular distancias", geo_sort: "Ordenar por cercanía",
    geo_none: "No encontré ese lugar. Prueba con el nombre del hotel y el municipio.", geo_from: "≈ {0} km en línea recta desde {1}", geo_zone: "zona sugerida: {0}",
    geo_note: "Distancias aproximadas con OpenStreetMap. Operaciones confirma la finca o el punto final según el hotel.", geo_t: "Geolocalización desde el hotel del pasajero",
    year: "Vigencia", season: "Temporada", all_seasons: "Todas", search: "Buscar tour o código", export_csv: "Exportar CSV",
    sep: "Formato del CSV", sep_comma: "Coma (,)", sep_semicolon: "Punto y coma (;) — Excel en español",
    rates_count: "{0} tarifas en {1} tours", no_rates: "Aún no hay tarifas cargadas para {0}. Escríbenos y te cotizamos.",
    carry: "Tarifas {0}: aplican hasta el 31 de marzo de {1}", pending_t: "Nuevas {0}: tarifa en preparación ({1})",
    pending_note: "Estas experiencias son nuevas en el portafolio {0}. Su tarifa neta se publica aquí muy pronto; mientras tanto, solicítala y te cotizamos.",
    no_match: "Ningún resultado con esos filtros.", duration: "Duración", hours: "{0} h", schedule: "Horario",
    sched_fixed: "Recogida en el hotel: {0}", sched_window: "Inicio a elección entre {0} y {1}", sched_from: "Desde las {0}", sched_tbc: "Por confirmar",
    includes: "Incluye", conditions: "Condiciones para agencias", th_season: "Temporada", th_pax: "Pasajeros", th_rate: "Tarifa neta",
    th_type: "Tipo", th_notes: "Notas", type_general: "General", type_special: "Especial para tu agencia", pax_range: "{0}–{1} pax", pax_one: "{0} pax",
    rates_note: "Tarifas netas confidenciales: no las compartas con viajeros. Si tienes una tarifa especial, verás solo esa en lugar de la general.",
    tr_note: "Descripciones de tours: traducción automática pendiente de revisión. Las condiciones para agencias están en español.",
    request_this: "Solicitar este tour", trip_details: "Datos del viaje",
    req_title: "Solicitar una reserva", req_sub: "Envíanos los datos y un asesor te confirma disponibilidad y tarifa final.",
    traveller: "Nombre del viajero o grupo", client_opt: "Cliente guardado (opcional)", tours: "Tours", add_tour: "Añadir tour",
    choose_tour: "Elige un tour", tour_ph: "Escribe el nombre, el código o la línea del tour…", no_tours_yet: "Aún no has añadido tours.", start_date: "Fecha de inicio", end_date: "Fecha de fin (opcional)",
    pax: "Número de pasajeros", hotel: "Hotel o alojamiento", guide_lang: "Idioma del guía",
    needs: "Necesidades especiales (accesibilidad, alimentación…)", notes: "Notas", send_request: "Enviar solicitud",
    needs_hint: "Solo lo necesario para operar el tour; sin diagnósticos ni datos médicos (los detalles se coordinan por WhatsApp).",
    req_sent: "Solicitud enviada. Te responderemos pronto.", need_tour: "Añade al menos un tour.", end_before: "La fecha de fin no puede ser anterior a la de inicio.",
    pax_invalid: "Indica el número de pasajeros (1 a 500).", max_tours: "Máximo 10 tours por solicitud.",
    my_requests: "Mis solicitudes", my_bookings: "Reservas", no_requests: "Aún no has enviado solicitudes.", no_bookings: "Aún no tienes reservas.",
    created: "Creada", status: "Estado", answer: "Respuesta de Espontáneos", cancel_req: "Cancelar solicitud", confirm_cancel: "¿Cancelar esta solicitud?",
    canceled_ok: "Solicitud cancelada.", dates: "Fechas", passengers: "Pasajeros",
    st_nueva: "Nueva", st_en_proceso: "En proceso", st_confirmada: "Confirmada", st_rechazada: "No disponible", st_cancelada: "Cancelada",
    st_borrador: "Borrador", st_pendiente: "Pendiente", st_en_curso: "En curso", st_finalizada: "Finalizada",
    show_qr: "Ver enlace y QR", hide_qr: "Ocultar enlace y QR", copy_link: "Copiar enlace", copied: "Enlace copiado.", code: "Código",
    qr_alt: "Código QR para abrir el itinerario {0}", send_wa: "Enviar por WhatsApp",
    wa_trip_msg: "¡Hola! Este es tu itinerario con Espontáneos Travel: ",
    new_client: "Nuevo cliente", edit_client: "Editar cliente", client_name: "Nombre completo del viajero", phone_wa: "Teléfono / WhatsApp",
    language: "Idioma", search_clients: "Buscar cliente", no_clients: "Aún no tienes clientes guardados.",
    consent_client: "Confirmo que el viajero autorizó a Espontáneos Travel SAS el tratamiento de sus datos personales para gestionar su viaje (Ley 1581 de 2012).",
    consent_on: "Autorización de datos registrada el {0} (versión {1}).", client_saved: "Cliente guardado.",
    delete_note: "Para eliminar los datos de un cliente (derecho de supresión), escríbenos y lo hacemos.",
    account_title: "Mi cuenta", languages: "Idiomas que hablas (separados por coma)", change_pw: "Cambiar contraseña",
    pw_email_sent: "Te enviamos un correo para cambiar tu contraseña.", role: "Rol"
  },
  en: {
    skip: "Skip to content", lang_label: "Language", logout: "Sign out", loading: "Loading…", retry: "Try again",
    close: "Close", save: "Save", cancel: "Cancel", edit: "Edit", remove: "Remove", saved: "Changes saved.",
    none: "— None —", required_note: "Fields marked * are required.", err_generic: "Something went wrong. Please try again.",
    portal_tag: "Agency portal", role_admin: "Admin", role_asesor: "Advisor", role_dmc: "DMC",
    login_title: "Sign in to the portal", login_sub: "For partner agencies / DMCs and the Espontáneos Travel team.",
    email: "Email", password: "Password", login_btn: "Sign in", forgot: "Forgot your password?",
    no_account: "Your agency doesn't have access yet?", request_access: "Request access", back_login: "Back to sign in",
    staff_note: "Espontáneos team member? Your account is created by the administrator.",
    back_site: "Back to website", traveler_title: "Travelling with us?", traveler_body: "This portal is for agencies only. Browse our experiences and book on WhatsApp.", traveler_btn: "See experiences →",
    reset_title: "Reset your password", reset_sub: "Enter your email and we'll send you a link to create a new one.",
    reset_btn: "Send link", reset_done: "If the email is registered, you'll receive a link to create a new password. Please check your spam folder too.",
    signup_title: "Request access for your agency", signup_sub: "We review every request and activate accounts manually. Once approved you'll see net rates and can request bookings.",
    sec_you: "About you", sec_agency: "Your agency", name: "Full name", whatsapp: "WhatsApp (with country code)",
    password_new: "Create a password", password_hint: "At least 8 characters.", password_confirm: "Repeat the password",
    pw_mismatch: "Passwords do not match.", pw_short: "The password must be at least 8 characters long.",
    agency_name: "Agency name", nit: "Tax ID (NIT, VAT, EIN…)", nit_hint: "Your company's tax identification number.",
    country: "Country", city: "City", contact: "Contact person", phone: "Phone", website: "Website",
    message: "Tell us about your agency (optional)",
    consent_signup: "I authorize Espontáneos Travel SAS to process my personal data to manage this request and our business relationship, under Colombian Law 1581 of 2012.",
    privacy_link: "Read the Data Processing Policy", consent_required: "You must accept the data processing authorization.",
    signup_btn: "Send request", complete_title: "Complete your request", complete_sub: "Your account exists, but your agency details are missing.",
    pending_title: "Your request is under review", pending_body: "Thank you for reaching out. An administrator will review your agency details and activate your access. If it's urgent, message us on WhatsApp.",
    verify_note: "Please confirm your email with the link we sent to:", verify_title: "Confirm your email to continue", verify_body: "For security, the portal only opens with a verified email. Open the link we sent you (check spam) and then press “I have confirmed it”.", verify_done: "I have confirmed it", download_qr: "Download QR", notes_agency: "Notes (visible to your agency and the Espontáneos team)", verify_resend: "Resend confirmation email", verify_sent: "We sent the confirmation email again.",
    check_again: "Check again", wa_us: "Message us on WhatsApp", wa_pending_msg: "Hello Espontáneos Travel, I requested access to the agency portal for: ",
    blocked_title: "Your access is blocked", blocked_body: "If you think this is a mistake, message us and we'll look into it.",
    noagency_title: "Your account has no active agency yet", noagency_body: "Your user is approved but not linked to an active agency. Please contact us.",
    hello: "Hi, {0}", agency: "Agency",
    tab_rates: "Rates", tab_request: "Book", tab_mine: "My bookings", tab_clients: "Clients", tab_account: "Account",
    tab_company: "About us", tab_portfolio: "Portfolio", ficha_t: "Technical sheet", pdf_btn: "Download sheet (PDF)", cat_label: "Category", all_cats: "All", pending_badge: "Rate coming soon",
    print_title: "Technical sheet for agencies", imp_label: "Impact", excludes: "Not included", operation: "Operations",
    p_param: "Operational parameter", p_b2b: "B2B technical detail", p_b2c: "B2C commercial specification",
    geo_ph: "Traveller's hotel or address (e.g. Mocawa Resort, La Tebaida)", geo_btn: "Calculate distances", geo_sort: "Sort by distance",
    geo_none: "I couldn't find that place. Try the hotel name and the town.", geo_from: "≈ {0} km as the crow flies from {1}", geo_zone: "suggested area: {0}",
    geo_note: "Approximate distances with OpenStreetMap. Operations confirms the final farm or meeting point according to the hotel.", geo_t: "Geolocation from the traveller's hotel",
    year: "Validity year", season: "Season", all_seasons: "All", search: "Search tour or code", export_csv: "Export CSV",
    sep: "CSV format", sep_comma: "Comma (,)", sep_semicolon: "Semicolon (;) — Excel in Spanish",
    rates_count: "{0} rates across {1} tours", no_rates: "No rates loaded for {0} yet. Message us for a quote.",
    carry: "{0} rates: valid until March 31, {1}", pending_t: "New in {0}: rate coming soon ({1})",
    pending_note: "These experiences are new in the {0} portfolio. Their net rate will be published here soon; meanwhile, request it and we'll send you a quote.",
    no_match: "No results for these filters.", duration: "Duration", hours: "{0} h", schedule: "Schedule",
    sched_fixed: "Hotel pickup: {0}", sched_window: "Start time of your choice between {0} and {1}", sched_from: "From {0}", sched_tbc: "To be confirmed",
    includes: "Includes", conditions: "Agency conditions", th_season: "Season", th_pax: "Passengers", th_rate: "Net rate",
    th_type: "Type", th_notes: "Notes", type_general: "General", type_special: "Special rate for your agency", pax_range: "{0}–{1} pax", pax_one: "{0} pax",
    rates_note: "Confidential net rates: do not share them with travellers. If you have a special rate, you'll see it instead of the general one.",
    tr_note: "Tour descriptions: machine translation pending review. Agency conditions are shown in Spanish.",
    request_this: "Request this tour", trip_details: "Trip details",
    req_title: "Request a booking", req_sub: "Send us the details and an advisor will confirm availability and the final rate.",
    traveller: "Traveller or group name", client_opt: "Saved client (optional)", tours: "Tours", add_tour: "Add tour",
    choose_tour: "Choose a tour", tour_ph: "Type the tour name, code or line…", no_tours_yet: "No tours added yet.", start_date: "Start date", end_date: "End date (optional)",
    pax: "Number of passengers", hotel: "Hotel or lodging", guide_lang: "Guide language",
    needs: "Special needs (accessibility, diet…)", notes: "Notes", send_request: "Send request",
    needs_hint: "Only what's needed to run the tour; no diagnoses or medical data (details are arranged via WhatsApp).",
    req_sent: "Request sent. We'll get back to you soon.", need_tour: "Add at least one tour.", end_before: "The end date can't be before the start date.",
    pax_invalid: "Enter the number of passengers (1 to 500).", max_tours: "Maximum 10 tours per request.",
    my_requests: "My requests", my_bookings: "Bookings", no_requests: "You haven't sent any requests yet.", no_bookings: "You have no bookings yet.",
    created: "Created", status: "Status", answer: "Reply from Espontáneos", cancel_req: "Cancel request", confirm_cancel: "Cancel this request?",
    canceled_ok: "Request cancelled.", dates: "Dates", passengers: "Passengers",
    st_nueva: "New", st_en_proceso: "In progress", st_confirmada: "Confirmed", st_rechazada: "Not available", st_cancelada: "Cancelled",
    st_borrador: "Draft", st_pendiente: "Pending", st_en_curso: "In progress", st_finalizada: "Completed",
    show_qr: "Show link & QR", hide_qr: "Hide link & QR", copy_link: "Copy link", copied: "Link copied.", code: "Code",
    qr_alt: "QR code to open itinerary {0}", send_wa: "Send via WhatsApp",
    wa_trip_msg: "Hi! Here is your itinerary with Espontáneos Travel: ",
    new_client: "New client", edit_client: "Edit client", client_name: "Traveller's full name", phone_wa: "Phone / WhatsApp",
    language: "Language", search_clients: "Search client", no_clients: "You have no saved clients yet.",
    consent_client: "I confirm the traveller authorized Espontáneos Travel SAS to process their personal data to manage the trip (Colombian Law 1581 of 2012).",
    consent_on: "Data consent recorded on {0} (version {1}).", client_saved: "Client saved.",
    delete_note: "To delete a client's data (right to erasure), message us and we'll do it.",
    account_title: "My account", languages: "Languages you speak (comma separated)", change_pw: "Change password",
    pw_email_sent: "We sent you an email to change your password.", role: "Role"
  }
};

const ERRORS = {
  "auth/invalid-credential": ["Correo o contraseña incorrectos.", "Wrong email or password."],
  "auth/invalid-login-credentials": ["Correo o contraseña incorrectos.", "Wrong email or password."],
  "auth/wrong-password": ["Correo o contraseña incorrectos.", "Wrong email or password."],
  "auth/user-not-found": ["Correo o contraseña incorrectos.", "Wrong email or password."],
  "auth/email-already-in-use": ["Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.", "An account with this email already exists. Sign in or reset your password."],
  "auth/weak-password": ["La contraseña es muy débil (mínimo 8 caracteres).", "The password is too weak (at least 8 characters)."],
  "auth/invalid-email": ["El correo no es válido.", "The email address is not valid."],
  "auth/too-many-requests": ["Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", "Too many attempts. Wait a few minutes and try again."],
  "auth/network-request-failed": ["Sin conexión. Revisa tu internet.", "No connection. Check your internet."],
  "auth/operation-not-allowed": ["El acceso con correo y contraseña no está activado en Firebase (ver docs/BACKEND.md).", "Email/password sign-in is not enabled in Firebase."],
  "auth/user-disabled": ["Esta cuenta está deshabilitada.", "This account is disabled."],
  "auth/unauthorized-domain": ["Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).", "This domain is not authorized in Firebase."],
  "permission-denied": ["No tienes permiso para esta acción. Si crees que es un error, escribe al administrador.", "You don't have permission for this action. Contact the administrator if this is a mistake."],
  "unavailable": ["Sin conexión con el servidor. Inténtalo de nuevo.", "Can't reach the server. Please try again."],
  "failed-precondition": ["Falta un índice en Firestore (ver docs/BACKEND.md, sección Índices).", "A Firestore index is missing."],
  "resource-exhausted": ["Se alcanzó el límite diario del plan gratuito de Firebase. Inténtalo mañana.", "Firebase free-plan daily quota reached. Try again tomorrow."]
};

/* ---------- Estado ---------- */
const S = {
  lang: "es", view: "boot", authMode: location.hash === "#solicitar" ? "signup" : "login", tab: null, tabsApi: null,
  fb: null, user: null, profile: null, dmc: null, signingUp: false,
  jenny: null, jennyP: null, i18n: null, tours: { list: [], byId: new Map(), byCode: new Map() },
  dmcs: [], users: [], refsLoaded: false, vigencias: [], cache: {}, preset: null, pagos: null,
  approval: null, approvalDone: null // aprobación pedida desde el correo de aviso / resultado para mostrar
};
let fs = null; // módulo firebase-firestore
let au = null; // módulo firebase-auth

/* ==========================================================================
   Utilidades puras (exportadas para pruebas)
   ========================================================================== */
const coll = new Intl.Collator("es", { sensitivity: "base", numeric: true });
export const collate = (a, b) => coll.compare(String(a == null ? "" : a), String(b == null ? "" : b));
export const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const digits = s => String(s == null ? "" : s).replace(/\D/g, "").slice(0, 20);
export const splitList = s => String(s == null ? "" : s).split(",").map(x => x.trim()).filter(Boolean);
export const slugify = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
const pad = n => String(n).padStart(2, "0");
export const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
// Búsqueda en Google Maps (siempre https y ≤ 500 caracteres, como exige firestore.rules)
export function mapsSearch(q) {
  let s = String(q || "").trim().replace(/\s+/g, " ").slice(0, 160);
  const base = "https://www.google.com/maps/search/";
  while (s && (base + encodeURIComponent(s)).length > 500) s = s.slice(0, -10);
  return s ? base + encodeURIComponent(s) : "";
}

export function safeUrl(u) {
  const s = String(u == null ? "" : u).trim();
  if (!s) return "";
  try {
    const base = typeof location !== "undefined" ? location.href : "https://example.invalid/";
    const url = new URL(s, base);
    if (["http:", "https:", "mailto:", "tel:", "blob:"].includes(url.protocol)) return url.href;
  } catch (e) { /* inválida */ }
  return "";
}

// URL https absoluta, sin espacios ni < > ", máx. 500 (igual que urlOk en firestore.rules). "" si no cumple.
export function httpsUrl(u) {
  const s = String(u == null ? "" : u).trim();
  if (!s || s.length > 500 || /[\s<>"]/.test(s)) return "";
  try {
    const url = new URL(s);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return "";
    return url.href.length <= 500 ? url.href : "";
  } catch (e) { return ""; }
}

// Prefijo OFICIAL de enlace de pago: https + dominio + al menos un segmento de ruta (no basta un dominio entero).
// Devuelve el prefijo normalizado (dominio en minúsculas) o "".
export function normPrefix(p) {
  const s = String(p == null ? "" : p).trim();
  if (!s || s.length > 200 || /[\s<>"]/.test(s) || !/^https:\/\//i.test(s)) return "";
  try {
    const u = new URL(s);
    const rest = s.slice(8);
    const i = rest.indexOf("/");
    if (u.protocol !== "https:" || i < 1 || u.username || u.password) return "";
    const host = rest.slice(0, i).toLowerCase(), path = rest.slice(i);
    if (host !== u.host || path.length < 2) return "";
    return "https://" + host + path;
  } catch (e) { return ""; }
}
// Enlace de pago aceptado solo si empieza por un prefijo oficial. "" si no.
export function payLinkFor(link, prefixes) {
  const l = httpsUrl(link);
  return l && (prefixes || []).some(p => p && l.startsWith(p)) ? l : "";
}
// Patrón RE2 que guardan las reglas (config/pagos.patron): coincide con enlaces que empiezan por algún prefijo.
export function prefixPattern(prefixes) {
  const esc = s => s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  return prefixes && prefixes.length ? "(" + prefixes.map(esc).join("|") + ").*" : "";
}

// Enlace de un lead: solo se abre si es viaje.html en nuestros propios dominios (https). "" si no.
export function ownTripLink(u) {
  try {
    const url = new URL(String(u == null ? "" : u).trim());
    if (url.protocol === "https:" && !url.port && !url.username && !url.password
      && OWN_HOSTS.includes(url.hostname) && url.pathname.endsWith("/viaje.html")) return url.href;
  } catch (e) { /* inválida */ }
  return "";
}

// El código del viajero deja de funcionar 30 días después del último día del viaje (privacidad).
// La regla de Firestore (match /reservas_publicas) niega la lectura pública después de "vence".
export const CODE_DAYS_AFTER = 30;
export function codeExpiry(itinerary, now = new Date()) {
  const last = (itinerary || []).map(i => i && i.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d || "")).sort().pop();
  const base = last ? new Date(last + "T23:59:59-05:00") : now;   // fin del día en Colombia
  return new Date(base.getTime() + CODE_DAYS_AFTER * 864e5);
}

/**
 * Documento PÚBLICO de una reserva (reservas_publicas/{código}): solo lo que necesita el conserje.
 * b: { code, lang, name, party, status, region, host, driver, guide, hotel, itinerary, payLink }
 * Agrega "vence" (fecha en que el código deja de abrir el conserje).
 */
export function buildPublicBooking(b, prefixes) {
  const str = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const person = p => ({ name: str(p && p.name, 80), phone: digits(p && p.phone) });
  const pub = {
    code: b.code, lang: str(b.lang, 5) || "es", name: str(b.name, 60) || "Viajero",
    status: str(b.status, 40), region: str(b.region, 120),
    host: person(b.host), driver: person(b.driver),
    guide: { name: str(b.guide && b.guide.name, 80), langs: ((b.guide && b.guide.langs) || []).map(x => str(x, 5).toLowerCase()).filter(Boolean).slice(0, 10) },
    hotel: { name: str(b.hotel && b.hotel.name, 120), area: str(b.hotel && b.hotel.area, 80), maps: httpsUrl(b.hotel && b.hotel.maps) },
    itinerary: (b.itinerary || []).slice(0, MAX_ITIN).map(it => ({
      date: str(it.date, 10), time: str(it.time, 5),
      title: it.title && typeof it.title === "object" ? it.title : str(it.title, 160),
      tourId: str(it.tourId, 40), maps: httpsUrl(it.maps)
    }))
  };
  pub.vence = codeExpiry(pub.itinerary);
  if (Number.isInteger(b.party) && b.party >= 1 && b.party <= 500) pub.party = b.party;
  const lat = b.hotel && b.hotel.lat, lon = b.hotel && b.hotel.lon;
  if (typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 && typeof lon === "number" && Number.isFinite(lon) && Math.abs(lon) <= 180) {
    pub.hotel.lat = lat; pub.hotel.lon = lon;
  }
  const pay = payLinkFor(b.payLink, prefixes);
  if (pay) pub.payLink = pay;
  return pub;
}

// Código de reserva: 10 caracteres sin ambiguos (sin 0/O/1/I). 32 símbolos → 50 bits de azar.
export function randomCode(n = 10) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += A[b & 31];
  return s;
}

// CSV tolerante: comillas, separador , ; o tabulador (detección automática), BOM y saltos CRLF.
function countOutside(line, ch) { let n = 0, q = false; for (const c of line) { if (c === '"') q = !q; else if (c === ch && !q) n++; } return n; }
export function detectDelimiter(text) {
  const first = String(text).replace(/^﻿/, "").split(/\r?\n/).find(l => l.trim()) || "";
  const best = [",", ";", "\t"].map(d => [d, countOutside(first, d)]).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}
export function parseCSV(text, delim) {
  const src = String(text == null ? "" : text).replace(/^﻿/, "");
  const d = delim || detectDelimiter(src);
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"' && cell.trim() === "") { q = true; cell = ""; }
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

// Números en formato colombiano o internacional: 185000 · 185.000 · 185,000 · 45.50 · 45,5 · 1.234.567,89 · $ 185.000
export function parseNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  let s = String(v == null ? "" : v).replace(/ /g, " ").trim().replace(/^'/, "").replace(/(COP|USD|EUR|\$|€|\s)/gi, "");
  if (!s || !/^-?[\d.,]+$/.test(s)) return NaN;
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  if (lastDot > -1 && lastComma > -1) {
    const dec = lastDot > lastComma ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = s.split(thou).join("").replace(dec, ".");
  } else if (lastDot > -1 || lastComma > -1) {
    const sep = lastDot > -1 ? "." : ",";
    const parts = s.split(sep);
    const intPart = parts[0].replace("-", "");
    const thousands = parts.length > 2 || (parts[1].length === 3 && intPart.length > 0 && intPart !== "0");
    s = thousands ? parts.join("") : parts.join(".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function toCSV(rows, cols, sep = ",") {
  const cell = v => {
    if (v == null) return "";
    let s;
    if (typeof v === "number") s = sep === ";" ? String(v).replace(".", ",") : String(v);
    else if (typeof v === "boolean") s = v ? "true" : "false";
    else if (typeof v === "string") s = /^[=+\-@\t\r]/.test(v) ? "'" + v : v; // evita fórmulas al abrir en Excel
    else s = JSON.stringify(v);
    return /["\r\n]/.test(s) || s.includes(sep) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [cols.map(cell).join(sep)].concat(rows.map(r => cols.map(c => cell(r[c])).join(sep))).join("\r\n") + "\r\n";
}

// Timestamps de Firestore → texto ISO (para CSV/JSON)
export function plain(v) {
  if (v && typeof v.toDate === "function") return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = plain(v[k]); return o; }
  return v;
}

const HEADER_ALIAS = { dmcid: "dmc_id", dmc: "dmc_id", agencia: "dmc_id", id_web: "tour_id", tour: "tour_id", tourid: "tour_id", tarifa: "tarifa_neta", neta: "tarifa_neta", precio_neto: "tarifa_neta", pax_min: "pax_desde", pax_max: "pax_hasta", ano: "vigencia", anio: "vigencia", year: "vigencia", nota: "notas", code: "codigo", currency: "moneda", season: "temporada" };
export function normHeader(hd) {
  const k = norm(hd).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return HEADER_ALIAS[k] || k;
}
const cleanCell = v => (v == null ? "" : String(v).replace(/^'(?=[=+\-@])/, "").trim());

export function tarifaId(d) {
  return [d.vigencia, d.dmcId || "general", d.tour_id || d.codigo, d.temporada || "todas", `${d.pax_desde}-${d.pax_hasta}`, d.moneda]
    .join("_").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 300);
}

/**
 * Valida filas de tarifas (objetos con claves ya normalizadas).
 * ctx: { vigencia (número elegido), dmcIds: Set de agencias existentes, tours: { byId: Map, byCode: Map } }
 * Devuelve { items: [{ line, id, data, errors, warnings }], missing: [columnas faltantes], errorCount, warningCount }
 */
export function validateTarifas(rows, ctx) {
  const keys = new Set(); rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  const missing = ["pax_desde", "pax_hasta", "moneda", "tarifa_neta"].filter(k => !keys.has(k));
  if (!keys.has("codigo") && !keys.has("tour_id")) missing.push("codigo o tour_id");
  const items = []; const seen = new Map();
  rows.forEach((r, i) => {
    const errors = [], warnings = [];
    const line = r.__line || i + 2;
    const get = k => cleanCell(r[k]);
    let vig = ctx.vigencia;
    if (get("vigencia")) {
      const v = parseInt(get("vigencia"), 10);
      if (!Number.isInteger(v)) errors.push("Vigencia no válida.");
      else if (v !== ctx.vigencia) errors.push(`La fila dice vigencia ${v}, pero elegiste ${ctx.vigencia}.`);
      else vig = v;
    }
    let codigo = get("codigo").toUpperCase(), tour_id = get("tour_id");
    const byCode = codigo ? ctx.tours.byCode.get(codigo) : null;
    const byId = tour_id ? ctx.tours.byId.get(tour_id) : null;
    if (!codigo && !tour_id) errors.push("Falta el código o el tour_id.");
    if (!tour_id && byCode) tour_id = byCode.id_web;
    if (!codigo && byId) codigo = byId.codigo;
    if (byId && codigo && byId.codigo && byId.codigo !== codigo) warnings.push(`El tour_id "${tour_id}" corresponde al código ${byId.codigo}, no a ${codigo}.`);
    if ((codigo || tour_id) && !byCode && !byId && !/^(ET|SU|HT)-/.test(codigo)) warnings.push("No está en el portafolio web (data/jenny.json); se importa igual.");
    if (codigo.length > 20) errors.push("El código tiene más de 20 caracteres.");
    if (tour_id.length > 40 || !/^[A-Za-z0-9_-]*$/.test(tour_id)) errors.push("tour_id no válido (solo letras, números, - y _; máx. 40).");
    const nombre = get("nombre") || (byId && byId.nombre) || (byCode && byCode.nombre) || "";
    if (!nombre) errors.push("Falta el nombre del tour.");
    if (nombre.length > 200) errors.push("El nombre tiene más de 200 caracteres.");
    const temporada = get("temporada");
    if (temporada.length > 40) errors.push("La temporada tiene más de 40 caracteres.");
    const pd = get("pax_desde"), ph = get("pax_hasta");
    const pax_desde = /^\d+$/.test(pd) ? parseInt(pd, 10) : NaN;
    const pax_hasta = /^\d+$/.test(ph) ? parseInt(ph, 10) : NaN;
    if (!(pax_desde >= 1)) errors.push("pax_desde debe ser un número entero desde 1.");
    if (!(pax_hasta >= 1)) errors.push("pax_hasta debe ser un número entero desde 1.");
    else if (pax_hasta < pax_desde) errors.push("pax_hasta no puede ser menor que pax_desde.");
    else if (pax_hasta > 999) errors.push("pax_hasta máximo 999.");
    const moneda = get("moneda").toUpperCase();
    if (!/^[A-Z]{3}$/.test(moneda)) errors.push("Moneda no válida (usa 3 letras: COP, USD, EUR).");
    const tarifa_neta = parseNumber(get("tarifa_neta"));
    if (!Number.isFinite(tarifa_neta)) errors.push("Tarifa neta vacía o no es un número.");
    else if (tarifa_neta < 0) errors.push("La tarifa no puede ser negativa.");
    else if (tarifa_neta === 0) warnings.push("Tarifa en 0.");
    const dmcRaw = get("dmc_id");
    const dmcId = dmcRaw ? dmcRaw.toLowerCase() : null;
    if (dmcId && dmcId !== "_nac" && !ctx.dmcIds.has(dmcId)) errors.push(`La agencia "${dmcRaw}" no existe. Créala en Agencias o deja dmc_id vacío para tarifa general.`);
    const notas = get("notas");
    if (notas.length > 500) errors.push("Las notas tienen más de 500 caracteres.");
    if (/ejemplo/i.test(notas) || /ejemplo/i.test(temporada)) errors.push("Fila de EJEMPLO de la plantilla: bórrala antes de importar.");
    const data = { vigencia: vig, codigo, tour_id, nombre, temporada, pax_desde, pax_hasta, moneda, tarifa_neta, dmcId, notas };
    const id = tarifaId(data);
    if (!errors.length) {
      if (seen.has(id)) errors.push(`Repetida: misma tarifa que la línea ${seen.get(id)} (tour, temporada, pasajeros, moneda y agencia).`);
      else seen.set(id, line);
    }
    items.push({ line, id, data, errors, warnings });
  });
  return {
    items, missing,
    errorCount: items.filter(x => x.errors.length).length,
    warningCount: items.filter(x => x.warnings.length).length
  };
}

// Convierte el texto de un archivo de tarifas (CSV o JSON) a filas con claves normalizadas.
export function rowsFromText(name, text) {
  const t = String(text == null ? "" : text).replace(/^﻿/, "");
  if (/\.json$/i.test(name || "") || /^\s*[[{]/.test(t)) {
    const j = JSON.parse(t);
    const arr = Array.isArray(j) ? j : (j && (j.tarifas || j.rates));
    if (!Array.isArray(arr)) throw userErr('El JSON debe ser una lista de tarifas o un objeto {"tarifas": [...]}.');
    return arr.map((o, i) => {
      const r = { __line: i + 1 };
      for (const k of Object.keys(o || {})) r[normHeader(k)] = o[k] == null ? "" : (typeof o[k] === "object" ? JSON.stringify(o[k]) : String(o[k]));
      return r;
    });
  }
  const rows = parseCSV(t);
  if (rows.length < 2) throw userErr("El archivo no tiene filas de datos (la primera fila debe ser el encabezado).");
  const head = rows[0].map(normHeader);
  return rows.slice(1).map((r, i) => {
    const o = { __line: i + 2 };
    head.forEach((k, j) => { if (k) o[k] = r[j] == null ? "" : r[j]; });
    return o;
  });
}

/** Valida el JSON de condiciones (formato de privado/condiciones-agencia-AAAA.json). */
export function validateCondiciones(json, fallbackYear) {
  const errors = [], items = [];
  if (!json || typeof json !== "object") return { vigencia: fallbackYear, items, errors: ["El archivo no es un JSON válido."] };
  const vig = Number.isInteger(json.vigencia) ? json.vigencia : fallbackYear;
  if (!(vig >= 2020 && vig <= 2100)) errors.push("Vigencia no válida.");
  let entries = [];
  if (Array.isArray(json.condiciones)) entries = json.condiciones.map(c => [c && c.tour_id, c]);
  else if (json.condiciones && typeof json.condiciones === "object") entries = Object.entries(json.condiciones);
  else errors.push('Falta el objeto "condiciones".');
  for (const [tourId, c] of entries) {
    const label = String(tourId || "(sin tour_id)");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(tourId || ""))) { errors.push(`${label}: tour_id no válido.`); continue; }
    const notas = c && Array.isArray(c.notas_agencia) ? c.notas_agencia : null;
    if (!notas) { errors.push(`${label}: falta la lista "notas_agencia".`); continue; }
    if (notas.length > 50) { errors.push(`${label}: máximo 50 notas.`); continue; }
    if (notas.some(n => typeof n !== "string" || n.length > 1000)) { errors.push(`${label}: cada nota debe ser texto de máx. 1000 caracteres.`); continue; }
    items.push({
      id: `${vig}_${tourId}`,
      data: { vigencia: vig, tour_id: String(tourId), codigo: String((c && c.codigo) || "").slice(0, 20), nombre: String((c && c.nombre) || "").slice(0, 200), notas_agencia: notas.slice() }
    });
  }
  return { vigencia: vig, items, errors };
}

/** Une tarifas generales y especiales: la especial reemplaza a la general idéntica (tour, temporada, pax, moneda). */
export function mergeTarifas(general, special) {
  const key = r => [r.tour_id || r.codigo, r.temporada, r.pax_desde, r.pax_hasta, r.moneda].join("|");
  const sk = new Set(special.map(key));
  return special.map(r => Object.assign({}, r, { especial: true })).concat(general.filter(r => !sk.has(key(r))).map(r => Object.assign({}, r, { especial: false })));
}

function userErr(msg) { const e = new Error(msg); e.code = "user"; return e; }

/* ==========================================================================
   DOM: helper seguro, formularios, avisos
   ========================================================================== */
const $ = (s, r = document) => r.querySelector(s);
let uidN = 0;
const uid = p => `p-${p || "x"}-${++uidN}`;

function append(el, kids) {
  for (const k of [kids].flat(Infinity)) {
    if (k == null || k === false || k === "") continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
// Crea elementos de forma segura: el texto siempre va como nodo de texto (nunca HTML).
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "value") value = v;
    else if (k === "checked") el.checked = !!v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "href" || k === "src") {
      // data:image solo para los QR que genera este mismo archivo (qrDataUrl)
      const u = /^data:image\/(gif|png);base64,[A-Za-z0-9+/=]+$/.test(String(v)) ? String(v) : safeUrl(v);
      if (u) el.setAttribute(k, u);
    }
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  append(el, kids);
  if (value != null) el.value = String(value);
  return el;
}
const add = (el, ...kids) => append(el, kids); // como el.append, pero ignora null/false y aplana listas
function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }

function L() { return S.view === "staff" ? "es" : S.lang; }
function t(key, ...args) {
  const d = I18N[L()] || I18N.es;
  let s = d[key] != null ? d[key] : (I18N.es[key] != null ? I18N.es[key] : key);
  args.forEach((a, i) => { s = s.split("{" + i + "}").join(String(a)); });
  return s;
}
const locale = () => (L() === "en" ? "en-US" : "es-CO");

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
const fmtDateTime = v => { const d = toDate(v); return d ? d.toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" }) : "—"; };
const fmtDay = v => { const d = toDate(v); return d ? d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }) : ""; };
function money(n, cur) {
  try { return new Intl.NumberFormat(locale(), { style: "currency", currency: cur || "COP", maximumFractionDigits: cur === "COP" ? 0 : 2 }).format(n); }
  catch (e) { return `${n} ${cur || ""}`.trim(); }
}
const time = d => (d ? toDate(d)?.getTime() || 0 : 0);
const sortByCreado = arr => arr.sort((a, b) => time(b.creado) - time(a.creado));
const first = s => String(s || "").trim().split(/\s+/)[0] || "";
const waLink = (phone, text) => "https://wa.me/" + digits(phone) + (text ? "?text=" + encodeURIComponent(text) : "");
// Número para wa.me: un celular colombiano de 10 dígitos (3xx…) recibe el indicativo 57. "" si no sirve.
const waDigits = p => { const d = digits(p); return /^3\d{9}$/.test(d) ? "57" + d : d.length >= 8 ? d : ""; };
const debounce = (fn, ms) => { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; };

function errMsg(e) {
  const code = (e && e.code) || "";
  if (code === "user") return e.message;
  const m = ERRORS[code];
  if (m) return m[L() === "en" ? 1 : 0] + (code === "failed-precondition" && e.message ? " " + e.message : "");
  console.error(e);
  return t("err_generic") + (code ? ` (${code})` : "");
}

const toastTimers = {};
function notify(msg, type) {
  const isErr = type === "error";
  const el = $(isErr ? "#p-alert" : "#p-status");
  if (!el) return;
  clear(el);
  add(el, h("span", { class: "p-toast__msg" }, msg), h("button", { type: "button", class: "p-toast__x", "aria-label": t("close"), onclick: () => clear(el) }, "×"));
  clearTimeout(toastTimers[el.id]);
  toastTimers[el.id] = setTimeout(() => clear(el), isErr ? 12000 : 5000);
}

async function busy(btn, fn) {
  if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); }
  try { return await fn(); }
  catch (e) { notify(errMsg(e), "error"); return undefined; }
  finally { if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); } }
}

function mkForm(onSubmit, ...kids) {
  const form = h("form", { class: "p-form" }, ...kids);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = e.submitter || form.querySelector('button[type="submit"]');
    busy(btn, () => onSubmit(form));
  });
  return form;
}

/**
 * Campos de formulario accesibles (label + input + ayuda).
 * defs: [{ name, label, type, options:[[valor, texto]], required, max, hint, full, rows, autocomplete, placeholder, attrs }]
 */
function formFields(defs, values) {
  const inputs = {};
  const grid = h("div", { class: "p-grid" });
  for (const d of defs) {
    const id = uid(d.name);
    const hintId = d.hint ? id + "-h" : null;
    const common = Object.assign({ id, name: d.name, required: d.required || null, "aria-describedby": hintId }, d.attrs || {});
    let input;
    if (d.type === "select") input = h("select", common, (d.options || []).map(([v, l]) => h("option", { value: v }, l)));
    else if (d.type === "textarea") input = h("textarea", Object.assign({ rows: d.rows || 3, maxlength: d.max, placeholder: d.placeholder }, common));
    else if (d.type === "checkbox") input = h("input", Object.assign({ type: "checkbox" }, common));
    else input = h("input", Object.assign({ type: d.type || "text", maxlength: d.max, placeholder: d.placeholder, autocomplete: d.autocomplete || "off", inputmode: d.inputmode }, common));
    const hint = d.hint ? h("small", { id: hintId, class: "p-hint" }, d.hint) : null;
    const wrap = d.type === "checkbox"
      ? h("div", { class: "p-field p-field--check" + (d.full ? " p-field--full" : "") }, input, h("div", null, h("label", { for: id }, d.label, d.required ? h("span", { class: "p-req", "aria-hidden": "true" }, " *") : null), hint))
      : h("div", { class: "p-field" + (d.full ? " p-field--full" : "") }, h("label", { for: id }, d.label, d.required ? h("span", { class: "p-req", "aria-hidden": "true" }, " *") : null), input, hint);
    add(grid, wrap);
    inputs[d.name] = input;
  }
  const api = {
    el: grid, inputs,
    get() {
      const o = {};
      for (const d of defs) {
        const i = inputs[d.name];
        if (d.type === "checkbox") o[d.name] = i.checked;
        else if (d.type === "password") o[d.name] = i.value;
        else o[d.name] = i.value.trim();
      }
      return o;
    },
    set(v) {
      for (const d of defs) {
        if (!v || !(d.name in v)) continue;
        const i = inputs[d.name], x = v[d.name];
        if (d.type === "checkbox") i.checked = !!x;
        else i.value = x == null ? "" : String(x);
      }
    }
  };
  api.set(values || {});
  return api;
}

function selectEl(options, value, attrs) {
  const s = h("select", attrs || {}, options.map(([v, l]) => h("option", { value: v }, l)));
  if (value != null) s.value = String(value);
  return s;
}
function labeled(label, control, cls) {
  if (!control.id) control.id = uid("c");
  return h("div", { class: "p-field" + (cls ? " " + cls : "") }, h("label", { for: control.id }, label), control);
}
function checkField(label, input) {
  if (!input.id) input.id = uid("chk");
  return h("div", { class: "p-field p-field--check" }, input, h("label", { for: input.id }, label));
}
const group = (legend, ...kids) => h("fieldset", { class: "p-fieldset" }, h("legend", null, legend), ...kids);
const btn = (label, onclick, cls, attrs) => h("button", Object.assign({ type: "button", class: "btn btn--sm " + (cls || "btn--ghost"), onclick }, attrs || {}), label);
const linkBtn = (label, onclick) => h("button", { type: "button", class: "p-link", onclick }, label);
const badge = (text, kind) => h("span", { class: "p-badge" + (kind ? " p-badge--" + kind : "") }, text);
const loadingBox = () => h("p", { class: "p-loading", role: "status" }, t("loading"));
const emptyBox = msg => h("p", { class: "p-empty" }, msg);
function errorBox(e, retry) {
  return h("div", { class: "p-error", role: "alert" }, h("p", null, errMsg(e)), retry ? btn(t("retry"), retry) : null);
}
function kv(label, value) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  return h("div", { class: "p-kv__row" }, h("dt", null, label), h("dd", null, value));
}
const kvList = (...rows) => h("dl", { class: "p-kv" }, ...rows);
function table(cols, rows, opts) {
  return h("table", { class: "p-table" + (opts && opts.stack ? " p-table--stack" : "") },
    opts && opts.caption ? h("caption", { class: "p-sr" }, opts.caption) : null,
    h("thead", null, h("tr", null, cols.map(c => h("th", { scope: "col", class: c.cls }, c.label)))),
    h("tbody", null, rows.map(r => h("tr", null, cols.map(c => h("td", { class: c.cls, "data-label": c.label }, c.get(r)))))));
}
const tableWrap = (cols, rows, opts) => h("div", { class: "p-table-wrap", tabindex: "0", role: "region", "aria-label": (opts && opts.caption) || "Tabla" }, table(cols, rows, opts));

function download(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name, class: "p-sr" });
  add(document.body, a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function getSep() { try { return localStorage.getItem("esp_csv_sep") === ";" ? ";" : ","; } catch (e) { return ","; } }
function sepSelect() {
  const s = selectEl([[",", t("sep_comma")], [";", t("sep_semicolon")]], getSep(), { id: uid("sep") });
  s.addEventListener("change", () => { try { localStorage.setItem("esp_csv_sep", s.value); } catch (e) { /* sin almacenamiento */ } });
  return s;
}
function copyText(s) {
  const done = () => notify(t("copied"));
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(done, () => window.prompt(t("copy_link"), s));
  else window.prompt(t("copy_link"), s);
}
function focusHeading(root) {
  const hd = (root || $("#p-main")).querySelector("h1, h2");
  if (hd) { hd.setAttribute("tabindex", "-1"); hd.focus({ preventScroll: false }); }
}
// QR generado en el navegador con js/vendor/qrcode.min.js (qrcode-generator): el enlace no sale a terceros.
// cell = píxeles por módulo; margen de 4 módulos. Devuelve data:image/gif o "" si la librería no cargó.
function qrDataUrl(text, cell) {
  try {
    if (typeof window.qrcode !== "function") return "";
    const q = window.qrcode(0, "M");
    q.addData(text);
    q.make();
    const c = cell || 5;
    return q.createDataURL(c, c * 4);
  } catch (e) { return ""; }
}

/* ==========================================================================
   Firebase
   ========================================================================== */
// App Check: debe iniciarse antes de usar Firestore o Auth. Sin clave, no hace nada.
async function startAppCheck(app) {
  if (!appCheckSiteKey) return;
  try {
    const ac = await import(SDK + "firebase-app-check.js");
    ac.initializeAppCheck(app, { provider: new ac.ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  } catch (e) { console.warn("App Check no se pudo iniciar", e); }
}
async function loadFirebase() {
  const [appM, authM, fsM] = await Promise.all([
    import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")
  ]);
  const app = appM.initializeApp(firebaseConfig);
  await startAppCheck(app);
  const auth = authM.getAuth(app);
  const db = fsM.initializeFirestore(app, { ignoreUndefinedProperties: true });
  return { appM, authM, fsM, app, auth, db };
}
const col = name => fs.collection(S.fb.db, name);
const dref = (name, id) => fs.doc(S.fb.db, name, id);
const newRef = name => fs.doc(col(name)); // referencia con ID automático
const ts = () => fs.serverTimestamp();
async function list(q) { const snap = await fs.getDocs(q); return snap.docs.map(d => Object.assign({ id: d.id }, d.data())); }
// Varias escrituras atómicas (todo o nada): ops = [b => b.set(...), b => b.update(...), …]
async function commit(ops) { const b = fs.writeBatch(S.fb.db); ops.forEach(op => op(b)); await b.commit(); }

// Importaciones grandes: lotes de BATCH_SIZE. Si un lote es rechazado (p. ej. límites de evaluación
// de las reglas), se reintenta con lotes más pequeños. Las escrituras son idempotentes (IDs fijos).
async function batchRun(ops, onProgress, label) {
  let size = BATCH_SIZE, i = 0;
  while (i < ops.length) {
    const chunk = ops.slice(i, i + size);
    try { await commit(chunk); }
    catch (e) {
      if (e && e.code === "permission-denied" && size > 10) { size = Math.max(10, Math.floor(size / 4)); continue; }
      throw e;
    }
    i += chunk.length;
    if (onProgress) onProgress(`${label}: ${i} de ${ops.length}`);
  }
}

// Prefijos oficiales de enlaces de pago (config/pagos, solo staff). [] si no hay.
async function loadPagos(force) {
  if (S.pagos && !force) return S.pagos;
  try { const s = await fs.getDoc(dref("config", "pagos")); S.pagos = s.exists() ? (s.data().prefijos || []).map(normPrefix).filter(Boolean) : []; }
  catch (e) { S.pagos = []; }
  return S.pagos;
}

/* ---------- Datos públicos del portafolio (data/jenny.json) ---------- */
async function loadJenny() {
  try {
    const r = await fetch("data/jenny.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const y = await r.json();
    S.jenny = y;
    const tours = Array.isArray(y.tours) ? y.tours : [];
    S.tours.list = tours.slice().sort((a, b) => collate(a.nombre, b.nombre));
    for (const x of tours) { if (x.id_web) S.tours.byId.set(x.id_web, x); if (x.codigo) S.tours.byCode.set(x.codigo, x); }
  } catch (e) { console.warn("No se pudo leer data/jenny.json", e); }
}
async function loadI18nTours() {
  if (S.i18n !== null) return;
  S.i18n = false;
  try { const r = await fetch("data/jenny.i18n.json", { cache: "no-cache" }); if (r.ok) S.i18n = await r.json(); } catch (e) { /* opcional */ }
}
const tourOf = r => S.tours.byId.get(r.tour_id) || S.tours.byCode.get(r.codigo) || null;
// Orden del índice del portafolio (línea y, dentro de cada línea, el de data/portafolio.json): «Tarifas» lo sigue
async function loadPfOrder() {
  if (S.pfOrder) return;
  S.pfOrder = new Map();
  try {
    const r = await fetch("data/portafolio.json", { cache: "no-cache" }); if (!r.ok) return;
    const P = await r.json(); let i = 0;
    Object.keys(P.cats || {}).forEach(c => (P.tours || []).filter(x => x.cat === c).forEach(x => S.pfOrder.set(x.id, i++)));
  } catch (e) { /* sin ese orden: por línea y nombre */ }
}
const CAT_POS = k => { const i = Object.keys(CATS).indexOf(k); return i < 0 ? 99 : i; };
const pfPos = tour => (tour && S.pfOrder && S.pfOrder.has(tour.id_web) ? S.pfOrder.get(tour.id_web) : 1e4 + CAT_POS(tour && tour.cat) * 100);
function tourText(tour, field) {
  if (!tour) return null;
  if (L() !== "es" && S.i18n && S.i18n[L()] && S.i18n[L()].tours) {
    const tr = S.i18n[L()].tours[tour.id_web];
    if (tr && tr[field] != null) return tr[field];
  }
  return tour[field];
}
function horarioText(hr) {
  if (!hr || !hr.tipo) return t("sched_tbc");
  let s = t("sched_tbc");
  if (hr.tipo === "fijo" && hr.horas && hr.horas.length) s = t("sched_fixed", hr.horas.join(" · "));
  else if (hr.tipo === "ventana" && hr.desde && hr.hasta) s = t("sched_window", hr.desde, hr.hasta);
  else if (hr.tipo === "desde" && hr.hora) s = t("sched_from", hr.hora);
  return hr.nota && L() === "es" ? `${s}. ${hr.nota}` : s;
}

// Año del portafolio vigente (data/jenny.json → _meta.vigencia_catalogo). Sin tarifas propias, usa las del año anterior.
const catalogYear = () => (S.jenny && S.jenny._meta && S.jenny._meta.vigencia_catalogo) || null;
async function loadVigencias() {
  let lista = [];
  try {
    const s = await fs.getDoc(dref("config", "vigencias"));
    if (s.exists()) lista = (s.data().lista || []).map(Number).filter(Number.isInteger);
  } catch (e) { /* sin config aún */ }
  const y = S.jenny && S.jenny._meta && S.jenny._meta.vigencia;
  if (!lista.length && Number.isInteger(y)) lista = [y];
  if (Number.isInteger(catalogYear())) lista.push(catalogYear());
  S.vigencias = [...new Set(lista)].sort((a, b) => b - a);
}

async function loadRefs(force) {
  if (S.refsLoaded && !force) return;
  const [dmcs, users] = await Promise.all([list(col("dmcs")), list(col("users"))]);
  S.dmcs = dmcs.sort((a, b) => collate(a.nombre, b.nombre));
  S.users = users.sort((a, b) => collate(a.nombre, b.nombre));
  S.refsLoaded = true;
}
const dmcName = id => (id === "_nac" ? "Mercado Nacional" : id ? ((S.dmcs.find(d => d.id === id) || {}).nombre || id) : "Venta directa");
const TIPOS_DMC = [["dmc", "DMC · tarifario DMC"], ["nac", "Mercado Nacional y Mayoristas · tarifario nacional"]];
const tipoLabel = x => (x === "nac" ? "Mercado Nacional y Mayoristas" : "DMC");
const scopeLabel = id => (id === "_nac" ? "Mercado Nacional (todas sus cuentas)" : id ? "Especial: " + dmcName(id) : "General DMC");
const userName = id => { const u = S.users.find(x => x.id === id); return u ? (u.nombre || u.email) : (id || "—"); };
const advisors = () => S.users.filter(u => (u.rol === "asesor" || u.rol === "admin") && u.estado === "activo");
const roleLabel = r => t("role_" + r);
const stLabel = e => t("st_" + e);
const ST_KIND = { nueva: "warn", en_proceso: "warn", pendiente: "warn", confirmada: "ok", en_curso: "ok", rechazada: "bad", cancelada: "bad", borrador: "", finalizada: "" };
const stBadge = e => badge(stLabel(e), ST_KIND[e]);

/* ==========================================================================
   Arranque y navegación
   ========================================================================== */
function initialLang() {
  try { const s = localStorage.getItem("esp_portal_lang"); if (s === "es" || s === "en") return s; } catch (e) { /* sin almacenamiento */ }
  return /^es\b/i.test(navigator.language || "es") ? "es" : "en";
}
function setLang(l) {
  S.lang = l;
  try { localStorage.setItem("esp_portal_lang", l); } catch (e) { /* sin almacenamiento */ }
  document.documentElement.lang = L();
  if (S.fb) S.fb.auth.languageCode = l;
  if (S.view === "setup") return renderSetup();
  if (S.view !== "auth") return route();
  if (S.authMode === "complete") return renderCompleteRequest();
  if (S.authMode.indexOf("status-") === 0) return renderStatus(S.authMode.slice(7));
  return renderAuth(S.authMode);
}

// Enlaces del correo de aviso: #aprobar-dmc-<uid>, #aprobar-asesor-<uid>, #rechazar-<uid> (y #usuarios).
// Se guardan en memoria hasta que entre un administrador; las reglas de Firestore deciden quién puede aprobar.
function readHash() {
  const m = /^#(?:aprobar-(dmc|asesor|admin)|(rechazar))-([A-Za-z0-9]{10,128})$/.exec(location.hash || "");
  if (m) S.approval = { rol: m[1] || "no", uid: m[3] };
}
function clearHash() { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* sin historial */ } }

async function boot() {
  readHash();
  window.addEventListener("hashchange", () => { readHash(); if (S.view === "staff") renderStaffApp(); });
  // Tema guardado por el sitio (antes era un script en línea; la CSP de portal.html no permite scripts en línea)
  try { const th = localStorage.getItem("esp_theme"); if (th === "dark" || th === "light") document.documentElement.setAttribute("data-theme", th); } catch (e) { /* sin almacenamiento */ }
  S.lang = initialLang();
  document.documentElement.lang = S.lang;
  S.jennyP = loadJenny();
  if (!enabled) return renderSetup();
  try { S.fb = await loadFirebase(); }
  catch (e) { return renderFatal("No se pudo cargar Firebase. Revisa tu conexión a internet y recarga la página.", () => location.reload()); }
  fs = S.fb.fsM; au = S.fb.authM;
  S.fb.auth.languageCode = S.lang;
  au.onAuthStateChanged(S.fb.auth, async user => {
    S.user = user;
    if (!user) {
      Object.assign(S, { profile: null, dmc: null, refsLoaded: false, dmcs: [], users: [], cache: {}, tab: null, vigencias: [], preset: null, pagos: null });
      // El siguiente ingreso abre el portafolio en Inicio y con «Arma tu ruta» limpio
      try { Object.keys(sessionStorage).filter(k => k.startsWith("pf27-")).forEach(k => sessionStorage.removeItem(k)); } catch (e) { /* sin almacenamiento */ }
      return renderAuth(location.hash === "#solicitar" ? "signup" : "login");   // portal.html#solicitar (página para agencias) abre la solicitud de acceso
    }
    if (S.signingUp) return; // el registro termina y luego enruta
    await enter();
  });
}

async function enter() {
  try { await loadProfile(); }
  catch (e) { return renderFatal(errMsg(e), enter); }
  await route();
}
async function loadProfile() {
  const snap = await fs.getDoc(dref("users", S.user.uid));
  S.profile = snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
}

async function route() {
  const p = S.profile;
  if (!S.user) return renderAuth("login");
  if (!p) return renderCompleteRequest();
  if (p.estado === "bloqueado") return renderStatus("blocked");
  if (p.estado !== "activo") return renderStatus("pending");
  // Las reglas exigen correo verificado (token email_verified) para cualquier lectura de datos.
  if (!S.user.emailVerified) return renderStatus("verify");
  if (p.rol === "dmc") {
    if (!p.dmcId) return renderStatus("noagency");
    if (!S.dmc) {
      try { const s = await fs.getDoc(dref("dmcs", p.dmcId)); S.dmc = s.exists() ? Object.assign({ id: s.id }, s.data()) : null; }
      catch (e) { S.dmc = null; }
    }
    if (!S.dmc || S.dmc.activo === false) return renderStatus("noagency");
    S.view = "dmc";
    return renderDmcApp();
  }
  if (p.rol === "admin" || p.rol === "asesor") {
    S.view = "staff";
    try { await loadRefs(); } catch (e) { return renderFatal(errMsg(e), route); }
    return renderStaffApp();
  }
  return renderStatus("pending");
}

function renderHeader() {
  const box = clear($("#p-header-actions"));
  // Siempre visible: quien llegó aquí por error vuelve al sitio con un clic
  const site = S.lang === "en" && S.view !== "staff" ? "/en/" : "/";
  add(box, h("a", { class: "btn btn--ghost btn--sm p-back", href: site }, h("span", { "aria-hidden": "true" }, "← "), t("back_site")));
  $("#p-skip").textContent = t("skip");
  $("#p-brand-tag").textContent = S.view === "staff" ? "Portal interno" : t("portal_tag");
  if (S.view !== "staff" && S.view !== "setup") {
    add(box, h("div", { class: "p-lang", role: "group", "aria-label": t("lang_label") },
      ["es", "en"].map(l => h("button", { type: "button", class: "p-lang__btn", lang: l, "aria-pressed": String(S.lang === l), onclick: () => setLang(l) }, l.toUpperCase()))));
  }
  if (S.user) {
    const who = (S.profile && S.profile.nombre) || S.user.email || "";
    add(box, h("span", { class: "p-who" }, h("span", { class: "p-who__name" }, who), S.profile ? h("span", { class: "p-role" }, roleLabel(S.profile.rol)) : null));
    add(box, btn(t("logout"), () => au.signOut(S.fb.auth)));
  }
}
function screen(...kids) {
  const m = clear($("#p-main"));
  append(m, kids);
  renderHeader();
  return m;
}
function renderFatal(msg, retry) {
  S.view = S.view === "boot" ? "auth" : S.view;
  screen(h("section", { class: "p-card p-auth" }, h("h1", { class: "p-title" }, "Ups"), h("p", null, msg), retry ? btn(t("retry"), retry, "btn--primary") : null));
}

/* ---------- Sin configurar ---------- */
function renderSetup() {
  S.view = "setup";
  screen(h("section", { class: "p-card p-setup" },
    h("h1", { class: "p-title" }, "Falta conectar Firebase"),
    h("p", null, "El portal está listo, pero todavía no tiene la configuración de tu proyecto de Firebase. Es un paso de una sola vez:"),
    h("ol", { class: "p-steps" },
      h("li", null, "Crea (o reutiliza) un proyecto en la consola de Firebase."),
      h("li", null, "Activa el inicio de sesión con correo y contraseña (Authentication)."),
      h("li", null, "Crea la base de datos Cloud Firestore en una región cercana (por ejemplo southamerica-east1)."),
      h("li", null, "Pega la configuración web en el archivo js/firebase-config.js y publica el sitio."),
      h("li", null, "Publica las reglas: copia el archivo firestore.rules en Firestore → Reglas."),
      h("li", null, "Crea tu cuenta y conviértela en administradora desde la consola.")),
    h("p", null, "Guía completa paso a paso, sin necesidad de programar: ", h("a", { href: DOCS_URL, target: "_blank", rel: "noopener" }, "docs/BACKEND.md"), "."),
    h("p", { class: "p-muted" }, "Mientras tanto, el sitio público y el conserje siguen funcionando igual que hoy.")));
}

/* ==========================================================================
   Acceso: ingresar, solicitar acceso, recuperar contraseña, estados
   ========================================================================== */
function renderAuth(mode) {
  S.view = "auth"; S.authMode = mode || "login";
  if (S.authMode === "signup") return renderSignup();
  if (S.authMode === "reset") return renderReset();
  const f = formFields([
    { name: "email", label: t("email"), type: "email", required: true, max: 200, autocomplete: "username" },
    { name: "password", label: t("password"), type: "password", required: true, max: 200, autocomplete: "current-password" }
  ]);
  const form = mkForm(async () => {
    const v = f.get();
    await au.signInWithEmailAndPassword(S.fb.auth, v.email, v.password);
  }, f.el, h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary btn--block" }, t("login_btn"))));
  const site = S.lang === "en" ? "/en/#experiencias" : "/#experiencias";
  screen(h("aside", { class: "p-traveler" }, h("p", null, h("b", null, t("traveler_title")), " ", t("traveler_body")),
      h("a", { class: "btn btn--primary btn--sm", href: site }, t("traveler_btn"))),
    h("section", { class: "p-card p-auth", "aria-labelledby": "p-auth-h" },
    h("h1", { class: "p-title", id: "p-auth-h" }, t("login_title")),
    h("p", { class: "p-sub" }, t("login_sub")),
    form,
    h("p", { class: "p-auth__links" }, linkBtn(t("forgot"), () => { renderAuth("reset"); focusHeading(); })),
    h("hr", { class: "p-sep" }),
    h("p", null, t("no_account"), " ", linkBtn(t("request_access"), () => { renderAuth("signup"); focusHeading(); })),
    h("p", { class: "p-muted" }, t("staff_note"))));
}

function renderReset() {
  const f = formFields([{ name: "email", label: t("email"), type: "email", required: true, max: 200, autocomplete: "email" }]);
  const done = h("p", { class: "p-note", role: "status" });
  const form = mkForm(async () => {
    try { await au.sendPasswordResetEmail(S.fb.auth, f.get().email); }
    catch (e) { if (e.code !== "auth/user-not-found") throw e; }
    done.textContent = t("reset_done"); // mismo mensaje exista o no la cuenta (no revela correos)
  }, f.el, h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, t("reset_btn"))));
  screen(h("section", { class: "p-card p-auth" },
    h("h1", { class: "p-title" }, t("reset_title")), h("p", { class: "p-sub" }, t("reset_sub")), form, done,
    h("p", { class: "p-auth__links" }, linkBtn(t("back_login"), () => { renderAuth("login"); focusHeading(); }))));
}

function agencyFields() {
  return formFields([
    { name: "agencia", label: t("agency_name"), required: true, max: 160, autocomplete: "organization" },
    { name: "nit", label: t("nit"), required: true, max: 40, hint: t("nit_hint") },
    { name: "pais", label: t("country"), required: true, max: 60, autocomplete: "country-name" },
    { name: "ciudad", label: t("city"), max: 80, autocomplete: "address-level2" },
    { name: "contacto", label: t("contact"), max: 120 },
    { name: "telefono", label: t("phone"), type: "tel", max: 40, autocomplete: "tel" },
    { name: "web", label: t("website"), type: "url", max: 200, placeholder: "https://" },
    { name: "mensaje", label: t("message"), type: "textarea", max: 1000, full: true }
  ]);
}
function consentBlock(textKey) {
  const input = h("input", { type: "checkbox", id: uid("consent"), required: true });
  return {
    input,
    el: h("div", { class: "p-consent" },
      h("div", { class: "p-field p-field--check" }, input, h("label", { for: input.id }, t(textKey), h("span", { class: "p-req", "aria-hidden": "true" }, " *"))),
      PRIVACY_URL ? h("p", { class: "p-hint" }, h("a", { href: PRIVACY_URL, target: "_blank", rel: "noopener" }, t("privacy_link"))) : null)
  };
}
function solicitudFrom(a, nombre) {
  return {
    agencia: a.agencia, nit: a.nit, pais: a.pais, ciudad: a.ciudad, contacto: a.contacto || nombre,
    telefono: a.telefono, web: a.web, mensaje: a.mensaje, aceptaDatos: true, versionPolitica: CONSENT_VERSION, idioma: S.lang
  };
}
// Aviso a info@ de una solicitud nueva. Cada enlace abre el portal, que pide entrar como administrador y confirmar.
function emailAccessRequest(userId, email, v, s) {
  if (!REQUESTS_EMAIL) return;
  const go = act => `${PORTAL_URL}#${act}-${userId}`;
  const body = {
    _subject: "🔑 Portal: solicitud de acceso — " + (s.agencia || v.nombre || email),
    _template: "table", _replyto: email,
    "Agencia": s.agencia || "", "NIT / Tax ID": s.nit || "", "País y ciudad": [s.pais, s.ciudad].filter(Boolean).join(" · "),
    "Persona": v.nombre || "", "Correo": email, "WhatsApp": v.whatsapp || "", "Teléfono": s.telefono || "", "Web": s.web || "",
    "Mensaje": s.mensaje || "", "Idioma": s.idioma || "",
    "✅ Aprobar como DMC": go("aprobar-dmc"),
    "✅ Aprobar como asesor del equipo": go("aprobar-asesor"),
    "⛔ Rechazar": go("rechazar"),
    "Todas las solicitudes": PORTAL_URL + "#usuarios",
    "Cómo funciona": "Abre el enlace que corresponda: el portal te pide entrar con tu cuenta de administrador y confirmar con un clic. Sin esa sesión, el enlace no cambia nada.",
    "Autorización de datos": `Sí (política versión ${s.versionPolitica || CONSENT_VERSION})`
  };
  try {
    fetch(REQUESTS_EMAIL, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  } catch (e) { /* el aviso es un extra: la solicitud ya quedó guardada */ }
}

function renderSignup() {
  const fy = formFields([
    { name: "nombre", label: t("name"), required: true, max: 120, autocomplete: "name" },
    { name: "email", label: t("email"), type: "email", required: true, max: 200, autocomplete: "email" },
    { name: "password", label: t("password_new"), type: "password", required: true, max: 200, hint: t("password_hint"), autocomplete: "new-password", attrs: { minlength: 8 } },
    { name: "password2", label: t("password_confirm"), type: "password", required: true, max: 200, autocomplete: "new-password", attrs: { minlength: 8 } },
    { name: "whatsapp", label: t("whatsapp"), type: "tel", max: 30, autocomplete: "tel", placeholder: "+57 300 000 0000" }
  ]);
  const fa = agencyFields();
  const consent = consentBlock("consent_signup");
  const form = mkForm(async () => {
    const v = fy.get(), a = fa.get();
    if (v.password.length < 8) throw userErr(t("pw_short"));
    if (v.password !== v.password2) throw userErr(t("pw_mismatch"));
    if (!consent.input.checked) throw userErr(t("consent_required"));
    S.signingUp = true;
    let cred;
    try { cred = await au.createUserWithEmailAndPassword(S.fb.auth, v.email, v.password); }
    catch (e) { S.signingUp = false; throw e; }
    S.user = cred.user;
    let failure = null;
    const sol = solicitudFrom(a, v.nombre);
    try {
      await fs.setDoc(dref("users", cred.user.uid), {
        email: cred.user.email, nombre: v.nombre, rol: "dmc", estado: "pendiente", dmcId: null,
        whatsapp: v.whatsapp, idiomas: [S.lang], solicitud: sol, creado: ts(), actualizado: ts()
      });
      emailAccessRequest(cred.user.uid, cred.user.email, v, sol);
    } catch (e) { failure = e; }
    au.sendEmailVerification(cred.user).catch(e => notify(errMsg(e), "error"));   // si Firebase no pudo enviarlo, se avisa
    S.signingUp = false;
    await enter(); // sin perfil (si falló) muestra «Completa tu solicitud»
    focusHeading();
    if (failure) throw failure;
  },
  h("p", { class: "p-muted" }, t("required_note")),
  group(t("sec_you"), fy.el), group(t("sec_agency"), fa.el), consent.el,
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, t("signup_btn"))));
  screen(h("section", { class: "p-card p-auth p-auth--wide" },
    h("h1", { class: "p-title" }, t("signup_title")), h("p", { class: "p-sub" }, t("signup_sub")), form,
    h("p", { class: "p-auth__links" }, linkBtn(t("back_login"), () => { renderAuth("login"); focusHeading(); }))));
}

// Cuenta creada pero sin perfil (p. ej. se cortó la conexión al registrarse)
function renderCompleteRequest() {
  S.view = "auth"; S.authMode = "complete";
  const fy = formFields([
    { name: "nombre", label: t("name"), required: true, max: 120, autocomplete: "name" },
    { name: "whatsapp", label: t("whatsapp"), type: "tel", max: 30, autocomplete: "tel" }
  ]);
  const fa = agencyFields();
  const consent = consentBlock("consent_signup");
  const form = mkForm(async () => {
    const v = fy.get(), a = fa.get();
    if (!consent.input.checked) throw userErr(t("consent_required"));
    const sol = solicitudFrom(a, v.nombre);
    await fs.setDoc(dref("users", S.user.uid), {
      email: S.user.email, nombre: v.nombre, rol: "dmc", estado: "pendiente", dmcId: null,
      whatsapp: v.whatsapp, idiomas: [S.lang], solicitud: sol, creado: ts(), actualizado: ts()
    });
    emailAccessRequest(S.user.uid, S.user.email, v, sol);
    await enter();
    focusHeading();
  }, group(t("sec_you"), fy.el), group(t("sec_agency"), fa.el), consent.el,
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, t("signup_btn"))));
  screen(h("section", { class: "p-card p-auth p-auth--wide" },
    h("h1", { class: "p-title" }, t("complete_title")), h("p", { class: "p-sub" }, t("complete_sub")),
    h("p", { class: "p-muted" }, S.user.email), form));
}

function renderStatus(kind) {
  S.view = "auth"; S.authMode = "status-" + kind;
  const wa = S.jenny && S.jenny.contacto && S.jenny.contacto.whatsapp;
  const agency = S.profile && S.profile.solicitud ? S.profile.solicitud.agencia : "";
  const titles = { pending: ["pending_title", "pending_body"], blocked: ["blocked_title", "blocked_body"], noagency: ["noagency_title", "noagency_body"], verify: ["verify_title", "verify_body"] };
  const [tk, bk] = titles[kind] || titles.pending;
  const verify = (kind === "pending" || kind === "verify") && S.user && !S.user.emailVerified;
  screen(h("section", { class: "p-card p-auth p-status" },
    h("h1", { class: "p-title" }, t(tk)),
    h("p", null, t(bk)),
    agency ? h("p", { class: "p-muted" }, t("agency") + ": " + agency) : null,
    verify ? h("p", { class: "p-note" }, t("verify_note"), " ", h("b", null, (S.user && S.user.email) || ""), " ", linkBtn(t("verify_resend"), e => busy(e.currentTarget, async () => { await au.sendEmailVerification(S.user); notify(t("verify_sent")); }))) : null,
    h("div", { class: "p-form-actions" },
      btn(t(kind === "verify" ? "verify_done" : "check_again"), e => busy(e.currentTarget, async () => {
        S.dmc = null;
        await au.reload(S.user).catch(() => {});
        // Pide un token nuevo para que las reglas vean email_verified = true
        if (S.user.emailVerified) await au.getIdToken(S.user, true).catch(() => {});
        await enter();
      }), "btn--primary"),
      wa ? h("a", { class: "btn btn--wa btn--sm", href: waLink(wa, t("wa_pending_msg") + (agency || S.user.email)), target: "_blank", rel: "noopener" }, t("wa_us")) : null)));
}

/* ==========================================================================
   Pestañas accesibles (role=tablist, flechas, Inicio/Fin)
   ========================================================================== */
function mountTabs(host, defs, handlers, ariaLabel) {
  const current = defs.some(d => d.id === S.tab) ? S.tab : defs[0].id;
  const nav = h("div", { class: "p-tabs", role: "tablist", "aria-label": ariaLabel || "Secciones" });
  const panel = h("section", { class: "p-panel", role: "tabpanel", id: "p-panel", tabindex: "-1" });
  const btns = defs.map(d => h("button", {
    type: "button", role: "tab", id: "tab-" + d.id, class: "p-tab", "aria-controls": "p-panel", "aria-selected": "false", tabindex: "-1",
    onclick: () => choose(d.id, true)
  }, d.label, d.count ? h("span", { class: "p-tab__count", "aria-label": `(${d.count})` }, String(d.count)) : null));
  nav.addEventListener("keydown", e => {
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % btns.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + btns.length) % btns.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = btns.length - 1;
    if (j != null) { e.preventDefault(); btns[j].focus(); choose(defs[j].id, false); }
  });
  append(nav, btns);
  add(host, nav, panel);
  function choose(id, fromClick) {
    S.tab = id;
    btns.forEach((b, k) => { const on = defs[k].id === id; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    panel.setAttribute("aria-labelledby", "tab-" + id);
    const pm = $("#p-main"); if (pm) pm.classList.remove("p-main--wide");
    clear(panel);
    const view = h("div", { class: "p-view" });
    add(panel, view);
    Promise.resolve().then(() => handlers[id](view)).catch(e => { clear(view); add(view, errorBox(e, () => choose(id))); });
    if (fromClick) { const b = btns[defs.findIndex(d => d.id === id)]; if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "nearest" }); }
  }
  choose(current, false);
  return { select: (id, focus) => { choose(id, false); if (focus) { const b = $("#tab-" + id); if (b) b.focus(); } } };
}

/* ==========================================================================
   VISTA AGENCIA / DMC
   ========================================================================== */
function renderDmcApp() {
  if (S.approval) { S.approval = null; clearHash(); }
  document.documentElement.lang = L();
  const main = screen(h("div", { class: "p-hello" },
    h("h1", { class: "p-title" }, t("hello", first(S.profile.nombre))),
    h("p", { class: "p-sub" }, t("agency") + ": " + (S.dmc.nombre || S.profile.dmcId))));
  S.tabsApi = mountTabs(main, [
    { id: "portafolio", label: t("tab_portfolio") }, { id: "tarifas", label: t("tab_rates") }, { id: "solicitar", label: t("tab_request") },
    { id: "mis", label: t("tab_mine") }, { id: "cuenta", label: t("tab_account") }
  ], { portafolio: dmcPortafolio, tarifas: dmcTarifas, solicitar: dmcSolicitar, mis: dmcMine, cuenta: myAccount });   // «Clientes» se quitó del menú de agencias (22-oct-2026); dmcClientes queda por si se vuelve a activar
}

// Traslados, suplementos y guianza (ET-/SU-) y hoteles (HT-): filas sin tour del catálogo
const isService = r => !r.tour_id && /^(ET|SU|HT)-/.test(r.codigo || "");
const isHotel = r => /^HT-/.test(r.codigo || "");
const ROOMS = { es: ["", "Sencilla", "Doble", "Triple", "Cuádruple"], en: ["", "Single", "Double", "Triple", "Quad"] };
// Tipo de cliente: «dmc» (tarifario DMC) o «nac» (Mercado Nacional y Mayoristas). Lo define el equipo en el DMC.
// El equipo, en la vista previa, elige cuál ver (S.pfTier). Las reglas de Firestore impiden leer el tarifario del otro tipo.
const NAC = "_nac";
const tierOf = () => (S.view === "staff" ? (S.pfTier === "nac" ? "nac" : "dmc") : (S.dmc && S.dmc.tipo === "nac" ? "nac" : "dmc"));
async function loadDmcRates(year) {
  // Una sola lectura por año y sesión (plan gratis de Firebase: cada consulta completa lee ~1.500 documentos)
  const key = "rates_" + year + "_" + (S.profile && S.profile.dmcId) + "_" + tierOf();
  if (S.cache[key]) return S.cache[key];
  const res = await loadDmcRatesFresh(year);
  S.cache[key] = res;
  return res;
}
async function loadDmcRatesFresh(year) {
  const mine = S.profile && S.profile.dmcId;      // el equipo no tiene DMC: sin tarifas especiales
  const one = async y => {
    const pk = await loadPack(y);
    if (pk) {
      const spe = mine ? await list(fs.query(col("tarifas"), fs.where("vigencia", "==", y), fs.where("dmcId", "==", mine))) : [];
      return { rates: mergeTarifas(pk.rates, spe), cond: pk.cond };
    }
    return oneQuery(y);
  };
  const oneQuery = y => Promise.all([
    list(fs.query(col("tarifas"), fs.where("vigencia", "==", y), fs.where("dmcId", "==", tierOf() === "nac" ? NAC : null))),
    mine ? list(fs.query(col("tarifas"), fs.where("vigencia", "==", y), fs.where("dmcId", "==", mine))) : Promise.resolve([]),
    list(fs.query(col("condiciones"), fs.where("vigencia", "==", y)))
  ]).then(([gen, spe, cond]) => ({ rates: mergeTarifas(gen, spe), cond }));
  const cur = await one(year);
  let pending = [];
  if (year === catalogYear()) {
    // Las tarifas y condiciones del año anterior rigen para los tours del catálogo que aún no tienen las del año
    const prev = S.vigencias.filter(y => y < year)[0];
    if (prev != null) {
      const old = await one(prev);
      // Por experiencia (tour_id); el código solo si la fila no trae tour_id (un retirado nunca se confunde con uno nuevo)
      const tid = r => (r.tour_id ? (S.tours.byId.get(r.tour_id) || {}).id_web : (tourOf(r) || {}).id_web);
      const have = new Set(cur.rates.map(tid).filter(Boolean));
      old.rates.filter(r => tid(r) && !have.has(tid(r))).forEach(r => cur.rates.push(Object.assign({}, r, { _de: prev })));
      const haveSrv = new Set(cur.rates.filter(isService).map(r => r.codigo));
      old.rates.filter(r => isService(r) && !haveSrv.has(r.codigo)).forEach(r => cur.rates.push(Object.assign({}, r, { _de: prev })));
      const hc = new Set(cur.cond.map(c => c.tour_id));
      old.cond.filter(c => !hc.has(c.tour_id)).forEach(c => cur.cond.push(Object.assign({}, c, { _de: prev })));
    }
    // Lo que no tiene tarifa en ningún año: fichas nuevas (tarifa en preparación)
    const con = new Set(cur.rates.map(r => (tourOf(r) || {}).id_web).filter(Boolean));
    pending = S.tours.list.filter(x => !con.has(x.id_web));
  }
  return { rates: cur.rates, cond: new Map(cur.cond.map(c => [c.tour_id, c])), pending };
}
const paxText = r => (r.pax_desde === r.pax_hasta ? t("pax_one", r.pax_desde) : t("pax_range", r.pax_desde, r.pax_hasta));
const rateKey = r => r.tour_id || r.codigo;

async function dmcTarifas(view) {
  add(view, loadingBox());
  await S.jennyP;
  if (L() !== "es") await loadI18nTours();
  if (!S.vigencias.length) await loadVigencias();
  clear(view);
  const years = S.vigencias.length ? S.vigencias : [new Date().getFullYear()];
  const ySel = selectEl(years.map(y => [String(y), String(y)]), years[0], { id: uid("y") });
  const tSel = selectEl([["", t("all_seasons")]], "", { id: uid("tmp") });
  const cSel = selectEl([["", t("all_cats")]].concat(Object.keys(CATS).map(k => [k, catName(k)])), "", { id: uid("cat") });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const sep = sepSelect();
  const exportBtn = btn(t("export_csv"), null);
  const count = h("p", { class: "p-count", role: "status" });
  const out = h("div", { class: "p-tours" });
  const gIn = h("input", { type: "search", id: uid("geo"), autocomplete: "off", placeholder: t("geo_ph"), value: (S.hotelGeo && S.hotelGeo.name) || "" });
  const gSort = h("input", { type: "checkbox", id: uid("gs"), checked: !!S.geoSort });
  const gMsg = h("p", { class: "p-muted p-geo__msg", role: "status" }, t("geo_note"));
  const gBtn = btn(t("geo_btn"), () => busy(gBtn, async () => {
    const q = gIn.value.trim(); if (!q) { S.hotelGeo = null; draw(); return; }
    const g = await geocodeHotel(q);
    if (!g) { gMsg.textContent = t("geo_none"); return; }
    S.hotelGeo = g; gMsg.textContent = t("geo_note"); draw();
  }), "btn--brand");
  gSort.addEventListener("change", () => { S.geoSort = gSort.checked; draw(); });
  add(view, 
    h("p", { class: "p-note" }, t("rates_note")),
    L() !== "es" && S.i18n ? h("p", { class: "p-muted" }, t("tr_note")) : null,
    h("div", { class: "p-toolbar" }, labeled(t("year"), ySel), labeled(t("season"), tSel), labeled(t("cat_label"), cSel), labeled(t("search"), q, "p-grow"), labeled(t("sep"), sep), h("div", { class: "p-toolbar__end" }, exportBtn)),
    h("div", { class: "p-card p-geo__bar" }, h("h3", { class: "p-h3" }, t("geo_t")),
      h("div", { class: "p-toolbar" }, labeled(t("geo_ph").split(" (")[0], gIn, "p-grow"), h("div", { class: "p-toolbar__end" }, gBtn)),
      checkField(t("geo_sort"), gSort), gMsg),
    count, out);
  let data = { rates: [], cond: new Map(), pending: [] }, shown = [];
  async function load() {
    clear(out); add(out, loadingBox()); count.textContent = "";
    await Promise.all([loadGeo(), loadPfOrder()]);
    try { data = await loadDmcRates(Number(ySel.value)); }
    catch (e) { clear(out); add(out, errorBox(e, load)); return; }
    const seasons = [...new Set(data.rates.map(r => r.temporada).filter(Boolean))].sort(collate);
    const keep = tSel.value;
    clear(tSel); add(tSel, h("option", { value: "" }, t("all_seasons")), seasons.map(s => h("option", { value: s }, s)));
    tSel.value = seasons.includes(keep) ? keep : "";
    draw();
  }
  function draw() {
    const term = norm(q.value), season = tSel.value, cat = cSel.value;
    shown = data.rates.filter(r => (!season || r.temporada === season) && (!cat || rateCat(r) === cat)
      && (!term || norm([r.nombre, r.codigo, r.tour_id, tourText(tourOf(r), "nombre")].join(" ")).includes(term)));
    clear(out);
    const pend = season ? [] : data.pending.filter(x => (!cat || x.cat === cat) && (!term || norm([x.nombre, x.codigo, x.id_web, tourText(x, "nombre")].join(" ")).includes(term)));
    const pendBox = pend.length ? h("section", { class: "p-pending" },
      h("h3", { class: "p-h3" }, t("pending_t", ySel.value, pend.length)), h("p", { class: "p-muted" }, t("pending_note", ySel.value)),
      h("div", { class: "p-tours" }, (S.geoSort && S.hotelGeo ? pend.slice().sort((a, b) => ((geoNearest(a, splitNotes((data.cond.get(a.id_web) || {}).notas_agencia)) || { km: 1e9 }).km) - ((geoNearest(b, splitNotes((data.cond.get(b.id_web) || {}).notas_agencia)) || { km: 1e9 }).km)) : pend.slice().sort((a, b) => pfPos(a) - pfPos(b))).map(x => pendingCard(x, data.cond)))) : null;
    if (!data.rates.length) { count.textContent = ""; add(out, data.pending.length ? null : emptyBox(t("no_rates", ySel.value)), pendBox); return; }
    if (!shown.length) { count.textContent = ""; add(out, pendBox || emptyBox(t("no_match"))); return; }
    const groups = new Map();
    shown.forEach(r => { const k = rateKey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    count.textContent = t("rates_count", shown.length, groups.size);
    const nameOf = rows => tourText(tourOf(rows[0]), "nombre") || rows[0].nombre;
    // Experiencias en el orden del índice del portafolio y, al final, traslados y servicios por código
    const kind = r => (isHotel(r) ? 2 : isService(r) ? 1 : 0);   // experiencias, luego traslados y servicios, luego hoteles
    const near = rows => { if (!S.geoSort || !S.hotelGeo) return 0; const tr = tourOf(rows[0]); const g = tr && geoNearest(tr, splitNotes((data.cond.get(tr.id_web) || {}).notas_agencia)); return g ? g.km : 1e9; };
    [...groups.values()].sort((a, b) => (kind(a[0]) - kind(b[0])) || (near(a) - near(b)) || (kind(a[0]) === 1 ? collate(a[0].codigo, b[0].codigo) : kind(a[0]) === 0 ? (pfPos(tourOf(a[0])) - pfPos(tourOf(b[0]))) || collate(nameOf(a), nameOf(b)) : collate(nameOf(a), nameOf(b))))
      .forEach(rows => add(out, tourCard(rows, data.cond)));
    if (pendBox) add(out, pendBox);
  }
  ySel.addEventListener("change", load);
  tSel.addEventListener("change", draw);
  cSel.addEventListener("change", draw);
  q.addEventListener("input", debounce(draw, 150));
  exportBtn.addEventListener("click", () => exportDmcCsv(shown, data.cond, Number(ySel.value), sep.value));
  await load();
}

/* ---------- Carga rápida: paquete de tarifas y condiciones por año y tipo de cliente ----------
   Una cuenta lee UN documento (tarifas_pack/{año}_{dmc|nac}) en vez de ~1.900 (plan gratis de Firebase: 50.000 lecturas al día).
   Lo arma administración al importar tarifas o condiciones (o con «Actualizar carga rápida» en Tarifas). */
const packId = (y, tipo) => `${y}_${tipo}`;
async function loadPack(y) {
  try {
    const snap = await fs.getDoc(dref("tarifas_pack", packId(y, tierOf())));
    if (!snap.exists()) return null;
    const P = JSON.parse(snap.data().datos || "null");
    if (!P || P.v !== 1) return null;
    const dmcId = tierOf() === "nac" ? NAC : null, rates = [];
    for (const [codigo, tour_id, nombre, filas] of P.g) for (const [temporada, pax_desde, pax_hasta, moneda, tarifa_neta, notas] of filas)
      rates.push({ vigencia: y, codigo, tour_id, nombre, temporada, pax_desde, pax_hasta, moneda, tarifa_neta, dmcId, notas: notas || "" });
    const cond = P.c.map(([tour_id, codigo, nombre, notas_agencia]) => ({ vigencia: y, tour_id, codigo, nombre, notas_agencia }));
    return { rates, cond };
  } catch (e) { return null; }       // sin paquete o reglas sin publicar: consultas normales
}
async function rebuildPacks(years, onProgress) {
  let n = 0;
  for (const y of years) {
    if (onProgress) onProgress(`Armando la carga rápida ${y}…`);
    const [tar, cond] = await Promise.all([list(fs.query(col("tarifas"), fs.where("vigencia", "==", y))), list(fs.query(col("condiciones"), fs.where("vigencia", "==", y)))]);
    const c = cond.map(x => [x.tour_id, x.codigo || "", x.nombre || "", x.notas_agencia || []]);
    for (const tipo of ["dmc", "nac"]) {
      const rows = tar.filter(r => (tipo === "nac" ? r.dmcId === NAC : r.dmcId == null));
      const g = new Map();
      rows.forEach(r => { const k = (r.tour_id || "") + "|" + r.codigo; if (!g.has(k)) g.set(k, [r.codigo, r.tour_id || "", r.nombre, []]); g.get(k)[3].push([r.temporada || "", r.pax_desde, r.pax_hasta, r.moneda, r.tarifa_neta, r.notas || ""]); });
      const datos = JSON.stringify({ v: 1, g: [...g.values()], c });
      if (datos.length > 1000000) throw userErr(`Las tarifas ${y} (${tipo}) no caben en un paquete; la carga rápida no se actualizó.`);
      await fs.setDoc(dref("tarifas_pack", packId(y, tipo)), { vigencia: y, tipo, filas: rows.length, datos, actualizado: ts() });
      n++;
    }
  }
  Object.keys(S.cache).forEach(k => { if (/^rates_/.test(k)) delete S.cache[k]; });
  return n;
}
// Importar no falla si la carga rápida no se pudo armar (p. ej. reglas sin publicar): queda el método de siempre
async function rebuildPacksSafe(years, progress) {
  try { await rebuildPacks(years, m => { if (progress) progress.textContent = m; }); return ""; }
  catch (e) { return " (La carga rápida no se actualizó: " + errMsg(e) + ")"; }
}

/* ---------- Videos privados del portafolio (solo DMC): colección medios, en partes de ≤ 900.000 caracteres ---------- */
async function loadVideo(id, partes) {
  const docs = await Promise.all([...Array(partes)].map((_, i) => fs.getDoc(dref("medios", `${id}-${i}`))));
  if (docs.some(d => !d.exists())) throw new Error("video incompleto");
  const b64 = docs.map(d => d.data().datos || "").join("");
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: (docs[0].data().tipo) || "video/mp4" });
}

/* ---------- Portafolio B2B 2027 (kit de ET): mapa, experiencias, arma tu ruta, transporte, kit de venta, condiciones ----------
   Los textos públicos vienen de data/portafolio.json; aquí se le pasan las tarifas del tipo de cliente, las fichas
   técnicas «solo agencias» (condiciones) y los datos privados del portafolio (portafolio/{año}: fincas, hoteles aliados…). */
async function loadPortafolioPriv(year) {
  const key = "pf_" + year;
  if (key in S.cache) return S.cache[key];
  let v = null;
  try { const snap = await fs.getDoc(dref("portafolio", String(year))); if (snap.exists()) v = JSON.parse(snap.data().datos || "null"); }
  catch (e) { v = null; }   // sin importar o reglas sin publicar: el portafolio funciona sin fincas ni hoteles aliados
  S.cache[key] = v;
  return v;
}
// Medios de pago oficiales (los mismos de la web y de Jenny: data/jenny.json → contacto.pagos)
function pagosOficiales() {
  const p = S.jenny && S.jenny.contacto && S.jenny.contacto.pagos; if (!p) return [];
  const en = L() === "en";
  return [p.titular && (en ? "Account holder: " : "Titular: ") + p.titular, p.bancolombia_ahorros && (en ? "Bancolombia savings account " : "Cuenta de ahorros Bancolombia ") + p.bancolombia_ahorros,
    p.nequi_daviplata && "Nequi / Daviplata: " + p.nequi_daviplata, p.tarjeta_wompi && (en ? "Credit or debit card (payment link): " : "Tarjeta de crédito o débito (enlace de pago): ") + p.tarjeta_wompi].filter(Boolean);
}
async function dmcPortafolio(view) {
  add(view, loadingBox());
  await S.jennyP;
  if (!S.vigencias.length) await loadVigencias();
  const year = catalogYear() || S.vigencias[0] || new Date().getFullYear();
  let data, priv, mod;
  const modP = import("./portafolio.js").then(m => m.preload(L()).then(() => m));
  try { [data, priv, mod] = await Promise.all([loadDmcRates(year), loadPortafolioPriv(year), modP]); }
  catch (e) { clear(view); add(view, errorBox(e, () => { clear(view); dmcPortafolio(view); })); return; }
  const pm = $("#p-main"); if (pm) pm.classList.add("p-main--wide");
  clear(view);
  const host = h("div", { class: "p-pf" });
  add(view, host);
  const { mountPortafolio } = mod;
  const staff = S.view === "staff";
  await mountPortafolio(host, {
    lang: L(), tier: tierOf(), staff,
    agency: staff ? "Vista previa del equipo" : ((S.dmc && S.dmc.nombre) || ""),
    rates: data.rates, cond: data.cond, priv, splitNotes, empresa: EMPRESA, loadVideo, pagos: pagosOficiales(),
    // Kit de venta: logo y nombre de la agencia guardados en kits/{uid} (solo el dueño los lee y los cambia)
    who: S.user.uid,
    kitLoad: () => fs.getDoc(dref("kits", S.user.uid)).then(s => (s.exists() ? s.data() : null)),
    kitSave: k => fs.setDoc(dref("kits", S.user.uid), Object.assign({}, k, { actualizado: ts() })),
    // Ruta o ficha → formulario «Reservar» con los tours (y pasajeros, hotel e itinerario) ya puestos
    onRequest: staff ? null : pre => { S.preset = pre; S.tabsApi.select("solicitar", true); }
  });
}

/* ---------- Nosotros: institucional, impacto, casos, equipo y flota (se muestra en Portafolio → Condiciones y Transporte) ----------
   Solo información comercial para agencias (sin datos internos: propiedad de cada vehículo, modelos ni municipios de los puntos). */
const EMPRESA = {
 "es": {
  "title": "Espontáneos Travel · Operador del Paisaje Cultural Cafetero Colombiano",
  "pillars": [
   [
    "Quiénes somos",
    "Somos un operador del Paisaje Cultural Cafetero Colombiano (PCCC): diseñamos y operamos experiencias que convierten la riqueza natural y cultural de la región en itinerarios de alto valor para nuestros socios comerciales en Colombia y el mundo."
   ],
   [
    "Cómo trabajamos",
    "Nuestra gestión B2B se basa en precisión logística, transparencia operativa y estándares de servicio rigurosos. Somos la extensión en territorio de cada agencia aliada y operamos en marca blanca: monitoreo en tiempo real, personal bilingüe capacitado y flota propia y aliada para cumplir cada itinerario."
   ],
   [
    "Qué hacemos",
    "Creamos rutas exclusivas, desde el turismo de naturaleza hasta vivencias comunitarias de inmersión profunda. Co-creamos cada experiencia con actores locales para que el destino sea un motor de desarrollo sostenible."
   ]
  ],
  "impact_t": "Convenciones de impacto",
  "impact_note": "Cada ficha técnica muestra su impacto principal con uno de estos íconos.",
  "impacts": [
   [
    "🌿",
    "Impacto ambiental",
    "Acciones concretas de reforestación, siembra de árboles nativos y medición y compensación de la huella de carbono según el número de pasajeros atendidos."
   ],
   [
    "🤝",
    "Impacto sociocultural",
    "Alianzas directas con familias locales, dignificación del trabajo artesanal y preservación del patrimonio inmaterial del Eje Cafetero, con capacitación, apoyo al desarrollo de producto y diseño de rutas."
   ],
   [
    "💰",
    "Impacto económico",
    "Comercio justo con retribución directa a las comunidades anfitrionas, sin intermediación innecesaria, y un catálogo de productos locales que incentiva la compra de los visitantes."
   ]
  ],
  "cases_t": "Casos de éxito e impacto socio comunitario",
  "cases_sub": "Reflejando el compromiso social corporativo de Espontáneos Travel.",
  "cases": [
   [
    "Red de artesanas de Armenia (más de 20 familias)",
    [
     "Población beneficiada: más de 20 familias y mujeres artesanas cabeza de hogar.",
     "Co-creación de producto: diseñamos con ellas el Taller de Aves, donde el visitante elabora junto a las artesanas piezas de la avifauna local.",
     "Cadena de valor B2B: compra directa de artesanías como kits de bienvenida para pasajeros VIP y regalos para nuestros clientes.",
     "Proyección internacional: un fondo de retribución por cada pasajero atendido apoya su participación en la principal feria de artesanías de Europa (2027), con la campaña «10.000 Colibríes por un Sueño»."
    ]
   ],
   [
    "Co-creación y elevación de estándares comunitarios",
    [
     "Asistencia técnica y capacitación en guianza especializada, bioseguridad, atención al cliente internacional y estructuración de costos.",
     "🐝 Tour de las Abejas: interpretación ambiental y meliponicultura.",
     "🍫 Tour del Cacao: transformación artesanal y cata de origen.",
     "☕ Ruta cafetera tradicional (Buenavista y Pijao): fincas de arquitectura tradicional y cafés de alta especialidad."
    ]
   ],
   [
    "Inversión social directa e infraestructura rural",
    [
     "Donación de kits escolares y vestimenta para niños de fundaciones y hogares de paso de la región.",
     "Gestión e instalación de mobiliario escolar (pupitres) en escuelas rurales de nuestras zonas de operación.",
     "Consecución de recursos con aliados para fortalecer proyectos rurales de turismo."
    ]
   ]
  ],
  "team_t": "Equipo de trabajo y protocolos de operación",
  "drivers_t": "Conductores", "drivers": ["Javier Bedoya", "Giovanni Camacho"], "drivers_note": "",
  "protocols": [
   [
    "Flota vehicular",
    "unidades con monitoreo satelital, aire acondicionado, botiquín de primeros auxilios e inspección mecánica bimestral."
   ],
   [
    "Conductores especializados",
    "personal propio capacitado en conducción defensiva y atención al cliente VIP."
   ],
   [
    "Red de guías profesionales",
    "guías locales certificados (RNT), bilingües y con capacitación continua en primeros auxilios."
   ],
   [
    "Jornadas de alineación",
    "evaluaciones semestrales con el equipo de campo para estandarizar guiones, bioseguridad y manejo de contingencias."
   ]
  ],
  "fleet_t": "Nuestra flota",
  "fleet_sub": "Capacidad referencial de vehículos habilitados para servicio especial. Seguridad · comodidad · confianza.",
  "fleet_cols": [
   "Vehículo",
   "Capacidad recomendada",
   "Capacidad máxima",
   "Equipaje referencial",
   "Uso ideal"
  ],
  "fleet": [
   [
    "Camioneta tipo Duster",
    "1 a 2 pasajeros",
    "2 pasajeros",
    "Hasta 2 maletas grandes + equipaje de mano",
    "Traslados privados, parejas y viajeros con poco equipaje"
   ],
   [
    "Van Hyundai H1",
    "3 a 5 pasajeros",
    "6 pasajeros",
    "Hasta 5 maletas medianas",
    "Familias y grupos pequeños, traslados y tours"
   ],
   [
    "Van Renault Traffic",
    "5 a 7 pasajeros",
    "7 pasajeros",
    "Hasta 7 maletas medianas",
    "Grupos pequeños, traslados y tours"
   ],
   [
    "Van Renault Master",
    "8 a 12 pasajeros",
    "12 pasajeros",
    "Hasta 12 maletas medianas",
    "Grupos medianos, viajes y tours"
   ],
   [
    "Van Mercedes Sprinter",
    "13 a 15 pasajeros",
    "15 pasajeros",
    "Hasta 15 maletas medianas",
    "Grupos medianos y viajes largos"
   ],
   [
    "Microbús",
    "16 a 19 pasajeros",
    "19 pasajeros",
    "Bodega para el equipaje del grupo",
    "Grupos grandes, excursiones"
   ],
   [
    "Busetón",
    "20 a 30 pasajeros",
    "30 pasajeros",
    "Bodega para grupos y eventos",
    "Grupos numerosos, eventos e incentivos"
   ],
   [
    "Línea Confort Superior · SUV Jetour",
    "1 a 3 pasajeros",
    "5 pasajeros",
    "Hasta 4 maletas medianas",
    "Viajeros VIP, ejecutivos y lunas de miel (bajo solicitud)"
   ]
  ],
  "fleet_cond": [
   "La asignación final depende del número de pasajeros, el equipaje, las características de la ruta y la disponibilidad.",
   "Plus para agencias aliadas: 1 silla para bebé sin costo adicional (solicítala al reservar).",
   "Transporte para personas con movilidad reducida: consultar.",
   "Todos los vehículos cuentan con pólizas y seguros, revisión técnico-mecánica al día, revisiones preventivas, dispositivos de velocidad y seguridad, y conductores profesionales.",
   "Los tours en caminos rurales o de montaña pueden requerir trayectos en Jeep Willys (ver suplementos de cada ficha).",
   "Niños de 0 a 2 años no pagan, pero ocupan silla de bebé en el vehículo; desde los 3 años pagan tarifa."
  ]
 },
 "en": {
  "title": "Espontáneos Travel · Colombian Coffee Cultural Landscape operator",
  "pillars": [
   [
    "Who we are",
    "We are an operator in the Colombian Coffee Cultural Landscape (PCCC): we design and operate experiences that turn the region's natural and cultural wealth into high-value itineraries for our trade partners in Colombia and worldwide."
   ],
   [
    "How we work",
    "Our B2B operation rests on precise logistics, operational transparency and rigorous service standards. We act as each partner agency's team on the ground and operate white-label: real-time monitoring, trained bilingual staff and our own and partner fleet to deliver every itinerary."
   ],
   [
    "What we do",
    "We create exclusive routes, from nature tourism to deeply immersive community experiences. We co-create every experience with local stakeholders so that the destination becomes an engine of sustainable development."
   ]
  ],
  "impact_t": "Impact icons",
  "impact_note": "Each technical sheet shows its main impact with one of these icons.",
  "impacts": [
   [
    "🌿",
    "Environmental impact",
    "Concrete reforestation actions, planting of native trees and measurement and offsetting of the carbon footprint according to the number of travellers served."
   ],
   [
    "🤝",
    "Socio-cultural impact",
    "Direct partnerships with local families, recognition of artisan work and preservation of the Coffee Region's intangible heritage, with training, product development and route design."
   ],
   [
    "💰",
    "Economic impact",
    "Fair trade with direct returns to host communities, without unnecessary intermediaries, and a catalogue of local products that encourages visitors to buy local."
   ]
  ],
  "cases_t": "Success stories and socio-community impact",
  "cases_sub": "Reflecting Espontáneos Travel's corporate social commitment.",
  "cases": [
   [
    "Armenia women artisans' network (20+ families)",
    [
     "Beneficiaries: more than 20 families and women artisans who head their households.",
     "Product co-creation: together we designed the Bird Workshop, where visitors craft pieces of the local birdlife alongside the artisans.",
     "B2B value chain: direct purchase of crafts as welcome kits for VIP travellers and gifts for our clients.",
     "International reach: a fund fed by each traveller served supports their participation in Europe's leading crafts fair (2027), through the campaign “10,000 Hummingbirds for a Dream”."
    ]
   ],
   [
    "Co-creation and higher community standards",
    [
     "Technical assistance and training in specialised guiding, biosafety, international customer service and cost structuring.",
     "🐝 Bee Tour: environmental interpretation and stingless-bee keeping.",
     "🍫 Cacao Tour: artisan processing and single-origin tasting.",
     "☕ Traditional coffee route (Buenavista and Pijao): traditional-architecture farms and specialty coffees."
    ]
   ],
   [
    "Direct social investment and rural infrastructure",
    [
     "Donation of school kits and clothing for children in foundations and shelters in the region.",
     "Sourcing and installation of school furniture (desks) in rural schools where we operate.",
     "Raising resources with partners to strengthen rural tourism projects."
    ]
   ]
  ],
  "team_t": "Our team and operating protocols",
  "drivers_t": "Drivers", "drivers": ["Javier Bedoya", "Giovanni Camacho"], "drivers_note": "",
  "protocols": [
   [
    "Vehicle fleet",
    "units with satellite tracking, air conditioning, first-aid kits and mechanical inspection every two months."
   ],
   [
    "Specialised drivers",
    "in-house staff trained in defensive driving and VIP customer service."
   ],
   [
    "Professional guide network",
    "certified local guides (RNT), bilingual and continuously trained in first aid."
   ],
   [
    "Alignment sessions",
    "six-monthly evaluations with the field team to standardise scripts, biosafety and contingency handling."
   ]
  ],
  "fleet_t": "Our fleet",
  "fleet_sub": "Reference capacity of vehicles licensed for special transport. Safety · comfort · trust.",
  "fleet_cols": [
   "Vehicle",
   "Recommended capacity",
   "Maximum capacity",
   "Reference luggage",
   "Ideal for"
  ],
  "fleet": [
   [
    "Duster-type SUV",
    "1–2 passengers",
    "2 passengers",
    "Up to 2 large suitcases + hand luggage",
    "Private transfers, couples and light travellers"
   ],
   [
    "Hyundai H1 van",
    "3–5 passengers",
    "6 passengers",
    "Up to 5 medium suitcases",
    "Families and small groups, transfers and tours"
   ],
   [
    "Renault Traffic van",
    "5–7 passengers",
    "7 passengers",
    "Up to 7 medium suitcases",
    "Small groups, transfers and tours"
   ],
   [
    "Renault Master van",
    "8–12 passengers",
    "12 passengers",
    "Up to 12 medium suitcases",
    "Medium groups, trips and tours"
   ],
   [
    "Mercedes Sprinter van",
    "13–15 passengers",
    "15 passengers",
    "Up to 15 medium suitcases",
    "Medium groups and long trips"
   ],
   [
    "Minibus",
    "16–19 passengers",
    "19 passengers",
    "Luggage hold for the group",
    "Large groups, excursions"
   ],
   [
    "Midibus",
    "20–30 passengers",
    "30 passengers",
    "Luggage hold for groups and events",
    "Large groups, events and incentives"
   ],
   [
    "Superior Comfort line · Jetour SUV",
    "1–3 passengers",
    "5 passengers",
    "Up to 4 medium suitcases",
    "VIP travellers, executives and honeymooners (on request)"
   ]
  ],
  "fleet_cond": [
   "Final allocation depends on the number of passengers, luggage, route characteristics and availability.",
   "Partner-agency perk: 1 baby seat at no extra cost (request it when booking).",
   "Transport for people with reduced mobility: ask us.",
   "All vehicles carry insurance policies, up-to-date technical inspection, preventive checks, speed and safety devices, and professional drivers.",
   "Tours on rural or mountain roads may require Jeep Willys legs (see each sheet's supplements).",
   "Children aged 0–2 travel free but occupy a baby seat; from age 3 they pay the rate."
  ]
 }
};
/* ---------- Ficha técnica DMC ----------
   Las condiciones que vienen de tools/convertir-fichas-portal.py traen etiqueta («Por qué venderla: …»): se muestran como
   ficha técnica; «Impacto: …» es el ícono; las demás notas son condiciones para agencias. */
const FICHA_LABELS = { "Por qué venderla": "Why sell it", "Te interesa": "Good to know", "Punto de operación": "Operating area", "Combínalo con": "Pair it with",
  "Menú": "Menu", "Suplementos": "Supplements", "Recomendaciones": "Recommendations", "Modalidad": "Format",
  "Dificultad": "Difficulty", "Capacidad máxima": "Maximum capacity" };
const fichaVal = (sp, k) => (sp.ficha.find(([x]) => x === k) || [])[1] || "";
const IMPACTOS = { "Ambiental": ["🌿", "Ambiental", "Environmental"], "Sociocultural": ["🤝", "Sociocultural", "Socio-cultural"], "Económico": ["💰", "Económico", "Economic"] };
// Índice filtrable con los nombres del documento del portafolio 2027 (sin la palabra «Turismo»)
// Mismo orden de líneas que el índice del portafolio
const CATS = { rurales: ["Rurales", "Rural"], naturaleza: ["Naturaleza", "Nature"], bienestar: ["Bienestar", "Wellness"], tradicionales: ["Tours tradicionales", "Traditional tours"],
  metropolitano: ["Metropolitano", "Metropolitan"], aventura: ["Actividades de aventura", "Adventure activities"], parques: ["Parques temáticos", "Theme parks"],
  incentivos: ["Incentivos y propuestas de alto valor", "Incentives & high-value proposals"],
  servicios: ["Traslados y servicios", "Transfers & services"], hoteles: ["Hoteles (noche por persona)", "Hotels (per person per night)"] };
const rateCat = r => (tourOf(r) || {}).cat || (isHotel(r) ? "hoteles" : isService(r) ? "servicios" : "");
const catName = c => (CATS[c] ? CATS[c][L() === "en" ? 1 : 0] : "");
function splitNotes(notas) {
  const ficha = [], cond = []; let imp = "";
  // Cada nota puede traer varias líneas (el conversor las agrupa en bloques: las reglas de Firebase
  // tienen un límite de evaluación y con muchas notas sueltas rechazan la escritura)
  const lineas = (notas || []).flatMap(x => String(x).split("\n")).map(x => x.trim()).filter(Boolean);
  for (const n of lineas) {
    const m = /^([^:]{2,30}):\s*([\s\S]+)$/.exec(n);
    if (m && m[1] === "Impacto") imp = m[2].trim();
    else if (m && FICHA_LABELS[m[1]]) ficha.push([m[1], m[2].trim()]);
    else cond.push(n);
  }
  return { ficha, cond, imp };
}
function impactBadge(imp) { const x = IMPACTOS[imp]; return x ? h("span", { class: "p-badge p-badge--imp", title: t("imp_label") }, x[0] + " " + x[L() === "en" ? 2 : 1]) : null; }
/* Prototipo de ficha técnica (documento 2027): Parámetro operativo | Detalle técnico B2B | Especificación comercial (B2C).
   Todo sale de datos reales (duración, horario, incluye, tarifas, ficha); lo que no está en los datos dice «Consultar». */
const PV = {
  es: { dur: "Duración", sched: "Horario recomendado", diff: "Nivel de dificultad", cap: "Capacidad máxima", meet: "Punto de encuentro", lang: "Idioma de guianza",
    full: "Día completo", half: "Medio día", short: "Unas horas", am: "Mañana", pm: "Tarde", ampm: "Mañana o tarde", choose: "a elección", agree: "A convenir",
    ask: "Consultar", low: "Baja", mid: "Media", high: "Alta", capB2B: "Tarifa publicada hasta {0} pax por grupo; grupos mayores: consultar", capB2C: "Hasta {0} personas", capB2C1: "1 persona",
    pick: "Pick-up en el alojamiento (zona de cobertura según condiciones)", pickC: "Su hotel", onsite: "En el lugar de la experiencia", langB2B: "Español / inglés (otros idiomas con suplemento de guianza)",
    langC: "Español / inglés", langShared: "Español (inglés con suplemento)", langSharedC: "Español" },
  en: { dur: "Duration", sched: "Recommended schedule", diff: "Difficulty level", cap: "Maximum capacity", meet: "Meeting point", lang: "Guiding language",
    full: "Full day", half: "Half day", short: "A few hours", am: "Morning", pm: "Afternoon", ampm: "Morning or afternoon", choose: "your choice", agree: "To be agreed",
    ask: "Ask us", low: "Low", mid: "Medium", high: "High", capB2B: "Rate published up to {0} pax per group; larger groups: ask us", capB2C: "Up to {0} people", capB2C1: "1 person",
    pick: "Pick-up at the accommodation (coverage area as per conditions)", pickC: "Your hotel", onsite: "At the experience site", langB2B: "Spanish / English (other languages with guiding supplement)",
    langC: "Spanish / English", langShared: "Spanish (English with supplement)", langSharedC: "Spanish" } };
const pv = (k, ...a) => { let x = (PV[L()] || PV.es)[k] || k; a.forEach((v, i) => { x = x.split("{" + i + "}").join(String(v)); }); return x; };
function franja(hr) {
  if (!hr || !hr.tipo) return pv("agree");
  const hh = s => parseInt(String(s || "").slice(0, 2), 10);
  if (hr.tipo === "fijo") { const hs = (hr.horas || []).map(hh).filter(n => !isNaN(n)); if (!hs.length) return pv("agree"); return hs.every(n => n < 12) ? pv("am") : hs.every(n => n >= 12) ? pv("pm") : pv("ampm"); }
  if (hr.tipo === "ventana") { const a = hh(hr.desde), b = hh(hr.hasta); return (a < 12 && b >= 12 ? pv("ampm") : a >= 12 ? pv("pm") : pv("am")) + " (" + pv("choose") + ")"; }
  return horarioText(hr);
}
function dificultad(sp) {
  const d = fichaVal(sp, "Dificultad").toLowerCase();       // dato de la plantilla de pendientes (Baja / Media / Alta)
  if (d) return /baja/.test(d) ? pv("low") : /media/.test(d) ? pv("mid") : /alta/.test(d) ? pv("high") : pv("ask");
  const txt = sp.ficha.map(([, v]) => v).join(" ");
  const m = /dificultad\s*:?\s*(?:muy\s+)?(f[aá]cil|baja|media|moderada|alta|exigente|dif[ií]cil)/i.exec(txt);
  if (!m) return pv("ask");
  const v = m[1].toLowerCase();
  return /f[aá]cil|baja/.test(v) ? pv("low") : /media|moderada/.test(v) ? pv("mid") : pv("high");
}
function paramTable(tour, sp, rows) {
  if (!tour) return null;
  const hrs = Number(tour.duracion_horas) || 0;
  const durB2B = tour.duracion_texto || (hrs ? t("hours", hrs) + (hrs >= 6 ? " (Full Day)" : hrs >= 3 ? " (Half Day)" : "") : pv("ask"));
  const durB2C = hrs >= 6 ? pv("full") : hrs >= 3 ? pv("half") : hrs ? pv("short") : pv("ask");
  const capFicha = parseInt(fichaVal(sp, "Capacidad máxima"), 10);    // dato de operación (plantilla); si no, la tarifa máxima publicada
  const maxPax = capFicha > 0 ? capFicha : (rows || []).reduce((m, r) => Math.max(m, Number(r.pax_hasta) || 0), 0);
  const incl = (tourText(tour, "incluye") || []).join(" ").toLowerCase();
  const shared = tour.id_web === "compartidocs";
  const meet = shared ? [String((tour.horario && tour.horario.nota) || "").replace(/;?\s*salida.*$/i, ""), "Armenia"]
    : /transporte/.test(incl) ? [pv("pick"), pv("pickC")] : [pv("onsite"), pv("onsite")];
  const diff = dificultad(sp);
  const filas = [
    [pv("dur"), durB2B, durB2C],
    [pv("sched"), horarioText(tour.horario), franja(tour.horario)],
    [pv("diff"), diff, diff],
    [pv("cap"), maxPax ? pv("capB2B", maxPax) : pv("ask"), maxPax ? (maxPax === 1 ? pv("capB2C1") : pv("capB2C", maxPax)) : pv("ask")],
    [pv("meet"), meet[0], meet[1]],
    [pv("lang"), shared ? pv("langShared") : pv("langB2B"), shared ? pv("langSharedC") : pv("langC")]
  ];
  return h("div", { class: "p-table-wrap p-params" }, table([
    { label: t("p_param"), get: r => h("strong", null, r[0]) }, { label: t("p_b2b"), get: r => r[1] }, { label: t("p_b2c"), get: r => r[2] }
  ], filas, { stack: true, caption: t("ficha_t") }));
}
function tourInfo(tour, sp, openCond, rows) {
  const list = (k) => tourText(tour, k) || [];
  const incl = list("incluye"), excl = list("no_incluye"), ops = list("notas");
  return [
    paramTable(tour, sp, rows),
    tour && tour.cat ? h("p", { class: "p-muted p-tour__cat" }, t("cat_label") + ": " + catName(tour.cat)) : null,
    sp.ficha.length ? h("details", { class: "p-details p-ficha", open: true }, h("summary", null, t("ficha_t")),
      h("dl", { class: "p-ficha__dl" }, sp.ficha.map(([k, v]) => [h("dt", null, L() === "en" ? FICHA_LABELS[k] : k), h("dd", null, v)]))) : null,
    incl.length || excl.length ? h("details", { class: "p-details" }, h("summary", null, t("includes") + (excl.length ? " / " + t("excludes") : "")),
      h("ul", { class: "p-list" }, incl.map(x => h("li", null, "✓ " + x))), excl.length ? h("ul", { class: "p-list p-list--no" }, excl.map(x => h("li", null, "✗ " + x))) : null) : null,
    ops.length ? h("details", { class: "p-details" }, h("summary", null, t("operation")), h("ul", { class: "p-list" }, ops.map(x => h("li", null, x)))) : null,
    sp.cond.length ? h("details", { class: "p-details", open: !!openCond }, h("summary", null, `${t("conditions")} (${sp.cond.length})`), h("ul", { class: "p-list" }, sp.cond.map(x => h("li", null, x)))) : null
  ];
}
// Descargar la ficha: se imprime solo esa tarjeta (en el diálogo, «Guardar como PDF»)
// Ficha en PDF descargable (mismo generador del portafolio); si la experiencia no está en el portafolio, se imprime
async function pdfFicha(tourId, card, btnEl) {
  const st = card.querySelector(".p-pdf-st") || card.appendChild(h("p", { class: "p-muted p-pdf-st", role: "status" }));
  st.textContent = L() === "en" ? "Building the PDF…" : "Armando el PDF…";
  if (btnEl) btnEl.disabled = true;
  try {
    const year = catalogYear() || S.vigencias[0] || new Date().getFullYear();
    const [m, data, priv] = await Promise.all([import("./portafolio.js"), loadDmcRates(year), loadPortafolioPriv(year)]);
    const ok = tourId && await m.downloadFichaPdf(tourId, { lang: L(), tier: tierOf(), rates: data.rates, cond: data.cond, priv, splitNotes, empresa: EMPRESA, pagos: pagosOficiales() }, { price: "net" }, st);
    if (!ok) { st.textContent = ""; printFicha(card); }
  } catch (e) { st.textContent = ""; printFicha(card); }
  finally { if (btnEl) btnEl.disabled = false; }
}
function printFicha(card) {
  let box = $("#p-print"); if (!box) { box = h("div", { id: "p-print" }); document.body.appendChild(box); }
  clear(box);
  const copy = card.cloneNode(true);
  copy.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
  copy.querySelectorAll(".p-actions").forEach(a => a.remove());
  add(box, h("div", { class: "p-print__head" }, h("strong", null, "Espontáneos Travel · " + t("print_title")),
    h("span", null, "RNT 91795 · info@espontaneostravel.com · WhatsApp +57 318 720 0023")), copy);
  document.body.classList.add("p-printing");
  try { window.print(); } finally { document.body.classList.remove("p-printing"); }
}
/* Geolocalización dinámica (documento 2027): el asesor escribe el hotel del pasajero; con OpenStreetMap (gratis) se
   ubica y se calcula la distancia a cada experiencia. Si la experiencia opera en varios municipios («Punto de operación»),
   se sugiere el más cercano (p. ej. hotel en Manizales → finca de la zona de Manizales). */
const geoKey = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/z/g, "s").replace(/[^a-z0-9]/g, "");
async function loadGeo() {
  if (S.geoData) return S.geoData;
  try { const r = await fetch("/data/geo.json", { cache: "no-cache" }); S.geoData = r.ok ? await r.json() : { pueblos: {}, lugares: {} }; }
  catch (e) { S.geoData = { pueblos: {}, lugares: {} }; }
  return S.geoData;
}
async function geocodeHotel(q) {
  const G = await loadGeo();
  try {
    const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=co&accept-language=es&viewbox=-76.3,5.6,-74.9,3.9&bounded=1&q=" + encodeURIComponent(q);
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    const j = r.ok ? await r.json() : [];
    if (j && j[0]) return { lat: +j[0].lat, lon: +j[0].lon, name: q };
  } catch (e) { /* sin red: se intenta con el municipio */ }
  const k = geoKey(q);
  const p = Object.values(G.pueblos || {}).find(x => k.includes(geoKey(x.nombre)));
  return p ? { lat: p.lat, lon: p.lon, name: q } : null;
}
const kmBetween = (a, b) => { const R = 6371, rad = x => x * Math.PI / 180, dl = rad(b.lat - a.lat), dn = rad(b.lon - a.lon);
  const h1 = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h1)); };
function geoNearest(tour, sp) {
  const G = S.geoData, H = S.hotelGeo; if (!G || !H || !tour) return null;
  const L0 = G.lugares && G.lugares[tour.id_web];
  let cands = L0 && L0.lat != null ? [{ name: L0.nombre_lugar || L0.municipio, lat: L0.lat, lon: L0.lon }] : [];
  if (!cands.length) {
    const punto = ((sp.ficha.find(([k]) => k === "Punto de operación") || [])[1] || "") + " " + (tourText(tour, "nombre") || "");
    const k = geoKey(punto);
    cands = Object.values(G.pueblos || {}).filter(p => k.includes(geoKey(p.nombre))).map(p => ({ name: p.nombre, lat: p.lat, lon: p.lon, zona: true }));
  }
  if (!cands.length) return null;
  const best = cands.map(c => Object.assign({ km: kmBetween(H, c) }, c)).sort((a, b) => a.km - b.km)[0];
  return Object.assign(best, { varias: cands.length > 1 });
}
function geoLine(tour, sp) {
  const g = geoNearest(tour, sp); if (!g) return null;
  return h("p", { class: "p-geo" }, "📍 " + t("geo_from", Math.round(g.km), S.hotelGeo.name) + (g.zona || g.varias ? " · " + t("geo_zone", g.name) : " · " + g.name));
}
// El equipo ve el portafolio igual que los DMC (y que las cuentas de Mercado Nacional), sin el botón de solicitud
async function staffPortafolio(view) {
  const host = h("div");
  const opts = [["dmc", "Portafolio · vista DMC"], ["nac", "Portafolio · vista Mercado Nacional"], ["lista", "Fichas y tarifas (lista)"]];
  const bs = opts.map(([k, l]) => btn(l, () => show(k)));
  async function show(k) {
    bs.forEach((b, i) => { b.className = "btn btn--sm " + (opts[i][0] === k ? "btn--brand" : "btn--ghost"); b.setAttribute("aria-pressed", String(opts[i][0] === k)); });
    const pm = $("#p-main"); if (pm) pm.classList.remove("p-main--wide");
    clear(host);
    S.pfTier = k === "nac" ? "nac" : "dmc";
    await (k === "lista" ? dmcTarifas(host) : dmcPortafolio(host));
  }
  add(view, h("p", { class: "p-note" }, "Así ven el portal los DMC y las cuentas de Mercado Nacional. Las fichas técnicas, las tarifas y los datos privados (fincas, hoteles aliados, formas de pago) salen de lo que importes en Condiciones y Tarifas."),
    h("div", { class: "p-actions" }, bs), host);
  await show("dmc");
}
function requestTour(tourId, codigo, nombre) { S.preset = { tour: { tour_id: tourId, codigo: codigo || "", nombre } }; S.tabsApi.select("solicitar", true); }
// Ficha de una experiencia sin tarifa todavía (fichas nuevas del portafolio)
function pendingCard(x, cond) {
  const sp = splitNotes((cond.get(x.id_web) || {}).notas_agencia);
  const name = tourText(x, "nombre") || x.nombre;
  const card = h("article", { class: "p-tour p-tour--pending" },
    h("header", { class: "p-tour__head" }, h("h3", { class: "p-h3" }, name), h("span", { class: "p-code" }, x.codigo || ""), badge(t("pending_badge"), "warn"), impactBadge(sp.imp)),
    geoLine(x, sp),
    tourInfo(x, sp, false, []),
    h("div", { class: "p-actions" }, S.view === "staff" ? null : btn(t("request_this"), () => requestTour(x.id_web, x.codigo, x.nombre), "btn--brand"), btn(t("pdf_btn"), ev => pdfFicha(x.id_web, card, ev.currentTarget))));
  return card;
}

function tourCard(rows, cond) {
  const r0 = rows[0], tour = tourOf(r0);
  const c = cond.get(r0.tour_id) || (tour && cond.get(tour.id_web));
  const name = tourText(tour, "nombre") || r0.nombre || rateKey(r0);
  const sp = splitNotes(c && c.notas_agencia);
  rows.sort((a, b) => (b.especial - a.especial) || collate(a.temporada, b.temporada) || a.pax_desde - b.pax_desde);
  const cols = [
    { label: t("th_season"), get: r => r.temporada || "—" },
    isHotel(r0) ? { label: L() === "en" ? "Room" : "Acomodación", get: r => (ROOMS[L()] || ROOMS.es)[r.pax_desde] || paxText(r) } : { label: t("th_pax"), get: r => paxText(r) },
    { label: t("th_rate"), cls: "num", get: r => money(r.tarifa_neta, r.moneda) },
    { label: t("th_type"), get: r => (r.especial ? badge(t("type_special"), "ok") : t("type_general")) },
    { label: t("th_notes"), get: r => r.notas || "" }
  ];
  const card = h("article", { class: "p-tour" },
    h("header", { class: "p-tour__head" }, h("h3", { class: "p-h3" }, name), h("span", { class: "p-code" }, (tour && tour.codigo) || r0.codigo || ""),
      r0._de ? badge(t("carry", r0._de, catalogYear()), "") : null, impactBadge(sp.imp), isService(r0) ? badge(catName(rateCat(r0)), "") : null),
    geoLine(tour, sp),
    tourInfo(tour, sp, true, rows),
    h("div", { class: "p-table-wrap" }, table(cols, rows, { stack: true, caption: name })),
    h("div", { class: "p-actions" }, S.view === "staff" ? null : btn(t("request_this"), () => requestTour(r0.tour_id || (tour && tour.id_web) || "", (tour && tour.codigo) || r0.codigo, (tour && tour.nombre) || r0.nombre), "btn--brand"),
      btn(t("pdf_btn"), ev => pdfFicha(tour && tour.id_web, card, ev.currentTarget))));
  return card;
}

function exportDmcCsv(rows, cond, year, sep) {
  const out = rows.map(r => {
    const tour = tourOf(r), c = cond.get(r.tour_id);
    return {
      vigencia: r._de ? year : r.vigencia, codigo: (tour && tour.codigo) || r.codigo, tour_id: r.tour_id, tour: tourText(tour, "nombre") || r.nombre, temporada: r.temporada,
      pax_desde: r.pax_desde, pax_hasta: r.pax_hasta, moneda: r.moneda, tarifa_neta: r.tarifa_neta,
      tipo: r.especial ? t("type_special") : t("type_general"), notas: r.notas || "",
      duracion_horas: tour ? tour.duracion_horas : "", horario: tour ? horarioText(tour.horario) : "",
      incluye: (tourText(tour, "incluye") || []).join(" | "), condiciones_agencia: c ? (c.notas_agencia || []).join(" | ") : ""
    };
  });
  const cols = ["vigencia", "codigo", "tour_id", "tour", "temporada", "pax_desde", "pax_hasta", "moneda", "tarifa_neta", "tipo", "notas", "duracion_horas", "horario", "incluye", "condiciones_agencia"];
  download(`tarifas-${slugify(S.dmc.nombre) || "agencia"}-${year}.csv`, toCSV(out, cols, sep), "text/csv;charset=utf-8");
}

async function loadMyClients() {
  return list(fs.query(col("clientes"), fs.where("dmcId", "==", S.profile.dmcId)));
}

// Buscador de tours: se escribe parte del nombre, el código o la línea y se elige de la lista (orden del índice del portafolio)
function tourPicker(onPick) {
  const lid = uid("tl");
  const input = h("input", { type: "search", autocomplete: "off", role: "combobox", "aria-expanded": "false", "aria-controls": lid, "aria-autocomplete": "list", placeholder: t("tour_ph") });
  const list = h("ul", { class: "p-combo__list", id: lid, role: "listbox", hidden: true });
  const field = labeled(t("choose_tour"), input, "p-grow p-combo"); add(field, list);
  const name = x => tourText(x, "nombre") || x.nombre;
  let items = [], act = -1;
  const open = on => { list.hidden = !on; input.setAttribute("aria-expanded", String(on)); if (!on) input.removeAttribute("aria-activedescendant"); };
  function mark() {
    items.forEach((x, i) => { const li = document.getElementById(lid + "-" + i); if (li) li.setAttribute("aria-selected", String(i === act)); });
    const el = act >= 0 && document.getElementById(lid + "-" + act);
    if (el) { input.setAttribute("aria-activedescendant", el.id); if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); } else input.removeAttribute("aria-activedescendant");
  }
  function draw() {
    const q = norm(input.value);
    items = S.tours.list.filter(x => !q || norm([name(x), x.nombre, x.codigo, catName(x.cat)].join(" ")).includes(q))
      .sort((a, b) => pfPos(a) - pfPos(b) || collate(name(a), name(b)));
    act = items.length ? 0 : -1;
    clear(list);
    if (!items.length) add(list, h("li", { class: "p-combo__none" }, t("no_match")));
    items.forEach((x, i) => add(list, h("li", { id: lid + "-" + i, role: "option", class: "p-combo__opt", "aria-selected": "false", onmousedown: ev => { ev.preventDefault(); pick(i); } },
      h("span", null, name(x)), h("span", { class: "p-muted" }, ` · ${x.codigo}${x.cat ? " · " + catName(x.cat) : ""}`))));
    open(true); mark();
  }
  function pick(i) { const x = items[i]; if (!x) return; onPick(x); input.value = ""; open(false); input.focus(); }
  input.addEventListener("input", draw);
  input.addEventListener("focus", draw);
  input.addEventListener("blur", () => setTimeout(() => open(false), 150));
  input.addEventListener("keydown", ev => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); if (list.hidden) draw(); else if (items.length) { act = (act + (ev.key === "ArrowDown" ? 1 : items.length - 1)) % items.length; mark(); } }
    else if (ev.key === "Enter") { ev.preventDefault(); if (!list.hidden && act >= 0) pick(act); }   // Enter elige; nunca envía el formulario
    else if (ev.key === "Escape" && !list.hidden) { ev.preventDefault(); open(false); }
  });
  return { el: field, input };
}
async function dmcSolicitar(view) {
  add(view, loadingBox());
  await S.jennyP;
  const myClients = (await loadMyClients().catch(() => [])).sort((a, b) => collate(a.nombre, b.nombre));
  await loadPfOrder();
  clear(view);
  const chosen = [];
  const pre = S.preset && (S.preset.tour || S.preset.tours) ? S.preset : null;
  if (pre) S.preset = null;
  if (pre && pre.tour) chosen.push(pre.tour);
  if (pre && pre.tours) pre.tours.slice(0, MAX_TOURS).forEach(x => chosen.push({ tour_id: String(x.tour_id || "").slice(0, 40), codigo: String(x.codigo || "").slice(0, 20), nombre: String(x.nombre || "").slice(0, 200) }));
  const picker = tourPicker(x => {
    if (chosen.length >= MAX_TOURS) return notify(t("max_tours"), "error");
    if (!chosen.some(c => c.tour_id === x.id_web)) chosen.push({ tour_id: String(x.id_web || "").slice(0, 40), codigo: String(x.codigo || "").slice(0, 20), nombre: String(x.nombre || "").slice(0, 200) });
    drawChips();
  });
  const chips = h("ul", { class: "p-chips", "aria-live": "polite" });
  function drawChips() {
    clear(chips);
    if (!chosen.length) add(chips, h("li", { class: "p-muted" }, t("no_tours_yet")));
    chosen.forEach((c, i) => add(chips, h("li", { class: "p-chip" }, h("span", null, c.nombre),
      h("button", { type: "button", class: "p-chip__x", "aria-label": `${t("remove")}: ${c.nombre}`, onclick: () => { chosen.splice(i, 1); drawChips(); picker.input.focus(); } }, "×"))));
  }
  drawChips();
  const clientSel = selectEl([["", t("none")]].concat(myClients.map(c => [c.id, c.nombre])), "", { id: uid("cl") });
  const f = formFields([
    { name: "viajero", label: t("traveller"), required: true, max: 120 },
    { name: "fecha_inicio", label: t("start_date"), type: "date", required: true, attrs: { min: isoDay(new Date()) } },
    { name: "fecha_fin", label: t("end_date"), type: "date", attrs: { min: isoDay(new Date()) } },
    { name: "pax", label: t("pax"), type: "number", required: true, inputmode: "numeric", attrs: { min: 1, max: 500, step: 1 } },
    { name: "hotel", label: t("hotel"), max: 120 },
    { name: "idioma", label: t("guide_lang"), type: "select", options: TRAVEL_LANGS },
    { name: "necesidades", label: t("needs"), type: "textarea", max: 1000, full: true, hint: t("needs_hint") },
    { name: "notas", label: t("notes"), type: "textarea", max: 2000, full: true }
  ], { idioma: S.lang });
  if (pre && pre.pax >= 1) f.inputs.pax.value = String(Math.min(500, pre.pax));
  if (pre && pre.hotel) f.inputs.hotel.value = String(pre.hotel).slice(0, 120);
  if (pre && pre.notas) f.inputs.notas.value = String(pre.notas).slice(0, 2000);
  clientSel.addEventListener("change", () => {
    const c = myClients.find(x => x.id === clientSel.value);
    if (c && !f.inputs.viajero.value.trim()) f.inputs.viajero.value = c.nombre;
    if (c && c.idioma && TRAVEL_LANGS.some(l => l[0] === c.idioma)) f.inputs.idioma.value = c.idioma;
  });
  const form = mkForm(async () => {
    const v = f.get();
    if (!chosen.length) { picker.input.focus(); throw userErr(t("need_tour")); }
    const pax = parseInt(v.pax, 10);
    if (!(pax >= 1 && pax <= 500)) throw userErr(t("pax_invalid"));
    if (v.fecha_fin && v.fecha_fin < v.fecha_inicio) throw userErr(t("end_before"));
    await fs.addDoc(col("solicitudes"), {
      dmcId: S.profile.dmcId, creadoPor: S.user.uid, creadoPorEmail: S.user.email || "", clienteId: clientSel.value || null,
      viajero: v.viajero, tours: chosen.slice(0, MAX_TOURS), fecha_inicio: v.fecha_inicio, fecha_fin: v.fecha_fin, pax,
      hotel: v.hotel, idioma: v.idioma, necesidades: v.necesidades, notas: v.notas, estado: "nueva", creado: ts(), actualizado: ts()
    });
    notify(t("req_sent"));
    S.tabsApi.select("mis", true);
  },
  h("p", { class: "p-muted" }, t("required_note")),
  group(t("tours"), h("div", { class: "p-inline" }, picker.el), chips),
  group(t("trip_details"), h("div", { class: "p-grid p-grid--first" }, labeled(t("client_opt"), clientSel)), f.el),
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, t("send_request"))));
  add(view, h("div", { class: "p-card" }, h("h2", { class: "p-h2" }, t("req_title")), h("p", { class: "p-sub" }, t("req_sub")), form));
}

// Fechas de una reserva interna (resumen guardado en reservas/{código}: fechaInicio / fechaFin)
function itinDates(b) {
  const a = b.fechaInicio, z = b.fechaFin || b.fechaInicio;
  if (!a) return "";
  return a === z ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(z)}`;
}

async function dmcMine(view) {
  add(view, loadingBox());
  const [sol, res] = await Promise.all([
    list(fs.query(col("solicitudes"), fs.where("dmcId", "==", S.profile.dmcId))),
    list(fs.query(col("reservas"), fs.where("dmcId", "==", S.profile.dmcId)))
  ]);
  sortByCreado(sol); sortByCreado(res);
  clear(view);
  const solBox = h("div", { class: "p-cards" });
  sol.forEach(s => add(solBox, h("article", { class: "p-item" },
    h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, s.viajero), stBadge(s.estado)),
    kvList(
      kv(t("tours"), (s.tours || []).map(x => x.nombre || x.codigo).join(" · ")),
      kv(t("dates"), s.fecha_fin && s.fecha_fin !== s.fecha_inicio ? `${fmtDay(s.fecha_inicio)} – ${fmtDay(s.fecha_fin)}` : fmtDay(s.fecha_inicio)),
      kv(t("passengers"), s.pax), kv(t("hotel"), s.hotel), kv(t("created"), fmtDateTime(s.creado)),
      kv(t("answer"), s.respuesta), kv(t("code"), s.reservaId)),
    s.estado === "nueva" ? h("div", { class: "p-actions" }, btn(t("cancel_req"), e => {
      if (!window.confirm(t("confirm_cancel"))) return;
      busy(e.currentTarget, async () => {
        await fs.updateDoc(dref("solicitudes", s.id), { estado: "cancelada", actualizado: ts() });
        notify(t("canceled_ok")); clear(view); await dmcMine(view);
      });
    })) : null)));
  if (!sol.length) add(solBox, emptyBox(t("no_requests")));
  const resBox = h("div", { class: "p-cards" });
  res.forEach(b => add(resBox, bookingCardDmc(b)));
  if (!res.length) add(resBox, emptyBox(t("no_bookings")));
  add(view, h("h2", { class: "p-h2" }, t("my_requests")), solBox, h("h2", { class: "p-h2" }, t("my_bookings")), resBox);
}

function bookingCardDmc(b) {
  const holder = h("div");
  const toggle = btn(t("show_qr"), () => {
    const open = holder.firstChild;
    clear(holder);
    if (!open) add(holder, shareBox(b.id, b.phone, b.lang));
    toggle.textContent = open ? t("show_qr") : t("hide_qr");
    toggle.setAttribute("aria-expanded", String(!open));
  }, null, { "aria-expanded": "false" });
  return h("article", { class: "p-item" },
    h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, b.name || "—"), stBadge(b.estado)),
    kvList(kv(t("code"), h("span", { class: "p-mono" }, b.id)), kv(t("dates"), itinDates(b)), kv(t("passengers"), b.party), kv(t("hotel"), b.hotelNombre)),
    h("div", { class: "p-actions" }, toggle), holder);
}

function travellerUrl(code) { return new URL("viaje.html?code=" + encodeURIComponent(code), location.href).href; }
function shareBox(code, phone, lang) {
  const url = travellerUrl(code);
  const qr = qrDataUrl(url, 5), qrBig = qrDataUrl(url, 12);
  const msg = (lang === "es" ? I18N.es.wa_trip_msg : I18N.en.wa_trip_msg) + url;
  return h("div", { class: "p-share" },
    qr ? h("img", { class: "p-share__qr", src: qr, alt: t("qr_alt", code) }) : null,
    h("div", { class: "p-share__info" },
      h("p", null, t("code") + ": ", h("strong", { class: "p-mono" }, code)),
      h("p", { class: "p-break" }, h("a", { href: url, target: "_blank", rel: "noopener" }, url)),
      h("div", { class: "p-actions" },
        btn(t("copy_link"), () => copyText(url), "btn--primary"),
        qrBig ? h("a", { class: "btn btn--ghost btn--sm", href: qrBig, download: `qr-${code}.gif` }, t("download_qr")) : null,
        digits(phone) ? h("a", { class: "btn btn--wa btn--sm", href: waLink(phone, msg), target: "_blank", rel: "noopener" }, t("send_wa")) : null)));
}

async function dmcClientes(view) {
  add(view, loadingBox());
  const rows = (await loadMyClients()).sort((a, b) => collate(a.nombre, b.nombre));
  clear(view);
  const formHost = h("div", { class: "p-formhost" });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const out = h("div", { class: "p-cards" });
  const reload = async () => { clear(view); await dmcClientes(view); };
  function draw() {
    clear(out);
    const term = norm(q.value);
    const shown = rows.filter(c => !term || norm([c.nombre, c.email, c.telefono, c.pais].join(" ")).includes(term));
    if (!shown.length) add(out, emptyBox(rows.length ? t("no_match") : t("no_clients")));
    shown.forEach(c => add(out, h("article", { class: "p-item" },
      h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, c.nombre)),
      kvList(kv(t("email"), c.email), kv(t("phone_wa"), c.telefono), kv(t("country"), c.pais), kv(t("language"), c.idioma),
        kv(t("notes"), c.notas), c.consentimiento ? kv("Habeas data", t("consent_on", fmtDay(c.consentimiento.fecha), c.consentimiento.version)) : null),
      h("div", { class: "p-actions" }, btn(t("edit"), () => clientForm(formHost, c, null, reload))))));
  }
  q.addEventListener("input", debounce(draw, 150));
  add(view, 
    h("div", { class: "p-toolbar" }, labeled(t("search_clients"), q, "p-grow"), h("div", { class: "p-toolbar__end" }, btn(t("new_client"), () => clientForm(formHost, null, null, reload), "btn--primary"))),
    formHost, out, h("p", { class: "p-muted" }, t("delete_note")));
  draw();
}

/**
 * Formulario de cliente (CRM) — compartido por agencia y staff. Exige autorización de datos al crear.
 * clientes/{id}: lo que la agencia dueña puede leer (incluye «notas» compartidas).
 * clientes_privado/{id}: asesor asignado, etiquetas y notas internas (solo staff).
 */
function clientForm(host, existing, prefill, onDone) {
  clear(host);
  const staff = S.view === "staff";
  const c = existing || prefill || {};
  const priv = c._priv || {};
  const defs = [
    { name: "nombre", label: t("client_name"), required: true, max: 120 },
    { name: "email", label: t("email"), type: "email", max: 200 },
    { name: "telefono", label: t("phone_wa"), type: "tel", max: 40 },
    { name: "pais", label: t("country"), max: 60 },
    { name: "idioma", label: t("language"), type: "select", options: TRAVEL_LANGS }
  ];
  if (staff) defs.push(
    { name: "origen", label: "Origen", type: "select", options: ORIGENES },
    { name: "dmcId", label: "DMC", type: "select", options: [["", "— Cliente directo —"]].concat(S.dmcs.map(d => [d.id, d.nombre])) },
    { name: "asesorId", label: "Asesor asignado (solo equipo)", type: "select", options: [["", "— Sin asignar —"]].concat(advisors().map(u => [u.id, u.nombre || u.email])) },
    { name: "etiquetas", label: "Etiquetas (solo equipo)", max: 300, hint: "Hasta 10, separadas por coma. Ej.: luna de miel, VIP, aves" });
  defs.push({
    name: "notas", label: staff ? "Notas compartidas" : t("notes_agency"), type: "textarea", max: 3000, full: true,
    hint: staff ? "Si el cliente pertenece a una agencia, la agencia VE estas notas. No guardes datos de salud ni otros datos sensibles." : t("needs_hint")
  });
  if (staff) defs.push({ name: "notasInternas", label: "Notas internas (solo el equipo de Espontáneos)", type: "textarea", max: 3000, full: true });
  const f = formFields(defs, {
    nombre: c.nombre || "", email: c.email || "", telefono: c.telefono || "", pais: c.pais || "",
    idioma: c.idioma && TRAVEL_LANGS.some(l => l[0] === c.idioma) ? c.idioma : (staff ? "es" : S.lang),
    origen: c.origen || "web", dmcId: c.dmcId || "",
    asesorId: priv.asesorId || c.asesorId || (staff && !existing && S.profile.rol === "asesor" ? S.user.uid : ""),
    etiquetas: (priv.etiquetas || []).join(", "), notas: c.notas || "", notasInternas: priv.notasInternas || c.notasInternas || ""
  });
  let consent = null, medio = null;
  if (!existing) {
    consent = consentBlock("consent_client");
    if (staff) medio = formFields([{ name: "medio", label: "¿Cómo dio la autorización?", type: "select", options: MEDIOS }], { medio: c.origen === "whatsapp" ? "whatsapp" : "web" });
  }
  const form = mkForm(async () => {
    const v = f.get();
    const base = { nombre: v.nombre, email: v.email, telefono: v.telefono, pais: v.pais, idioma: v.idioma, notas: v.notas, actualizado: ts() };
    if (staff) Object.assign(base, { origen: v.origen, dmcId: v.dmcId || null });
    const privDoc = staff ? {
      asesorId: v.asesorId || null, notasInternas: v.notasInternas,
      etiquetas: splitList(v.etiquetas).map(x => x.slice(0, 40)).slice(0, 10), actualizado: ts()
    } : null;
    let id = existing && existing.id;
    if (existing) {
      if (staff) await commit([b => b.update(dref("clientes", id), base), b => b.set(dref("clientes_privado", id), privDoc, { merge: true })]);
      else await fs.updateDoc(dref("clientes", id), base);
    } else {
      if (!consent.input.checked) throw userErr(t("consent_required"));
      const data = Object.assign(base, {
        consentimiento: { habeasData: true, fecha: ts(), version: CONSENT_VERSION, medio: staff ? medio.get().medio : "agencia", registradoPor: S.user.uid },
        creadoPor: S.user.uid, creado: ts()
      });
      if (!staff) Object.assign(data, { origen: "dmc", dmcId: S.profile.dmcId });
      const ref = newRef("clientes");
      id = ref.id;
      if (staff) await commit([b => b.set(ref, data), b => b.set(dref("clientes_privado", id), privDoc)]);
      else await fs.setDoc(ref, data);
    }
    notify(t("client_saved"));
    clear(host);
    if (onDone) await onDone(id);
  },
  h("p", { class: "p-muted" }, t("required_note")),
  f.el,
  existing && existing.consentimiento ? h("p", { class: "p-note" }, "Habeas data: " + t("consent_on", fmtDay(existing.consentimiento.fecha), existing.consentimiento.version)) : null,
  medio ? medio.el : null,
  consent ? consent.el : null,
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, t("save")), btn(t("cancel"), () => clear(host))));
  add(host, h("div", { class: "p-card p-card--form" }, h("h2", { class: "p-h2" }, existing ? t("edit_client") : t("new_client")), form));
  focusHeading(host);
}

/* ---------- Mi cuenta (todos los roles) ---------- */
async function myAccount(view) {
  const p = S.profile;
  const f = formFields([
    { name: "nombre", label: t("name"), required: true, max: 120, autocomplete: "name" },
    { name: "whatsapp", label: t("whatsapp"), type: "tel", max: 30, autocomplete: "tel" },
    { name: "idiomas", label: t("languages"), max: 60 }
  ], { nombre: p.nombre, whatsapp: p.whatsapp || "", idiomas: (p.idiomas || []).join(", ") });
  const form = mkForm(async () => {
    const v = f.get();
    const upd = { nombre: v.nombre, whatsapp: v.whatsapp, idiomas: splitList(v.idiomas).map(x => x.slice(0, 20)).slice(0, 10), actualizado: ts() };
    await fs.updateDoc(dref("users", S.user.uid), upd);
    Object.assign(S.profile, upd);
    renderHeader();
    notify(t("saved"));
  }, f.el, h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, t("save"))));
  add(view, h("div", { class: "p-card" },
    h("h2", { class: "p-h2" }, t("account_title")),
    kvList(kv(t("email"), S.user.email), kv(t("role"), roleLabel(p.rol)), p.rol === "dmc" && S.dmc ? kv(t("agency"), S.dmc.nombre) : null),
    form,
    h("hr", { class: "p-sep" }),
    btn(t("change_pw"), e => busy(e.currentTarget, async () => { await au.sendPasswordResetEmail(S.fb.auth, S.user.email); notify(t("pw_email_sent")); }))));
}

/* ==========================================================================
   VISTA EQUIPO (asesor y admin) — en español
   ========================================================================== */
function renderStaffApp() {
  document.documentElement.lang = "es";
  const admin = S.profile.rol === "admin";
  const pending = admin ? S.users.filter(u => u.estado === "pendiente").length : 0;
  const hello = h("div", { class: "p-hello" },
    h("h1", { class: "p-title" }, `Hola, ${first(S.profile.nombre)}`),
    h("p", { class: "p-sub" }, (admin ? "Administración" : "Asesor") + " · Espontáneos Travel"),
    pending ? h("p", { class: "p-note" }, `Tienes ${pending} solicitud${pending === 1 ? "" : "es"} de acceso pendiente${pending === 1 ? "" : "s"}. `, linkBtn("Revisar", () => S.tabsApi.select("agencias", true))) : null);
  const main = screen(hello);
  dueFollowUps(hello);
  // Enlaces del correo de aviso (solo administración)
  if (location.hash === "#usuarios") { if (admin) S.tab = "usuarios"; clearHash(); }
  if (S.approval && !admin) { S.approval = null; clearHash(); notify("Solo un administrador puede aprobar solicitudes de acceso.", "error"); }
  const apHost = h("div", { class: "p-approve-host" });
  add(main, apHost);
  if (S.approvalDone) { approvalDoneCard(apHost, S.approvalDone); S.approvalDone = null; }
  else if (S.approval) { S.tab = "usuarios"; approvalCard(apHost); }
  const defs = [
    { id: "leads", label: "Leads" }, { id: "clientes", label: "Clientes" },
    { id: "reservas", label: "Reservas" }, { id: "solicitudes", label: "Pedidos DMC" },
    { id: "portafolio", label: "Portafolio" }
  ];
  const handlers = { leads: staffLeads, clientes: staffClientes, reservas: staffReservas, solicitudes: staffSolicitudes, portafolio: staffPortafolio, cuenta: myAccount };
  if (admin) {
    defs.push({ id: "agencias", label: "DMC", count: pending }, { id: "usuarios", label: "Usuarios" }, { id: "tarifas", label: "Tarifas" },
      { id: "condiciones", label: "Condiciones" }, { id: "asesores", label: "Asesores" }, { id: "ajustes", label: "Pagos" }, { id: "respaldo", label: "Respaldo" });
    Object.assign(handlers, { usuarios: adminUsuarios, agencias: adminAgencias, tarifas: adminTarifas, condiciones: adminCondiciones, asesores: adminAsesores, ajustes: adminPagos, respaldo: adminRespaldo });
  }
  defs.push({ id: "cuenta", label: "Cuenta" });
  S.tabsApi = mountTabs(main, defs, handlers, "Secciones del portal");
  if (apHost.firstChild) focusHeading(apHost);
}

// Seguimientos de clientes para hoy o atrasados (consulta liviana: solo los que vencen)
function dueFollowUps(host) {
  fs.getDocs(fs.query(col("clientes_privado"), fs.where("seguimiento", "<=", isoDay(new Date())))).then(snap => {
    const n = snap.size;
    if (!n) return;
    add(host, h("p", { class: "p-note" }, `Tienes ${n} cliente${n === 1 ? "" : "s"} para contactar hoy o con seguimiento atrasado. `,
      linkBtn("Ver", () => { S.crmFilter = "due"; S.tabsApi.select("clientes", true); })));
  }).catch(() => { /* sin reglas nuevas o sin conexión: el aviso es un extra */ });
}

/* ---------- Leads del chatbot ---------- */
const STAGE_LABEL = Object.fromEntries(STAGES);
const STAGE_KIND = { qr_visita: "", resumen: "warn", whatsapp: "ok" };
function origenFromLead(l) { if (l.stage === "whatsapp") return "whatsapp"; return /qr/i.test(l.src || "") ? "qr" : "web"; }
function leadSummary(l) {
  return [l.plan && "Itinerario: " + l.plan, l.tour && "Experiencia: " + l.tour, l.date && "Fecha: " + l.date, l.party && "Personas: " + l.party,
    l.hotel && "Alojamiento: " + l.hotel, l.diet && "Alimentación: " + l.diet, l.notes && "Notas: " + l.notes, "Lead " + (l.leadId || l.id)].filter(Boolean).join("\n");
}

async function staffLeads(view) {
  const from = h("input", { type: "date", id: uid("from"), value: isoDay(addDays(new Date(), -30)) });
  const to = h("input", { type: "date", id: uid("to"), value: isoDay(new Date()) });
  const stage = selectEl([["", "Todas"]].concat(STAGES), "", { id: uid("st") });
  const src = selectEl([["", "Todos"]], "", { id: uid("src") });
  const onlyNew = h("input", { type: "checkbox", id: uid("new") });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off", placeholder: "Nombre, hotel, itinerario…" });
  const sep = sepSelect();
  const stats = h("p", { class: "p-count", role: "status" });
  const out = h("div", { class: "p-cards" });
  let rows = [], shown = [];
  async function load() {
    clear(out); add(out, loadingBox());
    const a = from.value ? new Date(from.value + "T00:00:00") : addDays(new Date(), -30);
    const b = addDays(to.value ? new Date(to.value + "T00:00:00") : new Date(), 1);
    try {
      rows = await list(fs.query(col("leads"), fs.where("creado", ">=", fs.Timestamp.fromDate(a)), fs.where("creado", "<", fs.Timestamp.fromDate(b)), fs.orderBy("creado", "desc"), fs.limit(500)));
    } catch (e) { clear(out); add(out, errorBox(e, load)); return; }
    const srcs = [...new Set(rows.map(r => r.src).filter(Boolean))].sort(collate);
    const keep = src.value;
    clear(src); add(src, h("option", { value: "" }, "Todos"), srcs.map(s => h("option", { value: s }, s)));
    src.value = srcs.includes(keep) ? keep : "";
    draw();
  }
  function draw() {
    const term = norm(q.value);
    shown = rows.filter(l => (!stage.value || l.stage === stage.value) && (!src.value || l.src === src.value) && (!onlyNew.checked || !l.contactado)
      && (!term || norm([l.name, l.plan, l.tour, l.hotel, l.notes, l.leadId].join(" ")).includes(term)));
    const by = k => shown.filter(l => l.stage === k).length;
    stats.textContent = `${shown.length} leads · ${STAGES.map(([k, lab]) => `${lab}: ${by(k)}`).join(" · ")}${rows.length >= 500 ? " · (máx. 500: acorta el rango de fechas)" : ""}`;
    clear(out);
    if (!shown.length) add(out, emptyBox("No hay leads con esos filtros."));
    shown.forEach(l => add(out, leadCard(l, draw)));
  }
  [stage, src, onlyNew].forEach(el => el.addEventListener("change", draw));
  [from, to].forEach(el => el.addEventListener("change", load));
  q.addEventListener("input", debounce(draw, 150));
  add(view, 
    h("div", { class: "p-toolbar" }, labeled("Desde", from), labeled("Hasta", to), labeled("Etapa", stage), labeled("Origen", src), labeled("Buscar", q, "p-grow")),
    h("div", { class: "p-toolbar" }, checkField("Solo sin contactar", onlyNew), labeled("Formato CSV", sep),
      h("div", { class: "p-toolbar__end" }, btn("Actualizar", e => busy(e.currentTarget, load)),
        btn("Exportar CSV", () => download(`leads-${isoDay(new Date())}.csv`, toCSV(shown.map(plain), ["id", "creado", "stage", "name", "plan", "tour", "date", "party", "hotel", "access", "diet", "notes", "kit", "src", "lang", "link", "page", "leadId", "contactado", "contactadoEn", "clienteId"], sep.value), "text/csv;charset=utf-8")))),
    stats, out);
  await load();
}

function leadCard(l, redraw) {
  const done = !!l.contactado;
  return h("article", { class: "p-item" + (done ? " is-done" : "") },
    h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, l.name || "Sin nombre"), badge(STAGE_LABEL[l.stage] || l.stage, STAGE_KIND[l.stage]), done ? badge("Contactado", "ok") : null),
    kvList(kv("Recibido", fmtDateTime(l.creado)), kv("Itinerario", l.plan), kv("Experiencia", l.tour), kv("Fecha del viaje", l.date), kv("Personas", l.party),
      kv("Alojamiento", l.hotel), kv("Accesibilidad", l.access ? "Sí" : ""), kv("Alimentación", l.diet), kv("Notas", l.notes), kv("Kit", l.kit ? "Sí" : ""),
      kv("Origen", l.src), kv("Idioma", l.lang), kv("Página", l.page),
      done ? kv("Contactado por", `${userName(l.contactadoPor)} · ${fmtDateTime(l.contactadoEn)}`) : null,
      l.link && !ownTripLink(l.link) ? kv("Enlace (no verificado, no se abre)", h("span", { class: "p-break p-muted" }, String(l.link).slice(0, 300))) : null),
    h("div", { class: "p-actions" },
      ownTripLink(l.link) ? h("a", { class: "btn btn--ghost btn--sm", href: ownTripLink(l.link), target: "_blank", rel: "noopener noreferrer" }, "Abrir enlace del cliente") : null,
      btn(done ? "Marcar como no contactado" : "Marcar contactado", e => busy(e.currentTarget, async () => {
        const upd = done ? { contactado: false } : { contactado: true, contactadoPor: S.user.uid, contactadoEn: ts() };
        await fs.updateDoc(dref("leads", l.id), upd);
        Object.assign(l, upd, done ? {} : { contactadoEn: new Date() });
        redraw();
      }), done ? null : "btn--brand"),
      l.clienteId ? badge("Cliente creado", "ok") : btn("Crear cliente", () => {
        S.preset = { cliente: { nombre: l.name || "", idioma: l.lang || "es", origen: origenFromLead(l), notasInternas: leadSummary(l) }, leadId: l.id };
        S.tabsApi.select("clientes", true);
      })));
}

/* ---------- Clientes (CRM) ---------- */
// Clientes + su parte interna (clientes_privado: asesor, etiquetas, notas internas) en c._priv
async function loadClientesStaff(force) {
  if (!S.cache.clientes || force) {
    const [rows, privs] = await Promise.all([list(fs.query(col("clientes"), fs.orderBy("creado", "desc"), fs.limit(1000))), list(col("clientes_privado"))]);
    const pm = new Map(privs.map(p => [p.id, p]));
    rows.forEach(c => { c._priv = pm.get(c.id) || {}; });
    S.cache.clientes = rows;
  }
  return S.cache.clientes;
}

/* ---------- CRM: etapa, seguimiento, registro de contactos e historial (clientes_privado, solo equipo) ---------- */
const etapaLabel = v => (ETAPAS.find(e => e[0] === v) || [0, v])[1];
// Guarda con merge: no pisa asesor, etiquetas ni notas internas
async function savePriv(c, o) {
  await fs.setDoc(dref("clientes_privado", c.id), Object.assign({}, o, { actualizado: ts() }), { merge: true });
  c._priv = Object.assign({}, c._priv, o);
}
function crmControls(c, redraw) {
  const p = c._priv;
  const etSel = selectEl(ETAPAS, p.etapa || "nuevo", { id: uid("ce"), class: "p-crm-etapa" });
  const segIn = h("input", { type: "date", id: uid("cs"), class: "p-crm-seg", value: p.seguimiento || "" });
  const logHost = h("div", { class: "p-formhost" });
  const sel = cls => `[data-cid="${c.id}"] .${cls}`;
  etSel.addEventListener("change", () => busy(etSel, async () => {
    await savePriv(c, { etapa: etSel.value });
    notify(`${c.nombre}: ${etapaLabel(etSel.value)}.`);
    redraw(sel("p-crm-etapa"));
  }));
  segIn.addEventListener("change", () => busy(segIn, async () => {
    await savePriv(c, { seguimiento: segIn.value || null });
    notify(segIn.value ? `Seguimiento de ${c.nombre}: ${fmtDay(segIn.value)}.` : `Sin seguimiento para ${c.nombre}.`);
    redraw(sel("p-crm-seg"));
  }));
  return h("div", null,
    h("div", { class: "p-crm" }, labeled("Etapa", etSel), labeled("Próximo seguimiento", segIn),
      btn("Registrar contacto", () => logForm(logHost, c, () => redraw(sel("p-crm-log"))), "btn--brand p-crm-log")),
    logHost);
}
function logForm(host, c, done) {
  clear(host);
  const cur = c._priv.etapa;
  const f = formFields([
    { name: "medio", label: "Medio", type: "select", options: MEDIOS_CONTACTO },
    { name: "etapa", label: "Etapa después de este contacto", type: "select", options: ETAPAS },
    { name: "nota", label: "¿Qué se habló?", type: "textarea", max: 500, required: true, full: true, rows: 2 },
    { name: "seguimiento", label: "Próximo seguimiento", type: "date", hint: "Vacío = no hay que volver a contactarlo por ahora." }
  ], { medio: "whatsapp", etapa: cur && cur !== "nuevo" ? cur : "contactado" });
  const form = mkForm(async () => {
    const v = f.get();
    if (!v.nota) throw userErr("Escribe en pocas palabras qué se habló.");
    const entry = { f: new Date(), medio: v.medio, nota: v.nota.slice(0, 500), por: S.user.uid };
    await savePriv(c, { bitacora: [entry].concat(c._priv.bitacora || []).slice(0, MAX_BITACORA), etapa: v.etapa, seguimiento: v.seguimiento || null });
    notify(`Contacto con ${c.nombre} registrado.`);
    clear(host);
    done();
  }, f.el, h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary btn--sm" }, "Guardar"), btn("Cancelar", () => clear(host))));
  add(host, h("div", { class: "p-card p-card--form" }, h("h4", { class: "p-h3" }, "Registrar contacto con " + c.nombre), form));
  f.inputs.nota.focus();
}
// Historial: contactos registrados + reservas del cliente (se cargan al abrir)
function clientHistory(c) {
  const log = c._priv.bitacora || [];
  const res = h("div", null);
  let loaded = false;
  const d = h("details", { class: "p-details" }, h("summary", null, `Historial (${log.length} contacto${log.length === 1 ? "" : "s"})`),
    log.length ? h("ol", { class: "p-log" }, log.map(e => h("li", null,
      h("small", null, [fmtDateTime(e.f), (MEDIOS_CONTACTO.find(m => m[0] === e.medio) || [0, e.medio || ""])[1], e.por ? userName(e.por) : ""].filter(Boolean).join(" · ")),
      e.nota))) : h("p", { class: "p-muted" }, "Aún no hay contactos registrados."),
    res);
  d.addEventListener("toggle", () => {
    if (!d.open || loaded) return;
    loaded = true;
    add(res, loadingBox());
    list(fs.query(col("reservas"), fs.where("clienteId", "==", c.id))).then(rs => {
      clear(res);
      rs.sort((a, b) => String(b.fechaInicio || "").localeCompare(String(a.fechaInicio || "")));
      add(res, h("p", { class: "p-h4" }, rs.length ? `Reservas (${rs.length})` : "Sin reservas todavía."),
        rs.length ? h("ul", { class: "p-log" }, rs.map(r => h("li", null, h("b", null, r.code || r.id), " ", stBadge(r.estado),
          r.fechaInicio ? " " + fmtDay(r.fechaInicio) + (r.fechaFin && r.fechaFin !== r.fechaInicio ? " – " + fmtDay(r.fechaFin) : "") : ""))) : null);
    }).catch(e => { clear(res); add(res, errorBox(e)); });
  });
  return d;
}

async function staffClientes(view) {
  add(view, loadingBox());
  let rows = await loadClientesStaff(true);
  clear(view);
  const formHost = h("div", { class: "p-formhost" });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const org = selectEl([["", "Todos"]].concat(ORIGENES), "", { id: uid("o") });
  const ag = selectEl([["", "Todas"], ["__directo", "Venta directa"]].concat(S.dmcs.map(d => [d.id, d.nombre])), "", { id: uid("a") });
  const sep = sepSelect();
  const et = selectEl([["", "Todas"]].concat(ETAPAS), "", { id: uid("et") });
  const seg = selectEl([["", "Todos"], ["due", "Hoy y atrasados"], ["week", "Próximos 7 días"], ["none", "Sin fecha"]], S.crmFilter || "", { id: uid("sg") });
  S.crmFilter = null;
  const pipe = h("div", { class: "p-pipe", role: "group", "aria-label": "Clientes por etapa" });
  const count = h("p", { class: "p-count", role: "status" });
  const out = h("div", { class: "p-cards" });
  let shown = [];
  const reload = async () => { rows = await loadClientesStaff(true); draw(); };
  const etapaOf = c => c._priv.etapa || "nuevo";
  const t0 = () => isoDay(new Date());
  const week = () => isoDay(addDays(new Date(), 7));
  const due = c => !!c._priv.seguimiento && c._priv.seguimiento <= t0();
  function open(existing, prefill, leadId) {
    clientForm(formHost, existing, prefill, async id => {
      if (leadId && id) await fs.updateDoc(dref("leads", leadId), { clienteId: id }).catch(e => notify(errMsg(e), "error"));
      await reload();
    });
  }
  function draw(focusSel) {
    const term = norm(q.value);
    const sg = c => c._priv.seguimiento || "";
    shown = rows.filter(c => (!org.value || c.origen === org.value)
      && (!ag.value || (ag.value === "__directo" ? !c.dmcId : c.dmcId === ag.value))
      && (!et.value || etapaOf(c) === et.value)
      && (!seg.value || (seg.value === "due" ? due(c) : seg.value === "week" ? (!!sg(c) && sg(c) <= week()) : !sg(c)))
      && (!term || norm([c.nombre, c.email, c.telefono, c.pais, (c._priv.etiquetas || []).join(" ")].join(" ")).includes(term)));
    // Primero los que hay que contactar (por fecha); el resto como llega (más recientes primero)
    shown = shown.map((c, i) => [c, i]).sort((a, b) => {
      const da = due(a[0]) || (seg.value && sg(a[0])) ? sg(a[0]) : "", db = due(b[0]) || (seg.value && sg(b[0])) ? sg(b[0]) : "";
      if (da && db) return da.localeCompare(db) || a[1] - b[1];
      if (da || db) return da ? -1 : 1;
      return a[1] - b[1];
    }).map(x => x[0]);
    clear(pipe);
    const nDue = rows.filter(due).length;
    ETAPAS.forEach(([v, l]) => {
      const n = rows.filter(c => etapaOf(c) === v).length;
      add(pipe, h("button", { type: "button", class: "p-pipe__btn", "aria-pressed": String(et.value === v), onclick: () => { et.value = et.value === v ? "" : v; draw(); } }, l, h("b", null, String(n))));
    });
    if (nDue) add(pipe, h("button", { type: "button", class: "p-pipe__btn p-pipe__btn--due", "aria-pressed": String(seg.value === "due"), onclick: () => { seg.value = seg.value === "due" ? "" : "due"; draw(); } }, "📅 Para hoy o atrasados", h("b", null, String(nDue))));
    count.textContent = `${shown.length} de ${rows.length} clientes`;
    clear(out);
    if (!shown.length) add(out, emptyBox(rows.length ? "Ningún cliente con esos filtros." : "Aún no hay clientes."));
    shown.forEach(c => add(out, h("article", { class: "p-item", "data-cid": c.id },
      h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, c.nombre), badge((ORIGENES.find(o => o[0] === c.origen) || [0, c.origen])[1]),
        badge(etapaLabel(etapaOf(c)), ETAPA_KIND[etapaOf(c)]),
        c._priv.seguimiento ? badge("📅 " + (c._priv.seguimiento === t0() ? "Hoy" : fmtDay(c._priv.seguimiento)), c._priv.seguimiento < t0() ? "bad" : c._priv.seguimiento === t0() ? "warn" : "") : null),
      crmControls(c, sel => draw(sel)),
      kvList(
        kv("Correo", c.email ? h("a", { href: "mailto:" + c.email }, c.email) : ""),
        kv("Teléfono", c.telefono ? (digits(c.telefono).length >= 8 ? h("a", { href: waLink(c.telefono), target: "_blank", rel: "noopener" }, c.telefono) : c.telefono) : ""),
        kv("País", c.pais), kv("Idioma", c.idioma), kv("Agencia", dmcName(c.dmcId)), kv("Asesor", c._priv.asesorId ? userName(c._priv.asesorId) : ""),
        kv("Etiquetas", (c._priv.etiquetas || []).join(", ")), kv(c.dmcId ? "Notas compartidas (las ve la agencia)" : "Notas compartidas", c.notas),
        kv("Notas internas", c._priv.notasInternas),
        kv("Habeas data", c.consentimiento ? `Autorizó el ${fmtDay(c.consentimiento.fecha)} · versión ${c.consentimiento.version} · ${c.consentimiento.medio || ""}` : "")),
      clientHistory(c),
      h("div", { class: "p-actions" },
        btn("Editar", () => open(c)),
        btn("Nueva reserva", () => { S.preset = { reserva: { clienteId: c.id, name: c.nombre, lang: c.idioma, phone: digits(c.telefono), dmcId: c.dmcId || "", asesorId: c._priv.asesorId || "" } }; S.tabsApi.select("reservas", true); }, "btn--brand"),
        btn("Eliminar", e => {
          if (!window.confirm(`¿Eliminar a ${c.nombre}? Se borran sus datos del CRM (no sus reservas). No se puede deshacer.`)) return;
          busy(e.currentTarget, async () => { await commit([b => b.delete(dref("clientes_privado", c.id)), b => b.delete(dref("clientes", c.id))]); notify("Cliente eliminado."); await reload(); });
        })))));
    if (focusSel) { const el = out.querySelector(focusSel); if (el) el.focus(); }
  }
  [org, ag, et, seg].forEach(el => el.addEventListener("change", () => draw()));
  q.addEventListener("input", debounce(() => draw(), 150));
  add(view, 
    h("div", { class: "p-toolbar" }, labeled("Buscar", q, "p-grow"), labeled("Etapa", et), labeled("Seguimiento", seg), labeled("Origen", org), labeled("Agencia", ag), labeled("Formato CSV", sep),
      h("div", { class: "p-toolbar__end" }, btn("Nuevo cliente", () => open(null), "btn--primary"),
        btn("Exportar CSV", () => download(`clientes-${isoDay(new Date())}.csv`, toCSV(shown.map(c => plain(Object.assign({}, c, { asesorId: c._priv.asesorId || "", etiquetas: c._priv.etiquetas || [], notasInternas: c._priv.notasInternas || "", etapa: etapaOf(c), seguimiento: c._priv.seguimiento || "", contactos: (c._priv.bitacora || []).length }))), ["id", "nombre", "email", "telefono", "pais", "idioma", "origen", "dmcId", "asesorId", "etapa", "seguimiento", "contactos", "etiquetas", "notas", "notasInternas", "consentimiento", "creado"], sep.value), "text/csv;charset=utf-8")))),
    formHost, pipe, count, out);
  draw();
  if (S.preset && S.preset.cliente) { const p = S.preset; S.preset = null; open(null, p.cliente, p.leadId); }
}

/* ---------- Reservas ---------- */
async function newBookingCode() {
  for (let i = 0; i < 6; i++) {
    const code = randomCode(10);
    const snap = await fs.getDoc(dref("reservas", code));
    if (!snap.exists()) return code;
  }
  throw userErr("No se pudo generar un código único. Inténtalo de nuevo.");
}
function statusText(estado, lang) {
  const es = { borrador: "borrador", pendiente: "pendiente", confirmada: "confirmada", en_curso: "en curso", finalizada: "finalizada", cancelada: "cancelada" };
  const en = { borrador: "draft", pendiente: "pending", confirmada: "confirmed", en_curso: "in progress", finalizada: "completed", cancelada: "cancelled" };
  return (lang === "es" ? es : en)[estado] || estado;
}
const titleText = x => (typeof x === "string" ? x : (x && (x.es || x.en || Object.values(x)[0])) || "");

function itineraryEditor(items) {
  const listEl = h("ol", { class: "p-itin" });
  const rows = [];
  const tourOpts = [["", "— Actividad libre (sin tour) —"]].concat(S.tours.list.map(x => [x.id_web, `${x.nombre} · ${x.codigo}`]));
  const lastDate = () => { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].date.value) return rows[i].date.value; return ""; };
  function addRow(it) {
    it = it || {};
    if (rows.length >= MAX_ITIN) { notify(`Máximo ${MAX_ITIN} actividades por reserva.`, "error"); return; }
    const row = { orig: it.title };
    row.date = h("input", { type: "date", id: uid("d"), value: it.date || "" });
    row.time = h("input", { type: "time", id: uid("t"), value: it.time || "" });
    row.tour = selectEl(tourOpts, S.tours.byId.has(it.tourId) ? it.tourId : "", { id: uid("tour") });
    row.title = h("input", { type: "text", id: uid("ti"), maxlength: 160, value: titleText(it.title) });
    row.maps = h("input", { type: "url", id: uid("m"), maxlength: 500, value: it.maps || "", placeholder: "https://…" });
    row.tour.addEventListener("change", () => { const x = S.tours.byId.get(row.tour.value); if (x && !row.title.value.trim()) row.title.value = x.nombre; });
    row.el = h("li", { class: "p-itin__row" },
      h("div", { class: "p-grid p-grid--itin" },
        labeled("Fecha", row.date), labeled("Hora", row.time), labeled("Tour del portafolio", row.tour, "p-span2"),
        labeled("Título que verá el viajero", row.title, "p-span2"), labeled("Enlace de mapa (opcional, https)", row.maps, "p-span2")),
      h("div", { class: "p-actions" }, btn("Quitar actividad", () => { rows.splice(rows.indexOf(row), 1); row.el.remove(); })));
    rows.push(row);
    add(listEl, row.el);
  }
  (items && items.length ? items.slice(0, MAX_ITIN) : [{}]).forEach(it => addRow(it));
  return {
    el: h("fieldset", { class: "p-fieldset" }, h("legend", null, "Itinerario (lo ve el viajero)"),
      h("p", { class: "p-hint" }, `Cada actividad necesita fecha y título (máx. ${MAX_ITIN}). Se ordenan solas por fecha y hora. Si eliges un tour y dejas el mapa vacío, se arma un enlace de búsqueda en Google Maps.`),
      listEl, btn("+ Añadir actividad", () => { addRow({ date: lastDate() }); const r = rows[rows.length - 1]; if (r) r.time.focus(); })),
    get(area) {
      const out = [];
      for (const r of rows) {
        const date = r.date.value, tm = r.time.value, tourId = r.tour.value, title = r.title.value.trim().slice(0, 160);
        const raw = r.maps.value.trim();
        if (!date && !tm && !tourId && !title && !raw) continue;
        if (!date || !title) { (date ? r.title : r.date).focus(); throw userErr("Cada actividad del itinerario necesita fecha y título."); }
        let maps = "";
        if (raw) { maps = httpsUrl(raw); if (!maps) { r.maps.focus(); throw userErr("Los enlaces de mapa deben empezar por https:// (sin espacios)."); } }
        if (!maps && tourId) maps = mapsSearch(title + " " + (area || ""));
        const keepObj = r.orig && typeof r.orig === "object" && titleText(r.orig) === title;
        out.push({ date, time: tm, tourId, title: keepObj ? r.orig : title, maps });
      }
      out.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
      return out;
    }
  };
}

/**
 * Reserva = 2 documentos guardados en el mismo lote:
 *  - reservas/{código}: interna (nombre completo, WhatsApp, preferencias, pago, vínculos) → staff y agencia dueña.
 *  - reservas_publicas/{código}: lo que ve el viajero en viaje.html (buildPublicBooking).
 */
async function reservaForm(host, existing, prefill, onDone) {
  clear(host); add(host, loadingBox());
  await S.jennyP;
  const [clientes, prefixes, pubSnap] = await Promise.all([
    loadClientesStaff(), loadPagos(true), existing ? fs.getDoc(dref("reservas_publicas", existing.id)) : Promise.resolve(null)
  ]);
  const pub = pubSnap && pubSnap.exists() ? pubSnap.data() : {};
  clear(host);
  const b = existing || {}, p = prefill || {};
  const ct = (S.jenny && S.jenny.contacto) || {};
  const hostPhone = digits(ct.whatsapp);
  const oldHotel = pub.hotel || {};
  const v0 = {
    clienteId: b.clienteId || p.clienteId || "", name: b.name || p.name || "",
    nombrePublico: b.nombrePublico || pub.name || first(b.name || p.name || ""),
    lang: TRAVEL_LANGS.some(l => l[0] === (b.lang || p.lang)) ? (b.lang || p.lang) : "es",
    party: b.party || p.party || "", phone: b.phone || p.phone || "",
    estado: b.estado || "pendiente", dmcId: b.dmcId || p.dmcId || "",
    asesorId: b.asesorId || p.asesorId || (S.profile.rol === "asesor" ? S.user.uid : ""), region: pub.region || "Eje Cafetero",
    host_name: pub.host ? pub.host.name : "Anfitrión Espontáneos", host_phone: pub.host ? pub.host.phone : hostPhone,
    driver_name: pub.driver ? pub.driver.name : "Conductor de recogida", driver_phone: pub.driver ? pub.driver.phone : hostPhone,
    guide_name: pub.guide ? pub.guide.name : "Por asignar", guide_langs: ((pub.guide && pub.guide.langs) || [p.lang || "es"]).join(", "),
    hotel_name: oldHotel.name || p.hotel || "", hotel_area: oldHotel.area || "", hotel_maps: oldHotel.maps || "",
    hotel_lat: oldHotel.lat != null ? oldHotel.lat : "", hotel_lon: oldHotel.lon != null ? oldHotel.lon : "",
    accessible: !!(b.prefs && b.prefs.accessible), babySeat: !!(b.prefs && b.prefs.babySeat), diet: (b.prefs && b.prefs.diet) || "",
    imagen: !!(b.prefs && b.prefs.imagen),
    anticipo: b.pago && b.pago.anticipo != null ? b.pago.anticipo : "", saldo: b.pago && b.pago.saldo != null ? b.pago.saldo : "",
    moneda: (b.pago && b.pago.moneda) || "COP", enlace: (b.pago && b.pago.enlace) || ""
  };
  const fV = formFields([
    { name: "clienteId", label: "Cliente del CRM", type: "select", options: [["", "— Sin vincular —"]].concat(clientes.map(x => [x.id, x.nombre + (x.email ? " · " + x.email : "")])) },
    { name: "name", label: "Nombre completo (interno)", required: true, max: 120 },
    { name: "nombrePublico", label: "Saludo en el enlace del viajero", required: true, max: 60, hint: "Es lo único del nombre que ve quien abra el enlace. Usa el nombre de pila (ej. Laura)." },
    { name: "lang", label: "Idioma del viajero", type: "select", options: TRAVEL_LANGS },
    { name: "party", label: "Personas", type: "number", required: true, inputmode: "numeric", attrs: { min: 1, max: 500, step: 1 } },
    { name: "phone", label: "WhatsApp del viajero (interno)", type: "tel", max: 30, hint: "Con indicativo, ej. 573001234567. Sirve para enviarle el enlace; no se publica." }
  ], v0);
  let pubTouched = !!existing;
  fV.inputs.nombrePublico.addEventListener("input", () => { pubTouched = true; });
  fV.inputs.name.addEventListener("input", () => { if (!pubTouched) fV.inputs.nombrePublico.value = first(fV.inputs.name.value).slice(0, 60); });
  const fO = formFields([
    { name: "estado", label: "Estado", type: "select", options: ESTADOS_RESERVA.map(e => [e, I18N.es["st_" + e]]) },
    { name: "dmcId", label: "DMC", type: "select", options: [["", "— Venta directa —"]].concat(S.dmcs.map(d => [d.id, d.nombre])) },
    { name: "asesorId", label: "Asesor", type: "select", options: [["", "— Sin asignar —"]].concat(advisors().map(u => [u.id, u.nombre || u.email])) },
    { name: "region", label: "Región (pública)", max: 120 }
  ], v0);
  const fT = formFields([
    { name: "host_name", label: "Anfitrión", max: 80 }, { name: "host_phone", label: "WhatsApp del anfitrión", type: "tel", max: 30 },
    { name: "driver_name", label: "Conductor", max: 80 }, { name: "driver_phone", label: "WhatsApp del conductor", type: "tel", max: 30 },
    { name: "guide_name", label: "Guía", max: 80 }, { name: "guide_langs", label: "Idiomas del guía", max: 40, hint: "Códigos separados por coma: es, en, fr, de, pt" }
  ], v0);
  const fH = formFields([
    { name: "hotel_name", label: "Hotel", max: 120 }, { name: "hotel_area", label: "Zona o ciudad", max: 80 },
    { name: "hotel_maps", label: "Enlace de mapa del hotel (https)", type: "url", max: 500, hint: "Si lo dejas vacío se arma con el nombre y la zona." },
    { name: "hotel_lat", label: "Latitud (opcional)", type: "number", attrs: { min: -90, max: 90, step: "any" } },
    { name: "hotel_lon", label: "Longitud (opcional)", type: "number", attrs: { min: -180, max: 180, step: "any" } }
  ], v0);
  const fPref = formFields([
    { name: "diet", label: "Alimentación", max: 120, hint: "Solo lo necesario (ej. vegetariano). Sin datos médicos." },
    { name: "accessible", label: "Requiere accesibilidad", type: "checkbox" }, { name: "babySeat", label: "Silla para bebé", type: "checkbox" },
    { name: "imagen", label: "Autoriza el uso de fotos y videos donde aparezca (web y redes). Menores: solo con autorización escrita de su acudiente.", type: "checkbox" }
  ], v0);
  const fP = formFields([
    { name: "anticipo", label: "Anticipo", type: "number", attrs: { min: 0, step: "any" } }, { name: "saldo", label: "Saldo", type: "number", attrs: { min: 0, step: "any" } },
    { name: "moneda", label: "Moneda", type: "select", options: MONEDAS },
    { name: "enlace", label: "Enlace de pago para el viajero", type: "url", max: 500, full: true,
      hint: prefixes.length ? "Solo se acepta si empieza por un enlace oficial (Administración → Pagos): " + prefixes.join(" · ")
        : "Aún no hay enlaces oficiales de pago configurados (Administración → Pagos): déjalo vacío." }
  ], v0);
  const itin = itineraryEditor(pub.itinerary || p.itinerary || []);
  fV.inputs.clienteId.addEventListener("change", () => {
    const x = clientes.find(c => c.id === fV.inputs.clienteId.value);
    if (!x) return;
    if (!fV.inputs.name.value.trim()) { fV.inputs.name.value = x.nombre; if (!pubTouched) fV.inputs.nombrePublico.value = first(x.nombre).slice(0, 60); }
    if (x.idioma && TRAVEL_LANGS.some(l => l[0] === x.idioma)) fV.inputs.lang.value = x.idioma;
    if (!fV.inputs.phone.value && x.telefono) fV.inputs.phone.value = digits(x.telefono);
    if (x.dmcId && !fO.inputs.dmcId.value) fO.inputs.dmcId.value = x.dmcId;
  });
  const info = p.solicitudInfo;
  const form = mkForm(async () => {
    const v = Object.assign({}, fV.get(), fO.get(), fT.get(), fH.get(), fPref.get(), fP.get());
    const party = parseInt(v.party, 10);
    if (!(party >= 1 && party <= 500)) throw userErr("Indica el número de personas (1 a 500).");
    const items = itin.get(v.hotel_area);
    let hotelMaps = "";
    if (v.hotel_maps) { hotelMaps = httpsUrl(v.hotel_maps); if (!hotelMaps) throw userErr("El enlace de mapa del hotel debe empezar por https:// (sin espacios)."); }
    const autoOld = oldHotel.name ? mapsSearch(oldHotel.name + " " + (oldHotel.area || "")) : "";
    if ((!hotelMaps || hotelMaps === autoOld) && v.hotel_name) hotelMaps = mapsSearch(v.hotel_name + " " + v.hotel_area);
    const lat = v.hotel_lat === "" ? null : Number(v.hotel_lat), lon = v.hotel_lon === "" ? null : Number(v.hotel_lon);
    if ((lat == null) !== (lon == null) || (lat != null && !(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)))
      throw userErr("Coordenadas del hotel no válidas: llena latitud (−90 a 90) y longitud (−180 a 180), o deja ambas vacías.");
    const enlace = v.enlace ? httpsUrl(v.enlace) : "";
    if (v.enlace && !enlace) throw userErr("El enlace de pago debe empezar por https:// (sin espacios).");
    if (enlace && !payLinkFor(enlace, prefixes)) {
      throw userErr(prefixes.length
        ? "Ese enlace de pago no empieza por ninguno de los enlaces oficiales (Administración → Pagos). Déjalo vacío o pide que lo agreguen."
        : "Aún no hay enlaces oficiales de pago configurados (Administración → Pagos). Deja el enlace vacío.");
    }
    const num = x => (x === "" || x == null ? null : Number(x));
    const anticipo = num(v.anticipo), saldo = num(v.saldo);
    if ([anticipo, saldo].some(x => x != null && !(x >= 0 && x <= 1e9))) throw userErr("Anticipo y saldo deben ser números positivos.");
    const code = existing ? existing.id : await newBookingCode();
    const pubDoc = buildPublicBooking({
      code, lang: v.lang, name: v.nombrePublico, party, status: statusText(v.estado, v.lang), region: v.region,
      host: { name: v.host_name, phone: v.host_phone }, driver: { name: v.driver_name, phone: v.driver_phone },
      guide: { name: v.guide_name, langs: splitList(v.guide_langs) },
      hotel: { name: v.hotel_name, area: v.hotel_area, maps: hotelMaps, lat, lon },
      itinerary: items, payLink: enlace
    }, prefixes);
    const dates = items.map(i => i.date).filter(Boolean).sort();
    const priv = {
      code, name: v.name, nombrePublico: pubDoc.name, lang: v.lang, party, phone: digits(v.phone),
      prefs: { accessible: v.accessible, babySeat: v.babySeat, diet: v.diet.slice(0, 120), imagen: v.imagen },
      pago: { anticipo, saldo, moneda: v.moneda, enlace },
      clienteId: v.clienteId || null, dmcId: v.dmcId || null, asesorId: v.asesorId || null,
      solicitudId: (existing && existing.solicitudId) || p.solicitudId || null, estado: v.estado,
      fechaInicio: dates[0] || "", fechaFin: dates[dates.length - 1] || "", actividades: items.length,
      hotelNombre: v.hotel_name.slice(0, 120), actualizado: ts()
    };
    if (!existing) Object.assign(priv, { creado: ts(), creadoPor: S.user.uid });
    await commit([
      bt => (existing ? bt.update(dref("reservas", code), priv) : bt.set(dref("reservas", code), priv)),
      bt => bt.set(dref("reservas_publicas", code), pubDoc)
    ]);
    if (!existing && p.solicitudId) {
      const upd = { reservaId: code, actualizado: ts() };
      if (p.solicitudEstado === "nueva") upd.estado = "en_proceso";
      await fs.updateDoc(dref("solicitudes", p.solicitudId), upd).catch(e => notify(errMsg(e), "error"));
    }
    notify(existing ? "Reserva actualizada." : "Reserva creada.");
    if (onDone) onDone(code, { phone: priv.phone, lang: v.lang });
  },
  info ? h("div", { class: "p-note" }, h("strong", null, `Solicitud de ${dmcName(info.dmcId)}: `),
    [info.necesidades && "Necesidades: " + info.necesidades, info.notas && "Notas: " + info.notas, info.fecha_fin && "Hasta: " + info.fecha_fin].filter(Boolean).join(" · ") || "sin notas adicionales.") : null,
  group("Viajero", fV.el), group("Organización interna", fO.el), itin.el, group("Equipo en destino (lo ve el viajero)", fT.el),
  group("Alojamiento (lo ve el viajero)", fH.el), group("Preferencias (internas)", fPref.el), group("Pago", fP.el),
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, existing ? "Guardar cambios" : "Crear reserva y generar enlace"), btn("Cancelar", () => clear(host))));
  add(host, h("div", { class: "p-card p-card--form" },
    h("h2", { class: "p-h2" }, existing ? `Editar reserva ${existing.id}` : "Nueva reserva"),
    h("p", { class: "p-note" }, "Quien tenga el enlace ve: saludo, personas, estado, región, equipo en destino, hotel, itinerario y el enlace de pago oficial. El nombre completo, WhatsApp, preferencias, montos y vínculos internos quedan privados."),
    form));
  focusHeading(host);
}

async function staffReservas(view) {
  const formHost = h("div", { class: "p-formhost" });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off", placeholder: "Código o nombre" });
  const est = selectEl([["", "Todos"]].concat(ESTADOS_RESERVA.map(e => [e, I18N.es["st_" + e]])), "", { id: uid("e") });
  const ag = selectEl([["", "Todas"], ["__directo", "Venta directa"]].concat(S.dmcs.map(d => [d.id, d.nombre])), "", { id: uid("a") });
  const count = h("p", { class: "p-count", role: "status" });
  const out = h("div", { class: "p-cards" });
  let rows = [];
  async function load() {
    clear(out); add(out, loadingBox());
    try { rows = await list(fs.query(col("reservas"), fs.orderBy("creado", "desc"), fs.limit(500))); }
    catch (e) { clear(out); add(out, errorBox(e, load)); return; }
    draw();
  }
  function showLink(code, booking) {
    clear(formHost);
    add(formHost, h("div", { class: "p-card" }, h("h2", { class: "p-h2" }, `Enlace del viajero · ${code}`), shareBox(code, booking.phone, booking.lang),
      h("div", { class: "p-form-actions" }, btn("Cerrar", () => clear(formHost)))));
    focusHeading(formHost);
  }
  function open(existing, prefill) {
    reservaForm(formHost, existing, prefill, (code, booking) => { showLink(code, booking); load(); })
      .catch(e => { clear(formHost); add(formHost, errorBox(e)); });
  }
  function draw() {
    const term = norm(q.value);
    const shown = rows.filter(b => (!est.value || b.estado === est.value)
      && (!ag.value || (ag.value === "__directo" ? !b.dmcId : b.dmcId === ag.value))
      && (!term || norm([b.id, b.name, b.hotelNombre].join(" ")).includes(term)));
    count.textContent = `${shown.length} de ${rows.length} reservas`;
    clear(out);
    if (!shown.length) add(out, emptyBox(rows.length ? "Ninguna reserva con esos filtros." : "Aún no hay reservas."));
    shown.forEach(b => {
      const holder = h("div");
      const toggle = btn("Enlace y QR", () => {
        const opened = holder.firstChild; clear(holder);
        if (!opened) add(holder, shareBox(b.id, b.phone, b.lang));
        toggle.setAttribute("aria-expanded", String(!opened));
      }, null, { "aria-expanded": "false" });
      add(out, h("article", { class: "p-item" },
        h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, b.name || "—"), stBadge(b.estado), h("span", { class: "p-mono p-muted" }, b.id)),
        kvList(kv("Fechas", itinDates(b)), kv("Personas", b.party), kv("Hotel", b.hotelNombre), kv("Agencia", dmcName(b.dmcId)),
          kv("Asesor", b.asesorId ? userName(b.asesorId) : ""), kv("Actividades", b.actividades),
          kv("Pago", b.pago && (b.pago.anticipo != null || b.pago.saldo != null) ? `Anticipo ${b.pago.anticipo != null ? money(b.pago.anticipo, b.pago.moneda) : "—"} · Saldo ${b.pago.saldo != null ? money(b.pago.saldo, b.pago.moneda) : "—"}` : "")),
        h("div", { class: "p-actions" },
          btn("Editar", () => open(b), "btn--brand"), toggle,
          btn("Eliminar", e => {
            if (!window.confirm(`¿Eliminar la reserva ${b.id} de ${b.name}? El enlace del viajero dejará de funcionar. No se puede deshacer.`)) return;
            busy(e.currentTarget, async () => {
              await commit([bt => bt.delete(dref("reservas_publicas", b.id)), bt => bt.delete(dref("reservas", b.id))]);
              notify("Reserva eliminada."); await load();
            });
          })),
        holder));
    });
  }
  [est, ag].forEach(el => el.addEventListener("change", draw));
  q.addEventListener("input", debounce(draw, 150));
  add(view,
    h("div", { class: "p-toolbar" }, labeled("Buscar", q, "p-grow"), labeled("Estado", est), labeled("Agencia", ag),
      h("div", { class: "p-toolbar__end" }, btn("Nueva reserva", () => open(null), "btn--primary"), btn("Actualizar", e => busy(e.currentTarget, load)))),
    formHost, count, out);
  if (S.preset && S.preset.reserva) { const p = S.preset.reserva; S.preset = null; open(null, p); }
  await load();
}

/* ---------- Solicitudes de agencias ---------- */
async function staffSolicitudes(view) {
  await S.jennyP;
  const est = selectEl([["", "Todas"]].concat(ESTADOS_SOLICITUD.map(e => [e, I18N.es["st_" + e]])), "nueva", { id: uid("e") });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const count = h("p", { class: "p-count", role: "status" });
  const out = h("div", { class: "p-cards" });
  let rows = [], firstLoad = true;
  async function load() {
    clear(out); add(out, loadingBox());
    try { rows = await list(fs.query(col("solicitudes"), fs.orderBy("creado", "desc"), fs.limit(500))); }
    catch (e) { clear(out); add(out, errorBox(e, load)); return; }
    if (firstLoad && !rows.some(r => r.estado === "nueva")) est.value = ""; // sin nuevas: mostrar todas
    firstLoad = false;
    draw();
  }
  function draw() {
    const term = norm(q.value);
    const shown = rows.filter(s => (!est.value || s.estado === est.value) && (!term || norm([s.viajero, dmcName(s.dmcId), s.creadoPorEmail, s.hotel].join(" ")).includes(term)));
    count.textContent = `${shown.length} de ${rows.length} solicitudes`;
    clear(out);
    if (!shown.length) add(out, emptyBox("No hay solicitudes con esos filtros."));
    shown.forEach(s => add(out, solicitudCard(s, draw)));
  }
  est.addEventListener("change", draw);
  q.addEventListener("input", debounce(draw, 150));
  add(view, h("div", { class: "p-toolbar" }, labeled("Estado", est), labeled("Buscar", q, "p-grow"), h("div", { class: "p-toolbar__end" }, btn("Actualizar", e => busy(e.currentTarget, load)))), count, out);
  await load();
}

function solicitudCard(s, redraw) {
  const est = selectEl(ESTADOS_SOLICITUD.map(e => [e, I18N.es["st_" + e]]), s.estado, { id: uid("se") });
  const resp = h("textarea", { id: uid("resp"), rows: 2, maxlength: 2000, value: s.respuesta || "" });
  const ase = selectEl([["", "— Sin asignar —"]].concat(advisors().map(u => [u.id, u.nombre || u.email])), s.asesorId || "", { id: uid("as") });
  const save = btn("Guardar", e => busy(e.currentTarget, async () => {
    const upd = { estado: est.value, respuesta: resp.value.trim(), asesorId: ase.value || null, actualizado: ts() };
    await fs.updateDoc(dref("solicitudes", s.id), upd);
    Object.assign(s, upd);
    notify("Solicitud actualizada. La agencia verá el estado y la respuesta en su portal.");
    redraw();
  }), "btn--primary");
  const mkRes = s.reservaId ? badge("Reserva " + s.reservaId, "ok") : btn("Crear reserva desde esta solicitud", () => {
    S.preset = { reserva: {
      dmcId: s.dmcId, clienteId: s.clienteId || "", name: s.viajero, party: s.pax, lang: s.idioma, hotel: s.hotel,
      asesorId: s.asesorId || "", solicitudId: s.id, solicitudEstado: s.estado, solicitudInfo: s,
      itinerary: (s.tours || []).map(x => ({ date: s.fecha_inicio, time: "", tourId: S.tours.byId.has(x.tour_id) ? x.tour_id : "", title: x.nombre || x.codigo || "" }))
    } };
    S.tabsApi.select("reservas", true);
  }, "btn--brand");
  return h("article", { class: "p-item" },
    h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, s.viajero), stBadge(s.estado), badge(dmcName(s.dmcId))),
    kvList(kv("Enviada", `${fmtDateTime(s.creado)} · ${s.creadoPorEmail || userName(s.creadoPor)}`),
      kv("Tours", (s.tours || []).map(x => `${x.nombre || ""} (${x.codigo || x.tour_id || ""})`).join(" · ")),
      kv("Fechas", s.fecha_fin ? `${s.fecha_inicio} → ${s.fecha_fin}` : s.fecha_inicio), kv("Pasajeros", s.pax), kv("Hotel", s.hotel),
      kv("Idioma del guía", s.idioma), kv("Necesidades", s.necesidades), kv("Notas", s.notas)),
    h("div", { class: "p-grid" }, labeled("Estado", est), labeled("Asesor", ase), labeled("Respuesta para la agencia", resp, "p-field--full")),
    h("div", { class: "p-actions" }, save, mkRes));
}

/* ==========================================================================
   ADMINISTRACIÓN
   ========================================================================== */
async function uniqueDmcId(base) {
  const b = (slugify(base) || "agencia").slice(0, 50);
  const root = b.length >= 2 ? b : b + "-dmc";
  for (let i = 1; i <= 30; i++) {
    const id = i === 1 ? root : `${root}-${i}`;
    const snap = await fs.getDoc(dref("dmcs", id));
    if (!snap.exists()) return id;
  }
  throw userErr("No se pudo generar un identificador único para la agencia.");
}
async function createDmcFromSolicitud(u) {
  const s = u.solicitud || {};
  const id = await uniqueDmcId(s.agencia || u.nombre);
  const data = {
    nombre: s.agencia || u.nombre, nit: s.nit || "", pais: s.pais || "", ciudad: s.ciudad || "", contacto: s.contacto || u.nombre,
    email: u.email || "", telefono: s.telefono || u.whatsapp || "", activo: true, creado: ts(), actualizado: ts()
  };
  // Web y mensaje de la solicitud → notas internas (la agencia no las ve)
  const notas = [s.web && "Web: " + s.web, s.mensaje].filter(Boolean).join("\n").slice(0, 2000);
  await commit([bt => bt.set(dref("dmcs", id), data), bt => bt.set(dref("dmcs_privado", id), { notas, actualizado: ts() })]);
  S.dmcs.push(Object.assign({ id }, data, { creado: new Date() }));
  S.dmcs.sort((a, b) => collate(a.nombre, b.nombre));
  return id;
}

/* ---------- Aprobación rápida desde el correo de aviso ---------- */
async function setUser(u, o) {
  const upd = Object.assign({ rol: u.rol, estado: u.estado, dmcId: u.dmcId || null }, o, { actualizado: ts() });
  if (upd.rol !== "dmc") upd.dmcId = null;
  await fs.updateDoc(dref("users", u.id), upd);
  Object.assign(u, upd);
}
function approvalCard(host) {
  const a = S.approval;
  const u = S.users.find(x => x.id === a.uid);
  const close = () => { S.approval = null; clearHash(); clear(host); };
  const finish = r => { S.approval = null; clearHash(); S.approvalDone = { u, r }; renderStaffApp(); };
  const card = (title, ...kids) => add(host, h("section", { class: "p-card p-approve" }, h("h2", { class: "p-h2" }, title), ...kids));
  if (!u) return card("Solicitud no encontrada", h("p", null, "Esa cuenta ya no existe o el enlace llegó incompleto."), h("div", { class: "p-actions" }, btn("Cerrar", close)));
  if (u.id === S.user.uid) return card("Es tu propia cuenta", h("p", null, "No puedes cambiar tu propio rol ni estado."), h("div", { class: "p-actions" }, btn("Cerrar", close)));
  if (u.estado !== "pendiente") return card("Esta solicitud ya se atendió",
    h("p", null, `${u.nombre || u.email}: ${roleLabel(u.rol)} · ${u.estado}${u.dmcId ? " · " + dmcName(u.dmcId) : ""}. Si hace falta cambiar algo, hazlo en la pestaña Usuarios.`),
    h("div", { class: "p-actions" }, btn("Cerrar", close)));
  const s = u.solicitud || {};
  const who = kvList(kv("Agencia", s.agencia), kv("NIT / Tax ID", s.nit), kv("País", s.pais), kv("Ciudad", s.ciudad),
    kv("Persona", u.nombre), kv("Correo", u.email), kv("WhatsApp", u.whatsapp), kv("Mensaje", s.mensaje));
  if (a.rol === "no") return card("¿Rechazar esta solicitud?", who,
    h("p", { class: "p-muted" }, "La cuenta queda bloqueada y no podrá entrar al portal. Si te equivocas, la reactivas en la pestaña Usuarios."),
    h("div", { class: "p-actions" },
      btn("Sí, rechazar", e => busy(e.currentTarget, async () => { await setUser(u, { estado: "bloqueado" }); finish("no"); }), "btn--primary"),
      btn("Cancelar", close)));
  const rolSel = selectEl([["dmc", "DMC"], ["asesor", "Asesor del equipo"], ["admin", "Administrador"]], a.rol, { id: uid("ar") });
  // Agencia que ya existe con el mismo NIT o nombre (p. ej. un segundo usuario de la misma agencia)
  const same = S.dmcs.find(d => (digits(s.nit) && digits(d.nit) === digits(s.nit)) || (s.agencia && norm(d.nombre) === norm(s.agencia)));
  const note = h("p", { class: "p-hint" });
  const sync = () => {
    note.textContent = rolSel.value !== "dmc" ? "Tendrá acceso interno del equipo (leads, clientes y reservas)."
      : u.dmcId ? `Queda vinculado a la agencia ${dmcName(u.dmcId)}.`
      : same ? `Se vinculará a la agencia que ya existe: ${same.nombre}.` : "Se creará la agencia con los datos de la solicitud.";
  };
  rolSel.addEventListener("change", sync); sync();
  card("Aprobar solicitud de acceso", who, h("div", { class: "p-grid" }, labeled("Aprobar como", rolSel)), note,
    h("div", { class: "p-actions" },
      btn("Aprobar", e => busy(e.currentTarget, async () => {
        const r = rolSel.value;
        const d = r !== "dmc" ? null : (u.dmcId || (same && same.id) || await createDmcFromSolicitud(u));
        await setUser(u, { rol: r, estado: "activo", dmcId: d });
        finish(r);
      }), "btn--primary"),
      btn("Ahora no", close)));
}
// Resultado + aviso a la persona (en su idioma) por WhatsApp o correo
function approvalDoneCard(host, done) {
  const { u, r } = done;
  const s = u.solicitud || {};
  const en = s.idioma === "en";
  const name = u.nombre || u.email;
  const ok = h("div", { class: "p-actions" }, btn("Listo", () => clear(host)));
  if (r === "no") return add(host, h("section", { class: "p-card p-approve", role: "status" }, h("h2", { class: "p-h2" }, `Solicitud rechazada: ${name}`), ok));
  const msg = en
    ? `Hello ${first(u.nombre)}, your access to the Espontáneos Travel agency portal is now active. Sign in with ${u.email} here: ${PORTAL_URL}`
    : `Hola ${first(u.nombre)}, ya está activo tu acceso al portal de agencias de Espontáneos Travel. Entra con ${u.email} aquí: ${PORTAL_URL}`;
  const subject = en ? "Your Espontáneos Travel portal access is active" : "Ya está activo tu acceso al portal de Espontáneos Travel";
  const wa = waDigits(u.whatsapp || s.telefono);
  add(host, h("section", { class: "p-card p-approve", role: "status" },
    h("h2", { class: "p-h2" }, `✅ Acceso activo: ${name}`),
    h("p", null, roleLabel(r) + (u.dmcId ? " · " + dmcName(u.dmcId) : "")),
    h("p", { class: "p-muted" }, "Avísale que ya puede entrar (el mensaje ya va escrito" + (en ? ", en inglés" : "") + "):"),
    h("div", { class: "p-actions" },
      wa ? h("a", { class: "btn btn--wa btn--sm", href: waLink(wa, msg), target: "_blank", rel: "noopener noreferrer" }, "Avisar por WhatsApp") : null,
      h("a", { class: "btn btn--ghost btn--sm", href: `mailto:${encodeURIComponent(u.email).replace("%40", "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}` }, "Avisar por correo"),
      btn("Listo", () => clear(host)))));
}

async function adminUsuarios(view) {
  add(view, loadingBox());
  await loadRefs(true);
  clear(view);
  const pend = S.users.filter(u => u.estado === "pendiente").length;
  const est = selectEl([["", "Todos"], ["pendiente", "Pendientes"], ["activo", "Activos"], ["bloqueado", "Bloqueados"]], pend ? "pendiente" : "", { id: uid("e") });
  const rol = selectEl([["", "Todos"], ["dmc", "DMC"], ["asesor", "Asesores"], ["admin", "Administradores"]], "", { id: uid("r") });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const formHost = h("div", { class: "p-formhost" });
  const count = h("p", { class: "p-count", role: "status" });
  const out = h("div", { class: "p-cards" });
  function draw() {
    const term = norm(q.value);
    const shown = S.users.filter(u => (!est.value || u.estado === est.value) && (!rol.value || u.rol === rol.value)
      && (!term || norm([u.nombre, u.email, u.solicitud && u.solicitud.agencia, dmcName(u.dmcId)].join(" ")).includes(term)));
    count.textContent = `${shown.length} de ${S.users.length} usuarios`;
    clear(out);
    if (!shown.length) add(out, emptyBox("Ningún usuario con esos filtros."));
    shown.forEach(u => add(out, userCard(u, draw)));
  }
  [est, rol].forEach(el => el.addEventListener("change", draw));
  q.addEventListener("input", debounce(draw, 150));
  add(view, 
    h("div", { class: "p-toolbar" }, labeled("Estado", est), labeled("Rol", rol), labeled("Buscar", q, "p-grow"),
      h("div", { class: "p-toolbar__end" }, btn("Crear cuenta", () => accountForm(formHost, "asesor", async () => { await loadRefs(true); draw(); }), "btn--primary"))),
    h("p", { class: "p-muted" }, "Para aprobar un DMC: pulsa «Aprobar DMC» (crea la agencia con los datos de la solicitud si aún no existe, la vincula y activa el acceso)."),
    formHost, count, out);
  draw();
}

function userCard(u, redraw) {
  const self = u.id === S.user.uid;
  const s = u.solicitud;
  const rolSel = selectEl([["dmc", "DMC"], ["asesor", "Asesor"], ["admin", "Administrador"]], u.rol, { id: uid("rol"), disabled: self });
  const estSel = selectEl([["pendiente", "Pendiente"], ["activo", "Activo"], ["bloqueado", "Bloqueado"]], u.estado, { id: uid("est"), disabled: self });
  const dmcOpts = () => [["", "— Sin DMC —"]].concat(S.dmcs.map(d => [d.id, d.nombre + (d.activo === false ? " (inactiva)" : "")]));
  const dmcSel = selectEl(dmcOpts(), u.dmcId || "", { id: uid("dmc") });
  async function save(over) {
    const o = over || {};
    const r = o.rol || rolSel.value, e = o.estado || estSel.value;
    let d = "dmcId" in o ? o.dmcId : dmcSel.value;
    if (r !== "dmc") d = "";
    if (r === "dmc" && e === "activo" && !d) throw userErr("Para activar un usuario de agencia, primero asígnale una agencia (o usa «Aprobar agencia»).");
    const upd = { rol: r, estado: e, dmcId: d || null, actualizado: ts() };
    await fs.updateDoc(dref("users", u.id), upd);
    Object.assign(u, upd);
    notify(`Usuario ${u.email} actualizado.`);
    redraw();
  }
  const acts = [btn("Guardar cambios", e => busy(e.currentTarget, () => save()), "btn--primary")];
  if (!self && u.rol === "dmc" && u.estado !== "activo") acts.push(btn("Aprobar DMC", e => busy(e.currentTarget, async () => {
    let d = dmcSel.value;
    if (!d && s) d = await createDmcFromSolicitud(u);
    if (!d) throw userErr("Elige el DMC al que pertenece este usuario.");
    await save({ rol: "dmc", estado: "activo", dmcId: d });
  }), "btn--brand"));
  if (s && !u.dmcId && u.rol === "dmc") acts.push(btn("Solo crear el DMC", e => busy(e.currentTarget, async () => {
    const id = await createDmcFromSolicitud(u);
    clear(dmcSel); dmcOpts().forEach(([v, l]) => add(dmcSel, h("option", { value: v }, l)));
    dmcSel.value = id;
    notify(`DMC creado (${id}). Revisa y pulsa «Guardar cambios».`);
  })));
  if (!self && u.estado !== "bloqueado") acts.push(btn("Bloquear", e => {
    if (!window.confirm(`¿Bloquear el acceso de ${u.email}?`)) return;
    busy(e.currentTarget, () => save({ estado: "bloqueado" }));
  }));
  // Eliminar la cuenta o la solicitud: pierde el acceso de inmediato (si vuelve a entrar, tendría que pedir acceso de nuevo)
  if (!self) acts.push(btn(u.estado === "pendiente" ? "Eliminar solicitud" : "Eliminar", e => {
    if (!window.confirm(`¿Eliminar ${u.estado === "pendiente" ? "la solicitud" : "la cuenta"} de ${u.nombre || u.email} (${u.email})? Pierde el acceso al portal de inmediato. No se puede deshacer.`)) return;
    busy(e.currentTarget, async () => { await fs.deleteDoc(dref("users", u.id)); await fs.deleteDoc(dref("kits", u.id)).catch(() => {}); await loadRefs(true); notify(`${u.email} eliminado.`); redraw(); });
  }, "btn--danger"));
  return h("article", { class: "p-item" },
    h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, u.nombre || u.email), badge(roleLabel(u.rol)),
      badge(u.estado, u.estado === "activo" ? "ok" : u.estado === "pendiente" ? "warn" : "bad")),
    kvList(kv("Correo", u.email), kv("WhatsApp", u.whatsapp), kv("DMC", u.dmcId ? dmcName(u.dmcId) : ""), kv("Creado", fmtDateTime(u.creado))),
    s ? h("details", { class: "p-details", open: u.estado === "pendiente" }, h("summary", null, "Datos de la solicitud de acceso"),
      kvList(kv("Empresa (DMC)", s.agencia), kv("NIT / Tax ID", s.nit), kv("País", s.pais), kv("Ciudad", s.ciudad), kv("Contacto", s.contacto),
        kv("Teléfono", s.telefono), kv("Web", s.web && safeUrl(s.web) ? h("a", { href: s.web, target: "_blank", rel: "noopener noreferrer" }, s.web) : s.web),
        kv("Mensaje", s.mensaje), kv("Autorizó datos", s.aceptaDatos ? `Sí (versión ${s.versionPolitica || "—"})` : "No"), kv("Idioma", s.idioma))) : null,
    h("div", { class: "p-grid" }, labeled("Rol", rolSel), labeled("Estado", estSel), labeled("DMC", dmcSel)),
    self ? h("p", { class: "p-hint" }, "Es tu cuenta: no puedes cambiar tu propio rol ni estado (evita quedarte sin acceso).") : null,
    h("div", { class: "p-actions" }, acts));
}

// Clave temporal legible (sin 0/O ni 1/l) para dictarla o enviarla por WhatsApp
const tempPass = () => { const a = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let x = ""; const r = crypto.getRandomValues(new Uint32Array(10)); for (const n of r) x += a[n % a.length]; return x + "7!"; };
/* Crea la cuenta de otra persona sin cerrar tu sesión (instancia secundaria de Firebase en memoria).
   modo «temporal»: con la clave que se le asigna (se le envía el enlace para confirmar su correo);
   modo «correo»: le llega un correo de Firebase para crear su propia clave. */
async function createAccount(v) {
  const { appM, authM } = S.fb;
  const app2 = appM.initializeApp(firebaseConfig, "alta-" + Date.now());
  let uidNew = null;
  const clave = v.modo === "temporal" ? v.clave : randomCode(20) + "a7!";
  try {
    const auth2 = authM.initializeAuth(app2, { persistence: authM.inMemoryPersistence });
    const cred = await authM.createUserWithEmailAndPassword(auth2, v.email, clave);
    uidNew = cred.user.uid;
    await fs.setDoc(dref("users", uidNew), {
      email: cred.user.email, nombre: v.nombre, rol: v.rol, estado: "activo", dmcId: v.rol === "dmc" ? v.dmcId : null,
      whatsapp: v.whatsapp || "", idiomas: splitList(v.idiomas || "es").slice(0, 10), creado: ts(), actualizado: ts()
    });
    if (v.modo === "temporal") await authM.sendEmailVerification(cred.user).catch(() => {});
    await authM.signOut(auth2).catch(() => {});
  } catch (e) {
    if (uidNew) throw userErr(`La cuenta se creó (UID ${uidNew}) pero no se pudo guardar su perfil: ${errMsg(e)} Créalo en la consola (ver docs/BACKEND.md).`);
    if (/email-already-in-use/.test(String(e && (e.code || e.message)))) throw userErr("Ese correo ya tiene una cuenta. Búscalo en Usuarios y asígnale la agencia.");
    throw e;
  } finally {
    await appM.deleteApp(app2).catch(() => {});
  }
  if (v.modo !== "temporal") await au.sendPasswordResetEmail(S.fb.auth, v.email);
  return { uid: uidNew, clave: v.modo === "temporal" ? clave : "" };
}
// Tarjeta con el acceso listo para enviar (WhatsApp o correo)
function accessCard(host, v, res) {
  const msg = `Hola ${v.nombre.split(" ")[0]}, ya tienes acceso al portal de agencias de Espontáneos Travel 🌿\n\nEntra en: https://www.espontaneostravel.com/portal.html\nUsuario: ${v.email}\n` +
    (res.clave ? `Clave temporal: ${res.clave}\n\nAl entrar por primera vez, confirma tu correo con el enlace que te enviamos (revisa también spam). Puedes cambiar la clave con «¿Olvidaste tu contraseña?».`
      : `Te enviamos un correo para que crees tu clave (revisa también spam).`);
  const wa = waDigits(v.whatsapp);
  add(host, h("div", { class: "p-card p-approve" },
    h("h2", { class: "p-h2" }, "✅ Acceso creado"),
    kvList(kv("Nombre", v.nombre), kv("Usuario (correo)", v.email), res.clave ? kv("Clave temporal", h("strong", { class: "p-mono" }, res.clave)) : null, v.dmcId ? kv("Agencia", dmcName(v.dmcId) || v.dmcId) : null),
    h("p", { class: "p-muted" }, "Envíale el acceso (el mensaje ya va escrito). Por seguridad, la clave no se guarda en ningún lado: cópiala ahora."),
    h("div", { class: "p-actions" },
      wa ? h("a", { class: "btn btn--brand btn--sm", href: "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), target: "_blank", rel: "noopener" }, "Enviar por WhatsApp") : null,
      h("a", { class: "btn btn--ghost btn--sm", href: "mailto:" + encodeURIComponent(v.email) + "?subject=" + encodeURIComponent("Tu acceso al portal de agencias · Espontáneos Travel") + "&body=" + encodeURIComponent(msg) }, "Enviar por correo"),
      btn("Copiar mensaje", () => { try { navigator.clipboard.writeText(msg); notify("Mensaje copiado."); } catch (e) { window.prompt("Copia el mensaje:", msg); } }),
      btn("Cerrar", () => clear(host)))));
  focusHeading(host);
}
function accountForm(host, presetRol, onDone, preset) {
  clear(host);
  const f = formFields([
    { name: "nombre", label: "Nombre completo", required: true, max: 120 },
    { name: "email", label: "Correo", type: "email", required: true, max: 200 },
    { name: "whatsapp", label: "WhatsApp", type: "tel", max: 30 },
    { name: "idiomas", label: "Idiomas (separados por coma)", max: 60 },
    { name: "rol", label: "Rol", type: "select", options: [["asesor", "Asesor"], ["admin", "Administrador"], ["dmc", "DMC"]] },
    { name: "dmcId", label: "DMC (solo para el rol DMC)", type: "select", options: [["", "— Ninguna —"]].concat(S.dmcs.map(d => [d.id, d.nombre])) },
    { name: "modo", label: "Clave de acceso", type: "select", options: [["temporal", "Asignar una clave temporal ahora (te la muestro para enviarla)"], ["correo", "Enviarle un correo para que cree su clave"]] },
    { name: "clave", label: "Clave temporal (puedes cambiarla)", max: 40 }
  ], Object.assign({ rol: presetRol || "asesor", idiomas: "es", modo: "temporal", clave: tempPass() }, preset || {}));
  const form = mkForm(async () => {
    const v = f.get();
    if (v.rol === "dmc" && !v.dmcId) throw userErr("Elige el DMC para una cuenta de rol DMC.");
    if (v.modo === "temporal" && String(v.clave || "").length < 8) throw userErr("La clave temporal debe tener al menos 8 caracteres.");
    const res = await createAccount(v);
    notify(res.clave ? `Acceso creado para ${v.email}.` : `Cuenta creada para ${v.email}. Le enviamos un correo para que cree su contraseña.`);
    clear(host);
    accessCard(host, v, res);
    if (onDone) await onDone();
  },
  h("p", { class: "p-muted" }, "Con clave temporal: te muestro el acceso para enviarlo por WhatsApp o correo, y la persona confirma su correo al entrar. Con correo: Firebase le envía un enlace para crear su clave (revisa que no llegue a spam)."),
  f.el,
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, "Crear cuenta"), btn("Cancelar", () => clear(host))));
  add(host, h("div", { class: "p-card p-card--form" }, h("h2", { class: "p-h2" }, "Crear cuenta"), form));
  focusHeading(host);
}

async function adminAgencias(view) {
  add(view, loadingBox());
  // Notas internas de cada agencia (dmcs_privado: solo staff)
  const loadPriv = async () => new Map((await list(col("dmcs_privado"))).map(x => [x.id, x.notas || ""]));
  let privNotas;
  [, privNotas] = await Promise.all([loadRefs(true), loadPriv()]);
  clear(view);
  const formHost = h("div", { class: "p-formhost" });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const out = h("div", { class: "p-cards" });
  const pendHost = h("div");
  const reload = async () => { [, privNotas] = await Promise.all([loadRefs(true), loadPriv()]); draw(); };
  function draw() {
    // Solicitudes de acceso de agencias / DMC que esperan aprobación (las mismas de Usuarios)
    clear(pendHost);
    const pend = S.users.filter(u => u.estado === "pendiente");
    if (pend.length) add(pendHost, h("section", { class: "p-card p-pending" },
      h("h2", { class: "p-h2" }, `Solicitudes de acceso por aprobar (${pend.length})`),
      h("p", { class: "p-muted" }, "«Aprobar DMC» crea el DMC con los datos de la solicitud (o lo vincula si ya existe) y activa el acceso."),
      h("div", { class: "p-cards" }, pend.map(u => userCard(u, reload)))));
    const term = norm(q.value);
    const shown = S.dmcs.filter(d => !term || norm([d.id, d.nombre, d.pais, d.ciudad, d.nit, d.contacto].join(" ")).includes(term));
    clear(out);
    if (!shown.length) add(out, emptyBox(S.dmcs.length ? "Ningún DMC con esa búsqueda." : "Aún no hay DMC. Se crean al aprobar solicitudes o con «Nuevo DMC con acceso»."));
    shown.forEach(d => {
      const users = S.users.filter(u => u.dmcId === d.id);
      add(out, h("article", { class: "p-item" + (d.activo === false ? " is-done" : "") },
        h("header", { class: "p-item__head" }, h("h3", { class: "p-h3" }, d.nombre), badge(d.activo === false ? "Inactiva" : "Activa", d.activo === false ? "bad" : "ok"), badge(tipoLabel(d.tipo), d.tipo === "nac" ? "warn" : ""), h("span", { class: "p-mono p-muted" }, d.id)),
        kvList(kv("Tipo de cliente (tarifario que ve)", tipoLabel(d.tipo)), kv("NIT / Tax ID", d.nit), kv("Ubicación", [d.ciudad, d.pais].filter(Boolean).join(", ")), kv("Contacto", d.contacto),
          kv("Correo", d.email), kv("Teléfono", d.telefono), kv("Usuarios", users.map(u => u.email).join(", ") || "Ninguno"), kv("Notas internas (la agencia no las ve)", privNotas.get(d.id))),
        h("div", { class: "p-actions" },
          btn("Editar", () => dmcForm(formHost, Object.assign({}, d, { _notas: privNotas.get(d.id) || "" }), reload), "btn--brand"),
          btn("Crear acceso", () => accountForm(formHost, "dmc", reload, { dmcId: d.id, nombre: d.contacto || "", email: d.email || "", whatsapp: d.telefono || "" })),
          btn(d.activo === false ? "Activar" : "Desactivar", e => {
            if (d.activo !== false && !window.confirm(`¿Desactivar ${d.nombre}? Sus ${users.length} usuario(s) pierden el acceso de inmediato.`)) return;
            busy(e.currentTarget, async () => { await fs.updateDoc(dref("dmcs", d.id), { activo: d.activo === false, actualizado: ts() }); await reload(); });
          }),
          btn("Eliminar", e => busy(e.currentTarget, async () => {
            const quien = users.length ? ` y sus ${users.length} usuario(s) (${users.map(u => u.email).join(", ")}), que pierden el acceso de inmediato` : "";
            if (!window.confirm(`¿Eliminar el DMC ${d.nombre}${quien}? No se puede deshacer.`)) return;
            if (users.length) await batchRun(users.filter(u => u.id !== S.user.uid).map(u => bt => bt.delete(dref("users", u.id))), null, "Eliminando usuarios");
            // Logo y nombre guardados para el kit de venta de cada usuario (aparte: si falla, no frena la eliminación)
            for (const u of users.filter(x => x.id !== S.user.uid)) await fs.deleteDoc(dref("kits", u.id)).catch(() => {});
            const special = await list(fs.query(col("tarifas"), fs.where("dmcId", "==", d.id)));
            if (special.length && window.confirm(`Tiene ${special.length} tarifa(s) especial(es). ¿Borrarlas también?`)) {
              await batchRun(special.map(x => bt => bt.delete(dref("tarifas", x.id))), null, "Borrando");
            }
            await commit([bt => bt.delete(dref("dmcs_privado", d.id)), bt => bt.delete(dref("dmcs", d.id))]);
            notify(`DMC ${d.nombre} eliminado.`);
            await reload();
          })))));
    });
  }
  q.addEventListener("input", debounce(draw, 150));
  add(view, h("div", { class: "p-toolbar" }, labeled("Buscar", q, "p-grow"), h("div", { class: "p-toolbar__end" }, btn("Nuevo DMC con acceso", () => agencyAccessForm(formHost, reload), "btn--primary"), btn("Solo la empresa", () => dmcForm(formHost, null, reload)))), pendHost, formHost, out);
  draw();
}

function dmcForm(host, existing, onDone) {
  clear(host);
  const d = existing || { activo: true };
  const idIn = h("input", { type: "text", id: uid("id"), maxlength: 60, value: existing ? existing.id : "", disabled: !!existing, autocomplete: "off", "aria-describedby": "dmc-id-hint" });
  let idTouched = false;
  idIn.addEventListener("input", () => { idTouched = true; });
  const f = formFields([
    { name: "nombre", label: "Nombre de la agencia", required: true, max: 160 },
    { name: "nit", label: "NIT / Tax ID", max: 40 }, { name: "pais", label: "País", max: 60 }, { name: "ciudad", label: "Ciudad", max: 80 },
    { name: "contacto", label: "Persona de contacto", max: 120 }, { name: "email", label: "Correo", type: "email", max: 200 },
    { name: "telefono", label: "Teléfono", type: "tel", max: 40 },
    { name: "tipo", label: "Tipo de cliente (define el tarifario que ve)", type: "select", options: TIPOS_DMC },
    { name: "notas", label: "Notas internas (solo el equipo; la agencia NO las ve)", type: "textarea", max: 2000, full: true },
    { name: "activo", label: "Agencia activa (sus usuarios pueden entrar)", type: "checkbox" }
  ], Object.assign({}, d, { notas: d._notas || "", tipo: d.tipo === "nac" ? "nac" : "dmc" }));
  if (!existing) f.inputs.nombre.addEventListener("input", () => { if (!idTouched) idIn.value = slugify(f.inputs.nombre.value); });
  const form = mkForm(async () => {
    const v = f.get();
    const data = { nombre: v.nombre, nit: v.nit, pais: v.pais, ciudad: v.ciudad, contacto: v.contacto, email: v.email, telefono: v.telefono, activo: v.activo, actualizado: ts() };
    if (v.tipo === "nac" || (existing && existing.tipo)) data.tipo = v.tipo === "nac" ? "nac" : "dmc";
    const priv = { notas: v.notas, actualizado: ts() };
    if (existing) {
      await commit([bt => bt.update(dref("dmcs", existing.id), data), bt => bt.set(dref("dmcs_privado", existing.id), priv)]);
    } else {
      const id = slugify(idIn.value);
      if (!/^[a-z0-9-]{2,60}$/.test(id)) throw userErr("El identificador debe tener al menos 2 caracteres: letras minúsculas, números y guiones.");
      if ((await fs.getDoc(dref("dmcs", id))).exists()) throw userErr("Ya existe una agencia con ese identificador.");
      await commit([bt => bt.set(dref("dmcs", id), Object.assign(data, { creado: ts() })), bt => bt.set(dref("dmcs_privado", id), priv)]);
    }
    notify("Agencia guardada.");
    clear(host);
    if (onDone) await onDone();
  },
  h("div", { class: "p-grid" }, h("div", { class: "p-field" }, h("label", { for: idIn.id }, "Identificador (dmc_id)"), idIn,
    h("small", { id: "dmc-id-hint", class: "p-hint" }, existing ? "No se puede cambiar." : "Se usa en la columna dmc_id del CSV de tarifas. Ej.: viajes-andinos"))),
  f.el,
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, "Guardar agencia"), btn("Cancelar", () => clear(host))));
  add(host, h("div", { class: "p-card p-card--form" }, h("h2", { class: "p-h2" }, existing ? `Editar ${existing.nombre}` : "Nueva agencia"), form));
  focusHeading(host);
}

// Agencia / DMC nueva y su primer acceso en un solo paso (empresa + persona + clave temporal)
function agencyAccessForm(host, onDone) {
  clear(host);
  const f = formFields([
    { name: "nombre", label: "Nombre del DMC", required: true, max: 160 },
    { name: "nit", label: "NIT / Tax ID", max: 40 }, { name: "pais", label: "País", max: 60 }, { name: "ciudad", label: "Ciudad", max: 80 },
    { name: "contacto", label: "Persona que va a entrar (nombre completo)", required: true, max: 120 },
    { name: "email", label: "Su correo (será el usuario)", type: "email", required: true, max: 200 },
    { name: "telefono", label: "WhatsApp", type: "tel", max: 40 },
    { name: "clave", label: "Clave temporal (puedes cambiarla)", required: true, max: 40 },
    { name: "tipo", label: "Tipo de cliente (define el tarifario que ve)", type: "select", options: TIPOS_DMC },
    { name: "notas", label: "Notas internas (solo el equipo)", type: "textarea", max: 2000, full: true }
  ], { clave: tempPass(), pais: "Colombia", tipo: "dmc" });
  const form = mkForm(async () => {
    const v = f.get();
    if (String(v.clave).length < 8) throw userErr("La clave temporal debe tener al menos 8 caracteres.");
    let id = slugify(v.nombre).slice(0, 60);
    if (!/^[a-z0-9-]{2,60}$/.test(id)) throw userErr("Escribe un nombre de agencia válido.");
    const ya = S.dmcs.find(d => d.id === id || (v.nit && digits(d.nit) && digits(d.nit) === digits(v.nit)));
    if (ya) id = ya.id;
    else await commit([bt => bt.set(dref("dmcs", id), Object.assign({ nombre: v.nombre, nit: v.nit, pais: v.pais, ciudad: v.ciudad, contacto: v.contacto, email: v.email, telefono: v.telefono, activo: true, creado: ts(), actualizado: ts() }, v.tipo === "nac" ? { tipo: "nac" } : {})),
      bt => bt.set(dref("dmcs_privado", id), { notas: v.notas, actualizado: ts() })]);
    const acc = { nombre: v.contacto, email: v.email, whatsapp: v.telefono, rol: "dmc", dmcId: id, modo: "temporal", clave: v.clave, idiomas: "es" };
    const res = await createAccount(acc);
    await loadRefs(true);
    clear(host);
    accessCard(host, acc, res);
    if (onDone) await onDone();
  },
  h("p", { class: "p-muted" }, "Crea el DMC y el acceso de su primera persona con una clave temporal. Si el DMC ya existe (mismo nombre o NIT), solo se le agrega el acceso."),
  f.el,
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, "Crear DMC y acceso"), btn("Cancelar", () => clear(host))));
  add(host, h("div", { class: "p-card p-card--form" }, h("h2", { class: "p-h2" }, "Nuevo DMC con acceso"), form));
  focusHeading(host);
}

/* ---------- Tarifas: importar y consultar ---------- */
async function readFileText(file) {
  const buf = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf); // CSV guardado por Excel como ANSI
  return text;
}
function yearOptions() {
  const y = new Date().getFullYear();
  return [...new Set(S.vigencias.concat([y - 1, y, y + 1, y + 2]))].sort((a, b) => b - a).map(x => [String(x), String(x)]);
}

async function adminTarifas(view) {
  add(view, loadingBox());
  await S.jennyP; await loadRefs(); await loadVigencias();
  clear(view);
  const defYear = S.vigencias[0] || (S.jenny && S.jenny._meta && S.jenny._meta.vigencia) || new Date().getFullYear();
  // --- Importar ---
  const ySel = selectEl(yearOptions(), defYear, { id: uid("y") });
  const file = h("input", { type: "file", id: uid("file"), accept: ".csv,.json,.txt,text/csv,application/json" });
  const replace = h("input", { type: "checkbox", id: uid("rep") });
  const preview = h("div", { class: "p-preview" });
  const progress = h("p", { class: "p-progress", role: "status" });
  const importBtn = h("button", { type: "button", class: "btn btn--primary", disabled: true }, "Importar tarifas");
  let rows = null, result = null;
  function validate() {
    if (!rows) return;
    result = validateTarifas(rows, { vigencia: Number(ySel.value), dmcIds: new Set(S.dmcs.map(d => d.id)), tours: S.tours });
    clear(preview);
    if (result.missing.length) {
      add(preview, h("div", { class: "p-error", role: "alert" }, h("p", null, "Faltan columnas: " + result.missing.join(", ") + ". Usa la plantilla.")));
      importBtn.disabled = true; return;
    }
    const ok = result.items.length - result.errorCount;
    add(preview, h("p", { class: result.errorCount ? "p-error" : "p-note", role: "status" },
      `${result.items.length} filas · ${ok} válidas · ${result.errorCount} con errores · ${result.warningCount} con avisos · vigencia ${ySel.value}.`,
      result.errorCount ? " Corrige el archivo y vuelve a cargarlo: no se importa nada mientras haya errores." : ""));
    const probs = result.items.filter(x => x.errors.length || x.warnings.length).slice(0, 60);
    if (probs.length) add(preview, h("details", { class: "p-details", open: !!result.errorCount }, h("summary", null, `Revisar ${probs.length} fila(s) con observaciones`),
      h("ul", { class: "p-list p-list--tight" }, probs.map(x => h("li", null, h("strong", null, `Línea ${x.line}: `), x.errors.concat(x.warnings.map(w => "Aviso: " + w)).join(" · "))))));
    const cols = [
      { label: "Línea", get: x => String(x.line) }, { label: "Código", get: x => x.data.codigo }, { label: "Tour", get: x => x.data.nombre },
      { label: "Temporada", get: x => x.data.temporada || "—" }, { label: "Pax", get: x => `${x.data.pax_desde}–${x.data.pax_hasta}` },
      { label: "Tarifa", cls: "num", get: x => (Number.isFinite(x.data.tarifa_neta) ? money(x.data.tarifa_neta, /^[A-Z]{3}$/.test(x.data.moneda) ? x.data.moneda : "COP") : "—") },
      { label: "Moneda", get: x => x.data.moneda }, { label: "Alcance", get: x => scopeLabel(x.data.dmcId) },
      { label: "Notas (las ven las agencias)", get: x => x.data.notas }, { label: "Estado", get: x => (x.errors.length ? badge("Error", "bad") : x.warnings.length ? badge("Aviso", "warn") : badge("OK", "ok")) }
    ];
    add(preview, h("p", { class: "p-muted" }, `Vista previa (primeras ${Math.min(150, result.items.length)} filas). Revisa que las tarifas se lean bien (miles y decimales).`),
      tableWrap(cols, result.items.slice(0, 150), { caption: "Vista previa de tarifas" }));
    importBtn.disabled = !!result.errorCount || !result.items.length;
  }
  file.addEventListener("change", () => busy(null, async () => {
    rows = null; result = null; importBtn.disabled = true; clear(preview); progress.textContent = "";
    const fl = file.files && file.files[0];
    if (!fl) return;
    if (fl.size > 5 * 1024 * 1024) throw userErr("El archivo pesa más de 5 MB.");
    rows = rowsFromText(fl.name, await readFileText(fl));
    // Si todas las filas traen el mismo año, se elige solo (evita importar un archivo 2026 con el selector en 2027)
    const ys = [...new Set(rows.map(r => parseInt(cleanCell(r.vigencia), 10)).filter(Number.isInteger))];
    if (ys.length === 1 && [...ySel.options].some(o => o.value === String(ys[0]))) ySel.value = String(ys[0]);
    validate();
  }));
  ySel.addEventListener("change", validate);
  importBtn.addEventListener("click", () => {
    if (!result || result.errorCount) return;
    const y = Number(ySel.value);
    const scope = [...new Set(result.items.map(x => scopeLabel(x.data.dmcId)))].join(", ");
    if (!window.confirm(`¿Importar ${result.items.length} tarifas a la vigencia ${y}?${replace.checked ? `\n\nSe BORRARÁN las tarifas ${y} existentes de: ${scope} que no estén en el archivo.` : ""}`)) return;
    busy(importBtn, async () => {
      const keep = new Set(result.items.map(x => x.id));
      if (replace.checked) {
        const scopes = new Set(result.items.map(x => x.data.dmcId || ""));
        const existing = await list(fs.query(col("tarifas"), fs.where("vigencia", "==", y)));
        const del = existing.filter(d => scopes.has(d.dmcId || "") && !keep.has(d.id));
        await batchRun(del.map(d => bt => bt.delete(dref("tarifas", d.id))), m => { progress.textContent = m; }, "Borrando tarifas anteriores");
      }
      await batchRun(result.items.map(x => bt => bt.set(dref("tarifas", x.id), Object.assign({}, x.data, { actualizado: ts() }))), m => { progress.textContent = m; }, "Guardando");
      await fs.setDoc(dref("config", "vigencias"), { lista: fs.arrayUnion(y), actualizado: ts() }, { merge: true });
      await loadVigencias();
      const aviso = await rebuildPacksSafe([y], progress);
      progress.textContent = `Listo: ${result.items.length} tarifas guardadas en la vigencia ${y}.${aviso}`;
      notify(progress.textContent);
      rows = null; result = null; file.value = ""; importBtn.disabled = true;
      vSel.value = String(y); loadExisting();
    });
  });
  // --- Consultar lo cargado ---
  const vSel = selectEl(yearOptions(), defYear, { id: uid("v") });
  const q = h("input", { type: "search", id: uid("q"), autocomplete: "off" });
  const sep = sepSelect();
  const exBox = h("div");
  let existing = [];
  async function loadExisting() {
    clear(exBox); add(exBox, loadingBox());
    try { existing = await list(fs.query(col("tarifas"), fs.where("vigencia", "==", Number(vSel.value)))); }
    catch (e) { clear(exBox); add(exBox, errorBox(e, loadExisting)); return; }
    existing.sort((a, b) => collate(a.nombre, b.nombre) || collate(a.temporada, b.temporada) || a.pax_desde - b.pax_desde);
    drawExisting();
  }
  function drawExisting() {
    clear(exBox);
    const term = norm(q.value);
    const shown = existing.filter(r => !term || norm([r.nombre, r.codigo, r.tour_id, r.temporada, dmcName(r.dmcId)].join(" ")).includes(term));
    const gen = existing.filter(r => !r.dmcId).length, nac = existing.filter(r => r.dmcId === "_nac").length;
    add(exBox, h("p", { class: "p-count", role: "status" }, `${existing.length} tarifas en ${vSel.value} (${gen} generales DMC, ${nac} Mercado Nacional, ${existing.length - gen - nac} especiales).${shown.length > 300 ? " Mostrando 300: usa el buscador." : ""}`));
    if (!existing.length) { add(exBox, emptyBox("No hay tarifas cargadas para esta vigencia.")); return; }
    add(exBox, tableWrap([
      { label: "Código", get: r => r.codigo }, { label: "Tour", get: r => r.nombre }, { label: "Temporada", get: r => r.temporada || "—" },
      { label: "Pax", get: r => `${r.pax_desde}–${r.pax_hasta}` }, { label: "Tarifa neta", cls: "num", get: r => money(r.tarifa_neta, r.moneda) },
      { label: "Alcance", get: r => scopeLabel(r.dmcId) }, { label: "Notas (las ven las agencias)", get: r => r.notas || "" }
    ], shown.slice(0, 300), { caption: "Tarifas cargadas" }));
  }
  vSel.addEventListener("change", loadExisting);
  q.addEventListener("input", debounce(drawExisting, 150));
  const packBtn = btn("Actualizar carga rápida", e => busy(e.currentTarget, async () => {
    await rebuildPacks(S.vigencias.length ? S.vigencias : [Number(vSel.value)], m => { packMsg.textContent = m; });
    packMsg.textContent = "Listo: las agencias cargan sus tarifas en un solo paso (" + (S.vigencias.join(", ") || vSel.value) + ")."; notify(packMsg.textContent);
  }));
  const packMsg = h("p", { class: "p-muted", role: "status" }, "La carga rápida se actualiza sola al importar. Úsalo si cambiaste tarifas de otra forma.");
  const exportBtn = btn("Exportar CSV (formato de importación)", () => download(`tarifas-${vSel.value}.csv`,
    toCSV(existing.map(r => Object.assign({}, r, { dmc_id: r.dmcId || "" })), TARIFA_COLS, sep.value), "text/csv;charset=utf-8"));
  add(view, 
    h("div", { class: "p-card" },
      h("h2", { class: "p-h2" }, "Importar tarifas netas"),
      h("ol", { class: "p-steps" },
        h("li", null, "Descarga la ", h("a", { href: "data/plantillas/tarifas-dmc-plantilla.csv", download: "tarifas-dmc-plantilla.csv" }, "plantilla CSV"), " y llénala en Excel o Google Sheets (una fila por tarifa). Borra las filas de EJEMPLO."),
        h("li", null, "dmc_id vacío = tarifa general DMC. dmc_id «_nac» = tarifario Mercado Nacional y Mayoristas (solo lo ven las cuentas de ese tipo). Con el identificador de una agencia = tarifa especial solo para ella."),
        h("li", null, h("strong", null, "La columna notas la VEN las agencias"), ": úsala solo para condiciones de la tarifa (ej. «incluye almuerzo»). No pongas notas internas."),
        h("li", null, "Elige la vigencia, carga el archivo (CSV o JSON) y revisa la vista previa. Solo se importa si no hay errores."),
        h("li", null, "Importar de nuevo actualiza las tarifas iguales (mismo tour, temporada, pasajeros, moneda y agencia); no las duplica.")),
      h("p", { class: "p-note" }, "El archivo con tarifas netas es confidencial: guárdalo fuera del repositorio (carpeta privado/ o tu computador). Nunca lo subas a GitHub."),
      h("div", { class: "p-toolbar" }, labeled("Vigencia", ySel), labeled("Archivo de tarifas", file, "p-grow")),
      checkField("Reemplazar: borrar las tarifas existentes de esa vigencia (de las agencias/general incluidas en el archivo) que no estén en el archivo", replace),
      preview, h("div", { class: "p-form-actions" }, importBtn), progress),
    h("div", { class: "p-card" },
      h("h2", { class: "p-h2" }, "Tarifas cargadas"),
      h("div", { class: "p-toolbar" }, labeled("Vigencia", vSel), labeled("Buscar", q, "p-grow"), labeled("Formato CSV", sep), h("div", { class: "p-toolbar__end" }, exportBtn, packBtn)),
      packMsg, exBox));
  await loadExisting();
}

/* ---------- Condiciones de agencia ---------- */
async function adminCondiciones(view) {
  add(view, loadingBox());
  await S.jennyP; await loadVigencias();
  clear(view);
  const defYear = S.vigencias[0] || (S.jenny && S.jenny._meta && S.jenny._meta.vigencia) || new Date().getFullYear();
  const ySel = selectEl(yearOptions(), defYear, { id: uid("y") });
  const file = h("input", { type: "file", id: uid("file"), accept: ".json,application/json" });
  const prune = h("input", { type: "checkbox", id: uid("pr") });
  const preview = h("div", { class: "p-preview" });
  const progress = h("p", { class: "p-progress", role: "status" });
  const importBtn = h("button", { type: "button", class: "btn btn--primary", disabled: true }, "Importar condiciones");
  let json = null, result = null;
  function validate() {
    if (!json) return;
    const pfData = json.portafolio || (json.tipo === "portafolio" ? json.datos : null);
    const soloPf = json.tipo === "portafolio";
    result = soloPf ? { vigencia: Number(json.vigencia) || Number(ySel.value), items: [], errors: [] } : validateCondiciones(json, Number(ySel.value));
    result.portafolio = pfData && typeof pfData === "object" ? pfData : null;
    result.medios = json.medios && typeof json.medios === "object" ? json.medios : null;
    clear(preview);
    if (result.medios) {
      const ids = Object.keys(result.medios), bad = ids.filter(k => !/^[a-z0-9-]{1,60}$/.test(k) || typeof result.medios[k].b64 !== "string");
      if (bad.length) result.errors.push("Videos con datos no válidos: " + bad.join(", "));
      add(preview, h("p", { class: "p-note", role: "status" }, `Videos privados (solo los ven los DMC con sesión): ${ids.length} · ${(ids.reduce((n, k) => n + (result.medios[k].b64 || "").length, 0) * 0.75 / 1048576).toFixed(1)} MB.`));
    }
    if (result.portafolio) {
      const P = result.portafolio, size = JSON.stringify(P).length;
      if (size > 450000) result.errors.push("Los datos del portafolio pesan más de 450 KB.");
      add(preview, h("p", { class: "p-note", role: "status" }, `Datos privados del portafolio ${result.vigencia}: ${(P.fincas || []).length} fincas, ${(P.hoteles || []).length} hoteles aliados, ${Object.keys(P.coords || {}).length} ubicaciones exactas, ${(P.pagos || []).length} formas de pago. Solo los ven las cuentas con sesión.`));
    }
    if (soloPf) { importBtn.disabled = !result.portafolio || !!result.errors.length; if (result.errors.length) add(preview, h("ul", { class: "p-list p-list--tight" }, result.errors.map(e => h("li", null, e)))); return; }
    if (Number.isInteger(json.vigencia)) ySel.value = String(json.vigencia);
    add(preview, h("p", { class: result.errors.length ? "p-error" : "p-note", role: "status" },
      `${result.items.length} tours con condiciones · vigencia ${result.vigencia}${Number.isInteger(json.vigencia) ? " (tomada del archivo)" : " (elegida arriba)"} · ${result.errors.length} error(es).`));
    if (result.errors.length) add(preview, h("ul", { class: "p-list p-list--tight" }, result.errors.slice(0, 50).map(e => h("li", null, e))));
    add(preview, tableWrap([
      { label: "tour_id", get: x => x.data.tour_id }, { label: "Código", get: x => x.data.codigo }, { label: "Tour", get: x => x.data.nombre },
      { label: "Notas", cls: "num", get: x => String(x.data.notas_agencia.length) },
      { label: "En portafolio web", get: x => (S.tours.byId.has(x.data.tour_id) ? "Sí" : badge("No", "warn")) }
    ], result.items, { caption: "Vista previa de condiciones" }));
    importBtn.disabled = !!result.errors.length || !result.items.length;
  }
  file.addEventListener("change", () => busy(null, async () => {
    json = null; result = null; importBtn.disabled = true; clear(preview); progress.textContent = "";
    const fl = file.files && file.files[0];
    if (!fl) return;
    if (fl.size > 40 * 1024 * 1024) throw userErr("El archivo pesa más de 40 MB.");
    try { json = JSON.parse((await readFileText(fl)).replace(/^﻿/, "")); }
    catch (e) { throw userErr("El archivo no es un JSON válido."); }
    validate();
  }));
  ySel.addEventListener("change", validate);
  importBtn.addEventListener("click", () => {
    if (!result || result.errors.length) return;
    const y = result.vigencia;
    if (!window.confirm(result.items.length ? `¿Importar condiciones de ${result.items.length} tours para ${y}?${result.portafolio ? " (y los datos privados del portafolio)" : ""}` : `¿Importar los datos privados del portafolio ${y}?`)) return;
    busy(importBtn, async () => {
      if (result.medios) {
        const PARTE = 900000, ops = [];
        for (const [id, m] of Object.entries(result.medios)) {
          const partes = Math.ceil(m.b64.length / PARTE);
          for (let i = 0; i < partes; i++) ops.push({ id: `${id}-${i}`, d: { tipo: m.tipo || "video/mp4", parte: i, partes, datos: m.b64.slice(i * PARTE, (i + 1) * PARTE), actualizado: ts() } });
        }
        // De a uno (cada parte pesa casi 1 MB; un lote de Firestore admite máx. 10 MB)
        for (let k = 0; k < ops.length; k++) { progress.textContent = `Subiendo videos privados ${k + 1}/${ops.length}…`; await fs.setDoc(dref("medios", ops[k].id), ops[k].d); }
      }
      if (result.portafolio) {
        await fs.setDoc(dref("portafolio", String(y)), { vigencia: y, datos: JSON.stringify(result.portafolio), actualizado: ts() });
        delete S.cache["pf_" + y];
        if (!result.items.length) { progress.textContent = `Listo: datos privados del portafolio ${y} guardados${result.medios ? " con sus videos" : ""}.`; notify(progress.textContent); json = null; result = null; file.value = ""; importBtn.disabled = true; return; }
      }
      if (prune.checked) {
        const keep = new Set(result.items.map(x => x.id));
        const old = await list(fs.query(col("condiciones"), fs.where("vigencia", "==", y)));
        await batchRun(old.filter(d => !keep.has(d.id)).map(d => bt => bt.delete(dref("condiciones", d.id))), m => { progress.textContent = m; }, "Borrando");
      }
      await batchRun(result.items.map(x => bt => bt.set(dref("condiciones", x.id), Object.assign({}, x.data, { actualizado: ts() }))), m => { progress.textContent = m; }, "Guardando");
      if (!S.vigencias.length) await loadVigencias();
      const aviso = await rebuildPacksSafe([...new Set(S.vigencias.concat([y]))], progress);
      progress.textContent = `Listo: condiciones de ${result.items.length} tours guardadas en ${y}${result.portafolio ? ", datos privados del portafolio" : ""}${result.medios ? " y videos" : ""}. Carga rápida actualizada.${aviso}`;
      notify(progress.textContent);
      json = null; result = null; file.value = ""; importBtn.disabled = true;
      vSel.value = String(y); loadExisting();
    });
  });
  const vSel = selectEl(yearOptions(), defYear, { id: uid("v") });
  const exBox = h("div");
  async function loadExisting() {
    clear(exBox); add(exBox, loadingBox());
    let rows;
    try { rows = await list(fs.query(col("condiciones"), fs.where("vigencia", "==", Number(vSel.value)))); }
    catch (e) { clear(exBox); add(exBox, errorBox(e, loadExisting)); return; }
    rows.sort((a, b) => collate(a.nombre, b.nombre));
    clear(exBox);
    add(exBox, h("p", { class: "p-count", role: "status" }, `${rows.length} tours con condiciones en ${vSel.value}.`));
    rows.forEach(c => add(exBox, h("details", { class: "p-details" }, h("summary", null, `${c.nombre || c.tour_id} (${c.codigo || c.tour_id}) · ${(c.notas_agencia || []).length} nota(s)`),
      h("ul", { class: "p-list" }, (c.notas_agencia || []).map(n => h("li", null, n))))));
  }
  vSel.addEventListener("change", loadExisting);
  add(view, 
    h("div", { class: "p-card" },
      h("h2", { class: "p-h2" }, "Importar condiciones de agencia y fichas técnicas"),
      h("p", null, "Carga el archivo privado de condiciones (por ejemplo privado/condiciones-agencia-2026.json). Formato: { \"vigencia\": 2026, \"condiciones\": { \"tour_id\": { \"codigo\", \"nombre\", \"notas_agencia\": [ … ] } } }. Si el archivo trae «portafolio» (fincas, hoteles aliados, ubicaciones exactas y formas de pago del Portafolio 2027), también se guarda."),
      h("p", { class: "p-note" }, "Este archivo es privado: no lo subas al repositorio. Importar de nuevo reemplaza las notas de cada tour."),
      h("div", { class: "p-toolbar" }, labeled("Vigencia (si el archivo no la trae)", ySel), labeled("Archivo JSON", file, "p-grow")),
      checkField("Borrar las condiciones de esa vigencia que no estén en el archivo", prune),
      preview, h("div", { class: "p-form-actions" }, importBtn), progress),
    h("div", { class: "p-card" }, h("h2", { class: "p-h2" }, "Condiciones cargadas"), h("div", { class: "p-toolbar" }, labeled("Vigencia", vSel)), exBox));
  await loadExisting();
}

/* ---------- Asesores ---------- */
async function adminAsesores(view) {
  add(view, loadingBox());
  await loadRefs(true);
  clear(view);
  const formHost = h("div", { class: "p-formhost" });
  const out = h("div");
  function draw() {
    clear(out);
    const staff = S.users.filter(u => u.rol === "asesor" || u.rol === "admin");
    add(out, staff.length ? tableWrap([
      { label: "Nombre", get: u => u.nombre || "—" }, { label: "Correo", get: u => u.email }, { label: "Rol", get: u => roleLabel(u.rol) },
      { label: "Estado", get: u => badge(u.estado, u.estado === "activo" ? "ok" : u.estado === "pendiente" ? "warn" : "bad") },
      { label: "WhatsApp", get: u => (digits(u.whatsapp).length >= 8 ? h("a", { href: waLink(u.whatsapp), target: "_blank", rel: "noopener" }, u.whatsapp) : (u.whatsapp || "")) },
      { label: "Idiomas", get: u => (u.idiomas || []).join(", ") }
    ], staff, { caption: "Asesores y administradores" }) : emptyBox("Aún no hay asesores."));
  }
  add(view, 
    h("div", { class: "p-toolbar" }, h("p", { class: "p-muted p-grow" }, "Para cambiar el rol o bloquear a alguien, usa la pestaña Usuarios."),
      h("div", { class: "p-toolbar__end" }, btn("Crear cuenta de asesor", () => accountForm(formHost, "asesor", async () => { await loadRefs(true); draw(); }), "btn--primary"))),
    formHost, out);
  draw();
}

/* ---------- Pagos: prefijos OFICIALES de enlaces de pago ---------- */
// Solo los enlaces que empiezan por uno de estos prefijos se guardan y se muestran al viajero.
// Se guarda en config/pagos: { prefijos, patron } (patron = expresión que usan las reglas para validar).
async function adminPagos(view) {
  add(view, loadingBox());
  const current = await loadPagos(true);
  clear(view);
  const ta = h("textarea", { id: uid("pref"), rows: 5, maxlength: 2100, value: current.join("\n"), "aria-describedby": "pref-hint", spellcheck: "false", autocomplete: "off" });
  const status = h("p", { class: "p-progress", role: "status" });
  const form = mkForm(async () => {
    const lines = ta.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (lines.length > 10) throw userErr("Máximo 10 prefijos.");
    const bad = lines.filter(x => !normPrefix(x));
    if (bad.length) throw userErr("No válidos (deben ser https://dominio/ruta de TU comercio, sin espacios): " + bad.join(" · "));
    const prefijos = [...new Set(lines.map(normPrefix))];
    await fs.setDoc(dref("config", "pagos"), { prefijos, patron: prefixPattern(prefijos), actualizado: ts() });
    S.pagos = prefijos;
    ta.value = prefijos.join("\n");
    status.textContent = prefijos.length ? `Guardado: ${prefijos.length} prefijo(s) oficial(es).` : "Guardado: sin prefijos (no se mostrará ningún botón de pago).";
    notify(status.textContent);
  },
  h("div", { class: "p-field" }, h("label", { for: ta.id }, "Prefijos oficiales de enlaces de pago (uno por línea)"), ta,
    h("small", { id: "pref-hint", class: "p-hint" },
      "Pega el inicio de los enlaces de pago de TU cuenta de comercio, incluyendo la parte que identifica a Espontáneos Travel ",
      "(no basta el dominio de la pasarela). Ejemplo de formato: https://pasarela.example/pagos/espontaneos/ — usa el que te dé tu pasarela.")),
  h("div", { class: "p-form-actions" }, h("button", { type: "submit", class: "btn btn--primary" }, "Guardar prefijos")), status);
  add(view, h("div", { class: "p-card" },
    h("h2", { class: "p-h2" }, "Enlaces oficiales de pago"),
    h("p", null, "Por seguridad, una reserva solo puede llevar un enlace de pago que empiece por uno de estos prefijos. Así nadie puede poner un enlace de cobro falso en el itinerario de un viajero."),
    h("p", { class: "p-note" }, "Vacío = ningún viajero verá botón de pago. Si cambias los prefijos, las reservas ya guardadas no cambian: edítalas y guarda de nuevo para revalidar su enlace."),
    form));
}

/* ---------- Respaldo (exportar colecciones) ---------- */
async function adminRespaldo(view) {
  const cSel = selectEl(COLECCIONES.map(c => [c, c]), "clientes", { id: uid("c") });
  const sep = sepSelect();
  const status = h("p", { class: "p-progress", role: "status" });
  const fetchAll = async name => (await list(col(name))).map(plain);
  const csvOf = (rows, sepV) => {
    const keys = new Set(["id"]); rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
    return toCSV(rows, [...keys], sepV);
  };
  add(view, h("div", { class: "p-card" },
    h("h2", { class: "p-h2" }, "Respaldo de datos"),
    h("p", null, "Descarga una copia de cualquier colección. Hazlo al menos una vez al mes y guárdala en una carpeta privada (Google Drive o tu computador), nunca en el repositorio público."),
    h("p", { class: "p-note" }, "Los respaldos contienen datos personales (Ley 1581): compártelos solo con personal autorizado."),
    h("div", { class: "p-toolbar" }, labeled("Colección", cSel), labeled("Formato CSV", sep),
      h("div", { class: "p-toolbar__end" },
        btn("Descargar CSV", e => busy(e.currentTarget, async () => {
          const rows = await fetchAll(cSel.value);
          download(`${cSel.value}-${isoDay(new Date())}.csv`, csvOf(rows, sep.value), "text/csv;charset=utf-8");
          status.textContent = `${rows.length} documentos de ${cSel.value} exportados.`;
        }), "btn--primary"),
        btn("Descargar JSON", e => busy(e.currentTarget, async () => {
          const rows = await fetchAll(cSel.value);
          download(`${cSel.value}-${isoDay(new Date())}.json`, JSON.stringify(rows, null, 2), "application/json");
          status.textContent = `${rows.length} documentos de ${cSel.value} exportados.`;
        })),
        btn("Todo en un JSON", e => busy(e.currentTarget, async () => {
          const all = {};
          for (const c of COLECCIONES) { status.textContent = "Leyendo " + c + "…"; all[c] = await fetchAll(c); }
          download(`respaldo-espontaneos-${isoDay(new Date())}.json`, JSON.stringify(all, null, 2), "application/json");
          status.textContent = "Respaldo completo descargado: " + COLECCIONES.map(c => `${c} ${all[c].length}`).join(" · ");
        })))),
    status));
}

/* ---------- Inicio ---------- */
if (typeof document !== "undefined" && document.getElementById("p-main")) boot();
