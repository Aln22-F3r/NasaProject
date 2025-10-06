/**
 * =================================================================
 * ANÁLISIS DE VIABILIDAD DE ENERGÍAS RENOVABLES (AÑO COMPLETO)
 * =================================================================
 */

// --- Umbrales para el análisis ---
const UMBRAL_VIENTO_VIABLE_MS = 5.0; // Velocidad en m/s a partir de la cual consideramos un día útil para energía eólica.
const UMBRAL_HUMEDAD_SOLAR = 90;   // Humedad relativa máxima para considerar un día con buen potencial solar.

/**
 * 1. REESTRUCTURA LOS DATOS DEL JSON
 * Transforma el JSON de Meteomatics a un formato más manejable (una lista de días).
 * @param {object} datosJson - El JSON original de la API.
 * @returns {Array<object>} Una lista de objetos, donde cada objeto es un día con todos sus datos.
 */
function parsearDatosAnuales(datosJson) {
    const datosPorFecha = new Map();
    const parametros = datosJson.data;

    // Mapear nombres de parámetro a nombres más amigables
    const mapaNombres = {
        't_2m:C': 'temperatura',
        'dew_point_2m:C': 'puntoRocio',
        'relative_humidity_2m:p': 'humedadRelativa',
        'precip_1h:mm': 'precipitacion',
        'wind_speed_10m:ms': 'velocidadViento'
    };

    parametros.forEach(param => {
        const nombreAmigable = mapaNombres[param.parameter];
        param.coordinates[0].dates.forEach(datoDiario => {
            const fecha = datoDiario.date.split('T')[0]; // Usamos solo la parte de la fecha YYYY-MM-DD
            if (!datosPorFecha.has(fecha)) {
                datosPorFecha.set(fecha, { fecha: new Date(datoDiario.date) });
            }
            datosPorFecha.get(fecha)[nombreAmigable] = datoDiario.value;
        });
    });

    // Convertir el mapa a un array y ordenarlo por fecha
    return Array.from(datosPorFecha.values()).sort((a, b) => a.fecha - b.fecha);
}

/**
 * 2. AGRUPA LOS DATOS DIARIOS POR MES
 * @param {Array<object>} datosDiarios - La lista de datos diarios ya parseada.
 * @returns {Map<string, Array<object>>} Un mapa donde la clave es "YYYY-MM" y el valor es una lista de los días de ese mes.
 */
function agruparPorMes(datosDiarios) {
    const datosMensuales = new Map();
    datosDiarios.forEach(dia => {
        const mesKey = `${dia.fecha.getFullYear()}-${String(dia.fecha.getMonth() + 1).padStart(2, '0')}`;
        if (!datosMensuales.has(mesKey)) {
            datosMensuales.set(mesKey, []);
        }
        datosMensuales.get(mesKey).push(dia);
    });
    return datosMensuales;
}

/**
 * 3. ANALIZA LOS DATOS DE UN SOLO MES
 * @param {string} mesKey - La clave del mes (ej. "2024-10").
 * @param {Array<object>} diasDelMes - La lista de datos diarios para ese mes.
 * @returns {object} Un objeto con el resumen y las métricas del mes.
 */
function analizarDatosMensuales(mesKey, diasDelMes) {
    const totalDias = diasDelMes.length;
    let sumaVelocidadViento = 0;
    let diasVientoViable = 0;
    let diasSolaresViables = 0;
    let precipitacionTotal = 0;

    diasDelMes.forEach(dia => {
        // Análisis Eólico
        sumaVelocidadViento += dia.velocidadViento;
        if (dia.velocidadViento >= UMBRAL_VIENTO_VIABLE_MS) {
            diasVientoViable++;
        }

        // Análisis Solar
        if (dia.precipitacion === 0 && dia.humedadRelativa < UMBRAL_HUMEDAD_SOLAR) {
            diasSolaresViables++;
        }
        precipitacionTotal += dia.precipitacion;
    });
    
    const nombreMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const [anio, mesIndex] = mesKey.split('-').map(Number);

    return {
        mes: nombreMeses[mesIndex - 1],
        anio: anio,
        totalDias: totalDias,
        analisis: {
            eolico: {
                velocidadPromedio: parseFloat((sumaVelocidadViento / totalDias).toFixed(2)),
                diasViables: diasVientoViable,
                porcentajeViabilidad: parseFloat((diasVientoViable / totalDias * 100).toFixed(2))
            },
            solar: {
                precipitacionTotal: parseFloat(precipitacionTotal.toFixed(2)),
                diasViables: diasSolaresViables,
                porcentajeViabilidad: parseFloat((diasSolaresViables / totalDias * 100).toFixed(2))
            }
        }
    };
}

/**
 * 4. CALCULA EL RESUMEN ANUAL
 * @param {Array<object>} analisisMensuales - La lista de resultados de análisis de cada mes.
 * @returns {object} Un objeto con el resumen y la recomendación anual.
 */
function calcularResumenAnual(analisisMensuales) {
    let totalDiasViablesEolico = 0;
    let totalDiasViablesSolar = 0;
    let totalDiasAnio = 0;

    analisisMensuales.forEach(mes => {
        totalDiasViablesEolico += mes.analisis.eolico.diasViables;
        totalDiasViablesSolar += mes.analisis.solar.diasViables;
        totalDiasAnio += mes.totalDias;
    });

    const porcentajeAnualEolico = parseFloat((totalDiasViablesEolico / totalDiasAnio * 100).toFixed(2));
    const porcentajeAnualSolar = parseFloat((totalDiasViablesSolar / totalDiasAnio * 100).toFixed(2));

    let recomendacion = "Ambas opciones tienen un potencial similar.";
    if (porcentajeAnualEolico > porcentajeAnualSolar * 1.15) { // Si es al menos un 15% mejor
        recomendacion = "La energía eólica parece ser la opción más consistente a lo largo del año.";
    } else if (porcentajeAnualSolar > porcentajeAnualEolico * 1.15) {
        recomendacion = "La energía solar parece ser la opción más consistente a lo largo del año.";
    }

    return {
        resumen: {
            eolico: {
                diasViables: totalDiasViablesEolico,
                porcentajeViabilidadAnual: porcentajeAnualEolico
            },
            solar: {
                diasViables: totalDiasViablesSolar,
                porcentajeViabilidadAnual: porcentajeAnualSolar
            }
        },
        recomendacion: recomendacion
    };
}


/**
 * =================================================================
 * FUNCIÓN PRINCIPAL PARA EJECUTAR EL ANÁLISIS
 * =================================================================
 */
function realizarAnalisisCompleto(datosJson) {
    console.log("1. Reestructurando datos...");
    const datosDiarios = parsearDatosAnuales(datosJson);
    
    console.log("2. Agrupando por mes...");
    const datosAgrupados = agruparPorMes(datosDiarios);

    console.log("3. Analizando cada mes...");
    const analisisMensuales = [];
    for (const [mesKey, diasDelMes] of datosAgrupados.entries()) {
        analisisMensuales.push(analizarDatosMensuales(mesKey, diasDelMes));
    }
    
    console.log("4. Calculando resumen anual...");
    const resumenAnual = calcularResumenAnual(analisisMensuales);

    console.log("¡Análisis Completo!");
    return {
        analisisPorMes: analisisMensuales,
        resumenAnual: resumenAnual
    };
}