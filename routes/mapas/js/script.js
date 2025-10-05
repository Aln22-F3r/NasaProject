    const map = L.map('map').setView([19.4326, -99.1332], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    let marker;
    const coordsEl = document.getElementById('coords');
    const btn = document.getElementById('sendBtn');
    const qualitySel = document.getElementById('quality');

   
    function setPoint(latlng) {
      if (marker) map.removeLayer(marker);

      const lat = latlng.lat.toFixed(6);
      const lng = latlng.lng.toFixed(6);

      marker = L.marker(latlng).addTo(map)
               .bindPopup(`Lat: ${lat}<br>Lng: ${lng}`).openPopup();

      coordsEl.textContent = `Lat: ${lat} | Lng: ${lng}`;

     
      btn.classList.remove('opacity-0', 'pointer-events-none');
      btn.classList.add('opacity-100', 'pointer-events-auto');
      qualitySel.disabled = false;
    }

    map.on('click', (e) => setPoint(e.latlng));

   
    L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: 'Buscar lugar...',
      position: 'topleft'
    })
    .on('markgeocode', (e) => {
      const center = e.geocode.center;
      const bbox = e.geocode.bbox;
      map.fitBounds(bbox);
      setPoint(center);
    })
    .addTo(map);

   
    btn.addEventListener('click', () => {
      
      alert('Listo para enviar al backend (coords + calidad).');
    });