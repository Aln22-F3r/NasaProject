// Inicializar mapa
const map = L.map('map').setView([19.4326, -99.1332], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19,
}).addTo(map);

// Elementos del DOM
let marker;
const coordsEl = document.getElementById('coords');
const sendBtn = document.getElementById('sendBtn');
const qualitySel = document.getElementById('quality');
const infoBtn = document.getElementById('infoBtn');
const infoPopup = document.getElementById('infoPopup');

// Función para colocar marcador y actualizar UI
function setPoint(latlng) {
  if (marker) map.removeLayer(marker);

  const lat = latlng.lat.toFixed(6);
  const lng = latlng.lng.toFixed(6);

  marker = L.marker(latlng)
    .addTo(map)
    .bindPopup(`Lat: ${lat}<br>Lng: ${lng}`)
    .openPopup();

  coordsEl.textContent = `Lat: ${lat} | Lng: ${lng}`;
  sendBtn.classList.add('activo');
  qualitySel.disabled = false;
}

// Eventos del mapa
map.on('click', (e) => setPoint(e.latlng));

L.Control.geocoder({ defaultMarkGeocode: false, placeholder: 'Buscar lugar...', position: 'topleft' })
  .on('markgeocode', (e) => {
    const center = e.geocode.center;
    map.fitBounds(e.geocode.bbox);
    setPoint(center);
  })
  .addTo(map);

// Enviar datos
sendBtn.addEventListener('click', () => {
  if (!marker) return alert('Selecciona primero una posición en el mapa.');

  const lat = marker.getLatLng().lat.toFixed(6);
  const lng = marker.getLatLng().lng.toFixed(6);
  const quality = qualitySel.value;

  alert(`Listo para enviar al backend:\nLat: ${lat}\nLng: ${lng}\nCalidad: ${quality}`);
});

// Mostrar/Ocultar popup de info
infoBtn.addEventListener('click', () => {
  infoPopup.style.display = infoPopup.style.display === 'block' ? 'none' : 'block';
});
