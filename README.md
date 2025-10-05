# Backend de aplicacion web Satelitleo

- FastApi
- modelo MVC
- Consumo de API (meteomatics)

# Endpoints

GET:
- api/meteo/timeseries:
Este endpoint me regresa un JSON equivalente a un dato por tiempo
en distintos rangos de tiempos (historial)

GET:
- api/meteo/grid
Este endpoint me regresa archivos csv,tif, png, nc para la visualizacion
de datos, el mas interesante es tif ya que podemos pasar el cursor por arriba
para que muestre pixel por pixel los diferentes datos meteorologicos
