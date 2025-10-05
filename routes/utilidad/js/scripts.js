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
  if (objetivo === 'comparar') {
    endpoint = (espacial === 'punto') ? 'timeseries' : 'grid';
    confianza = 0.8;
  }
  if (objetivo === 'sitio' && espacial === 'punto') {
    endpoint = 'timeseries';
    confianza = 0.9;
  }

  const catalogo = {
    timeseries: {
      badgeClass: 'badge-ts',
      titulo: 'Análisis de datos',
      vars: [
        'Temperatura del aire a 2 m [°C]',
        'Velocidad del viento a 10 m [m/s]',
        'Radiación solar global en horizontal [J/m²]'
      ]
    },
    grid: {
      badgeClass: 'badge-grid',
      titulo: 'Mapa',
      vars: [
        'Mapa de temperatura superficial',
        'Campo de viento a 10 m',
        'Irradiancia/insolación por píxel en bounding box'
      ]
    }
  };

  const rec = catalogo[endpoint] ?? catalogo.timeseries;
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
const sendBtn = document.getElementById("sendBtn");

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
      r.endpoint === 'grid'
        ? 'Recomendado Mapa: necesitas un campo espacial continuo para generar mapas o comparar áreas.'
        : 'Recomendado Análisis de datos: necesitas una señal temporal precisa en uno o pocos puntos.';
  }

  if (varsList) {
    varsList.innerHTML = '';
    (r.vars || []).forEach(v => {
      const li = document.createElement('li');
      li.textContent = v;
      varsList.appendChild(li);
    });
  }

  if (ejemplo) ejemplo.textContent = r.ejemplo || '';

  // CTAs
  if (ctaMapa) ctaMapa.classList.toggle('recomendada', r.endpoint === 'grid');
  if (ctaAnalisis) ctaAnalisis.classList.toggle('recomendada', r.endpoint === 'timeseries');
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
      panel?.classList.add('hidden');
      ejemplo && (ejemplo.textContent = '');
      varsList && (varsList.innerHTML = '');
      if (badgeEndpoint) { badgeEndpoint.textContent = ''; badgeEndpoint.className = ''; }
      badgeConf && (badgeConf.textContent = '');
      explicacion && (explicacion.textContent = '');
      ctaMapa?.classList.remove('recomendada');
      ctaAnalisis?.classList.remove('recomendada');
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

// ===== Mapa principal =====
const map = L.map("map").setView([19.4326, -99.1332], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors", maxZoom: 19
}).addTo(map);

let marker = null;
function setPoint(latlng) {
  if (marker) map.removeLayer(marker);
  const lat = latlng.lat.toFixed(6);
  const lon = latlng.lng.toFixed(6);
  marker = L.marker(latlng).addTo(map)
    .bindPopup(`<b>Lat:</b> ${lat}<br><b>Lng:</b> ${lon}`).openPopup();
  coordsEl.textContent = `📍 Lat: ${lat} | Lng: ${lon}`;
  sendBtn.classList.add("activo");
}
map.on("click", e => setPoint(e.latlng));

L.Control.geocoder({ defaultMarkGeocode: false, placeholder: "Buscar lugar...", position: "topleft" })
  .on("markgeocode", e => { const c = e.geocode.center; map.fitBounds(e.geocode.bbox); setPoint(c); })
  .addTo(map);

infoBtn?.addEventListener("click", () => {
  const vis = infoPopup.style.display === "block";
  infoPopup.style.display = vis ? "none" : "block";
});

// ===== Enviar =====
sendBtn.addEventListener("click", async () => {
  try {
    if (!marker) { alert("Selecciona un punto en el mapa."); return; }
    const lat = +marker.getLatLng().lat.toFixed(6);
    const lon = +marker.getLatLng().lng.toFixed(6);
    await loadGeoTiff(lat, lon);
  } catch (e) {
    console.error("Error en Enviar:", e);
    alert(e.message);
  }
});
