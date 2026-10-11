# Validación de la entrega

Fecha: 10 de octubre de 2026. Entorno: Windows, Node.js 24.14.1, Chrome; móvil emulado con perfil iPhone 13 en Chromium.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Importación oficial BCN | 16 regiones, 56 provincias, 346 comunas en catálogo; 345 con geometría |
| Geometrías | CUT únicos, jerarquía, anillos cerrados, coordenadas finitas en WGS84 y validez OGC JSTS |
| Archivos regionales | 16 existentes; correspondencia exacta entre geometrías y comunas disponibles del catálogo |
| Unión | Uniones de las 16 regiones y del preset SLEP válidas; normalización de anillos que se tocan en un vértice |
| Vitest | **34 pruebas aprobadas**: selección, búsqueda, HEX, persistencia y recuperación de datos anteriores a GeoSVG, JSON, fuentes y compatibilidad de proyectos, grupos, preset, provincias, encuadres, etiquetas, unión y SVG |
| Playwright | **12 pruebas aprobadas**: seis flujos en escritorio y los mismos seis en móvil emulado; incluye crear, duplicar, renombrar y eliminar paletas, asignar grupos, reutilizar proyectos JSON y tipografías opcionales |
| Tipografías | Inter y Fraunces cargadas desde el WOFF2 incluido en el SVG sin conexión; diferencias de píxeles verificadas frente a la fuente de sustitución y al mapa sin nombres; siete nombres, treinta nombres y ausencia de nombres comprobados |
| Flujo obligatorio | Preset SLEP de siete comunas → HEX `#E45D47` → SVG XML válido con colores y metadatos verificados |
| PNG | Archivo PNG válido de 2000 × 2000 px para SVG de 1000 × 1000 a 2×; esquina con alfa 0 |
| Navegación | Clic, activación por teclado, conservación del foco, zoom y exportación independiente de navegación |
| Temas y accesibilidad automática | Axe con reglas WCAG 2/2.1/2.2 A/AA: sin infracciones en las vistas probadas, claro y oscuro |
| Cobertura en navegador | Carga de las 16 regiones y Chile; selección global conservada; Rapa Nui y Juan Fernández presentes |
| TypeScript y Vite | Compilación correcta, modo estricto |
| npm audit | 0 vulnerabilidades después de actualizar dependencias |

Los resultados de navegador se regeneran con `npm run test:e2e`. Las capturas comprobadas están en `docs/screenshots/`. Los ejemplos reales descargados durante la prueba integral están en `docs/examples/`: SVG editable y PNG transparente con la selección SLEP en terracota.

Se verificó también el build bajo la ruta de repositorio `/GeoSVG/`, mediante `scripts/verify-build.mjs`: assets, fuentes, Web Worker, capa regional y preset, sin solicitar el archivo nacional en la carga inicial. Para repetirlo en PowerShell:

```powershell
$env:VITE_BASE_PATH = '/GeoSVG/'
npm run build
npm run preview -- --port 4173
# En otra terminal:
node scripts/verify-build.mjs http://127.0.0.1:4173/GeoSVG/
```

## Criterios cumplidos

- Aplicación funcional con cartografía oficial; Maule, provincias y ámbito nacional.
- Selección por CUT, búsqueda sin tildes y variantes habituales; siete comunas del preset SLEP.
- Vista previa SVG, tres modos de representación y unión geométrica real.
- Paletas HEX, grupos, contornos, opacidad, etiquetas, leyenda y fondo transparente.
- Exportación SVG editable y PNG, proporciones y dimensiones configurables.
- Paletas y presets personales, proyecto JSON validado y persistencia local.
- Interfaz responsive, claro/oscuro/automático, controles alternativos accesibles.
- Importación reproducible, pruebas, build y documentación.
- Workflow preparado para GitHub Pages, con assets y datos compatibles con subrutas.

## Pendientes y límites precisos

1. **Cobertura geométrica de 346 comunas:** falta Antártica (`12202`) en la fuente seleccionada. No se ha inventado ni completado su geometría. La cobertura actual de 345 está declarada en la interfaz, en los datos y en los SVG.
2. **Validación externa:** no se han probado dispositivos físicos, Safari, Firefox ni edición manual en Inkscape/Illustrator. Se validaron SVG como XML y contenido vectorial, y PNG en Chromium. No se afirma una auditoría manual completa de WCAG.

El remoto está configurado como [xdCL/GeoSVG](https://github.com/xdCL/GeoSVG). El workflow publica en [GitHub Pages](https://xdcl.github.io/GeoSVG/) después de completar la validación y compilación; sus resultados se consultan en [Actions](https://github.com/xdCL/GeoSVG/actions).

Los recuadros desplazados para islas y el ajuste tipográfico manual de etiquetas no están implementados; el mapa conserva las islas en su posición real y ofrece ocultamiento automático de nombres superpuestos. La zona sin demarcar está preservada como referencia separada y no se dibuja como comuna.

La fuente tiene distintas ediciones anteriores a 2026 y carácter referencial. La simplificación protegida conserva aproximadamente 16,14 % de vértices, incluidos arcos que se retuvieron para asegurar la validez. No permite trabajos geodésicos ni garantiza ausencia absoluta de todo defecto de la fuente.
