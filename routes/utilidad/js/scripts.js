/******************************************
 * CONFIGURACIÓN GLOBAL DE API
 ******************************************/
const API_BASE = "http://127.0.0.1:8000";
const API = {
  grid: `${API_BASE}/api/meteo/grid`,
  timeseries: `${API_BASE}/api/meteo/timeseries`
};

/******************************************
 * FUNCIONES DE TIEMPO Y BBOX
 ******************************************/
function toISO(dt) {
  return new Date(dt).toISOString().split(".")[0] + "Z";
}

// 🔹 genera un rango de 365 días atrás desde ahora
function defaultTimeRange(daysBack = 365) {
  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 24 * 3600 * 1000);
  return { start: toISO(start), end: toISO(end) };
}

function buildBBoxFromPoint(lat, lon, halfSpan = 0.25) {
  return {
    lat1: (lat + halfSpan).toFixed(6),
    lon1: (lon - halfSpan).toFixed(6),
    lat2: (lat - halfSpan).toFixed(6),
    lon2: (lon + halfSpan).toFixed(6),
  };
}

/******************************************
 * MAPA LEAFLET
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
  if (pointInfo) pointInfo.textContent = `📍 Coordenadas: ${lat}, ${lon}`;
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
 * ENVÍO AUTOMÁTICO AL BACKEND
 ******************************************/
function showCTAs() {
  if (!ctas) return;
  attachEndpointHandlers();
  ctas.classList.remove("hidden");
}

function attachEndpointHandlers() {
  const btnGrid = ctas.querySelector('a[data-endpoint="grid"]');
  const btnTS = ctas.querySelector('a[data-endpoint="timeseries"]');

  [btnGrid, btnTS].forEach(btn => {
    if (!btn || btn.dataset.bound === "1") return;

    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      if (!lastLatLng) return alert("Selecciona un punto primero.");

      // 🔹 rango automático: desde hace 365 días hasta hoy
      const { start, end } = defaultTimeRange(365);

      const model = document.getElementById("model").value || "era5";
      const params = document.getElementById("params").value || "t_2m:C";
      const step = document.getElementById("step").value || "PT9H";
      const res_lat = document.getElementById("res_lat").value || "0.02";
      const res_lon = document.getElementById("res_lon").value || "0.02";
      const lat = Number(lastLatLng.lat);
      const lon = Number(lastLatLng.lng);

      const type = btn.dataset.endpoint;
      let url = "";

      if (type === "timeseries") {
        const qs = new URLSearchParams({
          lat: lat.toFixed(6),
          lon: lon.toFixed(6),
          start, end, step, model, params
        });
        url = `${API.timeseries}?${qs.toString()}`;
      } else {
        const bbox = buildBBoxFromPoint(lat, lon, 0.25);
        const qs = new URLSearchParams({
          ...bbox, res_lat, res_lon, valid_time: "now", model, params
        });
        url = `${API.grid}?${qs.toString()}`;
      }

      console.log("🌐 GET:", url);
      const originalText = btn.textContent;
      btn.textContent = "Consultando...";
      btn.classList.add("opacity-70", "pointer-events-none");

      try {
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("application/json")) {
          const data = await resp.json();
          console.log("✅ JSON:", data);
          alert("Consulta exitosa (ver consola)");
        } else {
          const blob = await resp.blob();
          const href = URL.createObjectURL(blob);
          window.open(href, "_blank");
        }
      } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
      } finally {
        btn.textContent = originalText;
        btn.classList.remove("opacity-70", "pointer-events-none");
      }
    });

    btn.dataset.bound = "1";
  });
}
