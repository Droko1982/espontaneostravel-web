/* ==========================================================================
   Espontáneos Travel — Configuración de Firebase (portal B2B y sitio público)

   CÓMO LLENARLO (una sola vez):
   1. Entra a https://console.firebase.google.com y abre tu proyecto.
   2. Engranaje ⚙ → "Configuración del proyecto" → pestaña "General".
   3. Abajo, en "Tus apps", elige la app web (icono </>). Si no existe, créala
      con "Agregar app" → Web (no hace falta Firebase Hosting).
   4. Copia los valores del bloque "firebaseConfig" y pégalos aquí abajo,
      entre las comillas. Guarda y publica el sitio.

   ¿Es seguro que esto quede en el repositorio público?
   Sí: estos datos solo identifican el proyecto; NO son una contraseña.
   La seguridad real la dan las reglas (firestore.rules) y el inicio de sesión.
   Lo que NUNCA debe ir al repositorio: tarifarios, condiciones (privado/),
   respaldos CSV/JSON ni datos de clientes. Ver docs/BACKEND.md.

   Mientras apiKey esté vacío, el portal muestra una pantalla de configuración
   y el sitio público sigue funcionando igual que hoy (sin guardar nada).
   ========================================================================== */
export const firebaseConfig = {
  apiKey: "AIzaSyC7OO-o6sYEWdFKcFtBs6qcAbovhd9yTH8",
  authDomain: "espontaneos-travel-befc8.firebaseapp.com",
  projectId: "espontaneos-travel-befc8",
  storageBucket: "espontaneos-travel-befc8.firebasestorage.app",
  messagingSenderId: "1096778731607",
  appId: "1:1096778731607:web:e55d034a5e19b19b319312"
};

export const enabled = Boolean(firebaseConfig.apiKey);

/* Protección antispam (Firebase App Check con reCAPTCHA v3). Vacío = desactivada.
   Para activarla: crea una clave reCAPTCHA v3 para www.espontaneostravel.com, regístrala en
   Firebase → App Check → Apps → sitio, y pega aquí la CLAVE DEL SITIO (no la secreta).
   Ver docs/BACKEND.md → "App Check". */
export const appCheckSiteKey = "";
