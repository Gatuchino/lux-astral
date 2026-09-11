// Cálculo real de Carta Astral (posiciones planetarias + Ascendente/Medio
// Cielo), a pedido de Christian (2026-09-11): antes ChartPage generaba
// todo con un pseudo-random basado solo en la fecha (ni la hora ni el
// lugar se usaban). Ahora se usa efemérides real vía la librería
// astronomy-engine (cargada por CDN en Arcana.html como window.Astronomy)
// más fórmulas estándar de astrología esférica para el Ascendente/MC.
//
// Sin dependencias propias (solo window.Astronomy + Intl, ambos ya
// disponibles en el navegador) — así este cálculo corre igual en local y
// en producción sin necesidad de mirrorearlo en local-server.js /
// booking.mts (esos archivos solo hacen de proxy para geocodificar el
// lugar de nacimiento y resolver su huso horario — ver acción
// "geo-lookup").
//
// IMPORTANTE — bug real de astronomy-engine encontrado y verificado acá
// mismo con un script de prueba (7 casos + invariantes geométricas
// contra Astronomy.Horizon()) antes de usar esto en producción: llamar
// a Astronomy.e_tilt(date) y Astronomy.SiderealTime(date) pasándoles un
// objeto Date crudo repetido (en vez de un único AstroTime compartido)
// puede devolver NaN según el orden de llamada. Por eso acá SIEMPRE se
// convierte la fecha a AstroTime una sola vez con Astronomy.MakeTime()
// y se reutiliza ese mismo objeto para todo.

(function () {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;
  function norm360(d) { d = d % 360; return d < 0 ? d + 360 : d; }

  // Sistema de casas "Whole Sign" (cada casa = un signo completo, empezando
  // por el signo del Ascendente). Es un sistema real y de uso extendido
  // (el más usado en astrología helenística/tradicional y muy popular hoy
  // también) — se eligió en vez de Placidus porque Placidus exige resolver
  // ecuaciones no lineales para las cúspides intermedias (11, 12, 2, 3) y
  // el riesgo de un error de signo ahí es alto; Whole Sign da un
  // Ascendente y Medio Cielo igual de reales (misma efeméride, mismas
  // fórmulas esféricas) con muchísimo menos riesgo de bug.
  const HOUSE_SYSTEM = 'whole-sign';

  // ---- Convierte fecha/hora "de pared" en un huso horario IANA a un
  // instante UTC real, respetando el horario de verano histórico vigente
  // en esa fecha (Intl ya trae la base de datos IANA completa, no hace
  // falta ninguna librería aparte). Itera 2 veces para converger incluso
  // cerca de un cambio de horario.
  function zonedTimeToUtc(dateStr, timeStr, timeZone) {
    const [Y, M, D] = String(dateStr).split('-').map(Number);
    const [h, m] = String(timeStr || '12:00').split(':').map(Number);
    const wanted = Date.UTC(Y, M - 1, D, h, m || 0, 0);
    let guess = wanted;
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    for (let i = 0; i < 2; i++) {
      const parts = dtf.formatToParts(new Date(guess));
      const get = (t) => Number((parts.find((p) => p.type === t) || {}).value || 0);
      const seen = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
      const diff = wanted - seen;
      if (diff === 0) break;
      guess += diff;
    }
    return new Date(guess);
  }

  // ecliptic longitude (deg, beta=0) -> RA/Dec (deg), dado obliquity eps (deg)
  function eclipticToEquatorial(lambdaDeg, epsDeg) {
    const lam = lambdaDeg * DEG2RAD, eps = epsDeg * DEG2RAD;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    return { ra: norm360(ra * RAD2DEG), dec: dec * RAD2DEG };
  }

  // Medio Cielo (MC): punto de la eclíptica que culmina en el meridiano.
  // Fórmula estándar (Meeus, "Astronomical Algorithms"); verificada acá
  // con la invariante MC(theta=0)=0 para cualquier oblicuidad/latitud, y
  // con el round-trip RA(MC) == theta (culminar = ángulo horario 0).
  function midheavenLongitude(thetaDeg, epsDeg) {
    const th = thetaDeg * DEG2RAD, eps = epsDeg * DEG2RAD;
    const lam = Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(eps));
    return norm360(lam * RAD2DEG);
  }

  // Ascendente: punto de la eclíptica que sale por el horizonte este.
  // Fórmula estándar (Meeus) + corrección de +180° -- la forma de libro
  // de texto da el Descendente, no el Ascendente; verificado acá contra
  // Astronomy.Horizon() (altitud ~0 Y azimut entre 0-180, es decir
  // saliendo por el este) en 6 casos reales de distintas latitudes/fechas.
  // Nota: cerca de los círculos polares (|latitud| > ~66.5°) la fórmula
  // se vuelve inestable/indefinida -- casos así devuelven ascendant=null
  // (ver computeAstralChart).
  function ascendantLongitude(thetaDeg, epsDeg, latDeg) {
    const th = thetaDeg * DEG2RAD, eps = epsDeg * DEG2RAD, phi = latDeg * DEG2RAD;
    const lam = Math.atan2(-Math.cos(th), Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(th));
    return norm360(lam * RAD2DEG + 180);
  }

  function signOf(lonDeg) {
    const lon = norm360(lonDeg);
    const signIndex = Math.floor(lon / 30);
    return { lon, signIndex, deg: lon - signIndex * 30 };
  }

  const PLANET_BODIES = [
    ['sun', 'Sun'], ['mercury', 'Mercury'], ['venus', 'Venus'], ['mars', 'Mars'],
    ['jupiter', 'Jupiter'], ['saturn', 'Saturn'], ['uranus', 'Uranus'], ['neptune', 'Neptune'], ['pluto', 'Pluto'],
  ];
  const POLAR_LIMIT_DEG = 66.5; // círculo polar ártico/antártico -- ver nota arriba

  // { dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM', lat, lon, timeZone } -> carta real
  function computeAstralChart({ dateStr, timeStr, lat, lon, timeZone }) {
    const A = window.Astronomy;
    if (!A) throw new Error('astronomy-engine no está cargado (window.Astronomy).');
    const utcDate = zonedTimeToUtc(dateStr, timeStr, timeZone);
    const time = A.MakeTime(utcDate); // AstroTime compartido -- ver nota arriba sobre el bug de NaN

    const planets = {};
    for (const [key, bodyName] of PLANET_BODIES) {
      const vec = A.GeoVector(A.Body[bodyName], time, true);
      planets[key] = signOf(A.Ecliptic(vec).elon);
    }
    planets.moon = signOf(A.EclipticGeoMoon(time).lon);

    let ascendant = null, midheaven = null, houses = null;
    if (typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) < POLAR_LIMIT_DEG) {
      const eps = A.e_tilt(time).tobl; // oblicuidad verdadera de la fecha
      const gstHours = A.SiderealTime(time); // tiempo sideral de Greenwich, en horas
      const theta = norm360(gstHours * 15 + lon); // tiempo sideral local, en grados
      ascendant = signOf(ascendantLongitude(theta, eps, lat));
      midheaven = signOf(midheavenLongitude(theta, eps));
      if (HOUSE_SYSTEM === 'whole-sign') {
        // Casa 1 = todo el signo del Ascendente, casa 2 = el signo siguiente, etc.
        houses = [];
        for (let i = 0; i < 12; i++) {
          const signIndex = (ascendant.signIndex + i) % 12;
          houses.push({ house: i + 1, signIndex });
        }
      }
    }

    return {
      utcIso: utcDate.toISOString(),
      houseSystem: HOUSE_SYSTEM,
      planets,
      ascendant,
      midheaven,
      houses,
      polarWarning: typeof lat === 'number' && Math.abs(lat) >= POLAR_LIMIT_DEG,
    };
  }

  window.ArcanaAstro = { computeAstralChart, zonedTimeToUtc, eclipticToEquatorial, ascendantLongitude, midheavenLongitude, signOf };
})();
