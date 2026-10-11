# Arquitectura y decisiones

## Responsabilidades

- `src/data/catalog`: jerarquía administrativa, nombres, CUT y puntos internos; sin polígonos.
- `public/data/regions`: topologías regionales bajo demanda. `chile.topo.json` solo se solicita para un ámbito nacional.
- `src/data/presets`: configuraciones territoriales independientes de la interfaz.
- `src/store`: estado Zustand, valores iniciales, selección global y biblioteca local.
- `src/lib/geo`: carga y caché, Web Worker y construcción de escenas con D3-geo y TopoJSON.
- `src/lib/svg`: serialización XML independiente de React, descargas y rasterización Canvas.
- `src/lib/validation`: esquemas Zod estrictos, límites de tamaño y validación de CUT y jerarquía.
- `src/components`: controles territoriales, diseño, grupos, proyectos, mapa y exportación.
- `scripts/geodata`: importación reproducible y validación OGC con JSTS.

Una escena es un objeto serializable: dimensiones, paths, límites y etiquetas. El lienzo interactivo y el exportador consumen la misma escena. La navegación tiene un estado independiente y solo llega al SVG cuando se elige explícitamente “Usar zoom y desplazamiento actuales”. Los anchos de trazo se expresan en píxeles del SVG de salida.

## Geometría

Las selecciones se identifican por CUT, nunca por nombres. La unión usa `topojson.merge`: elimina arcos interiores compartidos y conserva polígonos desconectados. Polygon-clipping normaliza los anillos que solo se tocan en un vértice, detectados en archipiélagos australes, para evitar anillos autointersectados. No se dibujan puentes ni líneas entre territorios. Las topologías regionales proceden de la misma simplificación nacional; para selecciones nacionales, todas las comunas comparten una única topología. Los cálculos se ejecutan en el Worker; las bibliotecas de importación y validación OGC no se envían al navegador.

El borde adicional de selección usa esa unión para el perímetro territorial, restringida a comunas seleccionadas visibles en el ámbito. Cuando toda la escena está seleccionada, reutiliza el contorno exterior. La alternativa por comuna reutiliza cada path seleccionado. `selectionBorderPaths` define los trazados para ambos renderizadores; se dibujan sobre los límites generales, sin interceptar clics en la vista previa. Color y grosor se actualizan sin recalcular la geometría; activación y destino forman parte de la clave del Worker. Un grosor cero omite el borde.

Las geometrías se reproyectan desde EPSG:3857 a EPSG:4326. La representación usa Mercator y `fitExtent`, con margen y una escala uniforme. No se deforma el mapa para llenar formatos forzados. Mercator conserva ángulos locales, pero exagera áreas hacia latitudes australes; no se deben medir superficies sobre estos SVG.

Los puntos de etiquetas se calculan con Polylabel dentro del mayor polígono de cada comuna. No son centroides externos. En pantalla se resuelven colisiones por cajas de texto aproximadas, priorizando las comunas seleccionadas; el usuario puede desactivar el ocultamiento. No constituye un sistema tipográfico automático avanzado.

El Worker carga Inter o Fraunces mediante FontFace y mide los avances reales de los nombres con OffscreenCanvas para calcular las cajas de colisión. Si esas APIs no están disponibles, utiliza la estimación de ancho anterior; la altura de caja sigue siendo aproximada. La clave de caché incluye la fuente. El exportador carga el mismo WOFF2 local, lo convierte en una URL de datos y lo incluye con `@font-face` dentro del SVG, junto con su licencia completa en los metadatos. Las cargas se cachean y las fallidas se pueden reintentar. No se consulta la API de Google Fonts. El SVG conserva elementos `text` editables y Canvas rasteriza ese mismo documento para PNG.

`labelAppearance` comparte los atributos de texto entre la vista previa y el SVG: color, tamaño, peso, cursiva, subrayado, separación entre letras, opacidad y contorno. El contorno usa `paint-order="stroke fill"` para mantener el relleno legible; mayúsculas transforma solo el texto visible, conservando nombres originales y CUT de los polígonos. La leyenda comparte fuente, peso, cursiva y color; mantiene su tamaño y disposición propios. Cada familia tiene variantes locales de peso 400/500/700 normales y cursivas. La caché de WOFF2 y FontFace usa familia, peso y estilo; el SVG incluye únicamente la variante elegida.

Las mediciones del Worker usan el peso y la cursiva efectivos, el texto en mayúsculas cuando corresponde y el espaciado elegido. La resolución de colisiones añade espacio para el contorno y el subrayado. La clave de escena contiene esos ajustes métricos; cambios de color u opacidad no recalculan la geometría.

## Rendimiento

Un Worker procesa proyección, fronteras, unión y etiquetas sin bloquear la interfaz principal. La carga por región se almacena en caché durante la sesión. La caché contiene promesas y descarta las cargas fallidas para permitir reintentos. Se aplica un debounce de 40 ms a cambios del proyecto y se descartan respuestas obsoletas. La topología original queda fuera del estado editable y de los JSON personales.

Canvas rasteriza el SVG final. El límite explícito de PNG es 64 millones de píxeles y 16.000 px por lado, para evitar consumos excesivos de memoria. La exportación SVG no tiene ese límite de rasterización. No hay backend, telemetría, APIs con clave ni servicios externos necesarios en producción.

## Persistencia y seguridad de archivos

Clave local: `geosvg:v1`. Si todavía no existe, recupera los datos guardados con la clave anterior `comunas-svg:v1`; los siguientes cambios se guardan con la nueva clave. Contiene `project` y `library`; el JSON de proyecto exportado contiene solo `project`, con versión 1. Las paletas se intercambian en un archivo propio `{version: 1, palettes: [...]}`. Los presets personales guardan una copia del proyecto.

Los esquemas son estrictos: se rechazan claves desconocidas, HEX inválidos, CUT inexistentes, provincias de otra región y pertenencia duplicada a grupos. Los JSON importados tienen un máximo de 2 MB. No se usa `eval`, HTML importado ni ejecución de contenidos. Los textos del SVG se escapan como XML.

`migrateProject` es el punto único de migración. Como solo existe la versión 1, valida esa versión y rechaza versiones futuras. Al introducir una versión nueva debe añadirse una migración explícita y pruebas de fixtures antiguos, sin eliminar la posibilidad de importarlos.

El campo opcional de entrada `map.labelFont` admite `inter`, `fraunces` y `arial`. Al leer proyectos de versión 1 que no lo contienen se asigna Arial, incluyendo los presets personales de la biblioteca; los proyectos nuevos declaran Inter explícitamente.

`map.selectionBorder` contiene activación, HEX, grosor de 0 a 30 y destino `territory` o `communes`. Los archivos de versión 1 sin este campo reciben un borde desactivado, conservando su apariencia y selección; también se recuperan los presets antiguos de la biblioteca.

`map.labelStyle` contiene los ajustes tipográficos adicionales. La validación limita pesos a 400/500/700, espaciado a 0–8 px, opacidad a 0–1 y contorno a 0–6 px con HEX válido. Si falta, se aplica el estilo regular original: sin cursiva, subrayado, mayúsculas ni contorno, espaciado cero y opacidad completa. El color existente `map.colors.labels` se conserva y sigue formando parte de las paletas.

## Accesibilidad

El selector de checkboxes es la alternativa principal al mapa. Los polígonos tienen nombres, CUT, estado `aria-pressed`, foco y activación por Enter/espacio. Hay mensajes de carga y error, enlace de salto, reducción de movimiento y contraste de interfaz en ambos temas. Las pruebas axe no sustituyen una auditoría manual completa ni garantizan contraste de paletas arbitrarias elegidas por el usuario.
