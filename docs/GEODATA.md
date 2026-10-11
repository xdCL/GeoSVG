# Importar y actualizar cartografía oficial

## Fuente utilizada y decisión

Se compararon las dos fuentes prioritarias:

| Fuente | Evidencia consultada | Resultado |
| --- | --- | --- |
| [IDE SUBDERE / Comunas](https://ide.subdere.gov.cl/project/comunas/) | Declara EPSG:5360 y actualización 2022-11-15; la página de descargas anuncia DPA 2023 | Los botones SHP/KML del proyecto comunal tenían `href` vacío al consultarlos. No se seleccionó ni se redistribuyó una capa sin revisar condiciones. |
| [BCN / Mapas vectoriales](https://www.bcn.cl/siit/mapas_vectoriales/) | Descarga pública, uso libre con atribución, versiones 2014/2017/diciembre 2018 | Se descargó y procesó `comunas_final.zip`. Tiene 345 comunas y una zona sin demarcar. No contiene Antártica. |

URL concreta: `https://obtienearchivo.bcn.cl/obtienearchivo?id=repositorio/10221/10396/5/comunas_final.zip`

SHA-256 del ZIP consultado: `cca97e9c0d8ec28dbceb17242489a80a9ffc817f7bb926f9f5cde5b61eb130a6`.

El archivo tiene `comunas.shp`, `.shx`, `.dbf`, `.prj`, `.CPG`, índices y XML. CPG indica UTF-8. PRJ declara `WGS_1984_Web_Mercator_Auxiliary_Sphere`, equivalente a EPSG:3857. El XML fue creado 2019-10-16 y contiene procesos de atributos hasta junio de 2019; eso no establece una fecha única de actualización geométrica.

## Proceso reproducible

```sh
npm ci
npm run data:import
npm run data:validate
npm run test
npm run build
```

La primera ejecución descarga el ZIP a `.cache/`. Las siguientes reutilizan el archivo. Para consultar una descarga nueva usa otro archivo y `--source`, o retira exclusivamente `.cache/comunas_final.zip`. No elimines las capas versionadas hasta haber validado las nuevas.

Si la descarga falla, la aplicación existente sigue usando los archivos oficiales ya procesados. El importador falla con un mensaje; no genera geometrías de reemplazo.

```sh
npm run data:import -- --source "C:/datos/comunas_final.zip"
npm run data:import -- --source "C:/datos/comunas.shp"
```

El SHP debe tener al lado DBF, PRJ y CPG. Los ZIP se extraen solo para el shapefile elegido y sus archivos relacionados, con nombres planos; las rutas del archivo no se escriben directamente al disco.

## Transformaciones y topología

1. Mapshaper importa UTF-8, reproyecta a WGS84 y ejecuta `-clean` para resolver intersecciones, degeneraciones y defectos de la fuente. Esa limpieza puede eliminar fragmentos redundantes o reparar solapes; no añade cartografía inventada. Las islas y agujeros que se protegen son los de la capa reparada.
2. JSTS valida cada geometría con reglas OGC. Solo si una geometría sigue siendo inválida, se aplica `buffer(0)` y se registra CUT y causa en `geometryRepairs`. Una reparación vacía o inválida detiene el proceso.
3. CUT se toma de `cod_comuna` y se completa con ceros a cinco dígitos. Código provincial: sus tres primeros dígitos. Código regional: `codregion`, comprobado contra los dos primeros dígitos del CUT. Los nombres se normalizan a Unicode NFC y se conserva la presentación de BCN.
4. La simplificación es **nacional y topológica**. Se explotan temporalmente los multipolígonos para que `keep_shapes` proteja cada isla. Los agujeros se protegen con formas auxiliares que se excluyen del resultado.
5. El objetivo inicial es retener 5 % de vértices. Cuando JSTS detecta que un contorno simplificado encierra una isla o genera otro defecto, se conservan los vértices de los arcos afectados. Compartir un arco garantiza la misma frontera en ambos vecinos. Se repite hasta que cada comuna conserva el número de partes y agujeros de la fuente reparada y es válida. La retención efectiva puede superar 5 %; queda en el manifiesto.
6. Se agrupan los polígonos por CUT, se construye TopoJSON y se escriben la topología nacional y 16 regionales con los mismos límites, sin cuantización. Se eliminan arcos no usados de los archivos regionales.
7. Polylabel calcula un punto interior del mayor polígono de cada comuna, con precisión aproximada de 0,0001 grados. El catálogo incluye esos puntos; las pruebas comprueban su pertenencia a los polígonos.

`scripts/geodata/simplify.mjs` utiliza tres interfaces JavaScript de Mapshaper para proteger los vértices de los arcos. `package-lock.json` fija la versión comprobada. Una actualización de Mapshaper exige volver a ejecutar las pruebas y la validación completa.

## Sustituir la fuente

Antes de importar otra capa, confirma cobertura, vigencia, CRS y permiso de redistribución. El importador espera geometrías Polygon/MultiPolygon, 16 regiones, 56 provincias y los códigos CUT administrativos. No admite completar ausencias dibujando polígonos.

Para nombres de campos diferentes crea un JSON, por ejemplo:

```json
{
  "cut": "COD_COMUNA",
  "region": "COD_REGION",
  "name": "NOM_COMUNA",
  "province": "NOM_PROVINCIA",
  "regionName": "NOM_REGION"
}
```

Crea además un JSON de procedencia con `institution`, `page`, `download`, `layer`, `version`, `update`, `originalCrs`, `targetCrs` y `terms`. No atribuyas a BCN una capa de otra institución.

```sh
npm run data:import -- --source "C:/datos/oficial.shp" --fields "C:/datos/campos.json" --metadata "C:/datos/procedencia.json"
npm run data:validate
npm run check
npm run test:e2e
```

El archivo PRJ debe identificar el CRS; GeoJSON debe estar en WGS84 o declarar un CRS que Mapshaper pueda interpretar. Una capa con CRS desconocido se debe reproyectar explícitamente en una herramienta GIS antes de importarla.

Revisa cambios en `src/data/catalog/catalog.json`, `public/data/source.json`, `src/data/catalog/source.json`, `chile.topo.json` y todos los archivos regionales. Comprueba visualmente Maule, Valparaíso con islas, Aysén, Magallanes y Chile. Verifica que el preset SLEP siga correspondiendo a las mismas siete comunas. Conserva las condiciones de uso y la referencia de descarga.

Si una fuente nueva incluye Antártica, actualiza las notas de cobertura y las expectativas de prueba actualmente fijadas para la distribución BCN de 345 geometrías. Si cambia la estructura administrativa oficial, actualiza los conteos y los validadores de manera documentada; no desactives comprobaciones para ocultar diferencias.

## Limitaciones territoriales

- Antártica (`12202`) no tiene polígono en la capa BCN. Su registro de catálogo procede del código oficial publicado por MINSAL.
- La zona sin demarcar (`cod_comuna = 0`) se conserva en `reference.geojson`; no es una comuna y no se mezcla con CUT válidos.
- Rapa Nui, Juan Fernández y archipiélagos australes conservan su posición en los datos. No se usan recuadros desplazados ni se recortan islas para hacer más compacto el lienzo.
- El mapa aplica Mercator; la distorsión de superficie aumenta hacia el sur. No se garantiza precisión geodésica ni vigencia de los límites en 2026.
