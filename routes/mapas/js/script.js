
const map = L.map("map").setView([19.4326, -99.1332], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

let marker = null;
const coordsEl = document.getElementById("coords");
const sendBtn = document.getElementById("sendBtn");
const qualitySel = document.getElementById("quality");
const infoBtn = document.getElementById("infoBtn");
const infoPopup = document.getElementById("infoPopup");
const mapContainer = document.querySelector(".map-container");
const mapaTif = document.getElementById("mapaTif");

function setPoint(latlng) {
  if (marker) map.removeLayer(marker);

  const lat = latlng.lat.toFixed(6);
  const lng = latlng.lng.toFixed(6);

  marker = L.marker(latlng)
    .addTo(map)
    .bindPopup(`<b>Lat:</b> ${lat}<br><b>Lng:</b> ${lng}`)
    .openPopup();

  coordsEl.textContent = `📍 Lat: ${lat} | Lng: ${lng}`;

  sendBtn.classList.add("activo");
  if (qualitySel) qualitySel.disabled = false;
}

map.on("click", (e) => setPoint(e.latlng));

L.Control.geocoder({
  defaultMarkGeocode: false,
  placeholder: "Buscar lugar...",
  position: "topleft",
})
  .on("markgeocode", (e) => {
    const center = e.geocode.center;
    map.fitBounds(e.geocode.bbox);
    setPoint(center);
  })
  .addTo(map);

// Cambiar color del texto del buscador a negro
setTimeout(() => {
  const input = document.querySelector(
    ".leaflet-control-geocoder-form input"
  );
  if (input) {
    input.style.color = "black";
    input.style.fontWeight = "500";
  }
}, 500);

infoBtn.addEventListener("click", () => {
  const isVisible = infoPopup.style.display === "block";
  infoPopup.style.display = isVisible ? "none" : "block";
});

sendBtn.addEventListener("click", () => {
  if (!marker)
    return alert("⚠️ Selecciona primero una posición en el mapa.");

  const lat = marker.getLatLng().lat.toFixed(6);
  const lng = marker.getLatLng().lng.toFixed(6);
  const quality = qualitySel ? qualitySel.value : "No especificada";

  // Simular datos de la API
  const datos = {
    temperatura: (10 + Math.random() * 10).toFixed(1),
    radiacion: (400 + Math.random() * 300).toFixed(0),
    viento: (5 + Math.random() * 15).toFixed(1),
  };

  // Minimizar mapa principal
  mapContainer.classList.add("minimizado");
  
  // Mostrar mapa TIF
  mapaTif.classList.remove("hidden");
  mapaTif.classList.add("visible");

  // Mostrar contenedor de resultados
  const resultados = document.getElementById("resultados");
  resultados.classList.remove("hidden");

  // Actualizar información textual
  document.getElementById(
    "infoSeleccion"
  ).textContent = `📍 Ubicación: Lat ${lat}, Lng ${lng} (Calidad: ${quality})`;
  document.getElementById("tempDato").textContent = `${datos.temperatura} °C`;
  document.getElementById("radDato").textContent = `${datos.radiacion} W/m²`;
  document.getElementById("vientoDato").textContent = `${datos.viento} km/h`;

  // Crear mini-mapa con el punto seleccionado
  const miniMapContainer = document.getElementById("mapaMini");
  miniMapContainer.innerHTML = "";

  const miniMap = L.map("mapaMini", {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
  }).setView([lat, lng], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
    miniMap
  );
  L.marker([lat, lng]).addTo(miniMap);
});
