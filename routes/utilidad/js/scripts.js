/******************************************
 * CONFIGURACIÓN GLOBAL DE API
 ******************************************/
const API_BASE = "http://127.0.0.1:8000"; // <— ajusta a tu backend real

// Diccionario de parámetros disponibles (si los necesitas más adelante)
const PARAMS_DICT = {
  temp_2m: "t_2m:C",
  rh_2m: "relative_humidity_2m:p",
  dew_2m: "dew_point_2m:C",
  precip_1h: "precip_1h:mm",
  wind_10m: "wind_speed_10m:ms",
  wind_100m: "wind_speed_100m:ms",
  msl: "msl_pressure:hPa",
  ghi: "global_horizontal_irradiance:Wm2",
};

// Endpoints del backend (GET)
const API = {
  grid: `${API_BASE}/api/meteo/grid`,             // ?lat=&lon=&objetivo=&espacial=&temporal=
  timeseries: `${API_BASE}/api/meteo/timeseries`, // ?lat=&lon=&objetivo=&espacial=&temporal=
};

/******************************************
 * MOTOR DE RECOMENDACIÓN
 ******************************************/
function recomendar({ objetivo, espacial, temporal }) {
  let endpoint = "timeseries";
  let confianza = 0.75;

  if (espacial === "poligono") { endpoint = "grid"; confianza = 0.85; }
  if (objetivo === "mapa")     { endpoint = "grid"; confianza = 0.9; }
  if (objetivo === "hist" || objetivo === "now") {
    endpoint = (espacial === "punto") ? "timeseries" : "grid";
    confianza = (espacial === "punto") ? 0.9 : 0.8;
  }
  if (objetivo === "comparar") {
    endpoint = (espacial === "punto") ? "timeseries" : "grid";
    confianza = 0.8;
  }
  if (objetivo === "sitio" && espacial === "punto") {
    endpoint = "timeseries"; confianza = 0.9;
  }

  const catalogo = {
    timeseries: {
      badgeClass: "badge-ts",
      titulo: "Analisis de datos",
      vars: [
        "Temperatura 2m (°C)",
        "Viento 10m (m/s)",
        "Irradiancia global horizontal (W/m²)"
      ],
      ejemplo: ""
    },
    grid: {
      badgeClass: "badge-grid",
      titulo: "Mapa",
      vars: [
        "Temperatura 2m (°C)",
        "Viento 10m (m/s)",
        "Irradiancia directa normal (W/m²)"
      ],
      ejemplo: ""
    }
  };

  const rec = catalogo[endpoint] || catalogo.timeseries;
  return { endpoint, confianza, ...rec };
}

/******************************************
 * DOM REFS
 ******************************************/
const form          = document.getElementById("formCasos");
const objetivoSel   = document.getElementById("objetivo");
const espacialSel   = document.getElementById("espacial");
const temporalSel   = document.getElementById("temporal");
const btnRec        = document.getElementById("recomendar");

const panel         = document.getElementById("resultado");
const badgeEndpoint = document.getElementById("badgeEndpoint");
const badgeConf     = document.getElementById("badgeConf");
const explicacion   = document.getElementById("explicacion");
const varsList      = document.getElementById("vars");
const ejemplo       = document.getElementById("ejemplo");

// Contenedor de botones bajo el mapa (dos CTAs)
const ctas          = document.getElementById("ctas");
// Asegura que arranquen ocultos por si al HTML le faltó "hidden"
if (ctas && !ctas.classList.contains("hidden")) ctas.classList.add("hidden");

/******************************************
 * RENDER DEL RECOMENDADOR
 ******************************************/
function renderRec(r) {
  panel?.classList.remove("hidden");

  if (badgeEndpoint) {
    badgeEndpoint.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${r.badgeClass}`;
    badgeEndpoint.textContent = r.titulo;
  }
  if (badgeConf) badgeConf.textContent = `Confianza: ${(r.confianza * 100).toFixed(0)}%`;

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

  if (ejemplo) ejemplo.textContent = r.ejemplo || "";
}

/******************************************
 * EVENTOS DEL RECOMENDADOR
 ******************************************/
btnRec?.addEventListener("click", () => {
  const datos = {
    objetivo:  objetivoSel?.value,
    espacial:  espacialSel?.value,
    temporal:  temporalSel?.value
  };
  const r = recomendar(datos);
  renderRec(r);
});

form?.addEventListener("reset", () => {
  setTimeout(() => {
    panel?.classList.add("hidden");
    if (ejemplo) ejemplo.textContent = "";
    if (varsList) varsList.innerHTML = "";
    if (badgeEndpoint) { badgeEndpoint.textContent = ""; badgeEndpoint.className = ""; }
    if (badgeConf)     badgeConf.textContent = "";
    if (explicacion)   explicacion.textContent = "";
    ctas?.classList.add("hidden"); // ocultar de nuevo los CTAs al limpiar
  }, 0);
});

// Tarjetas predefinidas
document.querySelectorAll(".case-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tipo = btn.dataset.case;
    const presets = {
      pv:   { objetivo:"mapa", espacial:"poligono", temporal:"min" },
      wind: { objetivo:"hist",  espacial:"punto",    temporal:"hist" },
      temp: { objetivo:"mapa",  espacial:"poligono", temporal:"min" }
    };
    const r = recomendar(presets[tipo]);
    renderRec(r);
    const res = document.getElementById("resultado");
    if (res) {
      window.scrollTo({
        top: res.getBoundingClientRect().top + window.scrollY - 100,
        behavior: "smooth"
      });
    }
  });
});

/******************************************
 * MAPA LEAFLET
 ******************************************/
const map = L.map("map").setView([19.4326, -99.1332], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

let marker = null;
let lastLatLng = null; // último punto seleccionado

// Mostrar CTAs, actualizar href con lat/lon y enganchar GET fetch
function showCTAsWithCoords(latlng) {
  if (!ctas) return;

  lastLatLng = latlng;

  // (Opcional) añade ?lat=&lon= a cada link dentro de #ctas
  ctas.querySelectorAll("a").forEach(a => {
    try {
      const url = new URL(a.getAttribute("href"), window.location.origin);
      url.searchParams.set("lat", latlng.lat.toFixed(6));
      url.searchParams.set("lon", latlng.lng.toFixed(6));
      a.setAttribute("href", url.pathname + url.search);
    } catch {
      // rutas relativas sin origen: ignora
    }
  });

  // Engancha eventos GET al backend (una sola vez por botón)
  attachEndpointHandlers();

  ctas.classList.remove("hidden");
}

function setPoint(latlng) {
  if (marker) map.removeLayer(marker);

  const lat = latlng.lat.toFixed(6);
  const lon = latlng.lng.toFixed(6);

  marker = L.marker(latlng).addTo(map)
    .bindPopup(`<b>Lat:</b> ${lat}<br><b>Lng:</b> ${lon}`)
    .openPopup();

  // Mostrar botones SOLO después de elegir punto
  showCTAsWithCoords(latlng);
}

map.on("click", e => setPoint(e.latlng));

// Geocoder si está cargado en la página
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
} else {
  console.warn("Leaflet Control Geocoder no disponible (asegúrate de incluir sus scripts en el HTML).");
}

/******************************************
 * CTAs -> FETCH GET AL BACKEND
 ******************************************/
function attachEndpointHandlers() {
  const btnGrid = ctas.querySelector('a[data-endpoint="grid"]');
  const btnTS   = ctas.querySelector('a[data-endpoint="timeseries"]');

  [btnGrid, btnTS].forEach(btn => {
    if (!btn || btn.dataset.bound === "1") return;

    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (!lastLatLng) { alert("Selecciona un punto en el mapa."); return; }

      // Construye query
      const params = new URLSearchParams({
        lat: lastLatLng.lat.toFixed(6),
        lon: lastLatLng.lng.toFixed(6),
        objetivo:  objetivoSel?.value || "",
        espacial:  espacialSel?.value || "",
        temporal:  temporalSel?.value || ""
      });

      const type = btn.dataset.endpoint; // "grid" | "timeseries"
      const url  = `${API[type]}?${params.toString()}`;

      const originalText = btn.textContent;
      btn.textContent = "Consultando...";
      btn.classList.add("opacity-70", "pointer-events-none");

      try {
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const ct = (resp.headers.get("content-type") || "").toLowerCase();

        if (ct.includes("application/json")) {
          const data = await resp.json();
          console.log(`✅ Respuesta ${type}:`, data);

          // Ejemplo: guardar y navegar a otra página para visualizar
          // localStorage.setItem(`${type}_result`, JSON.stringify(data));
          // window.location.href = (type === 'grid')
          //   ? '/routes/mapas/html/index.html'
          //   : '/routes/analisis/html/index.html';

          alert("Solicitud completada. Revisa la consola para ver el JSON.");

        } else {
          // Si es archivo (PNG/TIF/CSV...), abrir en nueva pestaña
          const blob = await resp.blob();
          const href = URL.createObjectURL(blob);
          window.open(href, "_blank");
        }

      } catch (err) {
        console.error(err);
        alert("Error al consultar el backend: " + err.message);

      } finally {
        btn.textContent = originalText;
        btn.classList.remove("opacity-70", "pointer-events-none");
      }
    });

    // Evitar registrar múltiples veces si el usuario cambia de punto
    btn.dataset.bound = "1";
  });
}
 