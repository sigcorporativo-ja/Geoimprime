# Geoimprime
**Verisón beta - pruebas**

Geocodificación de direcciones postales y obtención de mapas centrados en las coordenadas obtenidas desde Geoprint,
e inclusión de los datos alfanuméricos e imágenes en ficheros html para su posterior edición.

Ejecucion
---------
npm install  
grunt

Requisitos
----------
- Grunt, node
- Visibilidad de Geoprint Integración (definición plantillas)

Estado actual
------------
- Sólo trabaja con municipio/provincia, no con cod INE.
- Tareas dependientes de los resultados de las anteriores, no pueden llamarse de manera independiente.
- Gestión de errores limitada.
