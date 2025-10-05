document.addEventListener("DOMContentLoaded", () => {
  // ===== Config =====
  const API_BASE = "http://127.0.0.1:8000";
  const PATH_PREFIX = "/api/meteo";
  const PARAM = "t_2m:C";   // parámetro raster
  const RES = 0.02;         // res_lat/res_lon
  const HALF = 0.5;         // bbox +/- en grados
  const FMT = "geotiff";    // formato esperado

  // ===== Helpers =====
  const gridUrl = ({ lat1, lon1, lat2, lon2, resLat, resLon, param, fmt }) =>
    `${API_BASE}${PATH_PREFIX}/grid?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}` +
    `&res_lat=${resLat}&res_lon=${resLon}&valid_time=now&params=${encodeURIComponent(param)}&fmt=${fmt}`;

  // ===== UI refs =====
  const coordsEl = document.getElementById("coords");
  const sendBtn = document.getElementById("sendBtn");
  const infoBtn = document.getElementById("infoBtn");
  const infoPopup = document.getElementById("infoPopup");
  const mapContainer = document.querySelector(".map-container");
  const mapaTif = document.getElementById("mapaTif");

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

  // ===== Panel GeoTIFF =====
  let gridMap = null;
  let geotiffLayer = null;
  let gridRect = null;      // celda resaltada
  let cellMarker = null;    // marca centro de celda

  function ensureGridMap() {
    if (gridMap) return;
    mapContainer.classList.add("minimizado");
    mapaTif.classList.remove("hidden"); mapaTif.classList.add("visible");
    mapaTif.innerHTML = `<div id="map_grid_canvas" style="width:100%;height:100%"></div>`;
    gridMap = L.map("map_grid_canvas", { zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(gridMap);
    addGraticule(0.5);
  }

  function addGraticule(step=0.5) {
    const lines = [];
    for (let lat=-90; lat<=90; lat+=step) lines.push([[lat,-180],[lat,180]]);
    for (let lon=-180; lon<=180; lon+=step) lines.push([[-90,lon],[90,lon]]);
    L.polyline(lines, { color: '#ffffff', opacity: 0.2, weight: 1, interactive: false }).addTo(gridMap);
  }

  function snapCell(lat, lon, resDeg=RES) {
    const lat0 = Math.floor(lat / resDeg) * resDeg;
    const lon0 = Math.floor(lon / resDeg) * resDeg;
    return L.latLngBounds([[lat0, lon0], [lat0 + resDeg, lon0 + resDeg]]);
  }

  async function loadGeoTiff(lat, lon, { param = PARAM, res = RES, half = HALF } = {}) {
    ensureGridMap();

    if (!(window.L && L.LeafletGeotiff)) {
      alert("Leaflet-Geotiff no cargado. Revisa el orden de scripts en <head>.");
      return;
    }

    const bbox = { lat1: lat + half, lon1: lon - half, lat2: lat - half, lon2: lon + half };
    const url = gridUrl({ ...bbox, resLat: res, resLon: res, param, fmt: FMT });
    console.log("GRID_GEOTIFF_URL:", url);

    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) {
      const txt = await resp.text().catch(()=>"(sin cuerpo)");
      throw new Error(`GeoTIFF HTTP ${resp.status} - ${txt.slice(0,180)}`);
    }
    const arr = await resp.arrayBuffer();
    const blobUrl = URL.createObjectURL(new Blob([arr], { type: "image/tiff" }));

    if (geotiffLayer) { gridMap.removeLayer(geotiffLayer); geotiffLayer = null; }

    const explicitBounds = L.latLngBounds([[bbox.lat2, bbox.lon1], [bbox.lat1, bbox.lon2]]);
    geotiffLayer = new L.LeafletGeotiff(blobUrl, {
      renderer: new L.LeafletGeotiff.Plotty({ colorScale: "viridis", clampLow: true, clampHigh: true }),
      bounds: explicitBounds,
      opacity: 0.85
    }).addTo(gridMap);

    geotiffLayer.once("load", () => {
      const b = geotiffLayer.getBounds?.();
      const target = (b && b.isValid && b.isValid()) ? b : explicitBounds;
      gridMap.fitBounds(target, { padding: [10,10] });
      L.marker([lat, lon]).addTo(gridMap);
    });

    // Hover: resalta celda de la malla a resolución 'res'
    gridMap.off("mousemove");
    gridMap.on("mousemove", ev => {
      const r = snapCell(ev.latlng.lat, ev.latlng.lng, res);
      if (!gridRect) gridRect = L.rectangle(r, { color: '#ffffff', weight: 1, fill: false, opacity: 0.8 }).addTo(gridMap);
      else gridRect.setBounds(r);
    });

    // Click: lee valor por píxel
    gridMap.off("click");
    gridMap.on("click", ev => {
      if (!geotiffLayer) return;
      const v = geotiffLayer.getValueAtLatLng(ev.latlng.lat, ev.latlng.lng);
      if (v != null && !Number.isNaN(v)) {
        document.getElementById("tempDato").textContent = `${(+v).toFixed(1)} °C`;
      }
      const r = snapCell(ev.latlng.lat, ev.latlng.lng, res);
      const c = r.getCenter();
      if (!cellMarker) cellMarker = L.circleMarker(c, { radius: 4, weight: 2, color: '#fff', fillOpacity: 0 }).addTo(gridMap);
      else cellMarker.setLatLng(c);
    });

    // UI resultados
    document.getElementById("resultados").classList.remove("hidden");
    document.getElementById("infoSeleccion").textContent = `📍 Ubicación: Lat ${lat}, Lng ${lon}`;
  }

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

  // Logs útiles
  console.log("Leaflet:", !!window.L, "Leaflet-Geotiff:", !!(window.L && L.LeafletGeotiff));
  window.addEventListener("error", e => console.error("WindowError:", e.error || e.message));
  window.addEventListener("unhandledrejection", e => console.error("PromiseRejection:", e.reason));
});
