# Atribuciones y licencias

El código de GeoSVG se distribuye bajo MIT, © 2026 xdCL.

## Cartografía

Fuente: **Biblioteca del Congreso Nacional de Chile (BCN)**, [Mapas vectoriales](https://www.bcn.cl/siit/mapas_vectoriales/). Capa `comunas_final.zip`, `comunas.shp`, consultada el 10 de octubre de 2026.

La página autoriza el uso libre de la información con atribución a BCN. No ofrece una licencia SPDX para esta capa. La licencia MIT del código no sustituye esas condiciones. Los SVG exportados incluyen la fuente y las limitaciones en sus metadatos; en publicaciones de PNG debe indicarse también la atribución.

BCN describe la cartografía como referencial, dependiente de distintas ediciones y sin precisión geodésica. La representación de límites no compromete al Estado de Chile. Consulte las condiciones completas en la fuente.

El registro de Antártica, CUT 12202, sin geometría, se verificó en el [catálogo de comunas de MINSAL](https://interoperabilidad.minsal.cl/fhir/ig/eis/0.2.0/CodeSystem-eis-comunas-cs.json.html). No se agregó un polígono de otra fuente ni un límite dibujado manualmente.

## Tipografías

[Fraunces](https://fonts.google.com/specimen/Fraunces) e [Inter](https://fonts.google.com/specimen/Inter), disponibles en Google Fonts, se sirven desde los paquetes locales `@fontsource/fraunces` y `@fontsource/inter`; no se contacta a Google Fonts ni a un CDN. Ambas usan SIL Open Font License 1.1. Las licencias completas están en `docs/licenses/`. La interfaz incluye alternativas Georgia y system-ui. Los nombres y leyendas pueden usar Inter, Fraunces o Arial; cuando se elige una fuente de Google y hay texto visible, el SVG incrusta su WOFF2, atribución y licencia completa. Arial conserva la representación de proyectos anteriores y depende de las fuentes del sistema.

## Bibliotecas

React, Vite, TypeScript, Zustand, Zod, D3-geo, TopoJSON-client, Polygon-clipping, Polylabel, Vitest, Playwright, axe-core, Mapshaper y JSTS conservan sus respectivas licencias. `package-lock.json` fija las versiones instaladas. Mapshaper y JSTS solo participan en el procesamiento y la validación de datos; no forman parte de la aplicación publicada.
