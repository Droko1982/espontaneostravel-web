/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Jenny, asistente de pre-venta del sitio
   Lee la MISMA fuente que el sitio y el conserje: data/jenny.json (+ i18n).
   Reglas: no inventa datos (null/POR_VALIDAR → asesor), nunca muestra tarifas
   netas, la tarifa directa solo sale al cotizar y con un beneficio por convenio, cada respuesta termina con una siguiente acción, 6 idiomas, y el
   mensaje a WhatsApp lleva tour + código, personas, fecha, hotel e idioma.
   ========================================================================== */
(function () {
  "use strict";

  // Menú inicial: "Experiencias" muestra todas las categorías (con cuántas hay) y un atajo a la galería de la página
  const ALL_T = {
    es: { chip: "🌿 Experiencias", msg: "Tenemos *{n} experiencias*. Elige una categoría 👇 o míralas todas con fotos en la página.", web: "🖼️ Verlas todas con fotos" },
    en: { chip: "🌿 Experiences", msg: "We have *{n} experiences*. Pick a category 👇 or see them all with photos on the page.", web: "🖼️ See them all with photos" },
    fr: { chip: "🌿 Expériences", msg: "Nous avons *{n} expériences*. Choisissez une catégorie 👇 ou voyez-les toutes en photos sur la page.", web: "🖼️ Les voir toutes en photos" },
    de: { chip: "🌿 Erlebnisse", msg: "Wir haben *{n} Erlebnisse*. Wählen Sie eine Kategorie 👇 oder sehen Sie alle mit Fotos auf der Seite.", web: "🖼️ Alle mit Fotos ansehen" },
    pt: { chip: "🌿 Experiências", msg: "Temos *{n} experiências*. Escolha uma categoria 👇 ou veja todas com fotos na página.", web: "🖼️ Ver todas com fotos" },
    it: { chip: "🌿 Esperienze", msg: "Abbiamo *{n} esperienze*. Scegli una categoria 👇 o guardale tutte con le foto sulla pagina.", web: "🖼️ Guardale tutte con le foto" }
  };
  const CONTACT_LBL = { es: "Tu WhatsApp o correo (opcional, por si no nos llega tu mensaje)", en: "Your WhatsApp or email (optional, in case your message doesn't reach us)",
    fr: "Votre WhatsApp ou e-mail (facultatif, au cas où votre message ne nous parviendrait pas)", de: "Ihre WhatsApp-Nummer oder E-Mail (optional, falls Ihre Nachricht uns nicht erreicht)",
    pt: "Seu WhatsApp ou e-mail (opcional, caso sua mensagem não chegue até nós)",
    it: "Il tuo WhatsApp o la tua email (facoltativo, nel caso il tuo messaggio non ci arrivi)" };
  // Autorización de uso de imagen (opcional, sin marcar por defecto). Ver terminos.html#imagenes
  const IMG_OK = {
    es: { chk: "Autorizo que Espontáneos Travel use fotos y videos donde aparezca, tomados en mis experiencias, en su web y redes (opcional; puedo retirarla cuando quiera).", wa: "📸 Uso de fotos donde aparezco:", yes: "Autorizo", no: "No autorizo" },
    en: { chk: "I allow Espontáneos Travel to use photos and videos of me taken during my experiences on its website and social media (optional; I can withdraw it at any time).", wa: "📸 Use of photos of me:", yes: "I agree", no: "I don't agree" },
    fr: { chk: "J'autorise Espontáneos Travel à utiliser les photos et vidéos où j'apparais, prises pendant mes expériences, sur son site et ses réseaux (facultatif ; je peux la retirer à tout moment).", wa: "📸 Utilisation des photos où j'apparais :", yes: "J'autorise", no: "Je n'autorise pas" },
    de: { chk: "Ich erlaube Espontáneos Travel, Fotos und Videos von mir, die bei meinen Erlebnissen entstehen, auf seiner Website und in sozialen Netzwerken zu nutzen (freiwillig; jederzeit widerrufbar).", wa: "📸 Nutzung von Fotos, auf denen ich zu sehen bin:", yes: "Erlaubt", no: "Nicht erlaubt" },
    pt: { chk: "Autorizo a Espontáneos Travel a usar fotos e vídeos em que eu apareça, feitos nas minhas experiências, no site e nas redes sociais da empresa (opcional; posso retirar esta autorização quando quiser).", wa: "📸 Uso de fotos em que apareço:", yes: "Autorizo", no: "Não autorizo" },
    it: { chk: "Autorizzo Espontáneos Travel a usare foto e video in cui compaio, scattati durante le mie esperienze, sul suo sito e sui suoi social (facoltativo; posso revocare l'autorizzazione quando voglio).", wa: "📸 Uso delle foto in cui compaio:", yes: "Autorizzo", no: "Non autorizzo" }
  };
  // "{n} día|{n} días": la primera forma para 1, la segunda para el resto
  const nForm = (s, n) => { const f = String(s).split("|"); return (f.length > 1 && +n !== 1 ? f[1] : f[0]).replace("{n}", n); };
  const LANG_ES = { es: "español", en: "inglés", fr: "francés", de: "alemán", pt: "portugués", it: "italiano" };
  const LANGNAME = { es: "Español", en: "English", fr: "Français", de: "Deutsch", pt: "Português", it: "Italiano" };
  const UI = {
    es: {
      launch: "¿Te ayudo?", close: "Cerrar", title: "Jenny", subtitle: "Tu anfitriona · en línea",
      menu_prompt: "Elige un tema o escríbeme tu pregunta 👇", more: "➕ Más temas", back: "↩ Menú", other: "Otra pregunta",
      foot: "Información oficial del portafolio · un asesor confirma los detalles", ask_ph: "Escribe tu pregunta…", send: "Enviar",
      m_reservar: "📅 Reservar", m_horarios: "🕘 Horarios", m_duracion: "⏱️ Duración", m_incluye: "✅ Qué incluye", m_llevar: "🎒 Qué llevar",
      m_precios: "💲 Precios", m_pagos: "💳 Pagos", m_plans: "🗺️ Itinerarios", m_scan: "📷 Escanear QR", m_asesor: "💬 Hablar con un asesor",
      m_traslados: "🚐 Traslados", m_ninos: "👨‍👩‍👧 Niños y mayores", m_access: "♿ Accesibilidad", m_idiomas: "🗣️ Idiomas", m_clima: "🌦️ Clima",
      m_temporadas: "📆 Temporadas", m_cancel: "↩️ Cancelaciones", m_sost: "🌿 Sostenibilidad", m_empresa: "🏡 Quiénes somos", m_redes: "📱 Redes", m_compartido: "🚐 Tour compartido Cocora + Salento",
      pick_cat: "¿Sobre qué experiencia? Elige una categoría 👇", pick_tour: "Elige la experiencia:",
      hub: "*{tour}* · {code}\n¿Qué quieres saber?", see_card: "🔎 Ver ficha completa", book_this: "📅 Reservar esta", another_tour: "Otra experiencia",
      a_horario: "*{tour}*: {h}.", a_dur: "*{tour}* dura aprox. *{d}* desde la recogida en tu hotel.",
      a_incl: "*{tour}* incluye:", a_noincl: "No incluye:", a_tbd: "Ese dato te lo confirma un asesor 💬",
      a_price_pub: "Precio de venta 2026: *{p}*.", forecast: "🌦️ Pronóstico para tu fecha:",
      rain: "🌧️ Lluvia probable ese día: lleva ropa impermeable.", uv: "☀️ Índice UV muy alto: bloqueador, gorra y gafas.", cold: "🧥 Mañana fría: lleva abrigo.",
      f_guide: "Idioma del guía", no_match: "No tengo esa respuesta exacta 🙈 Te paso con un asesor por WhatsApp para que te ayude.",
      wa_q: "¡Hola Espontáneos Travel! Tengo una pregunta:", wa_default: "¡Hola Espontáneos Travel! Me gustaría más información sobre sus experiencias.",
      open_wa: "Abrir WhatsApp", go_sust: "Ver sección Sostenibilidad", go_tours: "Ver experiencias", pay_btn: "💳 Pagar con tarjeta",
      wa_tour: "🌿 Experiencia:", wa_guide: "🧭 Idioma del guía:", confirm_book: "¿Quieres reservar *{tour}*?", wa_lead_tour: "¡Hola Espontáneos Travel! Quiero reservar:", consent: "Autorizo el tratamiento de mis datos según la {link} (Ley 1581 de 2012).", consent_link: "política de privacidad", consent_req: "Para continuar, acepta la política de datos 🙂", greet_fallback: "¡Hola! Soy Jenny, de Espontáneos Travel 🌿 ¿En qué te ayudo?"
    },
    en: {
      launch: "Need help?", close: "Close", title: "Jenny", subtitle: "Your host · online",
      menu_prompt: "Pick a topic or type your question 👇", more: "➕ More topics", back: "↩ Menu", other: "Another question",
      foot: "Official information from our catalogue · an advisor will confirm the details", ask_ph: "Type your question…", send: "Send",
      m_reservar: "📅 Book", m_horarios: "🕘 Schedules", m_duracion: "⏱️ Duration", m_incluye: "✅ What's included", m_llevar: "🎒 What to bring",
      m_precios: "💲 Prices", m_pagos: "💳 Payments", m_plans: "🗺️ Itineraries", m_scan: "📷 Scan QR", m_asesor: "💬 Talk to an advisor",
      m_traslados: "🚐 Transfers", m_ninos: "👨‍👩‍👧 Kids & seniors", m_access: "♿ Accessibility", m_idiomas: "🗣️ Languages", m_clima: "🌦️ Weather",
      m_temporadas: "📆 Seasons", m_cancel: "↩️ Cancellations", m_sost: "🌿 Sustainability", m_empresa: "🏡 About us", m_redes: "📱 Social media", m_compartido: "🚐 Shared Tour: Cocora + Salento",
      pick_cat: "Which experience? Pick a category 👇", pick_tour: "Pick an experience:",
      hub: "*{tour}* · {code}\nWhat would you like to know?", see_card: "🔎 See full details", book_this: "📅 Book this", another_tour: "Another experience",
      a_horario: "*{tour}*: {h}.", a_dur: "*{tour}* takes about *{d}* from hotel pickup.",
      a_incl: "*{tour}* includes:", a_noincl: "Not included:", a_tbd: "An advisor will confirm that for you 💬",
      a_price_pub: "2026 retail price: *{p}*.", forecast: "🌦️ Forecast for your date:",
      rain: "🌧️ Rain likely that day: bring waterproof clothing.", uv: "☀️ Very high UV: sunscreen, cap and sunglasses.", cold: "🧥 Chilly morning: bring a jacket.",
      f_guide: "Guide language", no_match: "I don't have that exact answer 🙈 Let me connect you with an advisor on WhatsApp.",
      wa_q: "Hi Espontáneos Travel! I have a question:", wa_default: "Hi Espontáneos Travel! I'd like more information about your experiences.",
      open_wa: "Open WhatsApp", go_sust: "See the Sustainability section", go_tours: "See experiences", pay_btn: "💳 Pay by card",
      wa_tour: "🌿 Experience:", wa_guide: "🧭 Guide language:", confirm_book: "Would you like to book *{tour}*?", wa_lead_tour: "Hi Espontáneos Travel! I'd like to book:", consent: "I authorise the processing of my data under the {link} (Colombian Law 1581 of 2012).", consent_link: "privacy policy", consent_req: "To continue, please accept the data policy 🙂", greet_fallback: "Hi! I'm Jenny from Espontáneos Travel 🌿 How can I help?"
    },
    fr: {
      launch: "Besoin d'aide ?", close: "Fermer", title: "Jenny", subtitle: "Votre hôtesse · en ligne",
      menu_prompt: "Choisissez un sujet ou écrivez votre question 👇", more: "➕ Plus de sujets", back: "↩ Menu", other: "Autre question",
      foot: "Informations officielles de notre catalogue · un conseiller confirme les détails", ask_ph: "Écrivez votre question…", send: "Envoyer",
      m_reservar: "📅 Réserver", m_horarios: "🕘 Horaires", m_duracion: "⏱️ Durée", m_incluye: "✅ Ce qui est inclus", m_llevar: "🎒 Quoi emporter",
      m_precios: "💲 Prix", m_pagos: "💳 Paiements", m_plans: "🗺️ Itinéraires", m_scan: "📷 Scanner un QR", m_asesor: "💬 Parler à un conseiller",
      m_traslados: "🚐 Transferts", m_ninos: "👨‍👩‍👧 Enfants et seniors", m_access: "♿ Accessibilité", m_idiomas: "🗣️ Langues", m_clima: "🌦️ Météo",
      m_temporadas: "📆 Saisons", m_cancel: "↩️ Annulations", m_sost: "🌿 Durabilité", m_empresa: "🏡 Qui sommes-nous", m_redes: "📱 Réseaux", m_compartido: "🚐 Tour partagé Cocora + Salento",
      pick_cat: "Quelle expérience ? Choisissez une catégorie 👇", pick_tour: "Choisissez l'expérience :",
      hub: "*{tour}* · {code}\nQue voulez-vous savoir ?", see_card: "🔎 Voir la fiche", book_this: "📅 Réserver celle-ci", another_tour: "Autre expérience",
      a_horario: "*{tour}* : {h}.", a_dur: "*{tour}* dure environ *{d}* depuis la prise en charge à l'hôtel.",
      a_incl: "*{tour}* comprend :", a_noincl: "Non inclus :", a_tbd: "Un conseiller vous le confirmera 💬",
      a_price_pub: "Prix de vente 2026 : *{p}*.", forecast: "🌦️ Prévisions pour votre date :",
      rain: "🌧️ Pluie probable ce jour-là : prévoyez des vêtements imperméables.", uv: "☀️ UV très élevé : crème solaire, casquette et lunettes.", cold: "🧥 Matinée froide : prévoyez une veste chaude.",
      f_guide: "Langue du guide", no_match: "Je n'ai pas de réponse précise à cette question 🙈 Je vous mets en contact avec un conseiller sur WhatsApp pour vous aider.",
      wa_q: "Bonjour Espontáneos Travel ! J'ai une question :", wa_default: "Bonjour Espontáneos Travel ! Je souhaite plus d'informations sur vos expériences.",
      open_wa: "Ouvrir WhatsApp", go_sust: "Voir la section Durabilité", go_tours: "Voir les expériences", pay_btn: "💳 Payer par carte",
      wa_tour: "🌿 Expérience :", wa_guide: "🧭 Langue du guide :", confirm_book: "Voulez-vous réserver *{tour}* ?", wa_lead_tour: "Bonjour Espontáneos Travel ! Je souhaite réserver :", consent: "J'autorise le traitement de mes données selon la {link} (loi colombienne 1581 de 2012).", consent_link: "politique de confidentialité", consent_req: "Pour continuer, veuillez accepter la politique de confidentialité 🙂", greet_fallback: "Bonjour ! Je suis Jenny, d'Espontáneos Travel 🌿 Comment puis-je vous aider ?"
    },
    de: {
      launch: "Kann ich helfen?", close: "Schließen", title: "Jenny", subtitle: "Ihre Gastgeberin · online",
      menu_prompt: "Wählen Sie ein Thema oder schreiben Sie Ihre Frage 👇", more: "➕ Weitere Themen", back: "↩ Menü", other: "Andere Frage",
      foot: "Offizielle Portfolio-Informationen · ein Berater bestätigt die Details", ask_ph: "Ihre Frage…", send: "Senden",
      m_reservar: "📅 Buchen", m_horarios: "🕘 Uhrzeiten", m_duracion: "⏱️ Dauer", m_incluye: "✅ Inklusive", m_llevar: "🎒 Was mitnehmen",
      m_precios: "💲 Preise", m_pagos: "💳 Zahlung", m_plans: "🗺️ Reisepläne", m_scan: "📷 QR scannen", m_asesor: "💬 Mit Berater sprechen",
      m_traslados: "🚐 Transfers", m_ninos: "👨‍👩‍👧 Kinder & Senioren", m_access: "♿ Barrierefreiheit", m_idiomas: "🗣️ Sprachen", m_clima: "🌦️ Wetter",
      m_temporadas: "📆 Saisons", m_cancel: "↩️ Stornierung", m_sost: "🌿 Nachhaltigkeit", m_empresa: "🏡 Über uns", m_redes: "📱 Soziale Medien", m_compartido: "🚐 Gruppentour Cocora + Salento",
      pick_cat: "Welches Erlebnis? Wählen Sie eine Kategorie 👇", pick_tour: "Wählen Sie das Erlebnis:",
      hub: "*{tour}* · {code}\nWas möchten Sie wissen?", see_card: "🔎 Details ansehen", book_this: "📅 Dieses buchen", another_tour: "Anderes Erlebnis",
      a_horario: "*{tour}*: {h}.", a_dur: "*{tour}* dauert ca. *{d}* ab der Abholung an Ihrem Hotel.",
      a_incl: "*{tour}* beinhaltet:", a_noincl: "Nicht inklusive:", a_tbd: "Das bestätigt Ihnen ein Berater 💬",
      a_price_pub: "Verkaufspreis 2026: *{p}*.", forecast: "🌦️ Vorhersage für Ihr Datum:",
      rain: "🌧️ An diesem Tag ist Regen wahrscheinlich: wasserfeste Kleidung mitnehmen.", uv: "☀️ Sehr hoher UV-Index: Sonnencreme, Kappe und Sonnenbrille.", cold: "🧥 Kalter Morgen: warme Jacke mitnehmen.",
      f_guide: "Sprache des Guides", no_match: "Darauf habe ich keine genaue Antwort 🙈 Ich verbinde Sie per WhatsApp mit einem Berater.",
      wa_q: "Hallo Espontáneos Travel! Ich habe eine Frage:", wa_default: "Hallo Espontáneos Travel! Ich hätte gern mehr Informationen zu Ihren Erlebnissen.",
      open_wa: "WhatsApp öffnen", go_sust: "Bereich Nachhaltigkeit ansehen", go_tours: "Erlebnisse ansehen", pay_btn: "💳 Mit Karte zahlen",
      wa_tour: "🌿 Erlebnis:", wa_guide: "🧭 Sprache des Guides:", confirm_book: "Möchten Sie *{tour}* buchen?", wa_lead_tour: "Hallo Espontáneos Travel! Ich möchte buchen:", consent: "Ich stimme der Verarbeitung meiner Daten gemäß der {link} zu (kolumbianisches Gesetz 1581 von 2012).", consent_link: "Datenschutzerklärung", consent_req: "Bitte akzeptieren Sie die Datenschutzerklärung, um fortzufahren 🙂", greet_fallback: "Hallo! Ich bin Jenny von Espontáneos Travel 🌿 Wie kann ich Ihnen helfen?"
    },
    pt: {
      launch: "Posso ajudar?", close: "Fechar", title: "Jenny", subtitle: "Sua anfitriã · online",
      menu_prompt: "Escolha um tema ou escreva sua pergunta 👇", more: "➕ Mais temas", back: "↩ Menu", other: "Outra pergunta",
      foot: "Informação oficial do portfólio · um consultor confirma os detalhes", ask_ph: "Escreva sua pergunta…", send: "Enviar",
      m_reservar: "📅 Reservar", m_horarios: "🕘 Horários", m_duracion: "⏱️ Duração", m_incluye: "✅ O que inclui", m_llevar: "🎒 O que levar",
      m_precios: "💲 Preços", m_pagos: "💳 Pagamentos", m_plans: "🗺️ Roteiros", m_scan: "📷 Escanear QR", m_asesor: "💬 Falar com um consultor",
      m_traslados: "🚐 Traslados", m_ninos: "👨‍👩‍👧 Crianças e idosos", m_access: "♿ Acessibilidade", m_idiomas: "🗣️ Idiomas", m_clima: "🌦️ Clima",
      m_temporadas: "📆 Temporadas", m_cancel: "↩️ Cancelamentos", m_sost: "🌿 Sustentabilidade", m_empresa: "🏡 Quem somos", m_redes: "📱 Redes sociais", m_compartido: "🚐 Tour compartilhado Cocora + Salento",
      pick_cat: "Sobre qual experiência? Escolha uma categoria 👇", pick_tour: "Escolha a experiência:",
      hub: "*{tour}* · {code}\nO que você quer saber?", see_card: "🔎 Ver detalhes", book_this: "📅 Reservar esta", another_tour: "Outra experiência",
      a_horario: "*{tour}*: {h}.", a_dur: "*{tour}* dura aprox. *{d}* a partir do momento em que buscamos você no hotel.",
      a_incl: "*{tour}* inclui:", a_noincl: "Não inclui:", a_tbd: "Um consultor confirma isso para você 💬",
      a_price_pub: "Preço de venda 2026: *{p}*.", forecast: "🌦️ Previsão para a sua data:",
      rain: "🌧️ Chuva provável nesse dia: leve roupa impermeável.", uv: "☀️ UV muito alto: protetor, boné e óculos.", cold: "🧥 Manhã fria: leve um casaco.",
      f_guide: "Idioma do guia", no_match: "Não tenho essa resposta exata 🙈 Vou passar você para um consultor no WhatsApp.",
      wa_q: "Olá Espontáneos Travel! Tenho uma pergunta:", wa_default: "Olá Espontáneos Travel! Gostaria de mais informações sobre as experiências.",
      open_wa: "Abrir WhatsApp", go_sust: "Ver seção Sustentabilidade", go_tours: "Ver experiências", pay_btn: "💳 Pagar com cartão",
      wa_tour: "🌿 Experiência:", wa_guide: "🧭 Idioma do guia:", confirm_book: "Quer reservar *{tour}*?", wa_lead_tour: "Olá Espontáneos Travel! Quero reservar:", consent: "Autorizo o tratamento dos meus dados conforme a {link} (Lei colombiana 1581 de 2012).", consent_link: "política de privacidade", consent_req: "Para continuar, aceite a política de dados 🙂", greet_fallback: "Olá! Sou a Jenny, da Espontáneos Travel 🌿 Como posso ajudar?"
    },
    it: {
      launch: "Posso aiutarti?", close: "Chiudi", title: "Jenny", subtitle: "La tua host · online",
      menu_prompt: "Scegli un argomento o scrivimi la tua domanda 👇", more: "➕ Altri argomenti", back: "↩ Menu", other: "Un'altra domanda",
      foot: "Informazioni ufficiali del portfolio · un consulente conferma i dettagli", ask_ph: "Scrivi la tua domanda…", send: "Invia",
      m_reservar: "📅 Prenota", m_horarios: "🕘 Orari", m_duracion: "⏱️ Durata", m_incluye: "✅ Cosa è incluso", m_llevar: "🎒 Cosa portare",
      m_precios: "💲 Prezzi", m_pagos: "💳 Pagamenti", m_plans: "🗺️ Itinerari", m_scan: "📷 Scansiona QR", m_asesor: "💬 Parla con un consulente",
      m_traslados: "🚐 Transfer", m_ninos: "👨‍👩‍👧 Bambini e anziani", m_access: "♿ Accessibilità", m_idiomas: "🗣️ Lingue", m_clima: "🌦️ Meteo",
      m_temporadas: "📆 Stagioni", m_cancel: "↩️ Cancellazioni", m_sost: "🌿 Sostenibilità", m_empresa: "🏡 Chi siamo", m_redes: "📱 Social", m_compartido: "🚐 Tour condiviso Cocora + Salento",
      pick_cat: "Quale esperienza? Scegli una categoria 👇", pick_tour: "Scegli l'esperienza:",
      hub: "*{tour}* · {code}\nCosa vuoi sapere?", see_card: "🔎 Vedi la scheda completa", book_this: "📅 Prenota questa", another_tour: "Un'altra esperienza",
      a_horario: "*{tour}*: {h}.", a_dur: "*{tour}* dura circa *{d}* dal ritiro in hotel.",
      a_incl: "*{tour}* include:", a_noincl: "Non include:", a_tbd: "Questo dato te lo conferma un consulente 💬",
      a_price_pub: "Prezzo di vendita 2026: *{p}*.", forecast: "🌦️ Previsioni per la tua data:",
      rain: "🌧️ Probabile pioggia quel giorno: porta abbigliamento impermeabile.", uv: "☀️ Indice UV molto alto: crema solare, cappellino e occhiali da sole.", cold: "🧥 Mattina fredda: porta una giacca calda.",
      f_guide: "Lingua della guida", no_match: "Non ho una risposta precisa a questa domanda 🙈 Ti metto in contatto con un consulente su WhatsApp che ti aiuterà.",
      wa_q: "Ciao Espontáneos Travel! Ho una domanda:", wa_default: "Ciao Espontáneos Travel! Vorrei maggiori informazioni sulle vostre esperienze.",
      open_wa: "Apri WhatsApp", go_sust: "Vai alla sezione Sostenibilità", go_tours: "Vedi le esperienze", pay_btn: "💳 Paga con carta",
      wa_tour: "🌿 Esperienza:", wa_guide: "🧭 Lingua della guida:", confirm_book: "Vuoi prenotare *{tour}*?", wa_lead_tour: "Ciao Espontáneos Travel! Vorrei prenotare:", consent: "Autorizzo il trattamento dei miei dati secondo l'{link} (legge colombiana 1581 del 2012).", consent_link: "informativa sulla privacy", consent_req: "Per continuare, accetta l'informativa sulla privacy 🙂", greet_fallback: "Ciao! Sono Jenny di Espontáneos Travel 🌿 Come posso aiutarti?"
    }
  };

  // Viajero con reserva que escribe en el sitio ("quiero cambiar de horario", "mi reserva"): lo llevamos a Mi viaje
  // (allí el cambio es guiado) o, si no tiene el código, a WhatsApp con una plantilla clara para llenar.
  const MT = {
    es: { change: "Para cambiar un horario de tu reserva, abre *Mi viaje* con tu código: eliges la actividad y la nueva hora, y tu anfitrión recibe por WhatsApp un mensaje con todos los datos 👇",
      view: "Tu itinerario, horarios, mapa y qué llevar están en *Mi viaje*. Ábrelo con tu código de reserva 👇", open: "🔑 Abrir Mi viaje", nocode: "💬 No tengo el código",
      wa_change: "¡Hola Espontáneos Travel! 👋 Tengo una reserva y quiero *cambiar un horario*.\n• Nombre de la reserva: \n• Actividad: \n• Día y hora actuales: \n• Nuevo horario que prefiero: ",
      wa_view: "¡Hola Espontáneos Travel! 👋 Tengo una reserva y necesito mi *código de viaje*.\n• Nombre de la reserva: \n• Fecha del viaje: " },
    en: { change: "To change a time in your booking, open *My trip* with your code: pick the activity and the new time, and your host gets a WhatsApp message with all the details 👇",
      view: "Your itinerary, times, map and packing list are in *My trip*. Open it with your booking code 👇", open: "🔑 Open My trip", nocode: "💬 I don't have the code",
      wa_change: "Hi Espontáneos Travel! 👋 I have a booking and I'd like to *change a time*.\n• Booking name: \n• Activity: \n• Current day and time: \n• New time I'd prefer: ",
      wa_view: "Hi Espontáneos Travel! 👋 I have a booking and I need my *trip code*.\n• Booking name: \n• Travel date: " },
    fr: { change: "Pour changer un horaire de votre réservation, ouvrez *Mon voyage* avec votre code : choisissez l'activité et la nouvelle heure, et votre hôte reçoit un message WhatsApp avec tous les détails 👇",
      view: "Votre itinéraire, vos horaires, la carte et ce qu'il faut emporter se trouvent dans *Mon voyage*. Ouvrez-le avec votre code de réservation 👇", open: "🔑 Ouvrir Mon voyage", nocode: "💬 Je n'ai pas le code",
      wa_change: "Bonjour Espontáneos Travel ! 👋 J'ai une réservation et je souhaite *changer un horaire*.\n• Nom de la réservation : \n• Activité : \n• Jour et heure actuels : \n• Nouvel horaire souhaité : ",
      wa_view: "Bonjour Espontáneos Travel ! 👋 J'ai une réservation et j'ai besoin de mon *code de voyage*.\n• Nom de la réservation : \n• Date du voyage : " },
    de: { change: "Um eine Uhrzeit Ihrer Buchung zu ändern, öffnen Sie *Meine Reise* mit Ihrem Code: Sie wählen die Aktivität und die neue Uhrzeit, und Ihr Gastgeber erhält per WhatsApp eine Nachricht mit allen Angaben 👇",
      view: "Ihr Reiseplan, Uhrzeiten, Karte und Packliste sind in *Meine Reise*. Öffnen Sie sie mit Ihrem Buchungscode 👇", open: "🔑 Meine Reise öffnen", nocode: "💬 Ich habe keinen Code",
      wa_change: "Hallo Espontáneos Travel! 👋 Ich habe eine Buchung und möchte eine *Uhrzeit ändern*.\n• Name der Buchung: \n• Aktivität: \n• Aktueller Tag und Uhrzeit: \n• Gewünschte neue Zeit: ",
      wa_view: "Hallo Espontáneos Travel! 👋 Ich habe eine Buchung und brauche meinen *Reisecode*.\n• Name der Buchung: \n• Reisedatum: " },
    pt: { change: "Para mudar um horário da sua reserva, abra *Minha viagem* com seu código: você escolhe a atividade e o novo horário, e seu anfitrião recebe pelo WhatsApp uma mensagem com todos os dados 👇",
      view: "Seu roteiro, horários, mapa e o que levar estão em *Minha viagem*. Abra com seu código de reserva 👇", open: "🔑 Abrir Minha viagem", nocode: "💬 Não tenho o código",
      wa_change: "Olá Espontáneos Travel! 👋 Tenho uma reserva e quero *mudar um horário*.\n• Nome da reserva: \n• Atividade: \n• Dia e horário atuais: \n• Novo horário que prefiro: ",
      wa_view: "Olá Espontáneos Travel! 👋 Tenho uma reserva e preciso do meu *código de viagem*.\n• Nome da reserva: \n• Data da viagem: " },
    it: { change: "Per cambiare un orario della tua prenotazione, apri *Il mio viaggio* con il tuo codice: scegli l'attività e il nuovo orario, e il tuo host riceve su WhatsApp un messaggio con tutti i dati 👇",
      view: "Il tuo itinerario, gli orari, la mappa e cosa portare sono in *Il mio viaggio*. Aprilo con il tuo codice di prenotazione 👇", open: "🔑 Apri Il mio viaggio", nocode: "💬 Non ho il codice",
      wa_change: "Ciao Espontáneos Travel! 👋 Ho una prenotazione e vorrei *cambiare un orario*.\n• Nome della prenotazione: \n• Attività: \n• Giorno e ora attuali: \n• Nuovo orario che preferisco: ",
      wa_view: "Ciao Espontáneos Travel! 👋 Ho una prenotazione e mi serve il mio *codice di viaggio*.\n• Nome della prenotazione: \n• Data del viaggio: " }
  };
  const ALIAS = {
    parquecafe: ["parque del cafe", "coffee park", "parc du cafe", "kaffeepark", "parque do cafe", "parco del caffe"],
    finca: ["tour del cafe", "tour de cafe", "coffee tour", "coffee farm", "finca cafetera", "fazenda de cafe", "ferme de cafe", "kaffeefarm", "kaffee-tour", "kaffeetour", "tour del caffe", "fattoria del caffe", "piantagione di caffe"],
    catacafe: ["cata de cafe", "coffee tasting", "degustation de cafe", "kaffeeverkostung", "degustacao de cafe", "degustazione di caffe"]
  };
  const CHANGE_VERB = /\b(cambi|mover|muev|reprogram|modific|aplaz|adelant|change|reschedul|move|modifi|deplac|andern|aendern|verschieb|mudar|alterar|remarc|spost|rinvi|posticip)\w*/;
  const TIME_WORD = /\b(hora|horas|horario|horarios|fecha|dia|time|date|day|heure|horaire|jour|uhr|uhrzeit|zeit|termin|tag|data|reserva|booking|reservation|buchung|ora|orario|orari|giorno|prenotazione)\b/;
  const MY_TRIP = /\b(mi|my|ma|mon|mein|meine|minha|meu|mio|mia)\s+(reserva|viaje|codigo|booking|trip|code|reservation|voyage|buchung|reise|viagem|prenotazione|viaggio|codice)\b/;

  // Temas del árbol (id del nodo en jenny.json → etiqueta del menú)
  const PRIMARY = ["reservar", "horarios", "duracion", "que_incluye", "que_llevar", "precios", "pagos", "plans", "asesor"];
  const MORE = ["compartido", "traslados", "ninos_mayores", "accesibilidad", "idiomas", "clima", "temporadas", "cancelacion", "sostenibilidad", "empresa", "redes", "scan"];
  const LABEL = { reservar: "m_reservar", horarios: "m_horarios", duracion: "m_duracion", que_incluye: "m_incluye", que_llevar: "m_llevar", precios: "m_precios",
    pagos: "m_pagos", plans: "m_plans", asesor: "m_asesor", traslados: "m_traslados", ninos_mayores: "m_ninos", accesibilidad: "m_access", idiomas: "m_idiomas",
    clima: "m_clima", temporadas: "m_temporadas", cancelacion: "m_cancel", sostenibilidad: "m_sost", empresa: "m_empresa", redes: "m_redes", compartido: "m_compartido", scan: "m_scan" };
  const TOUR_Q = ["horarios", "duracion", "que_incluye", "que_llevar"];          // preguntas que necesitan una experiencia
  // Palabras clave para el texto libre (se suman a pregunta_tipo de jenny.json)
  const KW = {
    horarios: ["hora", "horario", "a que hora", "a que horas sale", "recogen", "pickup", "what time", "schedule", "heure", "uhrzeit", "orari", "a che ora", "ritiro"],
    duracion: ["dura", "cuanto tiempo", "cuantas horas", "duracion", "how long", "duration", "duree", "dauer", "duracao", "quanto dura", "durata", "quante ore", "quanto tempo"],
    que_incluye: ["incluye", "include", "inclus", "inklusive", "inclui", "compreso", "comprende"],
    que_llevar: ["llevar", "ropa", "empacar", "bring", "pack", "emporter", "mitnehmen", "levar", "portare", "cosa portare", "valigia", "vestiti", "abbigliamento"],
    precios: ["precio", "cuesta", "valor", "tarifa", "cotiz", "price", "cost", "prix", "preis", "preco", "quanto", "prezz", "quanto costa", "tariff", "preventiv"],
    reservar: ["reserv", "book", "buchen", "prenot"],
    pagos: ["pago", "pagar", "anticipo", "nequi", "daviplata", "tarjeta", "payment", "pay", "deposit", "paiement", "zahlung", "pagamento", "pagament", "acconto", "caparra", "carta di credito", "bonifico"],
    traslados: ["traslado", "aeropuerto", "transfer", "airport", "aeroport", "flughafen", "aeroporto", "trasfer", "navetta"],
    ninos_mayores: ["nino", "bebe", "adulto mayor", "abuel", "kid", "child", "senior", "enfant", "kinder", "crianca", "bambin", "neonat", "anzian", "figli", "terza eta"],
    accesibilidad: ["accesib", "silla de ruedas", "discapacidad", "movilidad", "invidente", "wheelchair", "accessib", "barriere", "acessib", "sedia a rotelle", "disabil", "mobilita ridotta", "non vedent"],
    idiomas: ["idioma", "ingles", "language", "english", "langue", "sprache", "lingua", "lingue", "inglese", "parla italiano", "parlate italiano", "in italiano"],
    clima: ["clima", "lluvia", "llueve", "frio", "calor", "weather", "rain", "meteo", "wetter", "chuva", "pioggia", "piove", "freddo", "caldo", "temperatur"],
    temporadas: ["temporada", "semana santa", "season", "saison", "temporada alta", "stagion", "alta stagione", "settimana santa", "pasqua"],
    cancelacion: ["cancel", "reembols", "refund", "annul", "storn", "rimbors", "disdett", "disdire"],
    sostenibilidad: ["sostenib", "comunidad", "ambiental", "sustainab", "durabl", "nachhaltig", "sustent", "comunita", "ambient"],
    empresa: ["quienes son", "empresa", "about you", "who are", "qui etes", "wer seid", "quem sao", "chi siete", "azienda"],
    redes: ["instagram", "facebook", "redes", "social"],
    compartido: ["compartido", "shared", "partage", "gruppentour", "compartilhado", "condivis"],
    asesor: ["asesor", "humano", "advisor", "human", "conseiller", "berater", "consultor", "consulent", "operatore", "umano", "persona reale"]
  };

  /* ---------- Estado ---------- */
  let lang = (window.EspoApp && EspoApp.getLang()) || "es";
  let started = false, opened = false, busy = false;
  const ctx = {};
  const HAS_PLANS = typeof window.EspoPlans !== "undefined";
  const D = () => window.EspoData;
  const U = () => UI[lang] || UI.es;
  const P = () => (HAS_PLANS ? EspoPlans.ui(lang) : {});
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z"/></svg>';
  let launch, panel, body, quick, headTitle, headSub, launchTxt, badge, askForm, askIn, maxBtn, lastBot = null;

  /* ---------- Interfaz ---------- */
  function build() {
    launch = el("button", "espo-launch", `<span class="espo-launch__ava" aria-hidden="true">J<span class="espo-badge">1</span></span><span class="espo-launch__txt"></span>`);
    // Nombre accesible = texto visible («¿Te ayudo?»); el avatar «J» va oculto para lectores
    launchTxt = launch.querySelector(".espo-launch__txt");
    badge = launch.querySelector(".espo-badge");
    panel = el("div", "espo-panel");
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Jenny");
    panel.innerHTML =
      `<div class="espo-head">
         <span class="espo-head__ava">J</span>
         <span class="espo-head__t"><b class="espo-h-title"></b><span class="espo-h-sub"></span></span>
         <button class="espo-head__btn espo-head__max" type="button" aria-pressed="false"><svg class="i-max" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><svg class="i-min" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg></button>
         <button class="espo-head__close" aria-label="✕"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
       </div>
       <div class="espo-body" aria-live="polite"></div>
       <div class="espo-quick"></div>
       <form class="espo-ask" autocomplete="off"><input type="text" maxlength="200" aria-label="Pregunta"><button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></form>
       <div class="espo-foot"></div>`;
    document.body.appendChild(launch);
    document.body.appendChild(panel);
    body = panel.querySelector(".espo-body");
    quick = panel.querySelector(".espo-quick");
    headTitle = panel.querySelector(".espo-h-title");
    headSub = panel.querySelector(".espo-h-sub");
    askForm = panel.querySelector(".espo-ask"); askIn = askForm.querySelector("input");
    launch.addEventListener("click", openPanel);
    panel.querySelector(".espo-head__close").addEventListener("click", closePanel);
    askForm.addEventListener("submit", (e) => { e.preventDefault(); const q = askIn.value.trim(); if (!q || busy) return; askIn.value = ""; addBubble(esc(q), "user"); freeText(q); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && opened) closePanel(); });
    // Jenny no se cierra al hacer clic en la página: se puede leer y navegar el sitio con el chat abierto.
    maxBtn = panel.querySelector(".espo-head__max");
    maxBtn.addEventListener("click", () => setMax(!panel.classList.contains("espo-panel--max")));
    let savedMax = false; try { savedMax = localStorage.getItem("esp_jenny_max") === "1"; } catch (e) {}
    setMax(savedMax, true);
    refreshStatic();
  }
  const MAX_LBL = { es: ["Ampliar el chat", "Reducir el chat"], en: ["Expand chat", "Shrink chat"], fr: ["Agrandir le chat", "Réduire le chat"],
    de: ["Chat vergrößern", "Chat verkleinern"], pt: ["Ampliar o chat", "Reduzir o chat"], it: ["Ingrandisci la chat", "Riduci la chat"] };
  function setMax(on, quiet) {
    panel.classList.toggle("espo-panel--max", on);
    maxBtn.setAttribute("aria-pressed", String(on));
    maxBtn.setAttribute("aria-label", (MAX_LBL[lang] || MAX_LBL.es)[on ? 1 : 0]);
    maxBtn.title = maxBtn.getAttribute("aria-label");
    if (!quiet) { try { localStorage.setItem("esp_jenny_max", on ? "1" : "0"); } catch (e) {} reveal(lastBot); }
  }
  function refreshStatic() {
    launchTxt.textContent = U().launch; headTitle.textContent = U().title; headSub.textContent = U().subtitle;
    panel.querySelector(".espo-foot").textContent = U().foot;
    askIn.placeholder = U().ask_ph; askIn.setAttribute("aria-label", U().ask_ph);
    panel.querySelector(".espo-head__close").setAttribute("aria-label", U().close || "✕");
    askForm.querySelector("button").setAttribute("aria-label", U().send);
    if (maxBtn) setMax(panel.classList.contains("espo-panel--max"), true);
  }
  function openPanel() {
    opened = true; panel.classList.add("open"); launch.classList.add("hide");
    if (badge) badge.style.display = "none";
    if (!started) { started = true; start(); }
  }
  function closePanel() { opened = false; panel.classList.remove("open"); launch.classList.remove("hide"); }

  function addBubble(html, who) {
    const b = el("div", "espo-msg " + who);
    b.innerHTML = String(html).replace(/\*(.+?)\*/g, "<b>$1</b>");
    body.appendChild(b);
    if (who === "bot") { lastBot = b; reveal(b); } else scrollDown();
    return b;
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }
  // Si el mensaje no cabe, se muestra desde su primera línea; si cabe, se baja hasta el final
  function reveal(b) {
    if (!b || !b.isConnected) return;
    if (b.offsetHeight > body.clientHeight - 24) body.scrollTop = Math.max(0, b.offsetTop - 8);
    else scrollDown();
  }
  function typing() { const t = el("div", "espo-typing", "<span></span><span></span><span></span>"); body.appendChild(t); scrollDown(); return t; }
  function botSay(messages) {
    return new Promise((resolve) => {
      busy = true; quick.innerHTML = "";
      const list = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
      const next = () => {
        if (!list.length) { busy = false; resolve(); return; }
        const t = typing(); const msg = list.shift();
        setTimeout(() => { t.remove(); addBubble(msg, "bot"); setTimeout(next, 160); }, 380 + Math.min(520, String(msg).length * 5));
      };
      next();
    });
  }
  function renderChips(chips) {
    quick.innerHTML = "";
    chips.forEach(c => {
      const btn = el("button", "espo-chip" + (c.kind ? " espo-chip--" + c.kind : ""));
      btn.type = "button";
      btn.innerHTML = (c.kind === "wa" ? WA_ICON : "") + "<span>" + esc(c.label) + "</span>";
      btn.addEventListener("click", () => onChip(c));
      quick.appendChild(btn);
    });
    reveal(lastBot);
  }
  function onChip(c) {
    if (busy) return;
    addBubble(esc(c.userLabel || c.label), "user");
    if (c.scan) { scanQR(); return; }
    if (c.wa) { EspoApp.openWhatsApp(c.waMsg || composeWA(), "JENNY"); if (HAS_PLANS && ctx.leadId && ctx.consent) EspoPlans.sendLead(leadData("whatsapp")); }
    if (c.open) { EspoApp.openTour(c.open); closePanel(); }
    if (c.nav) { location.href = c.nav; return; }
    if (c.href) { window.open(c.href, "_blank", "noopener"); }
    if (c.anchor) { closePanel(); const s = document.querySelector(c.anchor); if (s) s.scrollIntoView({ behavior: "smooth" }); }
    if (c.share) { window.open("https://wa.me/?text=" + encodeURIComponent(c.share), "_blank", "noopener"); }
    if (c.set) Object.assign(ctx, c.set);
    if (c.to) go(c.to);
    else if (c.keep) renderChips(c.keep);
    else if (c.wa || c.href) renderChips(nextChips());
  }
  // Un nodo puede ser asíncrono (pronóstico) y puede pedir el formulario en vez de chips
  function go(id) {
    busy = true;
    Promise.resolve(buildNode(id)).then(node => botSay(node.msgs).then(() => { if (node.form) renderForm(); else if (node.codeForm) renderCodeForm(); else renderChips(node.chips || menuChips()); }));
  }
  function greeting() { return (D() && D().ready() && (D().node("saludo", lang) || {}).jenny) || U().greet_fallback; }
  function start() {
    refreshStatic(); body.innerHTML = "";
    const say = () => botSay([greeting(), U().menu_prompt]).then(() => renderChips(menuChips()));
    if (D() && !D().ready()) D().load().then(say, say); else say();
  }

  /* ---------- Menús y siguientes acciones ---------- */
  function menuChips(all) {
    const ids = all ? PRIMARY.concat(MORE) : PRIMARY;
    const arr = ids.filter(id => id !== "scan" || window.EspoQR).filter(id => id !== "plans" || HAS_PLANS)
      .map(id => id === "scan" ? { label: U().m_scan, scan: true } : { label: U()[LABEL[id]], to: "n:" + id, kind: id === "reservar" ? "primary" : "" });
    if (!all) { arr.splice(1, 0, { label: (ALL_T[lang] || ALL_T.es).chip, to: "alltours" }); arr.push({ label: U().more, to: "more" }); }
    return arr;
  }
  // Regla 3: toda respuesta termina con una siguiente acción
  function nextChips(salida) {
    const out = [];
    String(salida || "reservar|asesor").split("|").forEach(w => {
      if (w === "reservar") out.push({ label: U().m_reservar, kind: "primary", to: "n:reservar" });
      else if (w === "asesor") out.push({ label: U().m_asesor, kind: "wa", wa: true });
      else if (w === "que_llevar") out.push({ label: U().m_llevar, to: "n:que_llevar" });
      else if (w === "precios") out.push({ label: U().m_precios, to: "n:precios" });
      else if (w === "horarios") out.push({ label: U().m_horarios, to: "n:horarios" });
      else if (w === "accesibilidad") out.push({ label: U().m_access, to: "n:accesibilidad" });
      else if (w === "experiencias") out.push({ label: U().go_tours, anchor: "#experiencias" });
      else if (/sostenibilidad/i.test(w)) out.push({ label: U().go_sust, anchor: "#sostenibilidad" });
    });
    if (!out.some(c => c.wa)) out.push({ label: U().m_asesor, kind: "wa", wa: true });
    out.push({ label: U().other, to: "menu" });
    return out;
  }

  /* ---------- Árbol ---------- */
  function buildNode(id) {
    if (id === "menu" || id === "more") ctx.intent = null;
    if (id === "menu") return { msgs: [U().menu_prompt], chips: menuChips() };
    if (id === "more") return { msgs: [U().menu_prompt], chips: menuChips(true).filter(c => !PRIMARY.some(p => c.to === "n:" + p)).concat([{ label: U().back, to: "menu" }]) };
    if (id.startsWith("mytrip:")) {
      const M = MT[lang] || MT.es, change = id === "mytrip:change";
      return { msgs: [change ? M.change : M.view], chips: [{ label: M.open, nav: "/viaje.html" },
        { label: M.nocode, kind: "wa", wa: true, waMsg: change ? M.wa_change : M.wa_view }].concat(change ? [{ label: U().m_cancel, to: "n:cancelacion" }] : [], [{ label: U().back, to: "menu" }]) };
    }
    if (!D() || !D().ready()) return { msgs: [U().no_match], chips: nextChips("asesor") };

    if (id.startsWith("n:")) {
      const n = id.slice(2);
      if (n === "plans") return buildNode("plans");
      if (n === "asesor") return { msgs: [(D().node("asesor", lang) || {}).respuesta], chips: [{ label: U().open_wa, kind: "wa", wa: true }, { label: U().back, to: "menu" }] };
      if (n === "compartido") return tourNode("compartidocs", "compartido");
      if (n === "reservar") {
        const node = D().node("reservar", lang);
        if (ctx.tourId || ctx.planId) {
          const what = ctx.planId ? EspoPlans.name(EspoPlans.planById(ctx.planId), lang) : ctx.tourName;
          return { msgs: [node.respuesta, U().confirm_book.replace("{tour}", what)], chips: [
            { label: U().book_this, kind: "primary", to: "form" },
            { label: U().another_tour, to: "cats", set: { tourId: null, tourName: null, tourCode: null, planId: null, intent: "reservar" } },
            { label: U().back, to: "menu" }] };
        }
        ctx.intent = "reservar";
        return { msgs: [node.respuesta, U().pick_cat], chips: catChips() };
      }
      if (TOUR_Q.indexOf(n) >= 0) {
        if (n === "que_llevar" && !ctx.tourId && !ctx.planId) {
          ctx.intent = n;
          return { msgs: [D().general("que_llevar", lang), U().pick_cat], chips: catChips().concat(HAS_PLANS ? [{ label: U().m_plans, to: "plans" }] : []) };
        }
        if (ctx.tourId) return tourAnswer(ctx.tourId, n);
        if (ctx.planId && n === "que_llevar") return buildNode("pack:" + ctx.planId);
        ctx.intent = n;
        return { msgs: [U().pick_cat], chips: catChips() };
      }
      if (n === "precios") {
        // La tarifa solo sale cotizando: con experiencia → cotización; con plan → datos; si no, primero la experiencia
        if (ctx.tourId) return quoteNode(ctx.tourId);
        const msgs = [(D().node("precios", lang) || {}).respuesta];
        if (ctx.planId && HAS_PLANS) return { msgs: msgs.concat([P().form_intro]), form: true };
        ctx.intent = "cotizar";
        return { msgs: msgs.concat([U().pick_cat]), chips: catChips() };
      }
      const node = D().node(n, lang);
      if (!node || !node.respuesta) return { msgs: [U().no_match], chips: nextChips("asesor") };
      const chips = nextChips(node.salida);
      if (n === "pagos" && HAS_PLANS && EspoPlans.cfg.payLink) chips.unshift({ label: U().pay_btn, href: EspoPlans.cfg.payLink });
      if (n === "accesibilidad") ctx.access = true;
      return { msgs: [node.respuesta], chips };
    }

    if (id === "cats") return { msgs: [U().pick_cat], chips: catChips() };
    if (id === "alltours") {
      const A = ALL_T[lang] || ALL_T.es, vis = EspoApp.tours();
      const cats = EspoApp.categories().filter(c => c.id !== "all" && vis.some(t => t.cat === c.id))
        .map(c => ({ label: (c[lang] || c.es) + " (" + vis.filter(t => t.cat === c.id).length + ")", to: "cat:" + c.id }));
      return { msgs: [A.msg.replace("{n}", vis.length)], chips: cats.concat([{ label: A.web, anchor: "#experiencias" }, { label: U().back, to: "menu" }]) };
    }
    if (id.startsWith("cat:")) {
      const cid = id.slice(4);
      const tours = EspoApp.tours().filter(x => x.cat === cid);
      return { msgs: [U().pick_tour], chips: tours.map(x => ({ label: EspoApp.tourText(x).name, to: "tour:" + x.id })).concat([{ label: U().back, to: "cats" }]) };
    }
    if (id.startsWith("q:")) return quoteNode(id.slice(2));
    if (id.startsWith("qadd:")) {
      const c = id.slice(5); ctx.extras = (ctx.extras || []).filter(x => x !== c).concat([c]);
      const q = quoteBlock();
      return { msgs: [SL().added.replace("{tour}", esc(tourLabel(c)))].concat(q.msgs.slice(1)), chips: ctx.sumBase ? withQuote(ctx.sumBase, q) : nextChips("asesor") };
    }
    if (id === "qcode") return { msgs: [SL().code_ask], codeForm: true };
    if (id === "qupd") {
      const S = SL(), q = quoteBlock();
      const first = ctx.code ? S.code_check.replace("{c}", esc(ctx.code.c)) : "";
      return { msgs: [first].concat(q.msgs.slice(1)).filter(Boolean), chips: ctx.sumBase ? withQuote(ctx.sumBase, q) : nextChips("asesor") };
    }
    if (id.startsWith("tour:")) return tourNode(id.slice(5));
    if (id.startsWith("ta:")) { const parts = id.split(":"); return tourAnswer(parts[1], parts[2]); }

    /* ----- Itinerarios (QR) ----- */
    if (id === "plans") {
      const chips = EspoPlans.plans().map(p => ({ label: EspoPlans.name(p, lang) + " · " + nForm(P().days, p.days), to: "plan:" + p.id }));
      chips.push({ label: U().back, to: "menu" });
      return { msgs: [P().plans_q], chips };
    }
    if (id.startsWith("plan:")) {
      const plan = EspoPlans.planById(id.slice(5));
      if (!plan) return { msgs: [P().scan_bad], chips: menuChips() };
      ctx.planId = plan.id; ctx.tourId = null; ctx.tourName = null; ctx.tourCode = null;
      if (plan.access) ctx.access = true;
      const name = EspoPlans.name(plan, lang);
      const msgs = [];
      if (ctx.fromQR) { msgs.push(P().from_qr.replace("{plan}", name)); ctx.fromQR = false; }
      msgs.push(P().plan_intro.replace("{plan}", name).replace("{days}", nForm(P().days, plan.days)) + "\n" + planLines(plan) +
        (plan.priceFrom ? "\n\n" + P().price_from.replace("{p}", plan.priceFrom) : ""));
      return { msgs, chips: [{ label: P().choose, kind: "primary", to: "form" }, { label: P().pack_for, to: "pack:" + plan.id }, { label: P().others, to: "plans" }, { label: U().back, to: "menu" }] };
    }
    if (id.startsWith("pack:")) {
      const plan = EspoPlans.planById(id.slice(5)); if (plan) { ctx.planId = plan.id; ctx.tourId = null; ctx.tourName = null; }
      return EspoPlans.packFor(currentStops(), lang).then(pack => {
        const list = packText(pack);
        const chips = [{ label: U().book_this, kind: "primary", to: "form" }, { label: P().share, share: list.replace(/\*/g, "") }, { label: U().back, to: "menu" }];
        chips[1].keep = chips;
        return { msgs: [list, weatherText(pack)].filter(Boolean), chips };
      });
    }
    if (id === "form") return { msgs: [P().form_intro], form: true };
    if (id === "summary") return summaryNode();
    return { msgs: [U().menu_prompt], chips: menuChips() };
  }
  function catChips() {
    const vis = EspoApp.tours();
    return EspoApp.categories().filter(c => c.id !== "all" && vis.some(t => t.cat === c.id))
      .map(c => ({ label: c[lang] || c.es, to: "cat:" + c.id })).concat([{ label: U().back, to: "menu" }]);
  }
  function tourNode(tid, special) {
    const base = EspoApp.tours().find(x => x.id === tid);
    const info = D().tour(tid, lang);
    if (!base || !info) return { msgs: [U().no_match], chips: nextChips("asesor") };
    ctx.tourId = tid; ctx.tourName = info.nombre; ctx.tourCode = info.codigo; ctx.planId = null;
    if (ctx.intent) { const q = ctx.intent; ctx.intent = null; if (q === "cotizar") return quoteNode(tid); if (q === "reservar") return { msgs: [P().form_intro], form: true }; return tourAnswer(tid, q); }
    const msgs = [];
    if (special === "compartido") {
      const n = D().node("tour_compartido", lang) || {};
      msgs.push("*" + info.nombre + "* · " + info.codigo + "\n" + (n.itinerario || ""));
      if (n.puntos_encuentro) msgs.push("📍 " + n.puntos_encuentro.map(p => p.lugar + " — " + D().hhmm(p.hora, lang)).join("\n📍 "));
      if (n.operacion) msgs.push("🗓️ " + n.operacion + (n.no_opera ? "\n🚫 " + n.no_opera.join(" · ") : ""));
    } else msgs.push(U().hub.replace("{tour}", info.nombre).replace("{code}", info.codigo));
    return { msgs, chips: tourChips(tid) };
  }
  function tourChips(tid) {
    return [
      { label: U().book_this, kind: "primary", to: "form" },
      { label: U().m_horarios, to: "ta:" + tid + ":horarios" }, { label: U().m_duracion, to: "ta:" + tid + ":duracion" },
      { label: U().m_incluye, to: "ta:" + tid + ":que_incluye" }, { label: U().m_llevar, to: "ta:" + tid + ":que_llevar" },
      { label: SL().chip, to: "q:" + tid }, { label: U().see_card, open: tid },
      { label: U().another_tour, to: "cats" }, { label: U().back, to: "menu" }
    ];
  }
  // Respuesta sobre una experiencia concreta (regla 1: si falta el dato → asesor)
  function tourAnswer(tid, q) {
    const i = D().tour(tid, lang); if (!i) return { msgs: [U().no_match], chips: nextChips("asesor") };
    ctx.tourId = tid; ctx.tourName = i.nombre; ctx.tourCode = i.codigo; ctx.planId = null;
    const msgs = [];
    if (q === "horarios") {
      if (!i.horario) msgs.push(U().a_tbd);
      else msgs.push(U().a_horario.replace("{tour}", i.nombre).replace("{h}", D().fmtHorario(i.horario, lang)).replace(/\.\.$/, ".") + (i.horario_nota ? "\n" + i.horario_nota : ""));
      const key = i.notas.find(n => /horario|ingreso|opera|schedule|open|horaire|uhr|horár/i.test(n)); if (key) msgs.push("ℹ️ " + key);
    } else if (q === "duracion") {
      msgs.push(i.dur == null ? U().a_tbd : U().a_dur.replace("{tour}", i.nombre).replace("{d}", D().fmtDur(i.dur, lang)));
    } else if (q === "que_incluye") {
      msgs.push(U().a_incl.replace("{tour}", i.nombre) + "\n" + i.incluye.map(x => "✅ " + x).join("\n"));
      msgs.push((i.no_incluye.length ? U().a_noincl + " " + i.no_incluye.join(" · ") + ". " : "") + D().general("no_incluye_siempre", lang));
    } else if (q === "que_llevar") {
      if (i.rec.items.length) msgs.push("*" + i.rec.titulo + "*\n" + i.rec.items.join("\n"));
      else msgs.push(D().general("que_llevar", lang));
      if (ctx.date && HAS_PLANS && EspoPlans.forecastFor) {
        return EspoPlans.forecastFor(tid, ctx.date).then(f => ({ msgs: msgs.concat(forecastLines(f)), chips: tourChips(tid) }));
      }
    }
    return { msgs, chips: tourChips(tid) };
  }
  function forecastLines(f) {
    if (!f) return [];
    const out = [U().forecast + " " + EspoPlans.fcText(f)];
    if (f.rain >= 40) out.push(U().rain);
    if (f.uv >= 8) out.push(U().uv);
    if (f.tmin <= 12) out.push(U().cold);
    return [out.join("\n")];
  }

  /* ---------- Cotización con Jenny ----------
     La tarifa directa (mayor que la de agencia) solo sale aquí, y siempre con UN beneficio por convenio:
     el que más le convenga al viajero (no acumulables), válido si confirma en las horas que fije data/jenny.json → convenios.
     Tono de anfitriona: valor primero, prueba social real (reseñas de Google), sin precios tachados ni urgencias falsas. */
  const SALES = {
    es: {
      chip: "💲 Cotizar esta", intro: "¡Buena elección! ✨ *{tour}* · {code}", ask: "Para darte tu tarifa directa con el mejor beneficio, cuéntame la fecha y cuántas personas 👇",
      proof: "⭐ {cal} en Google · «{txt}» — {who}", proof0: "⭐ {cal} de calificación de nuestros viajeros en Google.",
      price_tbd: "💲 Tu tarifa directa te la confirma el equipo comercial por WhatsApp, con todo lo que incluye la ficha.",
      ben: "🎁 Beneficio por convenio: *{name}*{val}. {cond}", val: " ({v} % de descuento)", val_tbd: "El valor exacto te lo confirma el equipo comercial.",
      ben_one: "Los beneficios no se acumulan: te dejamos el que más te conviene.", ben_valid: "Se mantiene si confirmas tu reserva en las próximas {h} horas (hasta {until}, hora de Colombia).",
      hook_any: "💡 Tenemos beneficios por convenio: {list}. Si alguno te aplica, lo sumamos a tu cotización.",
      tip_combo: "💡 Si sumas otra experiencia, aplicas al beneficio *{name}*. Estas combinan muy bien con la tuya:",
      added: "Sumé *{tour}* a tu cotización ✅", code_chip: "🎟️ Tengo un código de convenio", code_ask: "Escribe tu código de convenio 👇",
      code_check: "Recibí tu código *{c}*. El equipo comercial lo valida al confirmar tu cotización.",
      hotel_chk: "🏨 Si tu hotel tiene convenio con nosotros, el equipo comercial lo revisa y te deja el beneficio que más te convenga.", wa_hotel: "🏨 Convenio con mi hotel:", tbc: "por confirmar",
      wa_ben: "🎁 Beneficio:", wa_until: "válido hasta", wa_extra: "➕ También:", wa_code: "🎟️ Código:",
      n_combo: "Combo de {n} o más experiencias", c_combo: "Aplica al reservar {n} o más experiencias en la misma cotización.",
      n_grupo: "Grupo", c_grupo: "Aplica a grupos desde {n} personas.", n_semana: "Entre semana", c_semana: "Aplica a experiencias de {dias}, sin incluir festivos.",
      n_aliado: "Hotel aliado", c_aliado: "Aplica porque llegaste por un hotel aliado.", n_codigo: "Código de convenio", c_codigo: "Aplica con el código de una empresa o aliado en convenio.",
      days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], to: " a "
    },
    en: {
      chip: "💲 Get a quote", intro: "Great choice! ✨ *{tour}* · {code}", ask: "To give you your direct rate with the best benefit, tell me your date and group size 👇",
      proof: "⭐ {cal} on Google · “{txt}” — {who}", proof0: "⭐ Rated {cal} by our travellers on Google.",
      price_tbd: "💲 Our sales team will confirm your direct rate on WhatsApp, with everything listed as included.",
      ben: "🎁 Partner benefit: *{name}*{val}. {cond}", val: " ({v}% off)", val_tbd: "Our sales team will confirm the exact amount.",
      ben_one: "Benefits can't be combined: we apply the one that suits you best.", ben_valid: "It holds if you confirm your booking within the next {h} hours (until {until}, Colombia time).",
      hook_any: "💡 We offer partner benefits: {list}. If one applies to you, we'll add it to your quote.",
      tip_combo: "💡 Add another experience and you qualify for *{name}*. These pair really well with yours:",
      added: "I added *{tour}* to your quote ✅", code_chip: "🎟️ I have a partner code", code_ask: "Type your partner code 👇",
      code_check: "Got your code *{c}*. Our sales team will validate it when confirming your quote.",
      hotel_chk: "🏨 If your hotel has a partner agreement with us, our sales team will check it and apply whichever benefit suits you best.", wa_hotel: "🏨 Partner agreement with my hotel:", tbc: "to be confirmed",
      wa_ben: "🎁 Benefit:", wa_until: "valid until", wa_extra: "➕ Also:", wa_code: "🎟️ Code:",
      n_combo: "{n}+ experience combo", c_combo: "Applies when you book {n} or more experiences in the same quote.",
      n_grupo: "Group", c_grupo: "Applies to groups of {n} or more.", n_semana: "Weekday", c_semana: "Applies to experiences from {dias}, excluding public holidays.",
      n_aliado: "Partner hotel", c_aliado: "Applies because you came through a partner hotel.", n_codigo: "Partner code", c_codigo: "Applies with a code from a partner company or ally.",
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], to: " to "
    },
    fr: {
      chip: "💲 Demander un devis", intro: "Excellent choix ! ✨ *{tour}* · {code}", ask: "Pour vous donner votre tarif direct avec le meilleur avantage, indiquez-moi la date et le nombre de personnes 👇",
      proof: "⭐ {cal} sur Google · « {txt} » — {who}", proof0: "⭐ Noté {cal} par nos voyageurs sur Google.",
      price_tbd: "💲 Notre équipe commerciale vous confirme votre tarif direct sur WhatsApp, avec tout ce qui est inclus dans la fiche.",
      ben: "🎁 Avantage partenaire : *{name}*{val}. {cond}", val: " ({v} % de réduction)", val_tbd: "Notre équipe commerciale vous confirme le montant exact.",
      ben_one: "Les avantages ne se cumulent pas : nous appliquons le plus intéressant pour vous.", ben_valid: "Il est maintenu si vous confirmez votre réservation dans les {h} prochaines heures (jusqu'au {until}, heure de Colombie).",
      hook_any: "💡 Nous proposons des avantages partenaires : {list}. Si l'un d'eux vous concerne, nous l'ajoutons à votre devis.",
      tip_combo: "💡 En ajoutant une autre expérience, vous bénéficiez de l'avantage *{name}*. Celles-ci se combinent très bien avec la vôtre :",
      added: "J'ai ajouté *{tour}* à votre devis ✅", code_chip: "🎟️ J'ai un code partenaire", code_ask: "Saisissez votre code partenaire 👇",
      code_check: "J'ai bien reçu votre code *{c}*. Notre équipe commerciale le valide en confirmant votre devis.",
      hotel_chk: "🏨 Si votre hôtel a une convention avec nous, notre équipe commerciale la vérifie et vous applique l'avantage le plus intéressant.", wa_hotel: "🏨 Convention avec mon hôtel :", tbc: "à confirmer",
      wa_ben: "🎁 Avantage :", wa_until: "valable jusqu'au", wa_extra: "➕ Aussi :", wa_code: "🎟️ Code :",
      n_combo: "Combiné de {n} expériences ou plus", c_combo: "S'applique en réservant {n} expériences ou plus dans le même devis.",
      n_grupo: "Groupe", c_grupo: "S'applique aux groupes à partir de {n} personnes.", n_semana: "En semaine", c_semana: "S'applique aux expériences du {dias}, hors jours fériés.",
      n_aliado: "Hôtel partenaire", c_aliado: "S'applique car vous venez d'un hôtel partenaire.", n_codigo: "Code partenaire", c_codigo: "S'applique avec le code d'une entreprise ou d'un partenaire conventionné.",
      days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"], to: " au "
    },
    de: {
      chip: "💲 Angebot anfragen", intro: "Gute Wahl! ✨ *{tour}* · {code}", ask: "Damit ich Ihnen Ihren Direktpreis mit dem besten Vorteil nennen kann, sagen Sie mir Datum und Personenzahl 👇",
      proof: "⭐ {cal} bei Google · „{txt}“ — {who}", proof0: "⭐ Von unseren Gästen bei Google mit {cal} bewertet.",
      price_tbd: "💲 Ihren Direktpreis bestätigt Ihnen unser Vertriebsteam per WhatsApp – mit allen in der Beschreibung genannten Leistungen.",
      ben: "🎁 Partnervorteil: *{name}*{val}. {cond}", val: " ({v} % Rabatt)", val_tbd: "Den genauen Betrag bestätigt Ihnen unser Vertriebsteam.",
      ben_one: "Vorteile sind nicht kombinierbar: Wir wenden den für Sie günstigsten an.", ben_valid: "Er gilt, wenn Sie Ihre Buchung innerhalb der nächsten {h} Stunden bestätigen (bis {until}, kolumbianische Zeit).",
      hook_any: "💡 Wir bieten Partnervorteile: {list}. Wenn einer davon auf Sie zutrifft, nehmen wir ihn in Ihr Angebot auf.",
      tip_combo: "💡 Wenn Sie ein weiteres Erlebnis hinzufügen, erhalten Sie den Vorteil *{name}*. Diese passen sehr gut zu Ihrem:",
      added: "Ich habe *{tour}* zu Ihrem Angebot hinzugefügt ✅", code_chip: "🎟️ Ich habe einen Partnercode", code_ask: "Geben Sie Ihren Partnercode ein 👇",
      code_check: "Ihr Code *{c}* ist angekommen. Unser Vertriebsteam prüft ihn bei der Bestätigung Ihres Angebots.",
      hotel_chk: "🏨 Wenn Ihr Hotel ein Partnerabkommen mit uns hat, prüft unser Vertriebsteam das und wendet den für Sie günstigsten Vorteil an.", wa_hotel: "🏨 Partnerabkommen mit meinem Hotel:", tbc: "zu bestätigen",
      wa_ben: "🎁 Vorteil:", wa_until: "gültig bis", wa_extra: "➕ Zusätzlich:", wa_code: "🎟️ Code:",
      n_combo: "Kombi ab {n} Erlebnissen", c_combo: "Gilt bei Buchung von {n} oder mehr Erlebnissen im selben Angebot.",
      n_grupo: "Gruppe", c_grupo: "Gilt für Gruppen ab {n} Personen.", n_semana: "Unter der Woche", c_semana: "Gilt für Erlebnisse von {dias}, außer an Feiertagen.",
      n_aliado: "Partnerhotel", c_aliado: "Gilt, weil Sie über ein Partnerhotel kommen.", n_codigo: "Partnercode", c_codigo: "Gilt mit dem Code eines Partnerunternehmens.",
      days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"], to: " bis "
    },
    pt: {
      chip: "💲 Cotar esta", intro: "Ótima escolha! ✨ *{tour}* · {code}", ask: "Para te passar sua tarifa direta com o melhor benefício, me diga a data e quantas pessoas 👇",
      proof: "⭐ {cal} no Google · “{txt}” — {who}", proof0: "⭐ Nota {cal} dos nossos viajantes no Google.",
      price_tbd: "💲 Nossa equipe comercial confirma sua tarifa direta pelo WhatsApp, com tudo o que a ficha inclui.",
      ben: "🎁 Benefício de convênio: *{name}*{val}. {cond}", val: " ({v}% de desconto)", val_tbd: "O valor exato é confirmado pela nossa equipe comercial.",
      ben_one: "Os benefícios não são cumulativos: aplicamos o que for melhor para você.", ben_valid: "Ele vale se você confirmar sua reserva nas próximas {h} horas (até {until}, horário da Colômbia).",
      hook_any: "💡 Temos benefícios de convênio: {list}. Se algum se aplicar a você, incluímos na sua cotação.",
      tip_combo: "💡 Se você somar outra experiência, ganha o benefício *{name}*. Estas combinam muito bem com a sua:",
      added: "Adicionei *{tour}* à sua cotação ✅", code_chip: "🎟️ Tenho um código de convênio", code_ask: "Digite seu código de convênio 👇",
      code_check: "Recebi seu código *{c}*. A equipe comercial valida ao confirmar sua cotação.",
      hotel_chk: "🏨 Se o seu hotel tem convênio conosco, a equipe comercial verifica e aplica o benefício que for melhor para você.", wa_hotel: "🏨 Convênio com meu hotel:", tbc: "a confirmar",
      wa_ben: "🎁 Benefício:", wa_until: "válido até", wa_extra: "➕ Também:", wa_code: "🎟️ Código:",
      n_combo: "Combo de {n} ou mais experiências", c_combo: "Vale ao reservar {n} ou mais experiências na mesma cotação.",
      n_grupo: "Grupo", c_grupo: "Vale para grupos a partir de {n} pessoas.", n_semana: "Dias úteis", c_semana: "Vale para experiências de {dias}, exceto feriados.",
      n_aliado: "Hotel parceiro", c_aliado: "Vale porque você chegou por um hotel parceiro.", n_codigo: "Código de convênio", c_codigo: "Vale com o código de uma empresa ou parceiro conveniado.",
      days: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"], to: " a "
    },
    it: {
      chip: "💲 Chiedi un preventivo", intro: "Ottima scelta! ✨ *{tour}* · {code}", ask: "Per darti la tua tariffa diretta con il vantaggio migliore, dimmi la data e quante persone siete 👇",
      proof: "⭐ {cal} su Google · «{txt}» — {who}", proof0: "⭐ Valutazione {cal} dei nostri viaggiatori su Google.",
      price_tbd: "💲 La tua tariffa diretta te la conferma il team commerciale su WhatsApp, con tutto ciò che è incluso nella scheda.",
      ben: "🎁 Vantaggio convenzione: *{name}*{val}. {cond}", val: " ({v}% di sconto)", val_tbd: "L'importo esatto te lo conferma il team commerciale.",
      ben_one: "I vantaggi non sono cumulabili: ti applichiamo quello più conveniente per te.", ben_valid: "Resta valido se confermi la prenotazione entro le prossime {h} ore (fino a {until}, ora colombiana).",
      hook_any: "💡 Abbiamo vantaggi in convenzione: {list}. Se uno fa al caso tuo, lo aggiungiamo al tuo preventivo.",
      tip_combo: "💡 Se aggiungi un'altra esperienza, hai diritto al vantaggio *{name}*. Queste si abbinano benissimo alla tua:",
      added: "Ho aggiunto *{tour}* al tuo preventivo ✅", code_chip: "🎟️ Ho un codice convenzione", code_ask: "Scrivi il tuo codice convenzione 👇",
      code_check: "Ho ricevuto il tuo codice *{c}*. Il team commerciale lo verifica quando conferma il tuo preventivo.",
      hotel_chk: "🏨 Se il tuo hotel ha una convenzione con noi, il team commerciale la verifica e ti applica il vantaggio più conveniente.", wa_hotel: "🏨 Convenzione con il mio hotel:", tbc: "da confermare",
      wa_ben: "🎁 Vantaggio:", wa_until: "valido fino a", wa_extra: "➕ Inoltre:", wa_code: "🎟️ Codice:",
      n_combo: "Combo da {n} o più esperienze", c_combo: "Valido prenotando {n} o più esperienze nello stesso preventivo.",
      n_grupo: "Gruppo", c_grupo: "Valido per gruppi da {n} persone in su.", n_semana: "Infrasettimanale", c_semana: "Valido per le esperienze dal {dias}, esclusi i festivi.",
      n_aliado: "Hotel partner", c_aliado: "Valido perché arrivi tramite un hotel partner.", n_codigo: "Codice convenzione", c_codigo: "Valido con il codice di un'azienda o di un partner convenzionato.",
      days: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"], to: " al "
    }
  };
  const SL = () => SALES[lang] || SALES.es;
  const PRIO = ["codigo", "aliado", "combo", "grupo", "entre_semana"];     // a igual valor, gana el más específico
  // Festivos de Colombia (Ley 51 de 1983: los trasladables pasan al lunes siguiente)
  function festivoCO(iso) {
    const y = +iso.slice(0, 4), d0 = (m, d) => new Date(Date.UTC(y, m - 1, d));
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      x = h + l - 7 * m + 114, pascua = d0(Math.floor(x / 31), (x % 31) + 1);
    const plus = n => new Date(pascua.getTime() + n * 864e5);
    const lunes = t => new Date(t.getTime() + ((8 - t.getUTCDay()) % 7) * 864e5);
    return [d0(1, 1), d0(5, 1), d0(7, 20), d0(8, 7), d0(12, 8), d0(12, 25), plus(-3), plus(-2), plus(43), plus(64), plus(71)]
      .concat([[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]].map(q => lunes(d0(q[0], q[1]))))
      .some(t => t.toISOString().slice(0, 10) === iso);
  }
  function landingSrc() { let v = ctx.src || ""; try { v = v || sessionStorage.getItem("esp_src") || ""; } catch (e) {} return v; }
  function convText(x, lg) {
    const S = SALES[lg] || SALES.es;
    const k = { combo: ["n_combo", "c_combo", x.min_experiencias || 2], grupo: ["n_grupo", "c_grupo", x.min_personas || 6], entre_semana: ["n_semana", "c_semana"],
      aliado: ["n_aliado", "c_aliado"], codigo: ["n_codigo", "c_codigo"] }[x.id];
    if (!k) return null;
    const ds = (x.dias || [1, 2, 3, 4, 5]).slice().sort();
    const dias = ds.length > 1 && ds[ds.length - 1] - ds[0] === ds.length - 1 ? S.days[ds[0]] + S.to + S.days[ds[ds.length - 1]] : ds.map(n => S.days[n]).join(", ");
    const f = t => t.replace("{n}", k[2]).replace("{dias}", dias);
    return { name: f(S[k[0]]), cond: f(S[k[1]]) };
  }
  function quoteCount() {
    if (ctx.planId) { const pl = EspoPlans.planById(ctx.planId); return pl ? pl.stops.map(t => t.tour).filter((v, i, a) => v && a.indexOf(v) === i).length : 1; }
    return 1 + (ctx.extras || []).length;
  }
  function applies(x) {
    if (x.id === "combo") return quoteCount() >= (x.min_experiencias || 2);
    if (x.id === "grupo") return (ctx.party || 0) >= (x.min_personas || 6);
    if (x.id === "entre_semana") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ctx.date || "")) return false;
      return (x.dias || [1, 2, 3, 4, 5]).indexOf(new Date(ctx.date + "T12:00:00Z").getUTCDay()) >= 0 && !festivoCO(ctx.date);
    }
    return false;      // hotel aliado y código: los confirma siempre el equipo comercial (cambian mucho)
  }
  function fmtUntil(ms, lg) {
    const l2 = lg || lang;
    try { return new Date(ms).toLocaleString(l2 === "en" ? "en-GB" : l2, { timeZone: "America/Bogota", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return new Date(ms).toISOString().slice(0, 16).replace("T", " "); }
  }
  function tourLabel(id, lg) { const i = D().tour(id, lg || lang); const x = EspoApp.tours().find(t => t.id === id); return (i && i.nombre) || (x ? EspoApp.tourText(x).name : id); }
  function extrasText(lg) { return (ctx.extras || []).map(c => { const i = D().tour(c, lg || lang); return i ? i.nombre + " (" + i.codigo + ")" : c; }).join(" + "); }
  function benefitName(lg) { const x = ctx.benefitObj; if (!x) return ""; return convText(x, lg).name + (x.valor ? " (" + x.valor + " %)" : ""); }
  function proofLine() {
    const r = D().resenas && D().resenas(); if (!r || !r.visible) return "";
    const S = SL(), cal = r.calificacion.toFixed(1).replace(".", lang === "en" ? "." : ",");
    const d = r.destacadas.find(x => x.idioma === lang && x.estrellas === 5);
    if (!d) return S.proof0.replace("{cal}", cal);
    const txt = d.texto.length > 120 ? d.texto.slice(0, 118).replace(/\s+\S*$/, "") + "…" : d.texto;
    return S.proof.replace("{cal}", cal).replace("{txt}", esc(txt)).replace("{who}", esc(d.nombre));
  }
  // Primer paso: valor de la experiencia + prueba social → fecha y personas (formulario)
  function quoteNode(tid) {
    const i = D().tour(tid, lang), base = EspoApp.tours().find(x => x.id === tid);
    if (!i || !base) return { msgs: [U().no_match], chips: nextChips("asesor") };
    if (ctx.tourId !== tid) ctx.extras = [];
    Object.assign(ctx, { tourId: tid, tourName: i.nombre, tourCode: i.codigo, planId: null, intent: null });
    const S = SL(), T = k => (EspoApp.t ? EspoApp.t(k) : "");
    const facts = [i.dur != null ? "⏱️ " + D().fmtDur(i.dur, lang) : "", i.modalidad ? "👥 " + T("mod_" + i.modalidad) : "",
      i.almuerzo === null ? "" : "🍽️ " + T(i.almuerzo ? "lunch_yes" : "lunch_no")].filter(Boolean).join(" · ");
    const msgs = [S.intro.replace("{tour}", esc(i.nombre)).replace("{code}", esc(i.codigo)) + (i.descripcion ? "\n" + esc(i.descripcion) : "") + (facts ? "\n" + esc(facts) : "")];
    const proof = proofLine(); if (proof) msgs.push(proof);
    if (!HAS_PLANS) return { msgs, chips: nextChips("asesor") };
    msgs.push(S.ask);
    return { msgs, form: true };
  }
  // Tarifa + beneficio (va en el resumen y se recalcula al sumar experiencias o un código)
  function quoteBlock() {
    const S = SL(), msgs = [], chips = [];
    if (!ctx.tourId && !ctx.planId) return { msgs, chips };
    const i = ctx.tourId ? D().tour(ctx.tourId, lang) : null;
    msgs.push(i && i.precio_publico && !(ctx.extras || []).length ? U().a_price_pub.replace("{p}", esc(i.precio_publico)) : S.price_tbd);
    const C = D().convenios ? D().convenios() : null;
    if (!C) { ctx.benefitObj = null; return { msgs, chips }; }
    const ok = C.lista.filter(applies);
    const best = ok.slice().sort((a, b) => (b.valor || 0) - (a.valor || 0) || PRIO.indexOf(a.id) - PRIO.indexOf(b.id))[0] || null;
    ctx.benefitObj = best;
    if (best) {
      if (!ctx.qUntil) ctx.qUntil = Date.now() + C.horas * 36e5;
      const tx = convText(best, lang);
      let m = S.ben.replace("{name}", tx.name).replace("{val}", best.valor ? S.val.replace("{v}", best.valor) : "").replace("{cond}", tx.cond);
      if (!best.valor) m += " " + S.val_tbd;
      if (ok.length > 1) m += "\n" + S.ben_one;
      msgs.push(m + "\n⏳ " + S.ben_valid.replace("{h}", C.horas).replace("{until}", fmtUntil(ctx.qUntil)));
    }
    // Convenio del hotel: si dio hotel o llegó por el enlace/QR de uno, el equipo comercial lo revisa
    ctx.hotelChk = C.lista.some(x => x.id === "aliado") && !!(ctx.hotel || landingSrc());
    if (ctx.hotelChk) msgs.push(S.hotel_chk);
    // Sumar una experiencia que combina bien (solo mientras el combo aún no aplica)
    const combo = C.lista.find(x => x.id === "combo");
    let tip = false;
    if (i && combo && !applies(combo)) {
      const sug = i.combina.filter(c => c !== ctx.tourId && (ctx.extras || []).indexOf(c) < 0 && EspoApp.tours().some(x => x.id === c)).slice(0, 2);
      if (sug.length) { tip = true; msgs.push(S.tip_combo.replace("{name}", convText(combo, lang).name)); sug.forEach(c => chips.push({ label: "➕ " + tourLabel(c), to: "qadd:" + c })); }
    }
    if (!best && !tip && !ctx.hotelChk) msgs.push(S.hook_any.replace("{list}", C.lista.map(x => convText(x, lang)).filter(Boolean).map(x => x.name.toLowerCase()).join(", ")));
    if (C.lista.some(x => x.id === "codigo") && !ctx.code) chips.push({ label: S.code_chip, to: "qcode" });
    return { msgs, chips };
  }
  function withQuote(base, q) {
    const chips = base.slice(0, 1).concat(q.chips, base.slice(1));
    chips.forEach(c => { if (!c.to) c.keep = chips; });
    return chips;
  }
  function renderCodeForm() {
    quick.innerHTML = "";
    const f = el("form", "espo-form espo-form--code");
    f.setAttribute("autocomplete", "off");
    f.innerHTML = `<input name="code" required maxlength="30" autocapitalize="characters" spellcheck="false" aria-label="${esc(SL().code_chip)}">
       <button class="btn btn--primary btn--sm" type="submit">${esc(U().send)}</button>`;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const c = f.elements.code.value.toUpperCase().replace(/\s+/g, "").slice(0, 30); if (!c) return;
      f.remove(); addBubble(esc(c), "user");
      ctx.code = { c };          // lo valida el equipo comercial al confirmar la cotización
      go("qupd");
    });
    body.appendChild(f); scrollDown();
    setTimeout(() => { try { f.elements.code.focus({ preventScroll: true }); } catch (e) {} }, 50);
  }

  /* ---------- Texto libre ---------- */
  // Palabras genéricas que no identifican una experiencia (evita "quiero reservar" → "yoga en reserva natural")
  const STOP = ["tour", "experiencia", "experience", "visita", "parque", "city", "cata", "full", "day", "reserva", "reservas", "natural",
    "naturales", "colombia", "quindio", "local", "locales", "mundo", "world", "total", "coffee", "cafe", "plato", "sesion", "tradicional",
    "experiencial", "especial", "origen", "bienestar", "conexion", "manjares", "senderismo", "ecosistema", "unico", "aficionados", "trek",
    "esperienza", "esperienze", "parco", "caffe", "degustazione", "riserva", "riserve", "naturale", "naturali", "locale", "locali", "mondo",
    "totale", "piatto", "sessione", "tradizionale", "esperienziale", "speciale", "origine", "benessere", "connessione", "delizie",
    "escursionismo", "appassionati", "percorso", "giorno"];
  const esc_re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasWord = (t, w) => new RegExp("(^|[^a-z0-9ñ])" + esc_re(w) + "([^a-z0-9ñ]|$)").test(t);   // palabra completa
  const hasStem = (t, w) => new RegExp("(^|[^a-z0-9ñ])" + esc_re(w)).test(t);                     // inicio de palabra
  function freeText(q) {
    if (!D() || !D().ready()) { const no = () => noMatch(q); D() ? D().load().then(() => freeText(q), no) : no(); return; }
    const t = norm(q);
    // 0) ¿ya tiene reserva? (cambiar un horario / ver su viaje)
    const chg = CHANGE_VERB.test(t) && TIME_WORD.test(t);
    if (chg || MY_TRIP.test(t)) { go(chg ? "mytrip:change" : "mytrip:view"); return; }
    // 1) ¿menciona una experiencia? (palabras completas y distintivas del nombre)
    let best = null, bestScore = 0;
    EspoApp.tours().forEach(x => {
      const words = norm(x.name + " " + EspoApp.tourText(x).name).split(/[^a-z0-9ñ]+/).filter(w => w.length > 4 && STOP.indexOf(w) < 0);
      const s = words.filter((w, i, a) => a.indexOf(w) === i).reduce((a, w) => a + (hasWord(t, w) ? w.length : 0), 0);
      if (s > bestScore) { bestScore = s; best = x.id; }
    });
    // 2) ¿qué pregunta? (palabras clave + pregunta_tipo de jenny.json, salvo las frases genéricas del tour compartido)
    let topic = null, tScore = 0;
    Object.keys(KW).forEach(id => {
      let kws = KW[id].slice();
      const node = id === "compartido" ? null : D().node(id, lang);
      if (node && node.pregunta_tipo) kws = kws.concat(node.pregunta_tipo);
      const s = kws.reduce((a, k) => { const nk = norm(k).replace(/[¿?¡!]/g, "").trim(); return a + (nk && hasStem(t, nk) ? nk.length : 0); }, 0);
      if (s > tScore) { tScore = s; topic = id; }
    });
    // Nombres que la gente usa y no salen de las palabras del título ("tour del café", "parque del café")
    Object.keys(ALIAS).forEach(id => { if (bestScore < 10 && ALIAS[id].some(a => t.indexOf(a) >= 0)) { bestScore = 10; best = id; } });
    if (best && bestScore >= 5) {
      if (topic && TOUR_Q.indexOf(topic) >= 0) { go("ta:" + best + ":" + topic); return; }
      const info = D().tour(best, lang);
      Object.assign(ctx, { tourId: best, tourName: info ? info.nombre : EspoApp.tourText(EspoApp.tours().find(x => x.id === best)).name, tourCode: info ? info.codigo : "", planId: null, intent: null });
      if (topic === "precios" || topic === "reservar") { go("n:" + topic); return; }
      go("tour:" + best); return;
    }
    if (topic) { go("n:" + topic); return; }
    noMatch(q);
  }
  function noMatch(q) {
    const waMsg = U().wa_q + " " + q;
    botSay([U().no_match]).then(() => renderChips([{ label: U().open_wa, kind: "wa", wa: true, waMsg }, { label: U().back, to: "menu" }]));
  }

  /* ---------- Escanear QR → itinerario ---------- */
  function scanQR() {
    const T = P();
    EspoQR.scan({ title: T.scan_title, hint: T.scan_hint, file: T.scan_file, nocam: T.scan_nocam, bad: T.scan_bad, close: T.scan_close }).then(text => {
      if (!text) { renderChips(menuChips()); return; }
      const r = EspoPlans.parseQR(text);
      if (!r) { botSay([T.scan_bad]).then(() => renderChips(menuChips())); return; }
      if (r.type === "plan") { ctx.planId = r.id; ctx.src = r.src || "QR"; ctx.fromQR = true; trackVisit(); go("plan:" + r.id); }
      else if (r.type === "tour") { ctx.src = r.src || "QR"; go("tour:" + r.id); }
      else { const q = r.type === "code" ? "code=" + encodeURIComponent(r.code) : r.query; botSay([T.scan_trip]).then(() => { location.href = "/viaje.html?" + q; }); }
    });
  }

  /* ---------- Formulario de datos (dentro del chat) ---------- */
  function renderForm() {
    const T = P();
    quick.innerHTML = "";
    const today = EspoPlans.localISO();
    const guide = ctx.guide || (lang === "de" ? "en" : lang);   // no hay guías en alemán: a quien escribe en alemán se le propone inglés
    const f = el("form", "espo-form");
    f.setAttribute("autocomplete", "on");
    f.innerHTML =
      `<label>${esc(T.f_name)}<input name="name" required maxlength="60" autocomplete="name" value="${esc(ctx.name || "")}"></label>
       <div class="espo-form__row">
         <label>${esc(T.f_date)}<input name="date" type="date" min="${today}" value="${esc(ctx.date || "")}"></label>
         <label>${esc(T.f_people)}<input name="people" type="number" min="1" max="60" value="${esc(ctx.party || 2)}"></label>
       </div>
       <label>${esc(T.f_hotel)}<input name="hotel" maxlength="80" value="${esc(ctx.hotel || "")}"></label>
       <label>${esc(U().f_guide)}<select name="guide">${["es", "en", "fr", "pt", "it"].map(c => `<option value="${c}"${c === guide ? " selected" : ""}>${LANGNAME[c]}</option>`).join("")}</select></label>
       <label>${esc(CONTACT_LBL[lang] || CONTACT_LBL.es)}<input name="contact" maxlength="80" autocomplete="tel" inputmode="email" value="${esc(ctx.contact || "")}"></label>
       <label>${esc(T.f_diet)}<input name="diet" maxlength="80" value="${esc(ctx.diet || "")}"></label>
       <label>${esc(T.f_notes)}<input name="notes" maxlength="160" value="${esc(ctx.notes || "")}"></label>
       <label class="espo-form__chk"><input type="checkbox" name="access"${ctx.access ? " checked" : ""}> ${esc(T.f_access)}</label>
       <label class="espo-form__chk"><input type="checkbox" name="kit"${ctx.kit ? " checked" : ""}> ${esc(T.f_kit)}</label>
       <label class="espo-form__chk espo-form__consent"><input type="checkbox" name="imagen"${ctx.imagen ? " checked" : ""}> <span>${esc((IMG_OK[lang] || IMG_OK.es).chk)} <a href="/terminos.html#imagenes" target="_blank" rel="noopener">+</a></span></label>
       <label class="espo-form__chk espo-form__consent"><input type="checkbox" name="consent"${ctx.consent ? " checked" : ""}> <span>${esc(U().consent).replace("{link}", `<a href="/privacidad.html" target="_blank" rel="noopener">${esc(U().consent_link)}</a>`)}</span></label>
       <p class="espo-form__err" hidden>${esc(T.f_req)}</p>
       <button class="btn btn--primary btn--sm" type="submit">${esc(T.f_send)}</button>`;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = (n) => (f.elements[n].value || "").trim();
      const err = f.querySelector(".espo-form__err");
      if (!v("name")) { err.textContent = T.f_req; err.hidden = false; f.elements.name.focus(); return; }
      if (!f.elements.consent.checked) { err.textContent = U().consent_req; err.hidden = false; f.elements.consent.focus(); return; }
      Object.assign(ctx, { consent: true, name: v("name"), date: v("date"), party: parseInt(v("people"), 10) || 1, hotel: v("hotel"), guide: v("guide"),
        diet: v("diet"), notes: v("notes"), contact: v("contact"), access: f.elements.access.checked, kit: f.elements.kit.checked, imagen: f.elements.imagen.checked });
      f.remove();
      addBubble(esc(ctx.name + " · " + ctx.party + " · " + (ctx.date ? fmtDate(ctx.date) : T.flexible)), "user");
      go("summary");
    });
    body.appendChild(f); scrollDown();
    setTimeout(() => { try { f.elements.name.focus({ preventScroll: true }); } catch (e) {} }, 50);
  }

  /* ---------- Resumen + WhatsApp ---------- */
  function fmtDate(iso) { try { return new Date(iso + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : lang, { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } }
  function planLines(plan) { return plan.stops.map(s => (plan.days > 1 ? P().day + " " + s.d + " · " : "") + s.t + " — " + EspoPlans.stopTitle(s, lang)).join("\n"); }
  function currentStops() {
    if (ctx.planId) { const plan = EspoPlans.planById(ctx.planId); return ctx.date ? EspoPlans.planToItinerary(plan, ctx.date) : plan.stops; }
    if (ctx.tourId) return [{ tour: ctx.tourId, tourId: ctx.tourId, date: ctx.date || "", time: "09:00", title: ctx.tourName }];
    return [];
  }
  function packText(pack) {
    let s = "*" + P().pack_title + "*\n" + pack.items.map(x => (x.i ? x.i + " " : "") + x.label).join("\n");
    if (pack.tips.length) s += "\n\n*" + P().pack_tips + "*\n" + pack.tips.map(x => "• " + x).join("\n");
    return s;
  }
  function weatherText(pack) {
    const rows = pack.days.filter(d => d.fc);
    if (rows.length) return "*" + P().fc_title + "*\n" + rows.map(d => "• " + (d.date ? fmtDate(d.date) + " · " : "") + d.title + "\n   " + EspoPlans.fcText(d.fc)).join("\n");
    return pack.days.length ? P().fc_na : "";
  }
  function provisionalLink() {
    if (!ctx.date || !(ctx.planId || ctx.tourId)) return "";
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let code = "PRE-"; for (let i = 0; i < 5; i++) code += c[Math.floor(Math.random() * c.length)];
    const itin = ctx.planId ? EspoPlans.planToItinerary(EspoPlans.planById(ctx.planId), ctx.date)
      : [{ date: ctx.date, time: "09:00", tourId: ctx.tourId, title: ctx.tourName, maps: "" }];
    const booking = { code, lang, name: ctx.name, party: ctx.party, status: "pendiente", region: "Eje Cafetero · Quindío",
      host: { name: "Espontáneos Travel", phone: "573187200023" }, guide: { name: "—", langs: [ctx.guide || lang] },
      hotel: { name: ctx.hotel || "", area: "Quindío" }, prefs: { accessible: !!ctx.access, diet: ctx.diet || "" }, itinerary: itin };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(booking)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.origin + "/viaje.html?d=" + b64;
  }
  function summaryNode() {
    const T = P();
    return EspoPlans.packFor(currentStops(), lang).then(pack => {
      const link = provisionalLink(); ctx.link = link;
      if (!ctx.leadId) ctx.leadId = EspoPlans.newLeadId();
      const q = quoteBlock();
      if (ctx.consent) EspoPlans.sendLead(leadData("resumen"));      // solo con autorización (Ley 1581)
      const what = ctx.planId ? EspoPlans.name(EspoPlans.planById(ctx.planId), lang) : (ctx.tourName + (ctx.tourCode ? " (" + ctx.tourCode + ")" : ""));
      const sum = [
        "*" + (ctx.planId ? T.wa_plan : T.wa_tour) + "* " + esc(what || "—"),
        "*" + T.wa_date + "* " + (ctx.date ? fmtDate(ctx.date) : T.flexible),
        "*" + T.wa_people + "* " + ctx.party,
        ...(!ctx.planId && (ctx.extras || []).length ? ["*" + SL().wa_extra + "* " + esc(extrasText())] : []),
        "*" + U().wa_guide + "* " + (LANGNAME[ctx.guide] || LANGNAME[lang])
      ];
      if (ctx.hotel) sum.push("*" + T.wa_hotel + "* " + esc(ctx.hotel));
      if (ctx.access) sum.push(T.wa_access);
      if (ctx.diet) sum.push("*" + T.wa_diet + "* " + esc(ctx.diet));
      if (ctx.kit) sum.push(T.wa_kit);
      const base = [{ label: T.send_wa, kind: "wa", wa: true }];
      if (link) base.push({ label: T.prov, href: link });
      base.push({ label: T.share, share: packText(pack).replace(/\*/g, "") });
      base.push({ label: U().m_pagos, to: "n:pagos" }, { label: U().back, to: "menu" });
      ctx.sumBase = base;
      return { msgs: [T.sum_ready.replace("{name}", esc(ctx.name)), sum.join("\n")].concat(q.msgs, [packText(pack), weatherText(pack)]).filter(Boolean), chips: withQuote(base, q) };
    });
  }

  /* ---------- Clientes → Google Sheets / backend (no hace nada si no está configurado) ---------- */
  function planLabel() { const p = ctx.planId && EspoPlans.planById(ctx.planId); return p ? EspoPlans.name(p, "es") + " (" + p.id + ")" : ""; }
  function leadData(stage) {
    return { stage, leadId: ctx.leadId || "", plan: planLabel(), tour: ctx.tourName ? ctx.tourName + (ctx.tourCode ? " (" + ctx.tourCode + ")" : "") : "",
      name: ctx.name || "", date: ctx.date || "", party: ctx.party || "", hotel: ctx.hotel || "", access: !!ctx.access, diet: ctx.diet || "",
      notes: [ctx.contact ? "Contacto: " + ctx.contact : "", ctx.notes, ctx.guide ? "Guía: " + (LANGNAME[ctx.guide] || ctx.guide) : "",
        !ctx.planId && (ctx.extras || []).length ? "Suma: " + extrasText("es") : "",
        ctx.benefitObj ? "Beneficio: " + benefitName("es") + " hasta " + fmtUntil(ctx.qUntil, "es") : "",
        ctx.hotelChk ? "Revisar convenio del hotel" + (landingSrc() ? " (llegó por: " + landingSrc() + ")" : "") : "",
        ctx.code ? "Código: " + ctx.code.c + " (por validar)" : ""].filter(Boolean).join(" · ").slice(0, 500), kit: !!ctx.kit,
      beneficio: ctx.benefitObj ? benefitName("es") + " · válido hasta " + fmtUntil(ctx.qUntil, "es") + " (hora Colombia)" : "",
      src: landingSrc() || "web", lang, link: ctx.link || "", contact: ctx.contact || "", imagen: !!ctx.imagen };
  }
  function trackVisit() {
    const key = "esp_v_" + ctx.planId + "_" + ctx.src;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) {}
    EspoPlans.sendLead({ stage: "qr_visita", plan: planLabel(), src: ctx.src, lang });
  }
  // Regla 5: tour + código, personas, fecha, hotel e idioma
  function composeWA() {
    if (!HAS_PLANS || !ctx.name) {
      const parts = [U().wa_default];
      if (ctx.tourName) parts.push("", U().wa_tour + " " + ctx.tourName + (ctx.tourCode ? " (" + ctx.tourCode + ")" : ""));
      return parts.join("\n");
    }
    const T = P(); const parts = [ctx.planId ? T.wa_lead : U().wa_lead_tour, ""];
    if (ctx.planId) { const plan = EspoPlans.planById(ctx.planId); parts.push(T.wa_plan + " " + EspoPlans.name(plan, lang) + " (" + plan.days + "d · " + plan.id + ")"); }
    else if (ctx.tourName) parts.push(T.wa_tour + " " + ctx.tourName + (ctx.tourCode ? " (" + ctx.tourCode + ")" : ""));
    if (!ctx.planId && (ctx.extras || []).length) parts.push(SL().wa_extra + " " + extrasText());
    parts.push(T.wa_name + " " + ctx.name);
    parts.push(T.wa_date + " " + (ctx.date ? ctx.date + " (" + fmtDate(ctx.date) + ")" : T.flexible));
    parts.push(T.wa_people + " " + ctx.party);
    if (ctx.hotel) parts.push(T.wa_hotel + " " + ctx.hotel);
    parts.push(U().wa_guide + " " + (LANGNAME[ctx.guide] || LANGNAME[lang]));
    if (ctx.access) parts.push(T.wa_access);
    if (ctx.diet) parts.push(T.wa_diet + " " + ctx.diet);
    if (ctx.notes) parts.push(T.wa_notes + " " + ctx.notes);
    if (ctx.kit) parts.push(T.wa_kit);
    if (landingSrc()) parts.push(T.wa_src + " " + landingSrc());
    if (ctx.benefitObj) parts.push(SL().wa_ben + " " + benefitName() + " · " + SL().wa_until + " " + fmtUntil(ctx.qUntil));
    if (ctx.hotelChk) parts.push(SL().wa_hotel + " " + SL().tbc);
    if (ctx.code) parts.push(SL().wa_code + " " + ctx.code.c + " (" + SL().tbc + ")");
    parts.push(T.wa_lang + " " + (LANGNAME[lang] || "Español"));
    { const I = IMG_OK[lang] || IMG_OK.es; parts.push(I.wa + " " + (ctx.imagen ? I.yes : I.no)); }
    if (lang !== "es") {   // resumen en español para el equipo (el cliente escribe en su idioma)
      const es = [];
      if (ctx.planId) es.push("Plan " + EspoPlans.name(EspoPlans.planById(ctx.planId), "es"));
      else if (ctx.tourId && D() && D().ready() && D().tour(ctx.tourId, "es")) es.push(D().tour(ctx.tourId, "es").nombre + (ctx.tourCode ? " (" + ctx.tourCode + ")" : ""));
      else if (ctx.tourName) es.push(ctx.tourName);
      if (!ctx.planId && (ctx.extras || []).length) es.push("+ " + extrasText("es"));
      if (ctx.benefitObj) es.push("beneficio " + benefitName("es") + " hasta " + fmtUntil(ctx.qUntil, "es"));
      if (ctx.hotelChk) es.push("revisar convenio del hotel");
      if (ctx.code) es.push("código " + ctx.code.c + " por validar");
      es.push(ctx.date || "fecha flexible", ctx.party + " pers.");
      if (ctx.hotel) es.push("hotel " + ctx.hotel);
      es.push("guía en " + (LANG_ES[ctx.guide || lang] || "español"), "cliente escribe en " + (LANG_ES[lang] || lang));
      parts.push("", "🇪🇸 Resumen: " + es.join(" · "));
    }
    if (ctx.link) parts.push("", T.wa_link, ctx.link);
    return parts.join("\n");
  }

  /* ---------- Cambio de idioma ---------- */
  document.addEventListener("espo:lang", (e) => {
    const newLang = e.detail; if (newLang === lang) return;
    lang = newLang; if (!launchTxt) return;      // idioma fijado antes de construir el widget
    refreshStatic();
    if (opened && started) { for (const k in ctx) delete ctx[k]; start(); } else started = false;
  });

  /* ---------- Arranque (QR impreso: index.html?plan=ID&src=aliado) ---------- */
  function startAt(id) {
    opened = true; started = true; panel.classList.add("open"); launch.classList.add("hide");
    if (badge) badge.style.display = "none";
    refreshStatic(); body.innerHTML = "";
    botSay([greeting()]).then(() => go(id));
  }
  window.EspoBot = {
    openPlan: (id) => { if (!panel) return; ctx.planId = id; startAt("plan:" + id); },
    openTour: (id) => { if (!panel) return; startAt("tour:" + id); },
    quote: (id) => { if (!panel) return; startAt("q:" + id); },
    topic: (n) => { if (!panel || !/^[a-z_]+$/.test(n || "")) return; startAt("n:" + n); }
  };
  function boot() {
    if (window.EspoApp) lang = EspoApp.getLang();
    build();
    const qs = new URLSearchParams(location.search);
    const src = (qs.get("src") || "").slice(0, 40);
    try { if (src) sessionStorage.setItem("esp_src", src); } catch (e) {}     // hotel aliado: se recuerda durante la visita
    const whenReady = (fn) => { if (D() && !D().ready()) D().load().then(fn, fn); else fn(); };
    if (HAS_PLANS && EspoPlans.planById(qs.get("plan"))) {
      const plan = EspoPlans.planById(qs.get("plan"));
      ctx.planId = plan.id; ctx.src = src || "QR"; ctx.fromQR = true; trackVisit();
      whenReady(() => setTimeout(() => startAt("plan:" + plan.id), 400));
    } else if (qs.get("cotizar") && EspoApp.tours().some(x => x.id === qs.get("cotizar"))) {
      const id = qs.get("cotizar"); if (src) ctx.src = src;
      try { qs.delete("cotizar"); history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); } catch (e) {}
      whenReady(() => setTimeout(() => startAt("q:" + id), 400));
    } else if (qs.get("tour") && EspoApp.tours().some(x => x.id === qs.get("tour"))) {
      ctx.src = src || "QR";
      whenReady(() => setTimeout(() => startAt("tour:" + qs.get("tour")), 400));
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
