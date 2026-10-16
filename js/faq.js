/* ==========================================================================
   Espontáneos Travel — Preguntas frecuentes (5 idiomas + FAQPage JSON-LD)
   Las RESPUESTAS salen de data/jenny.json (las mismas de Jenny), así el
   sitio y la asistente nunca se contradicen. Aquí solo van las preguntas.
   ========================================================================== */
(function (root, factory) {
  const spec = factory();
  if (typeof module === "object" && module.exports) { module.exports = spec; return; }
  root.EspoFAQ = spec;
  boot(spec);

  function boot(FAQ) {
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
    function lang() { try { return (window.EspoApp && EspoApp.getLang()) || document.documentElement.lang || "es"; } catch (e) { return "es"; } }
    function items(L) { return FAQ.items(window.EspoData, L); }
    function render() {
      const list = document.getElementById("faq-list"); if (!list || !window.EspoData || !EspoData.ready()) return;
      const L = lang();
      list.innerHTML = EspoRender.faq(items(L));
      injectJsonLd();
      if (window.__revealScan) window.__revealScan();
    }
    function injectJsonLd() {
      const old = document.getElementById("jsonld-faq"); if (old) old.remove();
      const data = { "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": items("es").map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) };
      const s = document.createElement("script"); s.type = "application/ld+json"; s.id = "jsonld-faq";
      s.textContent = JSON.stringify(data); document.head.appendChild(s);
    }
    void esc;
    document.addEventListener("espo:lang", render);
    document.addEventListener("espo:data", render);
    if (window.EspoData && EspoData.ready()) render();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // Orden pensado para el viajero: qué es, cómo reservo, cuánto, cómo pago, logística, condiciones.
  const Q = [
    ["empresa", { es: "¿Quiénes son Espontáneos Travel?", en: "Who is Espontáneos Travel?", fr: "Qui est Espontáneos Travel ?", de: "Wer ist Espontáneos Travel?", pt: "Quem é a Espontáneos Travel?" }],
    ["reservar", { es: "¿Cómo reservo y qué necesito?", en: "How do I book and what do I need?", fr: "Comment réserver et de quoi ai-je besoin ?", de: "Wie buche ich und was brauche ich?", pt: "Como reservo e do que preciso?" }],
    ["precios", { es: "¿Cuánto cuestan las experiencias?", en: "How much do the experiences cost?", fr: "Combien coûtent les expériences ?", de: "Was kosten die Erlebnisse?", pt: "Quanto custam as experiências?" }],
    ["pagos", { es: "¿Debo pagar todo por adelantado? ¿Qué medios de pago aceptan?", en: "Do I pay everything upfront? Which payment methods do you accept?", fr: "Dois-je tout payer à l'avance ? Quels moyens de paiement acceptez-vous ?", de: "Muss ich alles im Voraus zahlen? Welche Zahlungsmittel akzeptieren Sie?", pt: "Preciso pagar tudo adiantado? Quais formas de pagamento vocês aceitam?" }],
    ["traslados", { es: "¿Hacen traslados desde el aeropuerto?", en: "Do you offer airport transfers?", fr: "Proposez-vous des transferts depuis l'aéroport ?", de: "Bieten Sie Flughafentransfers an?", pt: "Vocês fazem traslados do aeroporto?" }],
    ["que_llevar", { es: "¿Qué debo llevar?", en: "What should I bring?", fr: "Que dois-je emporter ?", de: "Was sollte ich mitnehmen?", pt: "O que devo levar?" }],
    ["clima", { es: "¿Cómo es el clima?", en: "What's the weather like?", fr: "Quel est le climat ?", de: "Wie ist das Wetter?", pt: "Como é o clima?" }],
    ["temporadas", { es: "¿Cuándo es temporada alta?", en: "When is high season?", fr: "Quand a lieu la haute saison ?", de: "Wann ist Hochsaison?", pt: "Quando é a alta temporada?" }],
    ["ninos_mayores", { es: "¿Es apto para niños y adultos mayores?", en: "Is it suitable for children and older adults?", fr: "Est-ce adapté aux enfants et aux seniors ?", de: "Ist es für Kinder und ältere Menschen geeignet?", pt: "É indicado para crianças e idosos?" }],
    ["accesibilidad", { es: "¿Tienen opciones accesibles o sin barreras?", en: "Do you have accessible, barrier-free options?", fr: "Avez-vous des options accessibles, sans barrières ?", de: "Haben Sie barrierefreie Angebote?", pt: "Vocês têm opções acessíveis, sem barreiras?" }],
    ["idiomas", { es: "¿En qué idiomas son los guías?", en: "Which languages do the guides speak?", fr: "Quelles langues parlent les guides ?", de: "Welche Sprachen sprechen die Guides?", pt: "Em quais idiomas são os guias?" }],
    ["cancelacion", { es: "¿Qué pasa si cancelo?", en: "What if I cancel?", fr: "Que se passe-t-il si j'annule ?", de: "Was passiert, wenn ich storniere?", pt: "E se eu cancelar?" }],
    ["sostenibilidad", { es: "¿Son una empresa sostenible?", en: "Are you a sustainable company?", fr: "Êtes-vous une entreprise durable ?", de: "Sind Sie ein nachhaltiges Unternehmen?", pt: "Vocês são uma empresa sustentável?" }]
  ];
  function items(D, L) {
    return Q.map(([id, q]) => {
      const a = id === "que_llevar" ? D.general("que_llevar", L) : ((D.node(id, L) || {}).respuesta || "");
      return { id, q: q[L] || q.es, a };
    }).filter(x => x.a);
  }
  return { Q, items };
});
