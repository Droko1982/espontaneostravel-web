/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Conexión pública mínima con Firebase (sin inicio de sesión)

   Uso en cualquier página pública:
     <script type="module" src="js/backend.js"></script>

   Expone:
     window.EspoBackend = {
       enabled,                 // true si js/firebase-config.js tiene apiKey
       saveLead(data),          // → Promise<boolean>  guarda un lead del chatbot (solo crear)
       getBooking(code)         // → Promise<objeto|null>  reserva por código exacto (para viaje.html)
     }
   y luego lanza window "espo:backend".

   Los scripts clásicos (no módulos) se ejecutan ANTES que este módulo, así que deben esperar:
     function conBackend(cb) {
       if (window.EspoBackend) cb(window.EspoBackend);
       else window.addEventListener("espo:backend", function () { cb(window.EspoBackend); }, { once: true });
     }

   El SDK de Firebase solo se descarga la primera vez que se usa saveLead/getBooking.
   Los límites de texto deben coincidir con firestore.rules (match /leads). Ver docs/BACKEND.md.
   ========================================================================== */
import { firebaseConfig, enabled, appCheckSiteKey } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const STAGES = ["qr_visita", "resumen", "whatsapp"];
const LEAD_TEXT = { leadId: 40, plan: 120, tour: 120, name: 80, date: 10, hotel: 120, diet: 120, notes: 500, src: 40, lang: 5, link: 4000, page: 60 };
const PRIVATE_FIELDS = ["clienteId", "dmcId", "asesorId", "solicitudId", "creadoPor"];
let conn = null;

// App Check: debe iniciarse antes de usar Firestore o Auth. Sin clave, no hace nada.
async function startAppCheck(app) {
  if (!appCheckSiteKey) return;
  try {
    const ac = await import(SDK + "firebase-app-check.js");
    ac.initializeAppCheck(app, { provider: new ac.ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  } catch (e) { console.warn("App Check no se pudo iniciar", e); }
}
function connect() {
  if (!conn) {
    conn = Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-firestore.js")]).then(async ([a, f]) => {
      const fresh = !a.getApps().length;
      const app = fresh ? a.initializeApp(firebaseConfig) : a.getApp();
      if (fresh) await startAppCheck(app);
      return { f, db: f.getFirestore(app) };
    });
    conn.catch(() => { conn = null; }); // si falla la red, se reintenta en la próxima llamada
  }
  return conn;
}

// Timestamps → texto ISO, para que el resultado sea JSON simple (igual que data/bookings.json)
function plain(v) {
  if (v && typeof v.toDate === "function") return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = plain(v[k]); return o; }
  return v;
}

async function saveLead(data) {
  if (!enabled || !data || STAGES.indexOf(data.stage) < 0) return false;
  try {
    const lead = { stage: data.stage };
    for (const k of Object.keys(LEAD_TEXT)) {
      if (data[k] != null && data[k] !== "") lead[k] = String(data[k]).slice(0, LEAD_TEXT[k]);
    }
    if (!lead.page) lead.page = (location.pathname.split("/").pop() || "index.html").slice(0, LEAD_TEXT.page);
    const party = parseInt(data.party, 10);
    if (party >= 0 && party <= 999) lead.party = party;
    if (data.access != null) lead.access = !!data.access;
    if (data.kit != null) lead.kit = !!data.kit;
    const { f, db } = await connect();
    lead.creado = f.serverTimestamp();
    await f.addDoc(f.collection(db, "leads"), lead);
    return true;
  } catch (e) {
    return false;
  }
}

async function getBooking(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!enabled || !/^[A-Z0-9-]{5,24}$/.test(c)) return null;
  try {
    const { f, db } = await connect();
    const snap = await f.getDoc(f.doc(db, "reservas_publicas", c));   // documento público (solo lo que ve el viajero)
    if (!snap.exists()) return null;
    const b = plain(snap.data());
    PRIVATE_FIELDS.forEach(k => { delete b[k]; });
    b.code = b.code || c;
    if (!b.status && b.estado) b.status = b.estado;
    if (!b.payLink && b.pago && b.pago.enlace) b.payLink = b.pago.enlace;
    return b;
  } catch (e) {
    return null;
  }
}

window.EspoBackend = { enabled, saveLead, getBooking };
window.dispatchEvent(new Event("espo:backend"));
