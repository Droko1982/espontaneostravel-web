/* =====================================================================
   Autor de la plataforma: Dr. Mauricio Rodríguez Herrera · Director de Desarrollo Tecnológico
   js/maps.js — Mapas interactivos de Espontáneos Travel → window.EspoMaps
   ---------------------------------------------------------------------
   · Script clásico (sin build). Carga Leaflet 1.9.4 desde unpkg SOLO cuando
     un mapa entra en pantalla (IntersectionObserver) y una sola vez.
   · Datos: data/geo.json (generado por tools/build-geo.js con Nominatim +
     OSRM). El sitio no consulta OSRM en tiempo de ejecución.
   · Teselas CARTO Voyager / Dark Matter según el tema del sitio.
   · Google Maps solo vía enlaces de direcciones (sin API key ni costos).
   · 6 idiomas: es, en, fr, de, pt, it (opts.lang).

   API
     EspoMaps.load()                         → Promise<geo>  (también 'espomaps:ready')
     EspoMaps.overview(el, { lang, tours, categories, filter, onFilter, onSelect, chips })
     EspoMaps.tour(el, tourId, { lang, name })
     EspoMaps.itinerary(el, stops, { lang, hotel, onSelect })
     EspoMaps.distanceText(tourId, lang)     → "≈ 45 km · 1 h desde Armenia" | ''
     EspoMaps.place(tourId)                  → entrada de geo.lugares | null
     EspoMaps.directionsUrl(tourId, { fromMyLocation })
     EspoMaps.destroy(el)
   Ver docs/MAPAS.md.
   ===================================================================== */
(function (w, d) {
  'use strict';
  if (w.EspoMaps) return;

  /* ---------- Configuración ---------- */
  const SCRIPT_SRC = (d.currentScript && d.currentScript.src) || '';
  const GEO_URL = w.ESPO_GEO_URL || (SCRIPT_SRC ? new URL('../data/geo.json', SCRIPT_SRC).href : '/data/geo.json');
  const LEAFLET = {
    js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    jsSri: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
    css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    cssSri: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
  };
  // Teselas: OpenStreetMap estándar (uso normal en un sitio web permitido con atribución; el modo
  // oscuro se logra con un filtro CSS en css/maps.css). Las teselas gratis de CARTO son solo para uso
  // no comercial: si se obtiene licencia, se activan sin tocar este archivo con
  // window.ESPO_MAP_TILES = { light, dark, subdomains, attribution } (ver docs/MAPAS.md).
  const TILES = Object.assign({
    light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: '',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }, w.ESPO_MAP_TILES || {});
  const LOCALE = { es: 'es-CO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', it: 'it-IT' };
  const MAX_WAYPOINTS = 9; // límite práctico de los enlaces de Google Maps

  /* ---------- Textos (es, en, fr, de, pt, it) ---------- */
  const I18N = {
    es: {
      region_overview: 'Mapa de experiencias en el Eje Cafetero', region_tour: 'Mapa de ubicación y ruta: {name}', region_itin: 'Mapa de tu itinerario',
      loading: 'Cargando mapa…', from: 'desde', in_city: 'En {city}', see: 'Ver experiencia', directions: 'Cómo llegar',
      open_route: 'Abrir ruta en Google Maps', open_gm: 'Abrir en Google Maps', from_me: 'Desde mi ubicación',
      airport: 'Aeropuerto', city: 'Ciudad base', meeting: 'Punto de encuentro', start: 'Salida', stop: 'Parada', dest: 'Destino',
      on_foot: 'a pie', on_foot_note: 'El vehículo llega hasta {place}; el último tramo es a pie (≈ {km} en línea recta).',
      zone: 'Zona aproximada', zone_note: 'El lugar exacto depende de tu hotel; el círculo marca la zona aproximada.',
      alternatives: 'Alternativas según tu hotel', wide_area: 'área extensa',
      near_hotel: 'Cerca de tu hotel', near_hotel_note: 'El lugar exacto depende de dónde te alojes; te lo confirmamos al reservar.',
      service_area: 'Zona de servicio: {bases}', at_hotel: 'En tu hotel',
      mobile_title: 'Esta experiencia llega a ti', mobile_hotel: 'Se realiza en tu hotel o alojamiento: no necesitas desplazarte.',
      mobile_nearby: 'Se realiza en tu hotel o en la reserva natural más cercana a él.',
      mobile_city: 'Se realiza en tu hotel o en una locación a máximo 20 minutos de la ciudad.',
      service_in: 'Disponible para hoteles en {bases}.', city_tour: 'Recorrido urbano', to_confirm: 'Ubicación por confirmar',
      unavailable: 'Ubicación no disponible para esta experiencia.', map_error: 'No pudimos cargar el mapa.',
      offline: 'El mapa no está disponible ahora (sin conexión). Estos son los lugares y distancias:',
      approx_line: 'aprox. en línea recta', by_road: 'por carretera', traffic: 'Distancias y tiempos estimados por carretera, sin tráfico (OSRM).',
      route_total: 'Recorrido', legs: 'Tramos', your_hotel: 'Tu hotel', hotel_area: 'zona {area}, aprox.',
      full_route: 'Ruta completa en Google Maps', day_route: 'Ruta del {day} en Google Maps', no_location: 'sin ubicación en el mapa',
      filter: 'Filtrar por categoría', all: 'Todas', aside_title: 'Experiencias en tu hotel o cerca de él',
      aside_near: 'Ubicación según tu hotel', aside_mobile: 'Vienen a tu hotel', routes_attr: 'Rutas', places_list: 'Lugares y distancias',
      more_waypoints: 'Google Maps admite hasta {n} paradas por enlace; se muestran las primeras.', from_hotel: 'Desde tu hotel',
      tours_here: '{n} experiencias aquí'
    },
    en: {
      region_overview: 'Map of experiences in the Coffee Region', region_tour: 'Location and route map: {name}', region_itin: 'Map of your itinerary',
      loading: 'Loading map…', from: 'from', in_city: 'In {city}', see: 'See experience', directions: 'Directions',
      open_route: 'Open route in Google Maps', open_gm: 'Open in Google Maps', from_me: 'From my location',
      airport: 'Airport', city: 'Base city', meeting: 'Meeting point', start: 'Start', stop: 'Stop', dest: 'Destination',
      on_foot: 'on foot', on_foot_note: 'Vehicles reach {place}; the last stretch is on foot (≈ {km} in a straight line).',
      zone: 'Approximate area', zone_note: 'The exact place depends on your hotel; the circle shows the approximate area.',
      alternatives: 'Alternatives depending on your hotel', wide_area: 'large area',
      near_hotel: 'Near your hotel', near_hotel_note: 'The exact place depends on where you stay; we confirm it when you book.',
      service_area: 'Service area: {bases}', at_hotel: 'At your hotel',
      mobile_title: 'This experience comes to you', mobile_hotel: 'It takes place at your hotel or lodging: no need to travel.',
      mobile_nearby: 'It takes place at your hotel or at the nature reserve closest to it.',
      mobile_city: 'It takes place at your hotel or at a venue no more than 20 minutes from the city.',
      service_in: 'Available for hotels in {bases}.', city_tour: 'City route', to_confirm: 'Location to be confirmed',
      unavailable: 'Location not available for this experience.', map_error: 'We could not load the map.',
      offline: 'The map is not available right now (offline). Here are the places and distances:',
      approx_line: 'approx. straight line', by_road: 'by road', traffic: 'Estimated road distances and times, without traffic (OSRM).',
      route_total: 'Route', legs: 'Legs', your_hotel: 'Your hotel', hotel_area: '{area} area, approx.',
      full_route: 'Full route in Google Maps', day_route: 'Route for {day} in Google Maps', no_location: 'no location on the map',
      filter: 'Filter by category', all: 'All', aside_title: 'Experiences at or near your hotel',
      aside_near: 'Location depends on your hotel', aside_mobile: 'They come to your hotel', routes_attr: 'Routes', places_list: 'Places and distances',
      more_waypoints: 'Google Maps allows up to {n} stops per link; the first ones are shown.', from_hotel: 'From your hotel',
      tours_here: '{n} experiences here'
    },
    fr: {
      region_overview: 'Carte des expériences de la Région du Café', region_tour: 'Carte de localisation et d’itinéraire : {name}', region_itin: 'Carte de votre programme',
      loading: 'Chargement de la carte…', from: 'depuis', in_city: 'À {city}', see: 'Voir l’expérience', directions: 'Itinéraire',
      open_route: 'Ouvrir l’itinéraire dans Google Maps', open_gm: 'Ouvrir dans Google Maps', from_me: 'Depuis ma position',
      airport: 'Aéroport', city: 'Ville de départ', meeting: 'Point de rendez-vous', start: 'Départ', stop: 'Arrêt', dest: 'Destination',
      on_foot: 'à pied', on_foot_note: 'Les véhicules arrivent jusqu’à {place} ; le dernier tronçon se fait à pied (≈ {km} à vol d’oiseau).',
      zone: 'Zone approximative', zone_note: 'Le lieu exact dépend de votre hôtel ; le cercle indique la zone approximative.',
      alternatives: 'Alternatives selon votre hôtel', wide_area: 'zone étendue',
      near_hotel: 'Près de votre hôtel', near_hotel_note: 'Le lieu exact dépend de votre hébergement ; nous le confirmons à la réservation.',
      service_area: 'Zone desservie : {bases}', at_hotel: 'À votre hôtel',
      mobile_title: 'Cette expérience vient à vous', mobile_hotel: 'Elle a lieu à votre hôtel ou hébergement : aucun déplacement.',
      mobile_nearby: 'Elle a lieu à votre hôtel ou dans la réserve naturelle la plus proche.',
      mobile_city: 'Elle a lieu à votre hôtel ou dans un lieu à 20 minutes maximum de la ville.',
      service_in: 'Disponible pour les hôtels de {bases}.', city_tour: 'Parcours urbain', to_confirm: 'Emplacement à confirmer',
      unavailable: 'Emplacement non disponible pour cette expérience.', map_error: 'Impossible de charger la carte.',
      offline: 'La carte n’est pas disponible pour le moment (hors ligne). Voici les lieux et distances :',
      approx_line: 'approx. à vol d’oiseau', by_road: 'par la route', traffic: 'Distances et temps estimés par la route, hors trafic (OSRM).',
      route_total: 'Parcours', legs: 'Trajets', your_hotel: 'Votre hôtel', hotel_area: 'secteur {area}, approx.',
      full_route: 'Itinéraire complet dans Google Maps', day_route: 'Itinéraire du {day} dans Google Maps', no_location: 'sans emplacement sur la carte',
      filter: 'Filtrer par catégorie', all: 'Toutes', aside_title: 'Expériences à votre hôtel ou à proximité',
      aside_near: 'Lieu selon votre hôtel', aside_mobile: 'Elles viennent à votre hôtel', routes_attr: 'Itinéraires', places_list: 'Lieux et distances',
      more_waypoints: 'Google Maps accepte jusqu’à {n} arrêts par lien ; les premiers sont affichés.', from_hotel: 'Depuis votre hôtel',
      tours_here: '{n} expériences ici'
    },
    de: {
      region_overview: 'Karte der Erlebnisse in der Kaffeeregion', region_tour: 'Lage- und Routenkarte: {name}', region_itin: 'Karte Ihres Reiseplans',
      loading: 'Karte wird geladen…', from: 'ab', in_city: 'In {city}', see: 'Erlebnis ansehen', directions: 'Route',
      open_route: 'Route in Google Maps öffnen', open_gm: 'In Google Maps öffnen', from_me: 'Von meinem Standort',
      airport: 'Flughafen', city: 'Ausgangsstadt', meeting: 'Treffpunkt', start: 'Start', stop: 'Halt', dest: 'Ziel',
      on_foot: 'zu Fuß', on_foot_note: 'Fahrzeuge fahren bis {place}; das letzte Stück geht zu Fuß (≈ {km} Luftlinie).',
      zone: 'Ungefähres Gebiet', zone_note: 'Der genaue Ort hängt von Ihrem Hotel ab; der Kreis zeigt das ungefähre Gebiet.',
      alternatives: 'Alternativen je nach Hotel', wide_area: 'großes Gebiet',
      near_hotel: 'In der Nähe Ihres Hotels', near_hotel_note: 'Der genaue Ort hängt von Ihrer Unterkunft ab; wir bestätigen ihn bei der Buchung.',
      service_area: 'Servicegebiet: {bases}', at_hotel: 'In Ihrem Hotel',
      mobile_title: 'Dieses Erlebnis kommt zu Ihnen', mobile_hotel: 'Es findet in Ihrem Hotel oder Ihrer Unterkunft statt: keine Anfahrt nötig.',
      mobile_nearby: 'Es findet in Ihrem Hotel oder im nächstgelegenen Naturreservat statt.',
      mobile_city: 'Es findet in Ihrem Hotel oder an einem Ort höchstens 20 Minuten von der Stadt statt.',
      service_in: 'Verfügbar für Hotels in {bases}.', city_tour: 'Stadtrundgang', to_confirm: 'Ort wird noch bestätigt',
      unavailable: 'Für dieses Erlebnis ist kein Ort verfügbar.', map_error: 'Die Karte konnte nicht geladen werden.',
      offline: 'Die Karte ist gerade nicht verfügbar (offline). Hier sind die Orte und Entfernungen:',
      approx_line: 'ca. Luftlinie', by_road: 'auf der Straße', traffic: 'Geschätzte Straßenentfernungen und -zeiten ohne Verkehr (OSRM).',
      route_total: 'Strecke', legs: 'Etappen', your_hotel: 'Ihr Hotel', hotel_area: 'Gebiet {area}, ca.',
      full_route: 'Gesamte Route in Google Maps', day_route: 'Route für {day} in Google Maps', no_location: 'ohne Ort auf der Karte',
      filter: 'Nach Kategorie filtern', all: 'Alle', aside_title: 'Erlebnisse im oder nahe Ihrem Hotel',
      aside_near: 'Ort je nach Hotel', aside_mobile: 'Kommen zu Ihrem Hotel', routes_attr: 'Routen', places_list: 'Orte und Entfernungen',
      more_waypoints: 'Google Maps erlaubt bis zu {n} Stopps pro Link; die ersten werden gezeigt.', from_hotel: 'Ab Ihrem Hotel',
      tours_here: '{n} Erlebnisse hier'
    },
    pt: {
      region_overview: 'Mapa de experiências na Região Cafeeira', region_tour: 'Mapa de localização e rota: {name}', region_itin: 'Mapa do seu itinerário',
      loading: 'Carregando mapa…', from: 'de', in_city: 'Em {city}', see: 'Ver experiência', directions: 'Como chegar',
      open_route: 'Abrir rota no Google Maps', open_gm: 'Abrir no Google Maps', from_me: 'Da minha localização',
      airport: 'Aeroporto', city: 'Cidade base', meeting: 'Ponto de encontro', start: 'Saída', stop: 'Parada', dest: 'Destino',
      on_foot: 'a pé', on_foot_note: 'Os veículos chegam até {place}; o último trecho é a pé (≈ {km} em linha reta).',
      zone: 'Área aproximada', zone_note: 'O local exato depende do seu hotel; o círculo marca a área aproximada.',
      alternatives: 'Alternativas conforme o seu hotel', wide_area: 'área extensa',
      near_hotel: 'Perto do seu hotel', near_hotel_note: 'O local exato depende de onde você se hospeda; confirmamos na reserva.',
      service_area: 'Área de atendimento: {bases}', at_hotel: 'No seu hotel',
      mobile_title: 'Esta experiência vai até você', mobile_hotel: 'Acontece no seu hotel ou hospedagem: sem deslocamentos.',
      mobile_nearby: 'Acontece no seu hotel ou na reserva natural mais próxima dele.',
      mobile_city: 'Acontece no seu hotel ou em um local a no máximo 20 minutos da cidade.',
      service_in: 'Disponível para hotéis em {bases}.', city_tour: 'Percurso urbano', to_confirm: 'Local a confirmar',
      unavailable: 'Localização indisponível para esta experiência.', map_error: 'Não foi possível carregar o mapa.',
      offline: 'O mapa não está disponível agora (sem conexão). Estes são os locais e distâncias:',
      approx_line: 'aprox. em linha reta', by_road: 'por estrada', traffic: 'Distâncias e tempos estimados por estrada, sem trânsito (OSRM).',
      route_total: 'Percurso', legs: 'Trechos', your_hotel: 'Seu hotel', hotel_area: 'região de {area}, aprox.',
      full_route: 'Rota completa no Google Maps', day_route: 'Rota de {day} no Google Maps', no_location: 'sem localização no mapa',
      filter: 'Filtrar por categoria', all: 'Todas', aside_title: 'Experiências no seu hotel ou perto dele',
      aside_near: 'Local conforme o seu hotel', aside_mobile: 'Vão até o seu hotel', routes_attr: 'Rotas', places_list: 'Locais e distâncias',
      more_waypoints: 'O Google Maps aceita até {n} paradas por link; as primeiras são exibidas.', from_hotel: 'Do seu hotel',
      tours_here: '{n} experiências aqui'
    },
    it: {
      region_overview: 'Mappa delle esperienze nell\'Eje Cafetero', region_tour: 'Mappa di posizione e percorso: {name}', region_itin: 'Mappa del tuo itinerario',
      loading: 'Caricamento della mappa…', from: 'da', in_city: 'A {city}', see: 'Vedi l\'esperienza', directions: 'Come arrivare',
      open_route: 'Apri il percorso in Google Maps', open_gm: 'Apri in Google Maps', from_me: 'Dalla mia posizione',
      airport: 'Aeroporto', city: 'Città base', meeting: 'Punto d\'incontro', start: 'Partenza', stop: 'Tappa', dest: 'Destinazione',
      on_foot: 'a piedi', on_foot_note: 'Il veicolo arriva fino a {place}; l\'ultimo tratto è a piedi (≈ {km} in linea d\'aria).',
      zone: 'Zona approssimativa', zone_note: 'Il luogo esatto dipende dal tuo hotel; il cerchio indica la zona approssimativa.',
      alternatives: 'Alternative in base al tuo hotel', wide_area: 'area estesa',
      near_hotel: 'Vicino al tuo hotel', near_hotel_note: 'Il luogo esatto dipende da dove alloggi; te lo confermiamo al momento della prenotazione.',
      service_area: 'Zona servita: {bases}', at_hotel: 'Nel tuo hotel',
      mobile_title: 'Questa esperienza viene da te', mobile_hotel: 'Si svolge nel tuo hotel o alloggio: non devi spostarti.',
      mobile_nearby: 'Si svolge nel tuo hotel o nella riserva naturale più vicina.',
      mobile_city: 'Si svolge nel tuo hotel o in un luogo a massimo 20 minuti dalla città.',
      service_in: 'Disponibile per gli hotel di {bases}.', city_tour: 'Percorso urbano', to_confirm: 'Posizione da confermare',
      unavailable: 'Posizione non disponibile per questa esperienza.', map_error: 'Non siamo riusciti a caricare la mappa.',
      offline: 'La mappa non è disponibile al momento (offline). Ecco i luoghi e le distanze:',
      approx_line: 'circa, in linea d\'aria', by_road: 'su strada', traffic: 'Distanze e tempi stimati su strada, senza traffico (OSRM).',
      route_total: 'Percorso', legs: 'Tratte', your_hotel: 'Il tuo hotel', hotel_area: 'zona di {area}, indicativa',
      full_route: 'Percorso completo in Google Maps', day_route: 'Percorso del giorno {day} in Google Maps', no_location: 'senza posizione sulla mappa',
      filter: 'Filtra per categoria', all: 'Tutte', aside_title: 'Esperienze nel tuo hotel o nelle vicinanze',
      aside_near: 'Posizione in base al tuo hotel', aside_mobile: 'Vengono nel tuo hotel', routes_attr: 'Percorsi', places_list: 'Luoghi e distanze',
      more_waypoints: 'Google Maps consente fino a {n} tappe per link; vengono mostrate le prime.', from_hotel: 'Dal tuo hotel',
      tours_here: '{n} esperienze qui'
    }
  };
  // Etiquetas de categoría de respaldo (si la página no pasa `categories`)
  const CAT_LABELS = {
    tradicionales: { es: 'Clásicos', en: 'Classic', fr: 'Classiques', de: 'Klassiker', pt: 'Clássicos', it: 'Classici' },
    naturaleza: { es: 'Naturaleza', en: 'Nature', fr: 'Nature', de: 'Natur', pt: 'Natureza', it: 'Natura' },
    rurales: { es: 'Rurales', en: 'Rural', fr: 'Rurales', de: 'Ländlich', pt: 'Rurais', it: 'Rurali' },
    bienestar: { es: 'Bienestar', en: 'Wellness', fr: 'Bien-être', de: 'Wellness', pt: 'Bem-estar', it: 'Benessere' },
    aventura: { es: 'Aventura', en: 'Adventure', fr: 'Aventure', de: 'Abenteuer', pt: 'Aventura', it: 'Avventura' },
    parques: { es: 'Parques', en: 'Theme Parks', fr: 'Parcs', de: 'Freizeitparks', pt: 'Parques', it: 'Parchi' },
    metropolitano: { es: 'Ciudades', en: 'Cities', fr: 'Villes', de: 'Städte', pt: 'Cidades', it: 'Città' },
    incentivos: { es: 'Alto Valor', en: 'Premium', fr: 'Premium', de: 'Premium', pt: 'Alto Valor', it: 'Premium' }
  };
  const SVG = {
    plane: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>',
    route: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/></svg>',
    walk: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2a5 5 0 0 1-4.3-2.4l-1-1.6a2 2 0 0 0-2.5-.8L6 8.3V13h2V9.6z"/></svg>'
  };

  /* ---------- Utilidades ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  function normLang(l) { l = String(l || d.documentElement.lang || 'es').slice(0, 2).toLowerCase(); return I18N[l] ? l : 'es'; }
  function tr(lang, key, vars) {
    let s = (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function fmtNum(n, lang, dig) {
    try { return new Intl.NumberFormat(LOCALE[lang] || 'es-CO', { maximumFractionDigits: dig, minimumFractionDigits: 0 }).format(n); }
    catch (e) { return String(dig ? Math.round(n * 10) / 10 : Math.round(n)); }
  }
  function fmtKm(km, lang) { return km == null ? '' : fmtNum(km, lang, km < 10 ? 1 : 0) + ' km'; }
  function fmtMin(min) {
    if (min == null) return '';
    let m = Math.max(1, Math.round(min));
    if (m > 20) m = Math.round(m / 5) * 5;
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    return r ? h + ' h ' + r + ' min' : h + ' h';
  }
  function fmtHours(h, lang) { return h == null ? '' : fmtNum(h, lang, 1) + ' h'; }
  function hav(a, b) {
    const R = 6371, t = x => x * Math.PI / 180;
    const dLat = t(b.lat - a.lat), dLon = t(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function decodePoly(s) {
    const pts = []; let i = 0, lat = 0, lon = 0;
    while (i < s.length) {
      let r = 0, sh = 0, b;
      do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
      lat += (r & 1) ? ~(r >> 1) : (r >> 1);
      r = 0; sh = 0;
      do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
      lon += (r & 1) ? ~(r >> 1) : (r >> 1);
      pts.push([lat / 1e5, lon / 1e5]);
    }
    return pts;
  }
  const ll = p => (+p.lat).toFixed(5) + ',' + (+p.lon).toFixed(5);
  function gmDir(o) {
    let u = 'https://www.google.com/maps/dir/?api=1';
    if (o.origin) u += '&origin=' + encodeURIComponent(ll(o.origin));
    u += '&destination=' + encodeURIComponent(ll(o.destination));
    if (o.waypoints && o.waypoints.length) u += '&waypoints=' + encodeURIComponent(o.waypoints.map(ll).join('|'));
    return u + '&travelmode=driving';
  }
  const gmSearch = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ll(p));
  function isDark() {
    const a = d.documentElement.getAttribute('data-theme');
    if (a === 'dark') return true;
    if (a === 'light') return false;
    return !!(w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  const reducedMotion = () => !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const num = v => v != null && v !== '' && isFinite(v);
  function mk(tag, cls, html) { const e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- Datos (geo.json, una sola vez) ---------- */
  let GEO = null, geoPromise = null, MIDX = null;
  function load() {
    if (GEO) return Promise.resolve(GEO);
    if (geoPromise) return geoPromise;
    geoPromise = fetch(GEO_URL, { credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error('geo.json HTTP ' + r.status); return r.json(); })
      .then(j => {
        GEO = j; MIDX = null;
        try { d.dispatchEvent(new CustomEvent('espomaps:ready', { detail: { geo: j } })); } catch (e) { /* IE */ }
        return j;
      });
    geoPromise.catch(() => { geoPromise = null; }); // permite reintentar
    return geoPromise;
  }
  const lugar = id => (GEO && GEO.lugares && id && GEO.lugares[id]) || null;
  function pointOf(id) {
    if (!GEO || !id) return null;
    const h = (GEO.hubs || []).find(x => x.id === id);
    return h || (GEO.puntos && GEO.puntos[id]) || (GEO.pueblos && GEO.pueblos[id]) || null;
  }
  function hubOf(id) { return GEO ? (GEO.hubs || []).find(x => x.id === id) || null : null; }
  function baseName(id) {
    const p = GEO && GEO.pueblos && GEO.pueblos[id];
    if (p) return p.nombre;
    const h = pointOf(id);
    return h ? h.nombre : id;
  }
  function placeName(l) { const p = pointOf(l.punto); return (p && p.nombre) || l.nombre_lugar || ''; }
  function mat(a, b) {
    if (!GEO || !GEO.matriz || !a || !b) return null;
    if (!MIDX) { MIDX = {}; GEO.matriz.ids.forEach((id, i) => { MIDX[id] = i; }); }
    const i = MIDX[a], j = MIDX[b];
    if (i == null || j == null) return null;
    const km = GEO.matriz.km[i][j], min = GEO.matriz.min[i][j];
    return km == null ? null : { km, min };
  }
  const endPoint = l => l.acceso ? { lat: l.acceso.lat, lon: l.acceso.lon, id: l.acceso.id } : { lat: l.lat, lon: l.lon, id: l.punto };
  function listBases(ids, lang) {
    const names = (ids || []).map(baseName);
    if (names.length < 2) return names.join('');
    const and = { es: ' y ', en: ' and ', fr: ' et ', de: ' und ', pt: ' e ', it: ' e ' }[lang] || ', ';
    return names.slice(0, -1).join(', ') + and + names[names.length - 1];
  }
  // Líneas "≈ X km · Y min desde Armenia" (máx. 2: hub + Armenia/Pereira)
  function distLines(l, lang) {
    if (!l || !l.desde) return [];
    const order = [l.hub, 'armenia', 'pereira'].filter((v, i, a) => v && a.indexOf(v) === i);
    const out = [];
    for (const b of order) {
      const x = l.desde[b];
      if (!x) continue;
      out.push(x.km < 3 ? tr(lang, 'in_city', { city: baseName(b) }) : '≈ ' + fmtKm(x.km, lang) + ' · ' + fmtMin(x.min) + ' ' + tr(lang, 'from') + ' ' + baseName(b));
      if (out.length === 2) break;
    }
    return out;
  }
  function distanceText(id, lang) {
    lang = normLang(lang);
    const l = lugar(id);
    if (!l) { if (!GEO) load().catch(() => {}); return ''; }
    if (l.tipo === 'movil') return tr(lang, 'at_hotel');
    if (l.generica) return tr(lang, 'near_hotel');
    const x = l.desde && l.desde[l.hub];
    if (l.en_ciudad || (x && x.km < 3)) return tr(lang, 'in_city', { city: baseName(l.hub) });
    if (!x) return '';
    return '≈ ' + fmtKm(x.km, lang) + ' · ' + fmtMin(x.min) + ' ' + tr(lang, 'from') + ' ' + baseName(l.hub);
  }
  function place(id) { const l = lugar(id); if (!GEO) load().catch(() => {}); return l; }
  function directionsUrl(id, o) {
    const l = lugar(id);
    if (!l || l.tipo === 'movil' || l.generica) return '';
    const end = endPoint(l);
    if (o && o.fromMyLocation) return gmDir({ destination: end });
    const hub = pointOf(l.hub);
    const via = (l.paradas || []).filter(p => !(Math.abs(p.lat - end.lat) < 1e-5 && Math.abs(p.lon - end.lon) < 1e-5));
    if (!hub || (l.en_ciudad && !l.ruta)) return gmDir({ destination: end });
    return gmDir({ origin: hub, destination: end, waypoints: via.slice(0, MAX_WAYPOINTS) });
  }

  /* ---------- Leaflet perezoso (una sola carga) ---------- */
  let leafletPromise = null;
  function loadLeaflet() {
    if (w.L && w.L.map) return Promise.resolve(w.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      let cssOk = !!d.querySelector('link[data-espo-leaflet]'), jsOk = false, done = false;
      const finish = () => { if (!done && cssOk && jsOk) { done = true; clearTimeout(timer); w.L ? resolve(w.L) : reject(new Error('Leaflet')); } };
      const fail = err => { if (!done) { done = true; clearTimeout(timer); reject(err); } };
      const timer = setTimeout(() => fail(new Error('Leaflet timeout')), 15000);
      if (!cssOk) {
        const link = d.createElement('link');
        link.rel = 'stylesheet'; link.href = LEAFLET.css; link.integrity = LEAFLET.cssSri; link.crossOrigin = 'anonymous';
        link.setAttribute('data-espo-leaflet', '');
        link.onload = () => { cssOk = true; finish(); };
        link.onerror = () => { cssOk = true; finish(); }; // sin CSS el mapa aún funciona (peor estilo)
        d.head.appendChild(link);
      }
      const s = d.createElement('script');
      s.src = LEAFLET.js; s.integrity = LEAFLET.jsSri; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = () => { jsOk = true; finish(); };
      s.onerror = () => fail(new Error('Leaflet no cargó'));
      d.head.appendChild(s);
    });
    leafletPromise.catch(() => { leafletPromise = null; });
    return leafletPromise;
  }

  /* ---------- Tema (claro/oscuro) ---------- */
  const LIVE = new Set();
  let themeWatching = false;
  function watchTheme() {
    if (themeWatching) return;
    themeWatching = true;
    const re = () => LIVE.forEach(c => { try { c.applyTheme(); } catch (e) { /* noop */ } });
    if ('MutationObserver' in w) new MutationObserver(re).observe(d.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)');
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', re); else if (mq.addListener) mq.addListener(re); }
  }

  /* ---------- Controlador base (uno por elemento) ---------- */
  const OWN_CLASSES = ['espo-map', 'espo-map--overview', 'espo-map--tour', 'espo-map--itin', 'espo-map--fallback', 'espo-map--nomap', 'espo-map--dark', 'espo-map--ready'];
  function createCtl(el, kind, opts) {
    if (!el || !el.appendChild) throw new Error('EspoMaps: elemento no válido');
    if (el.__espoMap) el.__espoMap.destroy();
    const ctl = { el, kind, opts: opts || {}, lang: normLang(opts && opts.lang), map: null, tiles: null, destroyed: false, _clean: [], _styled: [] };
    const hadRole = el.hasAttribute('role');
    el.classList.add('espo-map', 'espo-map--' + kind);
    el.classList.toggle('espo-map--dark', isDark());
    if (!hadRole) el.setAttribute('role', 'region');
    el.innerHTML = '';
    ctl.top = mk('div', 'espo-map__top');
    ctl.canvas = mk('div', 'espo-map__canvas', '<p class="espo-map__loading">' + esc(tr(ctl.lang, 'loading')) + '</p>');
    ctl.info = mk('div', 'espo-map__info');
    ctl.list = mk('div', 'espo-map__list espo-vh');
    el.append(ctl.top, ctl.canvas, ctl.info, ctl.list);
    ctl.on = (target, ev, fn, o) => { target.addEventListener(ev, fn, o); ctl._clean.push(() => target.removeEventListener(ev, fn, o)); };
    ctl.whenVisible = fn => {
      if (!('IntersectionObserver' in w)) { fn(); return; }
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { io.disconnect(); if (!ctl.destroyed) fn(); }
      }, { rootMargin: '200px 0px' });
      io.observe(el);
      ctl._clean.push(() => io.disconnect());
    };
    ctl.applyTheme = () => {
      const dark = isDark();
      el.classList.toggle('espo-map--dark', dark);
      if (ctl.tiles) ctl.tiles.setUrl(dark ? TILES.dark : TILES.light);
      restyle(ctl);
    };
    ctl.destroy = () => {
      if (ctl.destroyed) return;
      ctl.destroyed = true;
      ctl._clean.forEach(f => { try { f(); } catch (e) { /* noop */ } });
      if (ctl.map) { try { ctl.map.remove(); } catch (e) { /* noop */ } ctl.map = null; }
      LIVE.delete(ctl);
      if (el.__espoMap === ctl) {
        el.__espoMap = null;
        el.innerHTML = '';
        OWN_CLASSES.forEach(c => el.classList.remove(c));
        el.removeAttribute('aria-label');
        if (!hadRole) el.removeAttribute('role');
      }
    };
    // Delegación: botones "Ver experiencia"
    ctl.on(el, 'click', e => {
      const b = e.target.closest && e.target.closest('[data-espo-select]');
      if (!b || !el.contains(b)) return;
      const fn = ctl.opts.onSelect;
      if (typeof fn === 'function') { e.preventDefault(); fn(b.getAttribute('data-espo-select')); }
    });
    el.__espoMap = ctl;
    LIVE.add(ctl);
    watchTheme();
    return ctl;
  }

  function showFallback(ctl, msgKey) {
    if (ctl.destroyed) return;
    ctl.el.classList.add('espo-map--fallback');
    ctl.canvas.hidden = true;
    ctl.canvas.innerHTML = '';
    if (ctl.map) { try { ctl.map.remove(); } catch (e) { /* noop */ } ctl.map = null; ctl.tiles = null; }
    ctl.list.classList.remove('espo-vh');
    const note = ctl.list.querySelector('.espo-map__offline');
    if (note) note.textContent = tr(ctl.lang, msgKey || 'offline');
    else if (ctl.kind === 'itin' && !ctl.info.querySelector('.espo-map__offline')) ctl.info.insertAdjacentHTML('afterbegin', '<p class="espo-map__offline">' + esc(tr(ctl.lang, msgKey || 'offline')) + '</p>');
  }
  function renderMessage(ctl, html, cls) {
    ctl.canvas.hidden = true;
    ctl.canvas.innerHTML = '';
    ctl.el.classList.add('espo-map--nomap');
    ctl.info.innerHTML = '<div class="emap-msg ' + (cls || '') + '">' + html + '</div>';
  }

  function withLeaflet(ctl, draw) {
    if (w.navigator && w.navigator.onLine === false) { showFallback(ctl); return Promise.resolve(); }
    return loadLeaflet().then(L => {
      if (ctl.destroyed) return;
      initMap(ctl, L);
      draw(L);
      ctl.el.classList.add('espo-map--ready');
    }).catch(() => showFallback(ctl));
  }

  function initMap(ctl, L) {
    ctl.canvas.innerHTML = '';
    const anim = !reducedMotion();
    const map = L.map(ctl.canvas, {
      zoomControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, keyboard: true,
      minZoom: 7, maxZoom: 18, zoomSnap: 0.25, attributionControl: true,
      zoomAnimation: anim, fadeAnimation: anim, markerZoomAnimation: anim
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    // La rueda solo hace zoom cuando el usuario interactúa con el mapa (no secuestra el scroll)
    map.on('focus click', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
    ctl.map = map;
    addTiles(ctl, L);
    // Teclado: Enter sobre un marcador → foco al primer botón del popup; Esc devuelve el foco
    ctl.on(ctl.canvas, 'keydown', e => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('leaflet-marker-icon')) ctl._kb = e.target; });
    map.on('popupopen', e => {
      const root = e.popup.getElement();
      if (!root) return;
      // Enlace directo de "Ver experiencia" (por si Leaflet detiene la propagación del clic en el popup)
      root.querySelectorAll('[data-espo-select]').forEach(b => {
        b.onclick = ev => {
          const fn = ctl.opts.onSelect;
          if (typeof fn !== 'function') return;
          ev.preventDefault(); ev.stopPropagation();
          fn(b.getAttribute('data-espo-select'));
        };
      });
      if (!ctl._kb) return;
      const f = root.querySelector('.espo-pop button, .espo-pop a');
      if (f) setTimeout(() => f.focus(), 0);
    });
    map.on('popupclose', () => { if (ctl._kb && d.body.contains(ctl._kb)) { const k = ctl._kb; ctl._kb = null; setTimeout(() => k.focus(), 0); } });
    if ('ResizeObserver' in w) {
      let raf = 0;
      const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (ctl.map) ctl.map.invalidateSize(); }); });
      ro.observe(ctl.canvas);
      ctl._clean.push(() => ro.disconnect());
    }
    return map;
  }

  function attribution(lang) {
    if (TILES.attribution) return TILES.attribution + ' · ' + esc(tr(lang, 'routes_attr')) + ': <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a>';
    return '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> · ' +
      esc(tr(lang, 'routes_attr')) + ': <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a>';
  }
  function addTiles(ctl, L) {
    const layer = L.tileLayer(isDark() ? TILES.dark : TILES.light, { subdomains: TILES.subdomains || 'abc', maxZoom: 19, attribution: attribution(ctl.lang) });
    let ok = 0, bad = 0;
    layer.on('tileload', () => { ok++; });
    layer.on('tileerror', () => { bad++; if (!ok && bad >= 4) showFallback(ctl); });
    layer.addTo(ctl.map);
    ctl.tiles = layer;
  }

  /* ---------- Estilos que dependen del tema ---------- */
  function cssVar(ctl, name, fb) {
    try { const v = getComputedStyle(ctl.el).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; }
  }
  function styleFor(ctl, role) {
    const route = cssVar(ctl, '--espo-route', '#FF8F2F'), casing = cssVar(ctl, '--espo-route-casing', '#ffffff');
    const zone = cssVar(ctl, '--espo-zone', '#4A5C3A'), alt = cssVar(ctl, '--espo-route-alt', '#4A5C3A');
    switch (role) {
      case 'casing': return { color: casing, weight: 8, opacity: 0.95 };
      case 'route': return { color: route, weight: 4.5, opacity: 1 };
      case 'dashed': return { color: alt, weight: 3, opacity: 0.95, dashArray: '6 8' };
      case 'walk': return { color: alt, weight: 3, opacity: 0.95, dashArray: '1 7' };
      case 'zone': return { color: zone, weight: 1.5, opacity: 0.8, dashArray: '4 6', fillColor: zone, fillOpacity: 0.08 };
      default: return {};
    }
  }
  function styled(ctl, layer, role) { layer.setStyle(styleFor(ctl, role)); ctl._styled.push([layer, role]); return layer; }
  function restyle(ctl) { ctl._styled.forEach(([layer, role]) => { try { layer.setStyle(styleFor(ctl, role)); } catch (e) { /* noop */ } }); }
  function drawRoute(ctl, L, pts) {
    const base = { interactive: false, lineCap: 'round', lineJoin: 'round', smoothFactor: 1 };
    styled(ctl, L.polyline(pts, base), 'casing').addTo(ctl.map);
    return styled(ctl, L.polyline(pts, base), 'route').addTo(ctl.map);
  }

  /* ---------- Iconos y marcadores ---------- */
  function divIcon(L, cls, inner, size) {
    size = size || 28;
    return L.divIcon({ className: 'espo-ico', html: '<span class="espo-pin ' + cls + '">' + (inner || '') + '</span>', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2 - 2] });
  }
  function hubIcon(L, h) {
    if (!h) return divIcon(L, 'espo-pin--city', '', 18);
    if (h.tipo === 'aeropuerto') return divIcon(L, 'espo-pin--air', SVG.plane, 28);
    if (h.tipo === 'encuentro') return divIcon(L, 'espo-pin--meet', SVG.flag, 24);
    return divIcon(L, 'espo-pin--city', '', 18);
  }
  function hubKind(h, lang) { return tr(lang, h && h.tipo === 'aeropuerto' ? 'airport' : h && h.tipo === 'encuentro' ? 'meeting' : 'city'); }
  function marker(ctl, L, p, icon, label, popup) {
    const m = L.marker([p.lat, p.lon], { icon, title: label, keyboard: true, riseOnHover: true, alt: label });
    if (popup) m.bindPopup(popup, { maxWidth: 300, minWidth: 210, autoPanPadding: [24, 24], className: 'espo-popup' });
    m.on('add', () => { const e = m.getElement(); if (e) { e.setAttribute('role', 'button'); e.setAttribute('aria-label', label); } });
    return m;
  }
  function boundsOf(L, pts) { const b = L.latLngBounds([]); pts.forEach(p => b.extend(Array.isArray(p) ? p : [p.lat, p.lon])); return b; }
  function fit(ctl, b, maxZoom) {
    if (!ctl.map || !b.isValid()) return;
    ctl.map.fitBounds(b, { padding: [28, 28], maxZoom: maxZoom || 14, animate: false });
  }

  /* =====================================================================
     1) OVERVIEW — mapa de toda la región
     ===================================================================== */
  function catLabel(ctl, id) {
    const lang = ctl.lang, list = ctl.opts.categories;
    if (id === 'all') {
      const c = list && list.find(x => x.id === 'all');
      return (c && (c.label || c[lang] || c.es)) || tr(lang, 'all');
    }
    const c = list && list.find(x => x.id === id);
    return (c && (c.label || c[lang] || c.es)) || (CAT_LABELS[id] && (CAT_LABELS[id][lang] || CAT_LABELS[id].es)) || id;
  }
  function tourName(t, l, lang) {
    const n = t && t.name;
    if (n && typeof n === 'object') return n[lang] || n.es || n.en || (l && l.tour) || t.id;
    return n || (l && l.tour) || (t && t.id) || '';
  }
  function overviewItems(ctl) {
    const lang = ctl.lang, src = Array.isArray(ctl.opts.tours) ? ctl.opts.tours : Object.keys(GEO.lugares).map(id => ({ id }));
    return src.map(t => {
      const l = lugar(t && t.id);
      if (!l) return null;
      return { id: t.id, cat: t.cat || l.cat || 'none', name: tourName(t, l, lang), dur: t.dur || fmtHours(l.duracion_h, lang), l };
    }).filter(Boolean);
  }
  function overview(el, opts) {
    opts = opts || {};
    const prev = el && el.__espoMap;
    if (prev && prev.kind === 'overview' && !prev.destroyed) { prev.update(opts); return prev; }
    const ctl = createCtl(el, 'overview', opts);
    ctl.filter = opts.filter || null;
    el.setAttribute('aria-label', tr(ctl.lang, 'region_overview'));
    ctl.update = o => {
      const langChanged = !!(o && o.lang && normLang(o.lang) !== ctl.lang);
      ctl.opts = Object.assign({}, ctl.opts, o || {});
      ctl.lang = normLang(ctl.opts.lang);
      if (o && 'filter' in o) ctl.filter = o.filter || null;
      el.setAttribute('aria-label', tr(ctl.lang, 'region_overview'));
      if (langChanged && ctl.tiles && ctl.map) {
        ctl.map.attributionControl.removeAttribution(ctl.tiles.options.attribution);
        ctl.tiles.options.attribution = attribution(ctl.lang);
        ctl.map.attributionControl.addAttribution(ctl.tiles.options.attribution);
      }
      if (GEO && ctl._started) renderOverview(ctl, true);
    };
    ctl.setFilter = cat => { ctl.filter = cat || 'all'; if (GEO && ctl._started) renderOverview(ctl, false); };
    ctl.focusTour = id => {
      if (!ctl.map || !ctl._markers) return;
      const m = ctl._markers[id];
      if (m) { ctl.map.setView(m.getLatLng(), Math.max(ctl.map.getZoom(), 11)); m.openPopup(); }
    };
    ctl.whenVisible(() => {
      ctl._started = true;
      load().then(() => {
        if (ctl.destroyed) return;
        renderOverview(ctl, true, true);
        return withLeaflet(ctl, () => renderOverview(ctl, true));
      }).catch(() => { renderMessage(ctl, esc(tr(ctl.lang, 'map_error'))); });
    });
    return ctl;
  }

  function renderOverview(ctl, refit, textOnly) {
    const lang = ctl.lang, items = overviewItems(ctl);
    // Categorías presentes (orden de opts.categories si existe)
    const present = [];
    items.forEach(i => { if (present.indexOf(i.cat) < 0) present.push(i.cat); });
    if (ctl.opts.categories) {
      const order = ctl.opts.categories.map(c => c.id);
      present.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    }
    let filter = ctl.filter || (present.length === 1 ? present[0] : 'all');
    if (filter !== 'all' && present.indexOf(filter) < 0) filter = 'all';
    const shown = items.filter(i => filter === 'all' || i.cat === filter);
    const canSelect = typeof ctl.opts.onSelect === 'function';

    // Chips (también funcionan como leyenda de colores)
    if (ctl.opts.chips !== false) {
      const chip = (id, n) => '<button type="button" class="emap-chip' + (id === filter ? ' is-active' : '') + '" aria-pressed="' + (id === filter) + '" data-cat="' + esc(id) + '">' +
        (id === 'all' ? '' : '<span class="espo-dot espo-cat--' + esc(id) + '" aria-hidden="true"></span>') + esc(catLabel(ctl, id)) + ' <span class="emap-chip__n">' + n + '</span></button>';
      ctl.top.innerHTML = '<div class="emap-chips" role="toolbar" aria-label="' + esc(tr(lang, 'filter')) + '">' +
        (present.length > 1 ? chip('all', items.length) : '') + present.map(c => chip(c, items.filter(i => i.cat === c).length)).join('') + '</div>' + legendHtml(lang);
      ctl.top.querySelectorAll('.emap-chip').forEach(b => b.addEventListener('click', () => {
        const c = b.getAttribute('data-cat');
        ctl.filter = c;
        if (typeof ctl.opts.onFilter === 'function') ctl.opts.onFilter(c);
        renderOverview(ctl, true);
      }));
    } else {
      ctl.top.innerHTML = legendHtml(lang);
    }

    // Grupos por lugar (mismo punto → un solo marcador con varias experiencias)
    const groups = new Map(), near = [], mobile = [];
    shown.forEach(i => {
      if (i.l.tipo === 'movil') { mobile.push(i); return; }
      if (i.l.generica) { near.push(i); return; }
      const key = i.l.punto;
      if (!groups.has(key)) groups.set(key, { key, l: i.l, items: [] });
      groups.get(key).items.push(i);
    });

    // Experiencias sin punto fijo (cerca del hotel / en el hotel)
    const li = i => '<li>' + (canSelect ? '<button type="button" class="espo-link" data-espo-select="' + esc(i.id) + '">' : '<span>') +
      '<span class="espo-dot espo-cat--' + esc(i.cat) + '" aria-hidden="true"></span>' + esc(i.name) + (canSelect ? '</button>' : '</span>') + '</li>';
    ctl.info.innerHTML = (near.length || mobile.length) ? '<div class="espo-aside"><p class="espo-aside__title">' + esc(tr(lang, 'aside_title')) + '</p>' +
      (near.length ? '<div class="espo-aside__grp"><p class="espo-aside__lbl">' + esc(tr(lang, 'aside_near')) + '</p><ul>' + near.map(li).join('') + '</ul></div>' : '') +
      (mobile.length ? '<div class="espo-aside__grp"><p class="espo-aside__lbl">' + esc(tr(lang, 'aside_mobile')) + '</p><ul>' + mobile.map(li).join('') + '</ul></div>' : '') +
      '</div>' : '';

    // Lista de texto (lectores de pantalla / respaldo sin conexión)
    const glist = Array.from(groups.values());
    ctl.list.innerHTML = '<p class="espo-map__offline">' + esc(tr(lang, 'places_list')) + '</p><ul>' + glist.map(g =>
      '<li><strong>' + esc(placeName(g.l)) + '</strong> — ' + g.items.map(i => esc(i.name)).join(' · ') +
      (distLines(g.l, lang).length ? '<br><span>' + esc(distLines(g.l, lang).join(' · ')) + '</span>' : '') +
      ' <a href="' + esc(gmDir({ destination: endPoint(g.l) })) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'directions')) + '</a></li>').join('') +
      (near.length ? '<li><strong>' + esc(tr(lang, 'near_hotel')) + '</strong> — ' + near.map(i => esc(i.name)).join(' · ') + '</li>' : '') +
      (mobile.length ? '<li><strong>' + esc(tr(lang, 'at_hotel')) + '</strong> — ' + mobile.map(i => esc(i.name)).join(' · ') + '</li>' : '') + '</ul>';
    if (ctl.el.classList.contains('espo-map--fallback')) {
      const n = ctl.list.querySelector('.espo-map__offline'); if (n) n.textContent = tr(lang, 'offline');
    }
    if (textOnly || !ctl.map) return;

    // Capa de marcadores
    const L = w.L;
    if (ctl._layer) ctl._layer.remove();
    const layer = L.layerGroup().addTo(ctl.map);
    ctl._layer = layer; ctl._markers = {};
    const pts = [];
    (GEO.hubs || []).forEach(h => {
      if (h.tipo === 'encuentro' || groups.has(h.id)) return;
      const label = h.nombre + ' · ' + hubKind(h, lang);
      marker(ctl, L, h, hubIcon(L, h), label, '<div class="espo-pop"><p class="espo-pop__place">' + esc(h.nombre) + '</p><p class="espo-pop__tag">' + esc(hubKind(h, lang)) + '</p></div>').addTo(layer);
      pts.push(h);
    });
    glist.forEach(g => {
      const l = g.l, cat = g.items[0].cat, n = g.items.length;
      const allZona = g.items.every(i => i.l.tipo === 'zona'), anyValidar = g.items.some(i => i.l.validar);
      const cls = 'espo-cat--' + cat + (allZona ? ' espo-pin--zona' : '') + (anyValidar ? ' espo-pin--validar' : '');
      const label = placeName(l) + ' — ' + (n > 1 ? tr(lang, 'tours_here', { n }) : g.items[0].name);
      const m = marker(ctl, L, l, divIcon(L, 'espo-pin--tour ' + cls, n > 1 ? '<b>' + n + '</b>' : '', n > 1 ? 30 : 26), label, groupPopup(g, lang, canSelect)).addTo(layer);
      g.items.forEach(i => { ctl._markers[i.id] = m; });
      pts.push(l);
    });
    if (refit) fit(ctl, boundsOf(L, pts.length ? pts : GEO.hubs), 12);
  }
  function legendHtml(lang) {
    return '<p class="espo-legend" aria-hidden="true">' +
      '<span><span class="espo-pin espo-pin--air espo-pin--mini">' + SVG.plane + '</span>' + esc(tr(lang, 'airport')) + '</span>' +
      '<span><span class="espo-pin espo-pin--city espo-pin--mini"></span>' + esc(tr(lang, 'city')) + '</span>' +
      '<span><span class="espo-pin espo-pin--tour espo-pin--zona espo-pin--mini"></span>' + esc(tr(lang, 'zone')) + '</span></p>';
  }
  function groupPopup(g, lang, canSelect) {
    const l = g.l, lines = distLines(l, lang);
    const allZona = g.items.every(i => i.l.tipo === 'zona'), anyValidar = g.items.some(i => i.l.validar);
    return '<div class="espo-pop"><p class="espo-pop__place">' + esc(placeName(l)) + '</p>' +
      (allZona ? '<p class="espo-pop__tag">' + esc(tr(lang, 'zone')) + '</p>' : '') +
      (anyValidar ? '<p class="espo-pop__tag espo-pop__tag--warn">' + esc(tr(lang, 'to_confirm')) + '</p>' : '') +
      (lines.length ? '<p class="espo-pop__dist">' + lines.map(esc).join('<br>') + '</p>' : '') +
      '<ul class="espo-pop__tours">' + g.items.map(i => '<li><span class="espo-dot espo-cat--' + esc(i.cat) + '" aria-hidden="true"></span><span class="espo-pop__tname">' + esc(i.name) +
        (i.dur ? ' <span class="espo-pop__dur">· ' + esc(i.dur) + '</span>' : '') +
        (!allZona && i.l.tipo === 'zona' ? ' <span class="espo-pop__dur">· ' + esc(tr(lang, 'zone')) + '</span>' : '') + '</span>' +
        (canSelect ? '<button type="button" class="espo-btn espo-btn--sm" data-espo-select="' + esc(i.id) + '">' + esc(tr(lang, 'see')) + '</button>' : '') + '</li>').join('') + '</ul>' +
      '<a class="espo-btn espo-btn--ghost espo-btn--sm" href="' + esc(gmDir({ destination: endPoint(l) })) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'directions')) + '</a></div>';
  }

  /* =====================================================================
     2) TOUR — ruta desde el hub hasta el lugar
     ===================================================================== */
  function tour(el, tourId, opts) {
    opts = opts || {};
    const ctl = createCtl(el, 'tour', opts);
    const lang = ctl.lang;
    ctl.tourId = tourId;
    el.setAttribute('aria-label', tr(lang, 'region_tour', { name: opts.name || tourId }));
    ctl.whenVisible(() => {
      load().then(() => {
        if (ctl.destroyed) return;
        const l = lugar(tourId);
        const name = opts.name || (l && l.tour) || tourId;
        el.setAttribute('aria-label', tr(lang, 'region_tour', { name }));
        if (!l) { renderMessage(ctl, esc(tr(lang, 'unavailable'))); return; }
        if (l.tipo === 'movil') { renderMobile(ctl, l); return; }
        renderTourInfo(ctl, l);
        return withLeaflet(ctl, L => drawTour(ctl, L, l));
      }).catch(() => renderMessage(ctl, esc(tr(lang, 'map_error'))));
    });
    return ctl;
  }

  function renderMobile(ctl, l) {
    const lang = ctl.lang;
    const key = l.modalidad === 'hotel_o_reserva' ? 'mobile_nearby' : l.modalidad === 'hotel_o_locacion' ? 'mobile_city' : 'mobile_hotel';
    renderMessage(ctl, '<span class="emap-msg__ico">' + SVG.home + '</span><div><p class="emap-msg__title">' + esc(tr(lang, 'mobile_title')) + '</p>' +
      '<p>' + esc(tr(lang, key)) + '</p>' +
      (l.servicio && l.servicio.length ? '<p class="espo-map__fine">' + esc(tr(lang, 'service_in', { bases: listBases(l.servicio, lang) })) + '</p>' : '') + '</div>', 'emap-msg--mobile');
  }

  function renderTourInfo(ctl, l) {
    const lang = ctl.lang, badges = [], notes = [];
    let actions = '', legs = '';
    if (l.generica) {
      badges.push('<span class="emap-badge">' + esc(tr(lang, 'near_hotel')) + '</span>');
      badges.push('<span class="emap-badge emap-badge--soft">' + esc(tr(lang, 'service_area', { bases: listBases(l.servicio, lang) })) + '</span>');
      notes.push(tr(lang, 'near_hotel_note'));
    } else {
      const hubName = baseName(l.hub);
      if (l.ruta && !l.en_ciudad) {
        badges.push('<span class="emap-badge">' + SVG.route + '≈ ' + esc(fmtKm(l.ruta.km, lang)) + ' · ' + esc(fmtMin(l.ruta.min)) + ' ' + esc(tr(lang, 'from')) + ' ' + esc(hubName) + '</span>');
      } else if (l.en_ciudad) {
        badges.push('<span class="emap-badge">' + esc(tr(lang, 'in_city', { city: hubName })) + ' · ' + esc(tr(lang, 'city_tour')) + (l.ruta ? ' ≈ ' + esc(fmtKm(l.ruta.km, lang)) : '') + '</span>');
        distLines(l, lang).filter(s => s.indexOf('≈') === 0).forEach(s => badges.push('<span class="emap-badge emap-badge--soft">' + esc(s) + '</span>'));
      }
      if (l.tipo === 'zona') badges.push('<span class="emap-badge emap-badge--soft">' + esc(tr(lang, 'zone')) + '</span>');
      if (l.validar) badges.push('<span class="emap-badge emap-badge--warn">' + esc(tr(lang, 'to_confirm')) + '</span>');
      // Solo textos para el viajero: `publico` (6 idiomas) + notas generadas. `nota` es interna (operaciones).
      if (l.publico) notes.push(l.publico[lang] || l.publico.es);
      if (l.acceso) notes.push(tr(lang, 'on_foot_note', { place: l.acceso.nombre, km: fmtKm(l.acceso.a_pie_km, lang) }));
      if (l.tipo === 'zona') notes.push(tr(lang, 'zone_note'));
      // Tramos (rutas con paradas)
      if (l.ruta && l.ruta.tramos && l.ruta.tramos.length > 1) {
        const names = [baseName(l.ruta.desde)].concat(l.ruta.via.map(id => (pointOf(id) || {}).nombre || id));
        legs = '<ol class="espo-legs" aria-label="' + esc(tr(lang, 'legs')) + '">' + l.ruta.tramos.map((t, i) =>
          '<li><span>' + esc(names[i]) + ' → ' + esc(names[i + 1]) + '</span><b>' + esc(fmtKm(t.km, lang)) + ' · ' + esc(fmtMin(t.min)) + '</b></li>').join('') + '</ol>';
      }
      const end = endPoint(l);
      actions = '<div class="espo-actions">' +
        (l.ruta && !(l.en_ciudad && !l.paradas)
          ? '<a class="espo-btn" href="' + esc(directionsUrl(ctl.tourId)) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'open_route')) + '</a>'
          : '<a class="espo-btn" href="' + esc(gmSearch(end)) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'open_gm')) + '</a>') +
        '<a class="espo-btn espo-btn--ghost" href="' + esc(gmDir({ destination: end })) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'from_me')) + '</a></div>';
    }
    ctl.info.innerHTML = '<div class="emap-badges">' + badges.join('') + '</div>' +
      notes.map(n => '<p class="espo-map__note">' + esc(n) + '</p>').join('') + legs + actions +
      (l.ruta || (!l.generica && l.desde) ? '<p class="espo-map__fine">' + esc(tr(lang, 'traffic')) + '</p>' : '');
    // Lista de texto (respaldo)
    const rows = [];
    rows.push('<li><strong>' + esc(tr(lang, 'dest')) + ':</strong> ' + esc(l.generica ? l.nombre_lugar || tr(lang, 'near_hotel') : placeName(l)) + '</li>');
    if (!l.generica) distLines(l, lang).forEach(s => rows.push('<li>' + esc(s) + '</li>'));
    (l.paradas || []).forEach((p, i) => rows.push('<li>' + esc(tr(lang, 'stop')) + ' ' + (i + 1) + ': ' + esc(p.nombre) + '</li>'));
    (l.alternativas || []).forEach(a => rows.push('<li>' + esc(tr(lang, 'alternatives')) + ': ' + esc(a.nombre) + (a.desde && a.desde[l.hub] ? ' — ≈ ' + esc(fmtKm(a.desde[l.hub].km, lang)) + ' ' + esc(tr(lang, 'from')) + ' ' + esc(baseName(l.hub)) : a.extensa ? ' (' + esc(tr(lang, 'wide_area')) + ')' : '') + '</li>'));
    ctl.list.innerHTML = '<p class="espo-map__offline">' + esc(tr(lang, 'places_list')) + '</p><ul>' + rows.join('') + '</ul>';
  }

  function drawTour(ctl, L, l) {
    const lang = ctl.lang, map = ctl.map, pts = [];
    if (l.generica) {
      (l.servicio || []).forEach(s => {
        const p = pointOf(s);
        if (!p) return;
        const c = styled(ctl, L.circle([p.lat, p.lon], { radius: (l.radio_km || 20) * 1000, interactive: false }), 'zone').addTo(map);
        const h = hubOf(s);
        marker(ctl, L, p, hubIcon(L, h), baseName(s) + ' · ' + tr(lang, 'service_area', { bases: baseName(s) }),
          '<div class="espo-pop"><p class="espo-pop__place">' + esc(baseName(s)) + '</p><p class="espo-pop__note">' + esc(tr(lang, 'near_hotel_note')) + '</p></div>').addTo(map);
        const b = c.getBounds(); pts.push(b.getNorthWest(), b.getSouthEast());
      });
      fit(ctl, boundsOf(L, pts.map(x => [x.lat, x.lng])), 11);
      return;
    }
    const cat = l.cat || 'none', end = endPoint(l);
    if (l.ruta && l.ruta.polyline) {
      const line = decodePoly(l.ruta.polyline);
      drawRoute(ctl, L, line);
      line.forEach(p => pts.push(p));
    }
    // Salida (hub)
    const hub = hubOf(l.hub);
    if (hub && l.ruta && !(Math.abs(hub.lat - l.lat) < 1e-5 && Math.abs(hub.lon - l.lon) < 1e-5)) {
      marker(ctl, L, hub, hubIcon(L, hub), tr(lang, 'start') + ': ' + hub.nombre,
        '<div class="espo-pop"><p class="espo-pop__tag">' + esc(tr(lang, 'start')) + '</p><p class="espo-pop__place">' + esc(hub.nombre) + '</p></div>').addTo(map);
      pts.push([hub.lat, hub.lon]);
    }
    // Paradas intermedias (numeradas)
    let n = 0;
    (l.paradas || []).forEach(p => {
      const same = q => Math.abs(p.lat - q.lat) < 1e-5 && Math.abs(p.lon - q.lon) < 1e-5;
      if (same(end) || same(l) || (hub && same(hub))) return;
      n++;
      const hb = hubOf(p.id);
      marker(ctl, L, p, hb && hb.tipo === 'encuentro' ? hubIcon(L, hb) : divIcon(L, 'espo-pin--num', '<b>' + n + '</b>', 22), tr(lang, 'stop') + ' ' + n + ': ' + p.nombre,
        '<div class="espo-pop"><p class="espo-pop__tag">' + esc(tr(lang, 'stop')) + ' ' + n + '</p><p class="espo-pop__place">' + esc(p.nombre) + '</p></div>').addTo(map);
      pts.push([p.lat, p.lon]);
    });
    // Acceso + tramo a pie
    if (l.acceso) {
      styled(ctl, L.polyline([[l.acceso.lat, l.acceso.lon], [l.lat, l.lon]], { interactive: false }), 'walk').addTo(map);
      marker(ctl, L, l.acceso, divIcon(L, 'espo-pin--walk', SVG.walk, 24), l.acceso.nombre + ' · ' + tr(lang, 'on_foot'),
        '<div class="espo-pop"><p class="espo-pop__place">' + esc(l.acceso.nombre) + '</p><p class="espo-pop__note">' + esc(tr(lang, 'on_foot_note', { place: l.acceso.nombre, km: fmtKm(l.acceso.a_pie_km, lang) })) + '</p></div>').addTo(map);
      pts.push([l.acceso.lat, l.acceso.lon]);
    }
    // Zona aproximada
    if (l.tipo === 'zona' && l.radio_km) {
      const c = styled(ctl, L.circle([l.lat, l.lon], { radius: l.radio_km * 1000, interactive: false }), 'zone').addTo(map);
      const b = c.getBounds(); pts.push([b.getNorth(), b.getWest()], [b.getSouth(), b.getEast()]);
    }
    // Alternativas
    (l.alternativas || []).forEach(a => {
      const dl = a.desde && a.desde[l.hub];
      marker(ctl, L, a, divIcon(L, 'espo-pin--alt espo-cat--' + cat, '', 18), tr(lang, 'alternatives') + ': ' + a.nombre,
        '<div class="espo-pop"><p class="espo-pop__tag">' + esc(tr(lang, 'alternatives')) + '</p><p class="espo-pop__place">' + esc(a.nombre) + '</p>' +
        (dl ? '<p class="espo-pop__dist">≈ ' + esc(fmtKm(dl.km, lang)) + ' · ' + esc(fmtMin(dl.min)) + ' ' + esc(tr(lang, 'from')) + ' ' + esc(baseName(l.hub)) + '</p>' : '') +
        (a.extensa ? '<p class="espo-pop__note">' + esc(tr(lang, 'wide_area')) + '</p>' : '') +
        (a.extensa ? '' : '<a class="espo-btn espo-btn--ghost espo-btn--sm" href="' + esc(gmDir({ destination: a })) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'directions')) + '</a>') + '</div>').addTo(map);
      if (!a.extensa) pts.push([a.lat, a.lon]);
    });
    // Destino
    const lines = distLines(l, lang);
    const dest = marker(ctl, L, l, divIcon(L, 'espo-pin--tour espo-pin--dest espo-cat--' + cat + (l.tipo === 'zona' ? ' espo-pin--zona' : '') + (l.validar ? ' espo-pin--validar' : ''), '', 30),
      tr(lang, 'dest') + ': ' + placeName(l),
      '<div class="espo-pop"><p class="espo-pop__tag">' + esc(tr(lang, 'dest')) + '</p><p class="espo-pop__place">' + esc(placeName(l)) + '</p>' +
      (lines.length ? '<p class="espo-pop__dist">' + lines.map(esc).join('<br>') + '</p>' : '') + '</div>').addTo(map);
    pts.push([l.lat, l.lon]);
    if (l.en_ciudad && !l.ruta) { map.setView([l.lat, l.lon], 14, { animate: false }); dest.openPopup(); return; }
    fit(ctl, boundsOf(L, pts), 14);
  }

  /* =====================================================================
     3) ITINERARY — paradas numeradas del viajero (conserje)
     ===================================================================== */
  function titleOf(s, lang) {
    const t = s && s.title;
    if (t && typeof t === 'object') return t[lang] || t.es || t.en || '';
    return t || '';
  }
  function resolveHotel(h, lang) {
    if (!h) return null;
    if (typeof h === 'string') {
      const p = pointOf(h), q = p ? null : findPueblo(h);
      const x = p || q;
      return x ? { name: tr(lang, 'your_hotel') + ' (' + (p ? baseName(h) : x.nombre) + ')', lat: x.lat, lon: x.lon, mid: p ? h : q.id, approx: true } : null;
    }
    if (num(h.lat) && num(h.lon)) return { name: h.name || tr(lang, 'your_hotel'), lat: +h.lat, lon: +h.lon, mid: h.placeId || null };
    const p = h.placeId ? pointOf(h.placeId) : null, q = p ? null : findPueblo(h.area || h.city || '');
    const x = p || q;
    if (x) return { name: h.name || tr(lang, 'your_hotel'), sub: tr(lang, 'hotel_area', { area: x.nombre }), lat: x.lat, lon: x.lon, mid: p ? h.placeId : q.id, approx: true };
    return null;
  }
  function findPueblo(name) {
    if (!GEO || !name) return null;
    const n = norm(name), P = GEO.pueblos || {};
    const k = Object.keys(P).find(id => norm(P[id].nombre) === n || id === n) || Object.keys(P).find(id => n.indexOf(norm(P[id].nombre)) >= 0);
    return k ? Object.assign({ id: k }, P[k]) : null;
  }

  function findRoute(a, b) {
    if (!GEO || !a || !b) return null;
    const direct = mat(a, b);
    for (const id of Object.keys(GEO.lugares)) {
      const r = GEO.lugares[id].ruta;
      if (!r || !r.polyline || !r.via || !r.via.length) continue;
      const last = r.via[r.via.length - 1];
      const fwd = r.desde === a && last === b, rev = r.desde === b && last === a;
      if (!fwd && !rev) continue;
      // Solo rutas "directas" (sin desvíos por paradas): ≤ 15 % más largas que la distancia OSRM directa
      if (r.via.length > 1 && (!direct || r.km > direct.km * 1.15)) continue;
      const pts = decodePoly(r.polyline);
      return { km: direct ? direct.km : r.km, min: direct ? direct.min : r.min, pts: fwd ? pts : pts.reverse(), kind: 'route' };
    }
    return null;
  }
  function legInfo(A, B) {
    const pre = findRoute(A.mid, B.mid);
    if (pre) return pre;
    const m = mat(A.mid, B.mid);
    const line = [[A.lat, A.lon], [B.lat, B.lon]];
    if (m) return { km: m.km, min: m.min, pts: line, kind: 'matrix' };
    return { km: Math.round(hav(A, B) * 10) / 10, min: null, pts: line, kind: 'line' };
  }
  function fmtDay(date, lang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
    if (!m) return date || '';
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return date; }
  }

  function itinerary(el, stops, opts) {
    opts = opts || {};
    const ctl = createCtl(el, 'itin', opts);
    const lang = ctl.lang;
    el.setAttribute('aria-label', tr(lang, 'region_itin'));
    ctl.whenVisible(() => {
      load().then(() => {
        if (ctl.destroyed) return;
        const model = itinModel(stops || [], opts, lang);
        renderItinList(ctl, model);
        if (!model.mappedCount) { ctl.canvas.hidden = true; ctl.canvas.innerHTML = ''; ctl.el.classList.add('espo-map--nomap'); return; }
        return withLeaflet(ctl, L => drawItin(ctl, L, model));
      }).catch(() => renderMessage(ctl, esc(tr(lang, 'map_error'))));
    });
    return ctl;
  }

  function itinModel(stops, opts, lang) {
    const hotel = resolveHotel(opts.hotel, lang);
    const rows = stops.map((s, i) => {
      const r = { n: 0, title: titleOf(s, lang), date: s.date || '', time: s.time || '', tourId: s.tourId || '' };
      const l = r.tourId ? lugar(r.tourId) : null;
      if (!r.title && l) r.title = l.tour;
      if (num(s.lat) && num(s.lon)) { Object.assign(r, { lat: +s.lat, lon: +s.lon, mid: s.placeId || null, place: s.place || '', kind: 'map' }); return r; }
      if (s.placeId && pointOf(s.placeId)) { const p = pointOf(s.placeId); Object.assign(r, { lat: p.lat, lon: p.lon, mid: s.placeId, place: p.nombre, kind: 'map' }); return r; }
      if (!l) { r.kind = 'none'; return r; }
      if (l.tipo === 'movil') { r.kind = 'hotel'; return r; }
      if (l.generica) { r.kind = 'near'; return r; }
      const e = endPoint(l);
      Object.assign(r, { lat: e.lat, lon: e.lon, mid: e.id, place: placeName(l), kind: 'map', cat: l.cat });
      return r;
    });
    let k = 0;
    rows.forEach(r => { if (r.kind === 'map') r.n = ++k; });
    const dates = rows.map(r => r.date).filter((v, i, a) => v && a.indexOf(v) === i);
    const byDay = !!hotel && dates.length > 1;
    const segments = [];
    if (byDay) {
      rows.forEach(r => {
        const last = segments[segments.length - 1];
        if (!last || (r.date && r.date !== last.date)) segments.push({ date: r.date, rows: [r] }); else last.rows.push(r);
      });
    } else segments.push({ date: dates.length === 1 ? dates[0] : '', rows });
    segments.forEach(sg => {
      let prev = hotel ? Object.assign({ isHotel: true }, hotel) : null;
      sg.pts = hotel ? [prev] : [];
      sg.rows.forEach(r => {
        if (r.kind !== 'map') return;
        if (prev && hav(prev, r) > 0.05) r.leg = legInfo(prev, r);
        if (!prev || hav(prev, r) > 0.05) sg.pts.push(r);
        prev = r;
      });
    });
    return { hotel, rows, segments, byDay, mappedCount: rows.filter(r => r.kind === 'map').length };
  }

  function legText(leg, lang) {
    if (!leg) return '';
    if (leg.kind === 'line') return '≈ ' + fmtKm(leg.km, lang) + ' · ' + tr(lang, 'approx_line');
    return '≈ ' + fmtKm(leg.km, lang) + ' · ' + fmtMin(leg.min) + ' ' + tr(lang, 'by_road');
  }

  function renderItinList(ctl, m) {
    const lang = ctl.lang, canSelect = typeof ctl.opts.onSelect === 'function';
    let html = '';
    m.segments.forEach(sg => {
      if (m.byDay && sg.date) html += '<p class="espo-itin__day">' + esc(fmtDay(sg.date, lang)) + '</p>';
      html += '<ol class="espo-itin">';
      if (m.hotel) html += '<li class="espo-itin__stop espo-itin__stop--hotel"><span class="espo-num espo-num--hotel" aria-hidden="true">' + SVG.home + '</span><div><b>' + esc(m.hotel.name) + '</b>' + (m.hotel.sub ? '<span>' + esc(m.hotel.sub) + '</span>' : '') + '</div></li>';
      sg.rows.forEach(r => {
        if (r.leg) html += '<li class="espo-itin__leg' + (r.leg.kind !== 'route' ? ' espo-itin__leg--approx' : '') + '"><span aria-hidden="true">↓</span> ' + esc(legText(r.leg, lang)) + '</li>';
        const sub = [r.date && !m.byDay ? fmtDay(r.date, lang) : '', r.time,
          r.kind === 'map' ? r.place : r.kind === 'hotel' ? tr(lang, 'at_hotel') : r.kind === 'near' ? tr(lang, 'near_hotel') + ' · ' + tr(lang, 'to_confirm') : tr(lang, 'no_location')].filter(Boolean).join(' · ');
        const title = canSelect && r.tourId && lugar(r.tourId) ? '<button type="button" class="espo-link" data-espo-select="' + esc(r.tourId) + '">' + esc(r.title) + '</button>' : esc(r.title);
        html += '<li class="espo-itin__stop' + (r.kind === 'map' ? '' : ' espo-itin__stop--off') + '"><span class="espo-num" aria-hidden="true">' + (r.kind === 'map' ? r.n : '·') + '</span><div><b>' + title + '</b><span>' + esc(sub) + '</span></div></li>';
      });
      html += '</ol>';
    });
    // Enlaces de Google Maps (multi-parada)
    const links = [];
    let trimmed = false;
    m.segments.forEach(sg => {
      if (sg.pts.length < 2) return;
      const pts = sg.pts.slice();
      const origin = pts.shift(), destination = pts.pop();
      if (pts.length > MAX_WAYPOINTS) trimmed = true;
      const url = gmDir({ origin, destination, waypoints: pts.slice(0, MAX_WAYPOINTS) });
      const label = m.byDay && sg.date ? tr(lang, 'day_route', { day: fmtDay(sg.date, lang) }) : tr(lang, 'full_route');
      links.push('<a class="espo-btn' + (links.length ? ' espo-btn--ghost' : '') + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>');
    });
    html += links.length ? '<div class="espo-actions">' + links.join('') + '</div>' : '';
    if (trimmed) html += '<p class="espo-map__fine">' + esc(tr(lang, 'more_waypoints', { n: MAX_WAYPOINTS })) + '</p>';
    if (m.mappedCount) html += '<p class="espo-map__fine">' + esc(tr(lang, 'traffic')) + '</p>';
    ctl.info.innerHTML = html;
    ctl.list.innerHTML = ''; // la lista visible ya es el respaldo accesible
  }

  function drawItin(ctl, L, m) {
    const lang = ctl.lang, map = ctl.map, pts = [];
    if (m.hotel) {
      marker(ctl, L, m.hotel, divIcon(L, 'espo-pin--hotel', SVG.home, 30), m.hotel.name,
        '<div class="espo-pop"><p class="espo-pop__place">' + esc(m.hotel.name) + '</p>' + (m.hotel.sub ? '<p class="espo-pop__note">' + esc(m.hotel.sub) + '</p>' : '') + '</div>').addTo(map);
      pts.push([m.hotel.lat, m.hotel.lon]);
    }
    const drawn = new Set();
    m.segments.forEach(sg => sg.rows.forEach(r => {
      if (r.kind !== 'map') return;
      if (r.leg) {
        const key = r.leg.pts[0].join() + '>' + r.leg.pts[r.leg.pts.length - 1].join();
        if (!drawn.has(key)) {
          drawn.add(key);
          let line;
          if (r.leg.kind === 'route') line = drawRoute(ctl, L, r.leg.pts);
          else line = styled(ctl, L.polyline(r.leg.pts, { interactive: true, lineCap: 'round' }), 'dashed').addTo(map);
          line.bindTooltip(legText(r.leg, lang) + (r.leg.kind === 'matrix' ? ' (' + tr(lang, 'approx_line') + ')' : ''), { sticky: true, className: 'espo-tip' });
          if (r.leg.kind !== 'route') {
            const a = r.leg.pts[0], b = r.leg.pts[1];
            L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], {
              interactive: false, keyboard: false,
              icon: L.divIcon({ className: 'espo-leg-label', html: '<span>' + esc(fmtKm(r.leg.km, lang)) + '</span>', iconSize: null })
            }).addTo(map);
          }
        }
      }
      const cls = 'espo-pin--num espo-pin--step' + (r.cat ? ' espo-cat--' + r.cat : '');
      const sub = [r.date ? fmtDay(r.date, lang) : '', r.time].filter(Boolean).join(' · ');
      marker(ctl, L, r, divIcon(L, cls, '<b>' + r.n + '</b>', 28), r.n + '. ' + r.title + (r.place ? ' — ' + r.place : ''),
        '<div class="espo-pop"><p class="espo-pop__tag">' + r.n + (sub ? ' · ' + esc(sub) : '') + '</p><p class="espo-pop__place">' + esc(r.title) + '</p>' +
        (r.place && r.place !== r.title ? '<p class="espo-pop__note">' + esc(r.place) + '</p>' : '') +
        (r.leg ? '<p class="espo-pop__dist">' + esc(legText(r.leg, lang)) + '</p>' : '') +
        '<a class="espo-btn espo-btn--ghost espo-btn--sm" href="' + esc(gmDir({ destination: r })) + '" target="_blank" rel="noopener">' + esc(tr(lang, 'directions')) + '</a></div>').addTo(map);
      pts.push([r.lat, r.lon]);
      if (r.leg) r.leg.pts.forEach(p => pts.push(p));
    }));
    fit(ctl, boundsOf(L, pts), 13);
  }

  /* ---------- Precarga ligera de geo.json en reposo (para distanceText/place) ---------- */
  if (w.ESPO_MAPS_PREFETCH !== false && typeof fetch === 'function') {
    const idle = fn => (w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
    const go = () => idle(() => load().catch(() => {}));
    if (d.readyState === 'complete') go(); else w.addEventListener('load', go, { once: true });
  }

  /* ---------- API pública ---------- */
  w.EspoMaps = {
    version: '1.0.0',
    load,
    ready: load,
    isLoaded: () => !!GEO,
    overview,
    tour,
    itinerary,
    distanceText,
    place,
    directionsUrl,
    destroy: el => { if (el && el.__espoMap) el.__espoMap.destroy(); },
    loadLeaflet,
    _i18n: I18N
  };
})(window, document);
