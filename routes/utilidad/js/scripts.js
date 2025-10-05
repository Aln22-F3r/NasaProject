// --- Motor de recomendación ---
function recomendar({ objetivo, espacial, temporal }) {
  let endpoint = 'timeseries';
  let confianza = 0.75;

  if (espacial === 'poligono') { endpoint = 'grid'; confianza = 0.85; }
  if (objetivo === 'mapa') { endpoint = 'grid'; confianza = 0.9; }
  if (objetivo === 'hist' || objetivo === 'now') {
    endpoint = (espacial === 'punto') ? 'timeseries' : 'grid';
    confianza = (espacial === 'punto') ? 0.9 : 0.8;
  }
  if (objetivo === 'comparar') { endpoint = (espacial === 'punto') ? 'timeseries' : 'grid'; confianza = 0.8; }
  if (objetivo === 'sitio' && espacial === 'punto') { endpoint = 'timeseries'; confianza = 0.9; }

  const catalogo = {
    timeseries: {
      badgeClass: 'badge-ts',
      titulo: 'Analisis de datos',
      vars: ['Temperatura del aire a 2 metros sobre la superficie terrestre, en grados Celsius', 'Velocidad del viento a 10 m de altura sobre el terreno, en metros por segundo.', 'cantidad total de radiación solar recibida en una superficie horizontal'],
      ejemplo:
`GET https://api.meteomatics.com/{start}--{end}:{step}/{parameter}/{lat},{lon}/json
Auth: user:pass

Ejemplo:
.../2025-01-01T00:00Z--2025-01-07T00:00Z:PT1H/temperature_2m:C,wind_speed_10m:ms/19.43,-99.13/json`
    },
    grid: {
      badgeClass: 'badge-grid',
      titulo: 'Mapa',
      vars: ['Temperatura del aire a 2 metros sobre la superficie terrestre, en grados Celsius', 'Velocidad del viento a 10 m de altura sobre el terreno, en metros por segundo.', 'Cantidad de radiación solar directa recibida por unidad de superficie orientada perpendicularmente a los rayos solares, medida en W/m²'],
      ejemplo:
`GET https://api.meteomatics.com/{valid_time}/{parameter}/{lat1},{lon1}:{lat2},{lon2}:{res_lat},{res_lon}/json
Auth: user:pass

Ejemplo:
.../2025-01-01T12:00Z/temperature_2m:C/20.5,-100.5:18.0,-98.0:0.1,0.1/json`
    }
  };

  const rec = catalogo[endpoint];
  return { endpoint, confianza, ...rec };
}

// --- DOM refs (con guards) ---
const form = document.getElementById('formCasos');
const objetivoSel = document.getElementById('objetivo');
const espacialSel = document.getElementById('espacial');
const temporalSel = document.getElementById('temporal');
const btnRec = document.getElementById('recomendar');

const panel = document.getElementById('resultado');
const badgeEndpoint = document.getElementById('badgeEndpoint');
const badgeConf = document.getElementById('badgeConf');
const explicacion = document.getElementById('explicacion');
const varsList = document.getElementById('vars');
const ejemplo = document.getElementById('ejemplo');

const ctas = document.getElementById('ctas');
const ctaMapa = document.getElementById('ctaMapa');
const ctaAnalisis = document.getElementById('ctaAnalisis');

// --- Render seguro ---
function renderRec(r) {
  if (panel) panel.classList.remove('hidden');

  if (badgeEndpoint) {
    badgeEndpoint.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${r.badgeClass}`;
    badgeEndpoint.textContent = r.titulo;
  }
  if (badgeConf) badgeConf.textContent = `Confianza: ${(r.confianza*100).toFixed(0)}%`;

  if (explicacion) {
    explicacion.textContent =
      r.endpoint === 'Mapa'
        ? 'Recomendado Mapa: necesitas un campo espacial continuo para generar mapas o comparar áreas.'
        : 'Recomendado Analisis de datos: necesitas una señal temporal precisa en uno o pocos puntos.';
  }

  if (varsList) {
    varsList.innerHTML = '';
    r.vars.forEach(v => {
      const li = document.createElement('li');
      li.textContent = v;
      varsList.appendChild(li);
    });
  }

  if (ejemplo) ejemplo.textContent = r.ejemplo;

  // CTAs
  if (ctaMapa) ctaMapa.classList.toggle('recomendada', r.endpoint === 'grid');
  if (ctaAnalisis) ctaAnalisis.classList.toggle('recomendada', r.endpoint === 'timeseries');
  if (ctas) ctas.classList.add('show');
}

// --- Eventos ---
if (btnRec) {
  btnRec.addEventListener('click', () => {
    const datos = {
      objetivo: objetivoSel?.value,
      espacial: espacialSel?.value,
      temporal: temporalSel?.value
    };
    const r = recomendar(datos);
    renderRec(r);
  });
}

// Reset nativo + limpiar
if (form) {
  form.addEventListener('reset', () => {
    setTimeout(() => {
      if (panel) panel.classList.add('hidden');
      if (ejemplo) ejemplo.textContent = '';
      if (varsList) varsList.innerHTML = '';
      if (badgeEndpoint) { badgeEndpoint.textContent = ''; badgeEndpoint.className = ''; }
      if (badgeConf) badgeConf.textContent = '';
      if (explicacion) explicacion.textContent = '';
      if (ctas) ctas.classList.remove('show');
      if (ctaMapa) ctaMapa.classList.remove('recomendada');
      if (ctaAnalisis) ctaAnalisis.classList.remove('recomendada');
    }, 0);
  });
}

// Presets de tarjetas
document.querySelectorAll('.case-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tipo = btn.dataset.case;
    const presets = {
      pv:   { objetivo:'mapa', espacial:'poligono', temporal:'min' },
      wind: { objetivo:'hist',  espacial:'punto',    temporal:'hist' },
      temp: { objetivo:'mapa',  espacial:'poligono', temporal:'min' }
    };
    const r = recomendar(presets[tipo]);
    renderRec(r);
    const res = document.getElementById('resultado');
    if (res) {
      window.scrollTo({
        top: res.getBoundingClientRect().top + window.scrollY - 100,
        behavior: 'smooth'
      });
    }
  });
});
