/* ==========================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   Espontáneos Travel — Itinerarios armados + "Qué llevar" según el clima.
   Compartido por el sitio (Jenny), el conserje (viaje.html) y el panel.
   - PLANS: itinerarios que el cliente elige (cada uno tiene su QR: ?plan=ID).
   - CLIMATE: perfil de clima por destino → lista de qué llevar + consejo.
   - Pronóstico real (gratis, sin clave) de Open-Meteo cuando la fecha está
     dentro de ~16 días: ajusta la lista (lluvia → poncho, UV alto → bloqueador…).
   EDITAR AQUÍ: itinerarios, artículos y perfiles.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Configuración del negocio (EDITAR AQUÍ) ---------- */
  const BIZ = {
    whatsapp: "573187200023",
    // URL del Web App de Google Apps Script que guarda cada cliente en Google Sheets
    // (ver tools/leads-apps-script.gs). Vacío = no se guarda nada.
    leadsEndpoint: "",
    // Copia por correo de cada cliente que completa sus datos con Jenny (aunque no envíe el WhatsApp).
    // FormSubmit, el mismo servicio del formulario de contacto. "" = desactivado.
    leadsEmail: "https://formsubmit.co/ajax/info@espontaneostravel.com",
    // Enlace general de pago del anticipo (Bold, Wompi, Mercado Pago, PayPal…). Vacío = no se muestra.
    // Cada reserva también puede llevar su propio enlace (campo "Enlace de pago" en el panel).
    payLink: "https://checkout.wompi.co/l/VPOS_jV9h51",
    // Enlace "Escribir una reseña" de tu Perfil de Empresa en Google (g.page/r/…/review).
    reviewUrl: "",
    // Números OFICIALES de WhatsApp. Un enlace de viaje (?d=) con otro número se corrige a este (evita enlaces falsos).
    officialPhones: ["573187200023"],
    // Prefijos EXACTOS de tus enlaces de pago oficiales (p. ej. "https://checkout.bold.co/payment/LNK_TUCOMERCIO").
    // Vacío = nunca se muestra un botón de pago tomado de una reserva.
    payLinkPrefixes: ["https://checkout.wompi.co/l/VPOS_jV9h51"]
  };
  // Solo se muestran enlaces de pago de estas pasarelas (evita enlaces falsos dentro de ?d=).
  const PAY_HOSTS = ["bold.co", "wompi.co", "mercadopago.com.co", "mpago.la", "paypal.com", "paypal.me", "payu.com", "epayco.co", "epayco.com"];
  function safePayLink(u) {
    if (!u) return "";
    try {
      const url = new URL(String(u));
      const ok = url.protocol === "https:" && PAY_HOSTS.some(h => url.hostname === h || url.hostname.endsWith("." + h))
        && BIZ.payLinkPrefixes.some(p => p && url.href.indexOf(p) === 0);      // solo comercios propios
      return ok ? url.href : "";
    } catch (e) { return ""; }
  }
  function isOfficialPhone(p) { return BIZ.officialPhones.indexOf(String(p || "").replace(/\D/g, "")) >= 0; }
  function safeHttps(u) { try { const x = new URL(String(u)); return x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; } }
  // Enlace para escribir reseña: data/jenny.json → resenas.url_escribir (BIZ.reviewUrl lo reemplaza si se llena)
  function googleReviewUrl() {
    const D = typeof window !== "undefined" && window.EspoData;
    const r = D && D.ready && D.ready() && D.resenas ? D.resenas() : null;
    return (r && r.url_escribir) || "";
  }
  const REVIEW_FALLBACK = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Espontáneos Travel Armenia Quindío");

  /* ---------- Itinerarios armados (el QR de cada uno abre index.html?plan=ID) ----------
     priceFrom: precio "desde" por persona en USD (null = no se muestra; se cotiza). */
  const PLANS = [
    { id: "esencia", days: 1, priceFrom: null,
      name: { es: "Esencia Cafetera", en: "Coffee Essence", fr: "Essence du café", de: "Kaffee-Essenz", pt: "Essência Cafeeira" },
      stops: [ { d: 1, t: "08:00", k: "pickup" }, { d: 1, t: "09:00", tour: "finca" }, { d: 1, t: "13:00", k: "lunch" }, { d: 1, t: "15:00", tour: "filandia" } ] },
    { id: "cocora", days: 1, priceFrom: null,
      name: { es: "Cocora, Salento y Filandia", en: "Cocora, Salento & Filandia", fr: "Cocora, Salento et Filandia", de: "Cocora, Salento & Filandia", pt: "Cocora, Salento e Filandia" },
      stops: [ { d: 1, t: "07:30", k: "pickup" }, { d: 1, t: "08:30", tour: "fulldayfcs" } ] },
    { id: "eje3", days: 3, priceFrom: null,
      name: { es: "Gran Eje Cafetero", en: "Grand Coffee Region", fr: "Grande région du café", de: "Große Kaffeeregion", pt: "Grande Região Cafeeira" },
      stops: [ { d: 1, t: "08:00", k: "pickup" }, { d: 1, t: "09:00", tour: "finca" }, { d: 1, t: "15:00", tour: "filandia" },
               { d: 2, t: "07:30", tour: "cocorasalento" }, { d: 3, t: "09:00", tour: "parquecafe" }, { d: 3, t: "17:00", tour: "termales" } ] },
    { id: "naturaleza", days: 2, priceFrom: null,
      name: { es: "Aves, Palmas y Páramo", en: "Birds, Palms & Páramo", fr: "Oiseaux, palmiers et páramo", de: "Vögel, Palmen & Páramo", pt: "Aves, Palmas e Páramo" },
      stops: [ { d: 1, t: "05:30", tour: "aves" }, { d: 1, t: "11:00", tour: "cocoraacaime" }, { d: 2, t: "06:00", tour: "paramo" } ] },
    { id: "familia", days: 2, priceFrom: null,
      name: { es: "Familia y Parques", en: "Family & Theme Parks", fr: "Famille et parcs", de: "Familie & Freizeitparks", pt: "Família e Parques" },
      stops: [ { d: 1, t: "09:00", tour: "panaca" }, { d: 2, t: "09:00", tour: "parquecafe" } ] },
    { id: "sinbarreras", days: 2, priceFrom: null, access: true,
      name: { es: "Paisaje Cafetero Sin Barreras ♿", en: "Barrier-Free Coffee Cultural Landscape ♿", fr: "Paysage culturel du café sans barrières ♿", de: "Barrierefreie Kaffeelandschaft ♿", pt: "Paisagem Cafeeira Sem Barreiras ♿" },
      stops: [ { d: 1, t: "09:00", k: "pickup_acc" }, { d: 1, t: "10:00", tour: "finca" }, { d: 2, t: "09:30", tour: "parquecafe" } ] },
    { id: "bienestar", days: 2, priceFrom: null,
      name: { es: "Orquídeas, Termales y Café", en: "Orchids, Hot Springs & Coffee", fr: "Orchidées, thermes et café", de: "Orchideen, Thermen & Kaffee", pt: "Orquídeas, Termas e Café" },
      stops: [ { d: 1, t: "09:00", tour: "orquideas" }, { d: 1, t: "15:00", tour: "termales" }, { d: 2, t: "09:00", tour: "catacafe" } ] }
  ];

  const STOP_LABEL = {
    pickup:     { es: "Recogida en tu alojamiento", en: "Pickup at your lodging", fr: "Prise en charge à votre hébergement", de: "Abholung an der Unterkunft", pt: "Buscamos você na hospedagem" },
    pickup_acc: { es: "Recogida accesible", en: "Accessible pickup", fr: "Prise en charge accessible", de: "Barrierefreie Abholung", pt: "Busca com veículo acessível" },
    lunch:      { es: "Almuerzo típico", en: "Traditional lunch", fr: "Déjeuner typique", de: "Typisches Mittagessen", pt: "Almoço típico" }
  };

  /* ---------- Artículos para llevar ---------- */
  const ITEMS = {
    cap:        { i: "🧢", es: "Gorra o sombrero", en: "Cap or hat", fr: "Casquette ou chapeau", de: "Kappe oder Hut", pt: "Boné ou chapéu" },
    sunscreen:  { i: "🧴", es: "Bloqueador solar FPS 50", en: "Sunscreen SPF 50", fr: "Crème solaire SPF 50", de: "Sonnencreme LSF 50", pt: "Protetor solar FPS 50" },
    repellent:  { i: "🦟", es: "Repelente de insectos", en: "Insect repellent", fr: "Anti-moustique", de: "Insektenschutz", pt: "Repelente de insetos" },
    water:      { i: "💧", es: "Botella de agua reutilizable", en: "Reusable water bottle", fr: "Gourde réutilisable", de: "Wiederverwendbare Trinkflasche", pt: "Garrafa de água reutilizável" },
    light:      { i: "👕", es: "Ropa ligera y fresca", en: "Light, breathable clothes", fr: "Vêtements légers", de: "Leichte, luftige Kleidung", pt: "Roupa leve e fresca" },
    sunglasses: { i: "🕶️", es: "Gafas de sol", en: "Sunglasses", fr: "Lunettes de soleil", de: "Sonnenbrille", pt: "Óculos de sol" },
    rain:       { i: "🧥", es: "Impermeable o poncho", en: "Rain jacket or poncho", fr: "Imperméable ou poncho", de: "Regenjacke oder Poncho", pt: "Capa de chuva ou poncho" },
    layers:     { i: "🧣", es: "Ropa por capas (madrugadas frías)", en: "Layers (chilly mornings)", fr: "Vêtements en couches (matins frais)", de: "Zwiebellook (kühle Morgen)", pt: "Roupas em camadas (madrugadas frias)" },
    boots:      { i: "🥾", es: "Botas o tenis con buen agarre (barro)", en: "Boots or trainers with good grip (mud)", fr: "Bottes ou baskets à bonne adhérence (boue)", de: "Stiefel oder Turnschuhe mit gutem Profil (Matsch)", pt: "Botas ou tênis com boa aderência (lama)" },
    warm:       { i: "🧤", es: "Abrigo térmico, gorro y guantes", en: "Warm jacket, beanie & gloves", fr: "Veste chaude, bonnet et gants", de: "Warme Jacke, Mütze & Handschuhe", pt: "Casaco térmico, gorro e luvas" },
    snacks:     { i: "🍫", es: "Snacks de energía", en: "Energy snacks", fr: "En-cas énergétiques", de: "Energie-Snacks", pt: "Lanches energéticos" },
    swim:       { i: "🩱", es: "Traje de baño", en: "Swimsuit", fr: "Maillot de bain", de: "Badekleidung", pt: "Roupa de banho" },
    towel:      { i: "🩴", es: "Toalla y chanclas", en: "Towel & flip-flops", fr: "Serviette et tongs", de: "Handtuch & Badelatschen", pt: "Toalha e chinelos" },
    drybag:     { i: "📱", es: "Bolsa impermeable para el celular", en: "Waterproof phone pouch", fr: "Pochette étanche pour téléphone", de: "Wasserdichte Handyhülle", pt: "Capinha à prova d'água para o celular" },
    flashlight: { i: "🔦", es: "Linterna (ideal con luz roja)", en: "Torch (ideally with red light)", fr: "Lampe torche (idéalement à lumière rouge)", de: "Taschenlampe (idealerweise mit Rotlicht)", pt: "Lanterna (de preferência com luz vermelha)" },
    longsleeve: { i: "👖", es: "Pantalón largo y manga larga", en: "Long trousers & sleeves", fr: "Pantalon et manches longues", de: "Lange Hose & Ärmel", pt: "Calça e manga compridas" },
    binoculars: { i: "🔭", es: "Binoculares", en: "Binoculars", fr: "Jumelles", de: "Fernglas", pt: "Binóculos" },
    neutral:    { i: "🎨", es: "Ropa de colores neutros", en: "Neutral-coloured clothes", fr: "Vêtements de couleur neutre", de: "Kleidung in gedeckten Farben", pt: "Roupa de cores neutras" },
    closed:     { i: "👟", es: "Zapato cerrado", en: "Closed-toe shoes", fr: "Chaussures fermées", de: "Geschlossene Schuhe", pt: "Calçado fechado" },
    wind:       { i: "🌬️", es: "Chaqueta cortaviento", en: "Windbreaker", fr: "Coupe-vent", de: "Windjacke", pt: "Corta-vento" },
    strap:      { i: "🔗", es: "Cordón para gafas y celular", en: "Strap for glasses & phone", fr: "Cordon lunettes et téléphone", de: "Band für Brille & Handy", pt: "Cordão para óculos e celular" },
    comfy:      { i: "👟", es: "Zapatos cómodos para caminar", en: "Comfortable walking shoes", fr: "Chaussures confortables", de: "Bequeme Schuhe", pt: "Calçado confortável para caminhar" },
    umbrella:   { i: "☂️", es: "Sombrilla pequeña", en: "Small umbrella", fr: "Petit parapluie", de: "Kleiner Regenschirm", pt: "Guarda-chuva pequeno" },
    cash:       { i: "💵", es: "Efectivo en pesos (artesanías, propinas)", en: "Cash in pesos (crafts, tips)", fr: "Espèces en pesos (artisanat, pourboires)", de: "Bargeld in Pesos (Kunsthandwerk, Trinkgeld)", pt: "Dinheiro em pesos (artesanato, gorjetas)" },
    powerbank:  { i: "🔋", es: "Batería externa", en: "Power bank", fr: "Batterie externe", de: "Powerbank", pt: "Carregador portátil" },
    change:     { i: "👚", es: "Muda de ropa extra", en: "Spare change of clothes", fr: "Vêtements de rechange", de: "Wechselkleidung", pt: "Muda de roupa extra" },
    stretchy:   { i: "🧘", es: "Ropa cómoda y elástica", en: "Comfortable, stretchy clothes", fr: "Tenue souple et confortable", de: "Bequeme, dehnbare Kleidung", pt: "Roupa confortável e elástica" }
  };

  /* ---------- Perfiles de clima (lat/lon para el pronóstico) ---------- */
  const CLIMATE = {
    valle:    { lat: 4.566, lon: -75.75, items: ["cap", "sunscreen", "repellent", "water", "light", "sunglasses", "umbrella"],
      label: { es: "Cálido (22–30 °C), sol fuerte y aguaceros de tarde", en: "Warm (22–30 °C), strong sun, afternoon showers", fr: "Chaud (22–30 °C), soleil fort, averses l'après-midi", de: "Warm (22–30 °C), starke Sonne, Nachmittagsschauer", pt: "Quente (22–30 °C), sol forte, pancadas à tarde" },
      tip: { es: "El sol del trópico quema aunque esté nublado: reaplica bloqueador cada 2 horas.", en: "Tropical sun burns even when cloudy: reapply sunscreen every 2 hours.", fr: "Le soleil tropical brûle même par temps nuageux : réappliquez de la crème solaire toutes les 2 heures.", de: "Die Tropensonne brennt auch bei Bewölkung: Cremen Sie sich alle 2 Stunden erneut ein.", pt: "O sol tropical queima mesmo nublado: reaplique o protetor solar a cada 2 horas." } },
    montana:  { lat: 4.637, lon: -75.53, items: ["layers", "rain", "boots", "sunscreen", "cap", "water", "change", "cash"],
      label: { es: "Montaña (12–22 °C), clima cambiante y lluvia frecuente", en: "Mountain (12–22 °C), changeable weather, frequent rain", fr: "Montagne (12–22 °C), temps changeant, pluie fréquente", de: "Berge (12–22 °C), wechselhaft, häufig Regen", pt: "Montanha (12–22 °C), tempo instável, chuva frequente" },
      tip: { es: "En Cocora el barro es casi seguro: la muda de ropa extra se agradece al volver.", en: "Mud is almost guaranteed in Cocora: you'll be glad of a spare change of clothes for the way back.", fr: "La boue est quasi certaine à Cocora : prévoyez des vêtements de rechange.", de: "In Cocora ist Matsch fast garantiert: Wechselkleidung für die Rückfahrt lohnt sich.", pt: "Em Cocora a lama é quase certa: a muda de roupa extra faz diferença na volta." } },
    paramo:   { lat: 4.70, lon: -75.40, items: ["warm", "rain", "boots", "sunscreen", "sunglasses", "snacks", "water"],
      label: { es: "Alta montaña (3–12 °C), viento y radiación UV muy alta", en: "High mountain (3–12 °C), wind and very high UV", fr: "Haute montagne (3–12 °C), vent et UV très élevés", de: "Hochgebirge (3–12 °C), Wind, sehr hohe UV-Strahlung", pt: "Alta montanha (3–12 °C), vento e UV muito alto" },
      tip: { es: "Sube despacio y toma agua seguido: la altura se siente. Aunque haga frío, el sol quema.", en: "Go slowly and drink water often: you'll feel the altitude. It's cold, but the sun still burns.", fr: "Montez lentement et buvez souvent : l'altitude se fait sentir. Le soleil brûle malgré le froid.", de: "Gehen Sie langsam und trinken Sie regelmäßig: Die Höhe ist spürbar. Auch wenn es kalt ist, brennt die Sonne.", pt: "Suba devagar e beba água com frequência: a altitude se faz sentir. Mesmo com frio, o sol queima." } },
    termales: { lat: 4.87, lon: -75.56, items: ["swim", "towel", "drybag", "layers", "water"],
      label: { es: "Aguas termales en montaña (14–20 °C fuera del agua)", en: "Mountain hot springs (14–20 °C out of the water)", fr: "Sources thermales de montagne (14–20 °C hors de l'eau)", de: "Bergthermen (14–20 °C außerhalb des Wassers)", pt: "Termas na montanha (14–20 °C fora d'água)" },
      tip: { es: "Al salir del agua hace frío: ten a mano ropa seca. Evita joyas de plata (los minerales las oscurecen).", en: "It's chilly when you get out: keep dry clothes handy. Leave silver jewellery behind (minerals tarnish it).", fr: "Il fait frais en sortant : gardez des vêtements secs. Évitez les bijoux en argent (les minéraux les noircissent).", de: "Nach dem Baden wird es kalt: Halten Sie trockene Kleidung bereit. Verzichten Sie auf Silberschmuck (die Mineralien lassen ihn anlaufen).", pt: "Ao sair da água faz frio: tenha roupa seca à mão. Evite joias de prata (os minerais as escurecem)." } },
    noche:    { lat: 4.637, lon: -75.53, items: ["flashlight", "repellent", "longsleeve", "boots", "rain"],
      label: { es: "Recorrido nocturno en bosque húmedo", en: "Night walk in a humid forest", fr: "Sortie nocturne en forêt humide", de: "Nachtwanderung im feuchten Wald", pt: "Passeio noturno em mata úmida" },
      tip: { es: "Evita perfumes y flash: los animales se asustan.", en: "Skip perfume and flash photography: they scare the animals.", fr: "Évitez parfum et flash : ils effraient les animaux.", de: "Kein Parfüm und kein Blitz: das verschreckt die Tiere.", pt: "Evite perfume e flash: assustam os animais." } },
    aves:     { lat: 4.637, lon: -75.53, items: ["binoculars", "neutral", "repellent", "layers", "rain", "boots"],
      label: { es: "Bosque de niebla, madrugada fresca", en: "Cloud forest, cool early morning", fr: "Forêt de nuages, matin frais", de: "Nebelwald, kühler Morgen", pt: "Floresta de neblina, madrugada fresca" },
      tip: { es: "Las aves madrugan: duerme temprano la noche anterior y evita ropa de colores brillantes.", en: "Birds are early risers: get an early night and avoid bright colours.", fr: "Les oiseaux sont matinaux : couchez-vous tôt et évitez les couleurs vives.", de: "Vögel sind Frühaufsteher: Gehen Sie am Vorabend früh schlafen und meiden Sie grelle Farben.", pt: "As aves acordam cedo: durma cedo na noite anterior e evite roupas de cores vivas." } },
    aire:     { lat: 4.53, lon: -75.68, items: ["wind", "closed", "strap", "sunglasses", "sunscreen"],
      label: { es: "Vuelo: más fresco y con viento en altura", en: "Flight: cooler and windy up high", fr: "Vol : plus frais et venteux en altitude", de: "Flug: oben kühler und windig", pt: "Voo: mais fresco e com vento no alto" },
      tip: { es: "El vuelo depende del viento: deja un margen flexible en tu horario.", en: "Flights depend on the wind: keep your schedule a bit flexible.", fr: "Le vol dépend du vent : gardez un horaire flexible.", de: "Geflogen wird je nach Wind: planen Sie etwas Puffer ein.", pt: "O voo depende do vento: deixe o horário flexível." } },
    caballo:  { lat: 4.53, lon: -75.68, items: ["longsleeve", "closed", "cap", "sunscreen", "repellent", "rain"],
      label: { es: "Cabalgata entre río y montaña", en: "Horseback ride between river and mountains", fr: "Balade à cheval entre rivière et montagne", de: "Ausritt zwischen Fluss und Bergen", pt: "Cavalgada entre rio e montanha" },
      tip: { es: "Pantalón largo evita rozaduras; asegura la gorra para que no vuele.", en: "Long trousers prevent chafing; secure your cap so it doesn't fly off.", fr: "Le pantalon long évite les frottements ; attachez votre casquette.", de: "Lange Hosen verhindern Scheuerstellen; sichern Sie Ihre Kappe, damit sie nicht wegfliegt.", pt: "Calça comprida evita assaduras; prenda bem o boné." } },
    parque:   { lat: 4.566, lon: -75.75, items: ["cap", "sunscreen", "repellent", "water", "comfy", "change", "powerbank"],
      label: { es: "Parque al aire libre, sol y mucho caminar", en: "Outdoor park, sun and lots of walking", fr: "Parc en plein air, soleil et beaucoup de marche", de: "Freizeitpark im Freien, Sonne, viel Laufen", pt: "Parque ao ar livre, sol e muita caminhada" },
      tip: { es: "Las atracciones acuáticas mojan de verdad: la muda extra es oro.", en: "Water rides really soak you: a spare change of clothes is worth its weight in gold.", fr: "Les attractions aquatiques mouillent vraiment : prévoyez des vêtements de rechange.", de: "Wasserbahnen machen richtig nass: Wechselkleidung ist Gold wert.", pt: "Os brinquedos aquáticos molham de verdade: a muda extra vale ouro." } },
    ciudad:   { lat: 4.53, lon: -75.68, items: ["comfy", "umbrella", "sunscreen", "cash", "powerbank", "water"],
      label: { es: "Ciudad templada (18–27 °C)", en: "City, mild climate (18–27 °C)", fr: "Ville tempérée (18–27 °C)", de: "Stadt mit mildem Klima (18–27 °C)", pt: "Cidade amena (18–27 °C)" },
      tip: { es: "Lleva efectivo para mercados y artesanías; no todos reciben tarjeta.", en: "Bring cash for markets and crafts; not everyone takes cards.", fr: "Prévoyez des espèces pour les marchés et l'artisanat : tout le monde n'accepte pas la carte.", de: "Bargeld für Märkte und Kunsthandwerk mitnehmen; nicht überall wird Karte akzeptiert.", pt: "Leve dinheiro em espécie para feiras e artesanato; nem todos aceitam cartão." } },
    bienestar:{ lat: 4.566, lon: -75.75, items: ["stretchy", "water", "layers", "repellent"],
      label: { es: "Espacio natural, ritmo tranquilo", en: "Natural setting, relaxed pace", fr: "Cadre naturel, rythme tranquille", de: "Natur, ruhiges Tempo", pt: "Ambiente natural, ritmo tranquilo" },
      tip: { es: "Come ligero antes de la sesión y llega unos minutos antes.", en: "Eat light before the session and arrive a few minutes early.", fr: "Mangez léger avant la séance et arrivez un peu en avance.", de: "Vorher leicht essen und etwas früher da sein.", pt: "Coma leve antes da sessão e chegue alguns minutos antes." } },
    hielo:    { lat: 4.566, lon: -75.75, items: ["swim", "towel", "warm", "water"],
      label: { es: "Inmersión en agua helada", en: "Ice-water immersion", fr: "Immersion en eau glacée", de: "Eisbad", pt: "Imersão em água gelada" },
      tip: { es: "Lleva ropa abrigada para después de la inmersión.", en: "Bring warm clothes for after the plunge.", fr: "Prévoyez des vêtements chauds pour après l'immersion.", de: "Warme Kleidung für danach mitbringen.", pt: "Leve roupa quente para depois." } },
    interior: { lat: 4.53, lon: -75.68, items: ["layers", "cash", "powerbank"],
      label: { es: "Experiencia bajo techo", en: "Indoor experience", fr: "Expérience en intérieur", de: "Erlebnis drinnen", pt: "Experiência em local coberto" },
      tip: { es: "Nada especial: solo ganas de disfrutar.", en: "Nothing special — just come ready to enjoy.", fr: "Rien de spécial : venez simplement en profiter.", de: "Nichts Besonderes – einfach genießen.", pt: "Nada especial: só vontade de curtir." } }
  };

  const TOUR_CLIMATE = {
    montana: ["cocorasalento", "fulldayfcs", "filandia", "compartidocs", "cocoraacaime", "palmacera", "cocoraacaime2", "cordillera", "barbasbremen", "otunquimbaya", "rioblanco", "canopy",
      "bicicafe", "bicicordillera", "bicirios", "bicifilandia", "bicipalma", "biciconexion", "bicimonos"],
    paramo: ["paramo", "avescampanario"], noche: ["ranas"], termales: ["termales"],
    aves: ["aves", "avesconocedores", "avesrancho", "avescamino", "avesbremen", "avescircasia", "avescaicedonia", "avescolibri"],
    valle: ["finca", "campesino", "cacao", "cana", "abejas", "frutas", "platano", "siembra", "orquideas", "romelia"],
    bienestar: ["conexion", "yoga", "senderovida", "equino", "rituales", "tallerrespiracion"], hielo: ["respiracion"],
    aire: ["parapente", "paratrike"], caballo: ["cabalgatamaria", "cabalgatadeluxe"],
    parque: ["parquecafe", "panaca", "recuca", "ukumari", "arrieros", "botanico", "laberinto"],
    ciudad: ["armenia", "cuyabro", "cartago", "pereira", "manizales"],
    interior: ["catacafe", "gastronomica", "cajaviajera", "cataquesos", "catacocteles", "rodizio", "alimentacion", "catacerveza", "cookingclass", "cerveceria",
      "artesanoswillys", "artesanosaves", "artesanosbalcones", "artesanosarcilla", "artesanoscesteria"]
  };
  const CAT_CLIMATE = { tradicionales: "montana", naturaleza: "montana", rurales: "valle", bienestar: "bienestar", aventura: "caballo", parques: "parque", metropolitano: "ciudad", incentivos: "interior" };
  // Para paradas sin tourId (p. ej. creadas a mano en el panel): se adivina por el título.
  const KEYWORDS = [
    [/p[aá]ramo|nevado|paramo/i, "paramo"], [/termal|hot spring|therm/i, "termales"], [/rana|frog|nocturn|night/i, "noche"],
    [/\bave|bird|vogel|oiseau/i, "aves"], [/parapente|paratrike|paraglid|vuelo/i, "aire"], [/cabalgata|caballo|horse/i, "caballo"],
    [/cocora|salento|filandia|palma|carbonera|acaime|trek|sendero|hike/i, "montana"],
    [/panaca|parque|park|recuca|ukumar|arrieros|bot[aá]nico|laberinto/i, "parque"],
    [/city|ciudad|armenia|pereira|manizales|cartago/i, "ciudad"], [/yoga|bienestar|wellness|ritual/i, "bienestar"],
    [/finca|caf[eé]|coffee|farm|cacao|trapiche|abeja|fruta|pl[aá]tano|campesin/i, "valle"],
    [/cata|tasting|taller|workshop|cena|dinner/i, "interior"]
  ];

  const T = (o, lang) => (o && (o[lang] || o.es)) || "";
  const tourById = (id) => (typeof TOURS !== "undefined" ? TOURS.find(x => x.id === id) : null);

  function climateFor(stop) {
    if (!stop) return null;
    const tid = stop.tour || stop.tourId;
    if (tid) {
      for (const k in TOUR_CLIMATE) if (TOUR_CLIMATE[k].indexOf(tid) >= 0) return k;
      const tour = tourById(tid); if (tour && CAT_CLIMATE[tour.cat]) return CAT_CLIMATE[tour.cat];
    }
    const title = typeof stop.title === "string" ? stop.title : (stop.title ? Object.values(stop.title).join(" ") : "");
    for (const [re, k] of KEYWORDS) if (re.test(title)) return k;
    return null;
  }

  function planById(id) { return PLANS.find(p => p.id === String(id || "").toLowerCase()) || null; }
  function stopTitle(s, lang) {
    if (s.k) return T(STOP_LABEL[s.k], lang);
    if (s.title) return typeof s.title === "string" ? s.title : T(s.title, lang);
    const tour = tourById(s.tour);
    if (!tour) return s.tour || "";
    if (typeof window.EspoApp !== "undefined" && EspoApp.tourText) return EspoApp.tourText(tour).name;
    return tour.name;
  }
  // Fecha local AAAA-MM-DD (toISOString usa UTC: en Colombia después de las 7 p. m. daría "mañana")
  function localISO(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  /* Reservas de demostración ("demo": true en data/bookings.json): las fechas se corren para que el
     viaje empiece siempre mañana; así el código de prueba nunca aparece como viaje terminado. */
  function demoShift(b) {
    if (!b || !b.demo || !Array.isArray(b.itinerary)) return b;
    const first = b.itinerary.map(i => i && i.date).filter(Boolean).sort()[0];
    if (!first) return b;
    const tm = new Date(); tm.setDate(tm.getDate() + 1);
    const n = Math.round((new Date(localISO(tm) + "T12:00:00") - new Date(first + "T12:00:00")) / 864e5);
    return Object.assign({}, b, { itinerary: b.itinerary.map(i => (i && i.date ? Object.assign({}, i, { date: addDays(i.date, n) }) : i)) });
  }

  /* Convierte un plan en itinerario con fechas reales (formato del conserje). */
  function planToItinerary(plan, startISO) {
    return plan.stops.map(s => {
      const title = {}; ["es", "en", "fr", "de", "pt"].forEach(l => { title[l] = stopTitle(s, l); });
      return { date: addDays(startISO, (s.d || 1) - 1), time: s.t || "", tourId: s.tour || "", title: title,
        maps: s.tour ? "https://www.google.com/maps/search/" + encodeURIComponent(stopTitle(s, "es") + " Quindío") : "" };
    });
  }

  /* ---------- Pronóstico (Open-Meteo, gratis, sin clave) ---------- */
  const fcCache = {};
  function forecast(profile, iso) {
    const c = CLIMATE[profile]; if (!c || !iso) return Promise.resolve(null);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = (new Date(iso + "T00:00:00") - today) / 86400000;
    if (!(days >= 0 && days <= 15)) return Promise.resolve(null); // fuera del rango de pronóstico
    const key = profile + iso;
    if (!fcCache[key]) {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lon +
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=America%2FBogota&start_date=" + iso + "&end_date=" + iso;
      fcCache[key] = fetch(url).then(r => r.ok ? r.json() : null).then(j => {
        if (!j || !j.daily) return null;
        const d = j.daily;
        return { tmax: Math.round(d.temperature_2m_max[0]), tmin: Math.round(d.temperature_2m_min[0]), rain: d.precipitation_probability_max[0], uv: Math.round(d.uv_index_max[0]) };
      }).catch(() => null);
    }
    return fcCache[key];
  }
  function fcText(f) {
    if (!f) return "";
    return (f.rain >= 50 ? "🌧️ " : f.uv >= 8 ? "☀️ " : "⛅ ") + f.tmin + "–" + f.tmax + " °C" +
      (f.rain != null ? " · 💧" + f.rain + "%" : "") + (f.uv != null ? " · UV " + f.uv : "");
  }

  /* Lista de qué llevar para un conjunto de paradas [{tour|tourId|title, date?}].
     Prioridad: la recomendación oficial de cada experiencia (data/jenny.json, vía EspoData);
     si una parada no la tiene, se usa el perfil de clima. El pronóstico solo agrega avisos.
     Devuelve { items:[{i,label}], tips:[], days:[{title, date, climate, fc}] }. */
  function packFor(stops, lang) {
    const D = (typeof window !== "undefined" && window.EspoData && window.EspoData.ready()) ? window.EspoData : null;
    const U = Object.assign({}, PUI.es, PUI[lang] || {});
    const seen = {}, items = [], tips = [], days = [], jobs = [];
    const norm = (x) => String(x).toLowerCase().replace(/[^a-záéíóúñü0-9 ]/gi, "").trim();
    const addItem = (i, label) => { const k = norm(label); if (!k || seen[k]) return; seen[k] = 1; items.push({ i: i, label: label }); };
    const addKey = (id) => { if (ITEMS[id]) addItem(ITEMS[id].i, T(ITEMS[id], lang)); };
    const addTip = (x) => { if (x && tips.indexOf(x) < 0) tips.push(x); };
    (stops || []).forEach(s => {
      const tid = s.tour || s.tourId;
      const k = climateFor(s);
      const info = D && tid ? D.tour(tid, lang) : null;
      if (info && info.rec && info.rec.items.length) info.rec.items.forEach(x => addItem("", x));
      else if (k) { CLIMATE[k].items.forEach(addKey); addTip(T(CLIMATE[k].tip, lang)); }
      if (!k && !(info && info.rec.items.length)) return;
      const row = { title: (info && info.nombre) || stopTitle(s, lang), date: s.date || "", climate: k ? T(CLIMATE[k].label, lang) : "", fc: null };
      days.push(row);
      if (s.date && k) jobs.push(forecast(k, s.date).then(f => {
        row.fc = f;
        if (!f) return;
        if (f.rain >= 40) addTip(U.fc_rain);
        if (f.uv >= 8) addTip(U.fc_uv);
        if (f.tmin <= 12) addTip(U.fc_cold);
      }));
    });
    return Promise.all(jobs).then(() => ({ items: items, tips: tips, days: days }));
  }
  // Pronóstico para una experiencia en una fecha (lo usa Jenny en "Qué llevar")
  function forecastFor(tourId, iso) { const k = climateFor({ tour: tourId }); return k ? forecast(k, iso) : Promise.resolve(null); }

  /* ---------- Textos de interfaz (5 idiomas) ---------- */
  const PUI = {
    es: { m_scan: "📷 Escanear QR", m_plans: "🗺️ Itinerarios armados", m_pack: "🎒 Qué llevar",
      plans_q: "Estos son nuestros itinerarios armados. ¿Cuál te gusta? 👇", days: "{n} día(s)", day: "Día",
      choose: "✅ Elegir este itinerario", others: "Ver otros itinerarios", pack_for: "🎒 Qué llevar a este plan",
      from_qr: "¡Escaneaste el itinerario *{plan}*! 🙌", plan_intro: "*{plan}* · {days}",
      pack_title: "🎒 Qué llevar", pack_pick: "¿Para qué itinerario quieres la lista?", pack_tips: "💡 Consejos",
      pack_none: "Elige un itinerario o experiencia y te digo qué llevar.",
      form_intro: "¡Genial! Déjame unos datos y te armo el resumen para tu asesor 👇",
      f_name: "Tu nombre", f_date: "Fecha de inicio", f_people: "Personas", f_hotel: "Alojamiento o ciudad",
      f_access: "Necesito turismo accesible ♿", f_diet: "Alimentación / alergias (opcional)", f_notes: "Algo más (opcional)",
      f_kit: "Ayúdenme con lo que me falte (poncho, bloqueador, repelente…)", f_send: "Ver mi resumen", f_req: "Escribe tu nombre, por favor 🙂",
      sum_ready: "¡Listo, {name}! Este es tu resumen. Toca *Enviar por WhatsApp* y un asesor te confirma disponibilidad y precio 💚",
      fc_title: "🌦️ Pronóstico", fc_na: "El pronóstico aparece ~15 días antes del viaje.",
      prov: "📄 Ver mi itinerario provisional", share: "📤 Compartir lista con mi grupo", send_wa: "Enviar por WhatsApp",
      wa_lead: "¡Hola Espontáneos Travel! Quiero reservar este itinerario:", wa_plan: "🗺️ Itinerario:", wa_tour: "🌿 Experiencia:",
      wa_name: "👤 Nombre:", wa_date: "📅 Inicio:", wa_people: "👥 Personas:", wa_hotel: "🏨 Alojamiento:", wa_access: "♿ Requiere turismo accesible",
      wa_diet: "🍽️ Alimentación:", wa_notes: "📝 Notas:", wa_kit: "🎒 Quiere ayuda con artículos para llevar", wa_src: "📍 Llegó por QR:", wa_lang: "💬 Idioma de contacto:", wa_link: "🔗 Itinerario provisional:",
      flexible: "flexible",
      scan_title: "Escanea el QR de tu itinerario", scan_hint: "Apunta la cámara al código QR", scan_file: "Subir foto del QR", scan_close: "Cerrar",
      scan_nocam: "No pude abrir la cámara. Puedes subir una foto del QR.", scan_bad: "Ese QR no es de un itinerario de Espontáneos Travel 🤔",
      scan_trip: "¡Encontré tu reserva! Te llevo a tu itinerario…",
      price_from: "💲 Desde *USD {p}* por persona", pay_deposit: "💳 Pagar anticipo (50%)",
      review_title: "🌟 ¿Cómo estuvo tu viaje?", review_text: "Tu opinión ayuda a otros viajeros y a las familias campesinas que te recibieron. ¡Gracias por elegirnos!",
      review_btn: "⭐ Dejar reseña en Google", review_wa: "💬 Contarle a mi anfitrión", review_wa_msg: "¡Hola! Ya terminé mi viaje con Espontáneos Travel ({code}). Quiero contarles cómo me fue:",
      last_trip: "📄 Abrir mi último viaje",
      rem_hi: "¡Hola {name}! 👋 Este es tu plan con Espontáneos Travel para el {day}:", rem_link: "📲 Tu itinerario y conserje:", rem_bye: "¡Te esperamos! Cualquier cosa, escríbenos por aquí 💚",
      fc_rain: "🌧️ Pronóstico con lluvia: lleva ropa impermeable.", fc_uv: "☀️ UV muy alto: bloqueador, gorra y gafas.", fc_cold: "🧥 Madrugada fría: lleva abrigo.",
      pending: "⏳ Itinerario provisional: tu asesor lo confirma por WhatsApp." },
    en: { m_scan: "📷 Scan QR", m_plans: "🗺️ Ready-made itineraries", m_pack: "🎒 What to pack",
      plans_q: "Here are our ready-made itineraries. Which one do you like? 👇", days: "{n} day(s)", day: "Day",
      choose: "✅ Choose this itinerary", others: "See other itineraries", pack_for: "🎒 What to pack for this plan",
      from_qr: "You scanned the *{plan}* itinerary! 🙌", plan_intro: "*{plan}* · {days}",
      pack_title: "🎒 What to pack", pack_pick: "Which itinerary do you want the list for?", pack_tips: "💡 Tips",
      pack_none: "Pick an itinerary or experience and I'll tell you what to pack.",
      form_intro: "Great! Leave me a few details and I'll prepare the summary for your advisor 👇",
      f_name: "Your name", f_date: "Start date", f_people: "People", f_hotel: "Lodging or city",
      f_access: "I need accessible travel ♿", f_diet: "Diet / allergies (optional)", f_notes: "Anything else (optional)",
      f_kit: "Help me with anything I'm missing (poncho, sunscreen, repellent…)", f_send: "See my summary", f_req: "Please enter your name 🙂",
      sum_ready: "All set, {name}! Here's your summary. Tap *Send via WhatsApp* and an advisor will confirm availability and price 💚",
      fc_title: "🌦️ Forecast", fc_na: "The forecast shows up ~15 days before the trip.",
      prov: "📄 See my provisional itinerary", share: "📤 Share the list with my group", send_wa: "Send via WhatsApp",
      wa_lead: "Hi Espontáneos Travel! I'd like to book this itinerary:", wa_plan: "🗺️ Itinerary:", wa_tour: "🌿 Experience:",
      wa_name: "👤 Name:", wa_date: "📅 Start:", wa_people: "👥 People:", wa_hotel: "🏨 Lodging:", wa_access: "♿ Needs accessible travel",
      wa_diet: "🍽️ Diet:", wa_notes: "📝 Notes:", wa_kit: "🎒 Wants help with items they're missing", wa_src: "📍 Came via QR:", wa_lang: "💬 Contact language:", wa_link: "🔗 Provisional itinerary:",
      flexible: "flexible",
      scan_title: "Scan your itinerary QR", scan_hint: "Point the camera at the QR code", scan_file: "Upload a photo of the QR", scan_close: "Close",
      scan_nocam: "I couldn't open the camera. You can upload a photo of the QR.", scan_bad: "That QR isn't an Espontáneos Travel itinerary 🤔",
      scan_trip: "Found your booking! Taking you to your itinerary…",
      price_from: "💲 From *USD {p}* per person", pay_deposit: "💳 Pay deposit (50%)",
      review_title: "🌟 How was your trip?", review_text: "Your review helps other travellers and the farming families who hosted you. Thank you for choosing us!",
      review_btn: "⭐ Leave a Google review", review_wa: "💬 Tell my host", review_wa_msg: "Hi! I just finished my trip with Espontáneos Travel ({code}). Here is how it went:",
      last_trip: "📄 Open my last trip",
      rem_hi: "Hi {name}! 👋 Here is your Espontáneos Travel plan for {day}:", rem_link: "📲 Your itinerary & concierge:", rem_bye: "See you soon! Message us here anytime 💚",
      fc_rain: "🌧️ Rain in the forecast: bring waterproof clothing.", fc_uv: "☀️ Very high UV: sunscreen, cap and sunglasses.", fc_cold: "🧥 Chilly early morning: bring a jacket.",
      pending: "⏳ Provisional itinerary: your advisor will confirm it on WhatsApp." },
    fr: { m_scan: "📷 Scanner un QR", m_plans: "🗺️ Itinéraires clés en main", m_pack: "🎒 Quoi emporter",
      plans_q: "Voici nos itinéraires clés en main. Lequel vous plaît ? 👇", days: "{n} jour(s)", day: "Jour",
      choose: "✅ Choisir cet itinéraire", others: "Voir d'autres itinéraires", pack_for: "🎒 Quoi emporter pour ce programme",
      from_qr: "Vous avez scanné l'itinéraire *{plan}* ! 🙌", plan_intro: "*{plan}* · {days}",
      pack_title: "🎒 Quoi emporter", pack_pick: "Pour quel itinéraire voulez-vous la liste ?", pack_tips: "💡 Conseils",
      pack_none: "Choisissez un itinéraire ou une expérience et je vous dis quoi emporter.",
      form_intro: "Super ! Laissez-moi quelques informations et je prépare le résumé pour votre conseiller 👇",
      f_name: "Votre nom", f_date: "Date de début", f_people: "Personnes", f_hotel: "Hébergement ou ville",
      f_access: "J'ai besoin d'un voyage accessible ♿", f_diet: "Alimentation / allergies (facultatif)", f_notes: "Autre chose (facultatif)",
      f_kit: "Aidez-moi avec ce qui me manque (poncho, crème solaire, anti-moustique…)", f_send: "Voir mon résumé", f_req: "Indiquez votre nom, s'il vous plaît 🙂",
      sum_ready: "C'est prêt, {name} ! Voici votre résumé. Touchez *Envoyer par WhatsApp* et un conseiller confirmera disponibilité et prix 💚",
      fc_title: "🌦️ Prévisions", fc_na: "Les prévisions apparaissent ~15 jours avant le voyage.",
      prov: "📄 Voir mon itinéraire provisoire", share: "📤 Partager la liste avec mon groupe", send_wa: "Envoyer par WhatsApp",
      wa_lead: "Bonjour Espontáneos Travel ! Je souhaite réserver cet itinéraire :", wa_plan: "🗺️ Itinéraire :", wa_tour: "🌿 Expérience :",
      wa_name: "👤 Nom :", wa_date: "📅 Début :", wa_people: "👥 Personnes :", wa_hotel: "🏨 Hébergement :", wa_access: "♿ Voyage accessible requis",
      wa_diet: "🍽️ Alimentation :", wa_notes: "📝 Notes :", wa_kit: "🎒 Souhaite de l'aide pour les affaires à emporter", wa_src: "📍 Arrivé par QR :", wa_lang: "💬 Langue de contact :", wa_link: "🔗 Itinéraire provisoire :",
      flexible: "flexible",
      scan_title: "Scannez le QR de votre itinéraire", scan_hint: "Pointez la caméra vers le QR code", scan_file: "Envoyer une photo du QR", scan_close: "Fermer",
      scan_nocam: "Impossible d'ouvrir la caméra. Vous pouvez envoyer une photo du QR.", scan_bad: "Ce QR n'est pas un itinéraire Espontáneos Travel 🤔",
      scan_trip: "Réservation trouvée ! Je vous redirige vers votre itinéraire…",
      price_from: "💲 À partir de *USD {p}* par personne", pay_deposit: "💳 Payer l'acompte (50 %)",
      review_title: "🌟 Comment s'est passé votre voyage ?", review_text: "Votre avis aide d'autres voyageurs et les familles paysannes qui vous ont accueilli. Merci de nous avoir choisis !",
      review_btn: "⭐ Laisser un avis Google", review_wa: "💬 Le raconter à mon hôte", review_wa_msg: "Bonjour ! Je viens de terminer mon voyage avec Espontáneos Travel ({code}). Voici comment ça s'est passé :",
      last_trip: "📄 Ouvrir mon dernier voyage",
      rem_hi: "Bonjour {name} ! 👋 Voici votre programme Espontáneos Travel pour le {day} :", rem_link: "📲 Votre itinéraire et votre conciergerie :", rem_bye: "À très vite ! Écrivez-nous ici si besoin 💚",
      fc_rain: "🌧️ Pluie prévue : prévoyez des vêtements imperméables.", fc_uv: "☀️ UV très élevé : crème solaire, casquette et lunettes.", fc_cold: "🧥 Petit matin froid : prévoyez une veste chaude.",
      pending: "⏳ Itinéraire provisoire : votre conseiller le confirmera sur WhatsApp." },
    de: { m_scan: "📷 QR scannen", m_plans: "🗺️ Fertige Reisepläne", m_pack: "🎒 Was mitnehmen",
      plans_q: "Das sind unsere fertigen Reisepläne. Welcher gefällt Ihnen? 👇", days: "{n} Tag(e)", day: "Tag",
      choose: "✅ Diesen Plan wählen", others: "Andere Pläne ansehen", pack_for: "🎒 Packliste für diesen Plan",
      from_qr: "Sie haben den Plan *{plan}* gescannt! 🙌", plan_intro: "*{plan}* · {days}",
      pack_title: "🎒 Was mitnehmen", pack_pick: "Für welchen Plan möchten Sie die Liste?", pack_tips: "💡 Tipps",
      pack_none: "Wählen Sie einen Plan oder ein Erlebnis, und ich sage Ihnen, was Sie mitnehmen sollten.",
      form_intro: "Super! Geben Sie mir ein paar Angaben, und ich erstelle die Zusammenfassung für Ihren Berater 👇",
      f_name: "Ihr Name", f_date: "Startdatum", f_people: "Personen", f_hotel: "Unterkunft oder Stadt",
      f_access: "Ich brauche barrierefreies Reisen ♿", f_diet: "Ernährung / Allergien (optional)", f_notes: "Sonstiges (optional)",
      f_kit: "Helfen Sie mir mit allem, was mir noch fehlt (Poncho, Sonnencreme, Insektenschutz…)", f_send: "Zusammenfassung ansehen", f_req: "Bitte geben Sie Ihren Namen ein 🙂",
      sum_ready: "Fertig, {name}! Hier ist Ihre Zusammenfassung. Tippen Sie auf *Per WhatsApp senden* – ein Berater bestätigt Verfügbarkeit und Preis 💚",
      fc_title: "🌦️ Wettervorhersage", fc_na: "Die Vorhersage erscheint ~15 Tage vor der Reise.",
      prov: "📄 Vorläufigen Reiseplan ansehen", share: "📤 Liste mit meiner Gruppe teilen", send_wa: "Per WhatsApp senden",
      wa_lead: "Hallo Espontáneos Travel! Ich möchte diesen Reiseplan buchen:", wa_plan: "🗺️ Reiseplan:", wa_tour: "🌿 Erlebnis:",
      wa_name: "👤 Name:", wa_date: "📅 Start:", wa_people: "👥 Personen:", wa_hotel: "🏨 Unterkunft:", wa_access: "♿ Benötigt barrierefreies Reisen",
      wa_diet: "🍽️ Ernährung:", wa_notes: "📝 Notizen:", wa_kit: "🎒 Möchte Hilfe bei Ausrüstung", wa_src: "📍 Über QR gekommen:", wa_lang: "💬 Kontaktsprache:", wa_link: "🔗 Vorläufiger Reiseplan:",
      flexible: "flexibel",
      scan_title: "Scannen Sie den QR-Code Ihres Reiseplans", scan_hint: "Richten Sie die Kamera auf den QR-Code", scan_file: "Foto des QR-Codes hochladen", scan_close: "Schließen",
      scan_nocam: "Die Kamera konnte nicht geöffnet werden. Sie können ein Foto des QR-Codes hochladen.", scan_bad: "Dieser QR-Code gehört zu keinem Reiseplan von Espontáneos Travel 🤔",
      scan_trip: "Buchung gefunden! Ich bringe Sie zu Ihrem Reiseplan…",
      price_from: "💲 Ab *USD {p}* pro Person", pay_deposit: "💳 Anzahlung leisten (50 %)",
      review_title: "🌟 Wie war Ihre Reise?", review_text: "Ihre Bewertung hilft anderen Reisenden und den Bauernfamilien, die Sie empfangen haben. Danke, dass Sie uns gewählt haben!",
      review_btn: "⭐ Google-Bewertung schreiben", review_wa: "💬 Meinem Gastgeber erzählen", review_wa_msg: "Hallo! Ich habe gerade meine Reise mit Espontáneos Travel ({code}) beendet. Ich möchte Ihnen erzählen, wie es war:",
      last_trip: "📄 Meine letzte Reise öffnen",
      rem_hi: "Hallo {name}! 👋 Hier ist Ihr Espontáneos-Travel-Plan für {day}:", rem_link: "📲 Ihr Reiseplan & Concierge:", rem_bye: "Bis bald! Schreiben Sie uns jederzeit hier 💚",
      fc_rain: "🌧️ Regen vorhergesagt: wasserfeste Kleidung mitnehmen.", fc_uv: "☀️ Sehr hoher UV-Index: Sonnencreme, Kappe und Sonnenbrille.", fc_cold: "🧥 Kalte Morgenstunden: warme Jacke mitnehmen.",
      pending: "⏳ Vorläufiger Reiseplan: Ihr Berater bestätigt ihn per WhatsApp." },
    pt: { m_scan: "📷 Escanear QR", m_plans: "🗺️ Roteiros prontos", m_pack: "🎒 O que levar",
      plans_q: "Estes são nossos roteiros prontos. De qual você gosta? 👇", days: "{n} dia(s)", day: "Dia",
      choose: "✅ Escolher este roteiro", others: "Ver outros roteiros", pack_for: "🎒 O que levar neste roteiro",
      from_qr: "Você escaneou o roteiro *{plan}*! 🙌", plan_intro: "*{plan}* · {days}",
      pack_title: "🎒 O que levar", pack_pick: "Para qual roteiro você quer a lista?", pack_tips: "💡 Dicas",
      pack_none: "Escolha um roteiro ou experiência e eu digo o que levar.",
      form_intro: "Ótimo! Deixe alguns dados e eu preparo o resumo para o seu consultor 👇",
      f_name: "Seu nome", f_date: "Data de início", f_people: "Pessoas", f_hotel: "Hospedagem ou cidade",
      f_access: "Preciso de turismo acessível ♿", f_diet: "Alimentação / alergias (opcional)", f_notes: "Algo mais (opcional)",
      f_kit: "Me ajudem com o que faltar (poncho, protetor, repelente…)", f_send: "Ver meu resumo", f_req: "Escreva seu nome, por favor 🙂",
      sum_ready: "Pronto, {name}! Este é o seu resumo. Toque em *Enviar por WhatsApp* e um consultor confirma disponibilidade e preço 💚",
      fc_title: "🌦️ Previsão", fc_na: "A previsão aparece ~15 dias antes da viagem.",
      prov: "📄 Ver meu roteiro provisório", share: "📤 Compartilhar lista com meu grupo", send_wa: "Enviar por WhatsApp",
      wa_lead: "Olá Espontáneos Travel! Quero reservar este roteiro:", wa_plan: "🗺️ Roteiro:", wa_tour: "🌿 Experiência:",
      wa_name: "👤 Nome:", wa_date: "📅 Início:", wa_people: "👥 Pessoas:", wa_hotel: "🏨 Hospedagem:", wa_access: "♿ Precisa de turismo acessível",
      wa_diet: "🍽️ Alimentação:", wa_notes: "📝 Notas:", wa_kit: "🎒 Quer ajuda com itens para levar", wa_src: "📍 Chegou via QR:", wa_lang: "💬 Idioma de contato:", wa_link: "🔗 Roteiro provisório:",
      flexible: "flexível",
      scan_title: "Escaneie o QR do seu roteiro", scan_hint: "Aponte a câmera para o QR code", scan_file: "Enviar foto do QR", scan_close: "Fechar",
      scan_nocam: "Não consegui abrir a câmera. Você pode enviar uma foto do QR.", scan_bad: "Esse QR não é um roteiro da Espontáneos Travel 🤔",
      scan_trip: "Encontrei sua reserva! Levando você ao seu roteiro…",
      price_from: "💲 A partir de *USD {p}* por pessoa", pay_deposit: "💳 Pagar sinal (50%)",
      review_title: "🌟 Como foi sua viagem?", review_text: "Sua avaliação ajuda outros viajantes e as famílias do campo que receberam você. Obrigado por nos escolher!",
      review_btn: "⭐ Avaliar no Google", review_wa: "💬 Contar ao meu anfitrião", review_wa_msg: "Olá! Acabei minha viagem com a Espontáneos Travel ({code}). Quero contar como foi:",
      last_trip: "📄 Abrir minha última viagem",
      rem_hi: "Olá {name}! 👋 Este é o seu plano com a Espontáneos Travel para {day}:", rem_link: "📲 Seu roteiro e concierge:", rem_bye: "Esperamos você! Qualquer coisa, fale com a gente por aqui 💚",
      fc_rain: "🌧️ Previsão de chuva: leve roupa impermeável.", fc_uv: "☀️ UV muito alto: protetor, boné e óculos.", fc_cold: "🧥 Madrugada fria: leve um casaco.",
      pending: "⏳ Roteiro provisório: seu consultor confirma pelo WhatsApp." }
  };

  /* Interpreta el texto de un QR. Solo se aceptan parámetros conocidos; nunca se
     navega a sitios externos. */
  function parseQR(text) {
    const s = String(text || "").trim();
    let m = s.match(/^(?:PLAN|ESP-PLAN)[:\s]+([a-z0-9_-]+)/i);
    if (m && planById(m[1])) return { type: "plan", id: m[1].toLowerCase() };
    if (/^ESP-[A-Z0-9]{4,}$/i.test(s)) return { type: "code", code: s.toUpperCase() };
    let p; try { p = new URL(s, location.href).searchParams; } catch (e) { return null; }
    const src = (p.get("src") || "").slice(0, 40);
    if (p.get("plan") && planById(p.get("plan"))) return { type: "plan", id: p.get("plan").toLowerCase(), src: src };
    if (p.get("d")) return { type: "trip", query: "d=" + encodeURIComponent(p.get("d")) };
    if (p.get("code")) return { type: "trip", query: "code=" + encodeURIComponent(p.get("code").toUpperCase()) };
    if (p.get("tour") && tourById(p.get("tour"))) return { type: "tour", id: p.get("tour"), src: src };
    return null;
  }

  /* ---------- Clientes → Google Sheets (opcional, sin servidor propio) ---------- */
  function newLeadId() { return "L" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  const emailed = {};
  function emailLead(d) {
    if (!BIZ.leadsEmail || d.stage !== "resumen" || d.src === "formulario" || !d.leadId || emailed[d.leadId]) return;
    emailed[d.leadId] = 1;
    const que = d.plan || d.tour || "—";
    const body = {
      _subject: "🌿 Jenny: nuevo cliente — " + (d.name || "sin nombre") + " · " + que,
      _template: "table",
      "Cliente": d.name || "", "Contacto": d.contact || "(no lo dejó: espera su WhatsApp)", "Plan o experiencia": que,
      "Fecha": d.date || "flexible", "Personas": d.party || "", "Alojamiento": d.hotel || "", "Accesibilidad": d.access ? "Sí" : "No",
      "Alimentación": d.diet || "", "Notas": d.notes || "", "Idioma del cliente": d.lang || "", "Origen": d.src || "web",
      "Beneficio por convenio": d.beneficio || "—", "Itinerario provisional": d.link || "", "ID": d.leadId,
      "Uso de fotos donde aparece": d.imagen ? "Sí, lo autoriza" : "No lo autoriza",
      "Autorización de datos": "Sí, aceptó la política de privacidad (Ley 1581 de 2012)"
    };
    try {
      fetch(BIZ.leadsEmail, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    } catch (e) {}
  }
  function sendLead(data) {
    emailLead(data || {});
    // Backend del portal (Firebase), si está configurado: el módulo js/backend.js expone EspoBackend
    try {
      const fire = () => { if (window.EspoBackend && window.EspoBackend.enabled) window.EspoBackend.saveLead(data).catch(() => {}); };
      if (window.EspoBackend) fire(); else window.addEventListener("espo:backend", fire, { once: true });
    } catch (e) {}
    if (!BIZ.leadsEndpoint) return Promise.resolve(false);
    const body = JSON.stringify(Object.assign({ page: location.pathname.split("/").pop() || "index.html" }, data));
    // text/plain evita la verificación CORS previa; Apps Script lee e.postData.contents
    return fetch(BIZ.leadsEndpoint, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
      .then(() => true).catch(() => false);
  }

  window.EspoPlans = {
    plans: () => PLANS, planById, stopTitle, planToItinerary, climateFor, packFor, forecast, forecastFor, fcText, parseQR, addDays,
    name: (plan, lang) => T(plan.name, lang),
    ui: (lang) => Object.assign({}, PUI.es, PUI[lang] || {}),
    climateLabel: (k, lang) => CLIMATE[k] ? T(CLIMATE[k].label, lang) : "",
    cfg: BIZ, reviewUrl: () => BIZ.reviewUrl || googleReviewUrl() || REVIEW_FALLBACK, sendLead, newLeadId, safePayLink, localISO, demoShift, isOfficialPhone, safeHttps
  };
})();
