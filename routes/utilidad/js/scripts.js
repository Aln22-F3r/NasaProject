// Motor simple de recomendación Grid vs Time Series
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
      titulo: 'Time Series',
      vars: ['temperature_2m:C', 'wind_speed_10m:ms', 'global_horizontal_irradiance:Wm2'],
      ejemplo:
`GET https://api.meteomatics.com/{start}--{end}:{step}/{parameter}/{lat},{lon}/json
Auth: user:pass

Ejemplo:
.../2025-01-01T00:00Z--2025-01-07T00:00Z:PT1H/temperature_2m:C,wind_speed_10m:ms/19.43,-99.13/json`
    },
    grid: {
      badgeClass: 'badge-grid',
      titulo: 'Grid',
      vars: ['temperature_2m:C', 'wind_speed_10m:ms', 'direct_normal_irradiance:Wm2'],
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

// DOM
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

// Render
function renderRec(r) {
  panel.classList.remove('hidden');

  badgeEndpoint.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${r.badgeClass}`;
  badgeEndpoint.textContent = r.titulo;

  badgeConf.textContent = `Confianza: ${(r.confianza*100).toFixed(0)}%`;

  explicacion.textContent =
    r.endpoint === 'grid'
      ? 'Recomendado Grid: necesitas un campo espacial continuo para generar mapas o comparar áreas.'
      : 'Recomendado Time Series: necesitas una señal temporal precisa en uno o pocos puntos.';

  varsList.innerHTML = '';
  r.vars.forEach(v => {
    const li = document.createElement('li');
    li.textContent = v;
    varsList.appendChild(li);
  });

  ejemplo.textContent = r.ejemplo;
}

// Eventos
btnRec.addEventListener('click', () => {
  const datos = {
    objetivo: objetivoSel.value,
    espacial: espacialSel.value,
    temporal: temporalSel.value
  };
  const r = recomendar(datos);
  renderRec(r);
});

// Reset nativo del form + limpiar panel
form.addEventListener('reset', () => {
  setTimeout(() => {
    panel.classList.add('hidden');
    ejemplo.textContent = '';
    varsList.innerHTML = '';
    badgeEndpoint.textContent = '';
    badgeEndpoint.className = '';
    badgeConf.textContent = '';
    explicacion.textContent = '';
  }, 0);
});

// Tarjetas predefinidas
document.querySelectorAll('.case-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tipo = btn.dataset.case;
    const presets = {
      pv: { objetivo:'mapa', espacial:'poligono', temporal:'min' },
      wind:{ objetivo:'hist', espacial:'punto', temporal:'hist' },
      temp:{ objetivo:'mapa', espacial:'poligono', temporal:'min' }
    };
    const r = recomendar(presets[tipo]);
    renderRec(r);
    window.scrollTo({ top: document.getElementById('resultado').getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  });
});
