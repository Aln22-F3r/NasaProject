// js/app.js

document.addEventListener('DOMContentLoaded', function () {
    // --- INICIALIZACIÓN ---
    inicializarMapa();
    
    // Ejecutar el análisis con los datos cargados desde data.js
    const analisisCompleto = realizarAnalisisCompleto(tus_datos_json);
    
    // Mostrar los resultados en la página
    mostrarResumenAnual(analisisCompleto.resumenAnual);
    renderizarGraficoPrincipal(analisisCompleto.analisisPorMes);

    // --- EVENT LISTENERS ---
    const botonDescarga = document.getElementById('descargarCsvBtn');
    botonDescarga.addEventListener('click', () => {
        descargarResumenCSV(analisisCompleto.analisisPorMes);
    });
});

/**
 * Inicializa el mapa de Leaflet.
 */
function inicializarMapa() {
    const map = L.map('map').setView([19.4326, -99.1332], 10); // Centrado en CDMX
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([19.4326, -99.1332]).addTo(map)
        .bindPopup('Datos de análisis para esta ubicación.')
        .openPopup();

    // Aquí podrías añadir la lógica para que el clic en el mapa
    // realizara un nuevo fetch al backend en un futuro.
}

/**
 * Muestra el resumen anual en la tarjeta de información.
 * @param {object} resumenAnual 
 */
function mostrarResumenAnual(resumenAnual) {
    const container = document.getElementById('resumen-anual');
    container.innerHTML = `
        <h4>💨 Energía Eólica</h4>
        <p>${resumenAnual.resumen.eolico.porcentajeViabilidadAnual}% de días viables al año.</p>
        <h4>☀️ Energía Solar</h4>
        <p>${resumenAnual.resumen.solar.porcentajeViabilidadAnual}% de días viables al año.</p>
        <hr>
        <p><strong>Recomendación:</strong> ${resumenAnual.recomendacion}</p>
    `;
}

/**
 * Renderiza el gráfico principal usando Chart.js
 * @param {Array<object>} analisisMensuales 
 */
function renderizarGraficoPrincipal(analisisMensuales) {
    // Pega aquí la función renderizarGraficoPrincipal que ya teníamos
    // ...
}

/**
 * Genera y descarga el archivo CSV
 * @param {Array<object>} analisisMensuales 
 */
function descargarResumenCSV(analisisMensuales) {
    // Pega aquí la función descargarResumenCSV que ya teníamos
    // ...
}