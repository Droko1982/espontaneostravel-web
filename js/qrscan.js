/* ==========================================================================
   Espontáneos Travel — Lector de QR con la cámara (sin servidor).
   Usa BarcodeDetector (Chrome/Android) y, si no existe (iPhone/Safari,
   Firefox), carga jsQR desde CDN. Respaldo: subir una foto del QR.
   Uso: EspoQR.scan({ title, hint, file, close, nocam }).then(text => …)
        (resuelve con el texto del QR, o null si el usuario cierra).
   ========================================================================== */
(function () {
  "use strict";
  const JSQR_URL = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
  let jsqrPromise = null;

  function loadJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (!jsqrPromise) jsqrPromise = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = JSQR_URL; s.async = true;
      s.integrity = "sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx"; s.crossOrigin = "anonymous";
      s.onload = () => res(window.jsQR); s.onerror = rej; document.head.appendChild(s);
    });
    return jsqrPromise;
  }
  function nativeDetector() {
    try { if ("BarcodeDetector" in window) return new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (e) {}
    return null;
  }
  // Decodifica desde un <video>, <img> o <canvas>
  function decodeFrom(source, canvas, detector) {
    if (detector) return detector.detect(source).then(r => (r && r[0] ? r[0].rawValue : null)).catch(() => null);
    return loadJsQR().then(jsQR => {
      const w = source.videoWidth || source.naturalWidth || source.width, h = source.videoHeight || source.naturalHeight || source.height;
      if (!w || !h) return null;
      const scale = Math.min(1, 800 / Math.max(w, h));
      canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      return r ? r.data : null;
    }).catch(() => null);
  }

  function scan(t) {
    t = t || {};
    return new Promise((resolve) => {
      const detector = nativeDetector();
      const canvas = document.createElement("canvas");
      let stream = null, done = false, timer = null;

      const ov = document.createElement("div");
      ov.className = "qr-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", t.title || "QR");
      ov.innerHTML =
        '<div class="qr-box">' +
          '<div class="qr-head"><b></b><button type="button" class="qr-x">✕</button></div>' +
          '<div class="qr-cam"><video playsinline muted autoplay></video><span class="qr-frame"></span></div>' +
          '<p class="qr-hint"></p>' +
          '<label class="btn btn--ghost btn--sm qr-file"><input type="file" accept="image/*" hidden><span></span></label>' +
        '</div>';
      ov.querySelector(".qr-head b").textContent = t.title || "QR";
      ov.querySelector(".qr-x").setAttribute("aria-label", t.close || "Close");
      ov.querySelector(".qr-hint").textContent = t.hint || "";
      ov.querySelector(".qr-file span").textContent = t.file || "📷";
      // Evita que el clic "fuera del panel" de Jenny cierre el chat mientras se escanea.
      ov.addEventListener("click", (e) => { e.stopPropagation(); if (e.target === ov) finish(null); });
      ov.querySelector(".qr-x").addEventListener("click", () => finish(null));
      const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); finish(null); } };
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(ov);
      const video = ov.querySelector("video");
      const hint = ov.querySelector(".qr-hint");

      function finish(val) {
        if (done) return; done = true;
        clearTimeout(timer);
        if (stream) stream.getTracks().forEach(tr => tr.stop());
        document.removeEventListener("keydown", onKey, true);
        ov.remove(); resolve(val);
      }
      function loop() {
        if (done) return;
        if (video.readyState >= 2) {
          decodeFrom(video, canvas, detector).then(v => { if (v) finish(v); else timer = setTimeout(loop, 250); });
        } else timer = setTimeout(loop, 250);
      }

      ov.querySelector(".qr-file input").addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const img = new Image();
        img.onload = () => decodeFrom(img, canvas, detector).then(v => { URL.revokeObjectURL(img.src); if (v) finish(v); else hint.textContent = t.bad || "QR?"; });
        img.src = URL.createObjectURL(f);
      });

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { ov.classList.add("qr-nocam"); hint.textContent = t.nocam || ""; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
        .then(s => {
          if (done) { s.getTracks().forEach(tr => tr.stop()); return; }
          stream = s; video.srcObject = s; video.play().catch(() => {}); loop();
        })
        .catch(() => { ov.classList.add("qr-nocam"); hint.textContent = t.nocam || ""; });
    });
  }

  window.EspoQR = { scan };
})();
