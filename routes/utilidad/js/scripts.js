/******************************************
 * CONFIGURACIÓN GLOBAL DE API
 ******************************************/
const API_BASE = "http://127.0.0.1:8000";
const API = {
  grid: `${API_BASE}/api/meteo/grid`,             // GET ?lat1=&lon1=&lat2=&lon2=&res_lat=&res_lon=&valid_time=&params
  timeseries: `${API_BASE}/api/meteo/timeseries`  // GET ?lat=&lon=&start=&end=&step=&params
};

/******************************************
 * UTILIDADES: FECHAS Y BBOX
 ******************************************/
function toISO(dt) {
  return new Date(dt).toISOString().split(".")[0] + "Z";
}

// Rango automático: ahora y hace 365 días
function defaultTimeRange(daysBack = 365) {
  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 24 * 3600 * 1000);
  return { start: toISO(start), end: toISO(end) };
}

// Bounding box alrededor de un punto (para Grid)
function buildBBoxFromPoint(lat, lon, halfSpan = 0.25) {
  return {
    lat1: (lat + halfSpan).toFixed(6),
    lon1: (lon - halfSpan).toFixed(6),
    lat2: (lat - halfSpan).toFixed(6),
    lon2: (lon + halfSpan).toFixed(6),
  };
}

/******************************************
 * 🔎 MOTOR DE RECOMENDACIÓN (RESTABLECIDO)
 ******************************************/
function recomendar({ objetivo, espacial, temporal }) {
  let endpoint = "timeseries";
  let confianza = 0.75;

  if (espacial === "poligono") { endpoint = "grid"; confianza = 0.85; }
  if (objetivo === "mapa")     { endpoint = "grid"; confianza = 0.90; }
  if (objetivo === "hist" || objetivo === "now") {
    endpoint = (espacial === "punto") ? "timeseries" : "grid";
    confianza = (espacial === "punto") ? 0.90 : 0.80;
  }
  if (objetivo === "comparar") {
    endpoint = (espacial === "punto") ? "timeseries" : "grid";
    confianza = 0.80;
  }
  if (objetivo === "sitio" && espacial === "punto") {
    endpoint = "timeseries"; confianza = 0.90;
  }

  const catalogo = {
    timeseries: {
      badgeClass: "badge-ts",
      titulo: "Análisis de datos",
      vars: ["Temperatura 2m (°C)", "Viento 10m (m/s)", "Irradiancia global horizontal (W/m²)"],
    },
    grid: {
      badgeClass: "badge-grid",
      titulo: "Mapa",
      vars: ["Temperatura 2m (°C)", "Viento 10m (m/s)", "Irradiancia directa normal (W/m²)"],
    }
  };

  return { endpoint, confianza, ...(catalogo[endpoint] || catalogo.timeseries) };
}

// DOM del recomendador
const formCasos     = document.getElementById("formCasos");
const objetivoSel   = document.getElementById("objetivo");
const espacialSel   = document.getElementById("espacial");
const temporalSel   = document.getElementById("temporal");
const btnRec        = document.getElementById("recomendar");

const panel         = document.getElementById("resultado");
const badgeEndpoint = document.getElementById("badgeEndpoint");
const badgeConf     = document.getElementById("badgeConf");
const explicacion   = document.getElementById("explicacion");
const varsList      = document.getElementById("vars");

function renderRec(r) {
  panel?.classList.remove("hidden");

  if (badgeEndpoint) {
    badgeEndpoint.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${r.badgeClass}`;
    badgeEndpoint.textContent = r.titulo;
  }
  if (badgeConf) {
    badgeConf.textContent = `Confianza: ${(r.confianza * 100).toFixed(0)}%`;
  }
  if (explicacion) {
    explicacion.textContent =
      r.endpoint === "grid"
        ? "Recomendado Mapa: necesitas un campo espacial continuo para generar mapas o comparar áreas."
        : "Recomendado Análisis de datos: necesitas una señal temporal precisa en uno o pocos puntos.";
  }
  if (varsList) {
    varsList.innerHTML = "";
    r.vars.forEach(v => {
      const li = document.createElement("li");
      li.textContent = v;
      varsList.appendChild(li);
    });
  }
}

// Eventos recomendador
btnRec?.addEventListener("click", () => {
  const datos = {
    objetivo: objetivoSel?.value,
    espacial: espacialSel?.value,
    temporal: temporalSel?.value,
  };
  const r = recomendar(datos);
  renderRec(r);
});

formCasos?.addEventListener("reset", () => {
  setTimeout(() => {
    panel?.classList.add("hidden");
    if (badgeEndpoint) { badgeEndpoint.textContent = ""; badgeEndpoint.className = ""; }
    if (badgeConf)     { badgeConf.textContent = ""; }
    if (explicacion)   { explicacion.textContent = ""; }
    if (varsList)      { varsList.innerHTML = ""; }
  }, 0);
});

// Presets de tarjetas (si existen .case-btn en el HTML)
document.querySelectorAll(".case-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tipo = btn.dataset.case;
    const presets = {
      pv:   { objetivo: "mapa", espacial: "poligono", temporal: "min"  },
      wind: { objetivo: "hist",  espacial: "punto",    temporal: "hist" },
      temp: { objetivo: "mapa",  espacial: "poligono", temporal: "min"  },
    };
    const r = recomendar(presets[tipo]);
    renderRec(r);
    const res = document.getElementById("resultado");
    if (res) {
      window.scrollTo({ top: res.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
    }
  });
});

/******************************************
 * MAPA LEAFLET + CTAs
 ******************************************/
const map = L.map("map").setView([19.4326, -99.1332], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

const pointInfo = document.getElementById("pointInfo");
const ctas = document.getElementById("ctas");
let lastLatLng = null;
let marker = null;

function setPoint(latlng) {
  if (marker) map.removeLayer(marker);

  const lat = latlng.lat.toFixed(6);
  const lon = latlng.lng.toFixed(6);

  marker = L.marker(latlng).addTo(map)
    .bindPopup(`<b>Lat:</b> ${lat}<br><b>Lng:</b> ${lon}`)
    .openPopup();

  lastLatLng = latlng;
  pointInfo && (pointInfo.textContent = `📍 Coordenadas: ${lat}, ${lon}`);
  showCTAs();
}

map.on("click", e => setPoint(e.latlng));

if (L.Control && L.Control.geocoder) {
  L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Buscar lugar...",
    position: "topleft"
  })
    .on("markgeocode", e => {
      const c = e.geocode.center;
      map.fitBounds(e.geocode.bbox);
      setPoint(c);
    })
    .addTo(map);
}

/******************************************
 * FETCH GET A LOS ENDPOINTS (sin model)
 ******************************************/
function showCTAs() {
  if (!ctas) return;
  attachEndpointHandlers();
  ctas.classList.remove("hidden");
}

function attachEndpointHandlers() {
  const btnGrid = ctas.querySelector('a[data-endpoint="grid"]');
  const btnTS   = ctas.querySelector('a[data-endpoint="timeseries"]');

  [btnGrid, btnTS].forEach(btn => {
    if (!btn || btn.dataset.bound === "1") return;

    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (!lastLatLng) return alert("Selecciona un punto primero.");

      const paramsEl = document.getElementById("params");
      const stepEl   = document.getElementById("step");
      const resLatEl = document.getElementById("res_lat");
      const resLonEl = document.getElementById("res_lon");

      const params  = (paramsEl?.value || "t_2m:C").trim();
      const step    = (stepEl?.value   || "PT9H").trim();
      const res_lat = (resLatEl?.value || "0.02").trim();
      const res_lon = (resLonEl?.value || "0.02").trim();

      const lat = Number(lastLatLng.lat);
      const lon = Number(lastLatLng.lng);

      const type = btn.dataset.endpoint;
      let url = "";

      if (type === "timeseries") {
        const { start, end } = defaultTimeRange(365);
        const qs = new URLSearchParams({
          lat: lat.toFixed(6),
          lon: lon.toFixed(6),
          start,
          end,
          step,
          params
        });
        url = `${API.timeseries}?${qs.toString()}`;
      } else {
        const bbox = buildBBoxFromPoint(lat, lon, 0.25);
        const qs = new URLSearchParams({
          ...bbox,
          res_lat,
          res_lon,
          valid_time: "now",
          params
          // fmt: "png" // descomenta si tu API lo usa
        });
        url = `${API.grid}?${qs.toString()}`;
      }

      const originalText = btn.textContent;
      btn.textContent = "Consultando...";
      btn.classList.add("opacity-70", "pointer-events-none");
      console.log("🌐 GET:", url);

      try {
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${errText}`);
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("application/json")) {
          const data = await resp.json();
          console.log("✅ JSON:", data);
          alert("Consulta exitosa (revisa la consola).");
        } else {
          const blob = await resp.blob();
          const href = URL.createObjectURL(blob);
          window.open(href, "_blank");
        }
      } catch (err) {
        console.error(err);
        alert("Error al consultar backend: " + err.message);
      } finally {
        btn.textContent = originalText;
        btn.classList.remove("opacity-70", "pointer-events-none");
      }
    });

    btn.dataset.bound = "1"; // evita listeners duplicados
  });
}
