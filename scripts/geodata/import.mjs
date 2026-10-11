import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mapshaper from 'mapshaper';
import { unzipSync } from 'fflate';
import { feature } from 'topojson-client';
import polylabel from 'polylabel';
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js';
import GeoJSONWriter from 'jsts/org/locationtech/jts/io/GeoJSONWriter.js';
import IsValidOp from 'jsts/org/locationtech/jts/operation/valid/IsValidOp.js';
import BufferOp from 'jsts/org/locationtech/jts/operation/buffer/BufferOp.js';
import { simplifyProtected } from './simplify.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const URL = 'https://obtienearchivo.bcn.cl/obtienearchivo?id=repositorio/10221/10396/5/comunas_final.zip';
const args = process.argv.slice(2);
const option = flag => args[args.indexOf(flag) + 1];
const cache = path.join(ROOT, '.cache');
await fs.mkdir(cache, { recursive: true });
let input = args.includes('--source') ? path.resolve(option('--source')) : path.join(cache, 'comunas_final.zip');
if (!args.includes('--source')) {
  try { await fs.access(input); } catch {
    console.log('Descargando cartografía oficial BCN…');
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`BCN respondió ${response.status}. Descargue la capa manualmente y use --source.`);
    await fs.writeFile(input, Buffer.from(await response.arrayBuffer()));
  }
}
const sourceBytes = await fs.readFile(input);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
if (input.toLowerCase().endsWith('.zip')) {
  const files = unzipSync(sourceBytes);
  const destination = path.join(cache, 'import');
  await fs.mkdir(destination, { recursive: true });
  const shp = Object.keys(files).find(k => k.toLowerCase().endsWith('.shp'));
  if (!shp) throw new Error('El ZIP no contiene un shapefile.');
  const stem = shp.slice(0, -4);
  for (const name of Object.keys(files).filter(k => k.startsWith(`${stem}.`))) {
    // Flatten only the selected shapefile's sidecars. Never extract archive paths.
    await fs.writeFile(path.join(destination, path.basename(name)), files[name]);
  }
  input = path.join(destination, path.basename(shp));
}
const quote = value => JSON.stringify(value.replaceAll('\\', '/'));
const command = `-i ${quote(input)} encoding=utf8 -proj wgs84 -clean -o format=geojson`;
const output = await mapshaper.applyCommands(command);
const raw = JSON.parse(Object.values(output)[0]);
const mapFields = args.includes('--fields') ? JSON.parse(await fs.readFile(option('--fields'), 'utf8')) : { cut: 'cod_comuna', region: 'codregion', name: 'Comuna', province: 'Provincia', regionName: 'Region' };
const reader = new GeoJSONReader();
const writer = new GeoJSONWriter();
const repairs = [];
for (const f of raw.features) {
  const g = reader.read(f.geometry);
  const validation = new IsValidOp(g);
  if (!validation.isValid()) {
    repairs.push({ cut: String(f.properties[mapFields.cut]).padStart(5, '0'), issue: String(validation.getValidationError()) });
    const fixed = BufferOp.bufferOp(g, 0);
    if (!new IsValidOp(fixed).isValid() || fixed.isEmpty()) throw new Error('No se pudo reparar una geometría original.');
    f.geometry = writer.write(fixed);
  }
}
const normalized = raw.features.filter(f => Number(f.properties[mapFields.cut]) > 0).map(f => {
  const cut = String(f.properties[mapFields.cut]).padStart(5, '0');
  return { ...f, id: cut, properties: { cut, name: String(f.properties[mapFields.name]).normalize('NFC').trim(), province: cut.slice(0, 3), provinceName: String(f.properties[mapFields.province]).normalize('NFC').trim(), region: String(f.properties[mapFields.region]).padStart(2, '0'), regionName: String(f.properties[mapFields.regionName]).normalize('NFC').trim() } };
}).sort((a, b) => a.id.localeCompare(b.id));
const geojson = { type: 'FeatureCollection', features: normalized };
const simplified = simplifyProtected(geojson);
const topoResult = await mapshaper.applyCommands('-i input.geojson -o format=topojson no-quantization id-field=cut', { 'input.geojson': JSON.stringify(simplified.collection) });
const topology = JSON.parse(Object.values(topoResult)[0]);
topology.objects.communes = Object.values(topology.objects)[0];
for (const key of Object.keys(topology.objects)) if (key !== 'communes') delete topology.objects[key];
const vertices = fc => fc.features.reduce((total, f) => { const p = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; return total + p.flat().reduce((n, r) => n + r.length, 0); }, 0);
const retained = Math.round(vertices(simplified.collection) / vertices(geojson) * 10000) / 100;
const geometries = feature(topology, topology.objects.communes).features;
const area = ring => Math.abs(ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0));
const label = geometry => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const largest = [...polygons].sort((a, b) => area(b[0]) - area(a[0]))[0];
  return polylabel(largest, 0.0001).slice(0, 2);
};
const communes = normalized.map(f => ({ cut: f.id, name: f.properties.name, province: f.properties.province, region: f.properties.region, label: label(geometries.find(g => String(g.id) === f.id).geometry), available: true }));
if (!communes.some(c => c.cut === '12202')) communes.push({ cut: '12202', name: 'Antártica', province: '122', region: '12', label: null, available: false });
communes.sort((a, b) => a.cut.localeCompare(b.cut));
const provinces = [...new Map(normalized.map(f => [f.properties.province, { code: f.properties.province, name: f.properties.provinceName, region: f.properties.region }])).values()].sort((a, b) => a.code.localeCompare(b.code));
const regionOrder = ['15','01','02','03','04','05','13','06','07','16','08','09','14','10','11','12'];
const shortNames = { '01': 'Tarapacá', '02': 'Antofagasta', '03': 'Atacama', '04': 'Coquimbo', '05': 'Valparaíso', '06': 'O’Higgins', '07': 'Maule', '08': 'Biobío', '09': 'La Araucanía', '10': 'Los Lagos', '11': 'Aysén', '12': 'Magallanes', '13': 'Metropolitana', '14': 'Los Ríos', '15': 'Arica y Parinacota', '16': 'Ñuble' };
const regions = regionOrder.filter(code => communes.some(c => c.region === code)).map(code => ({ code, name: normalized.find(f => f.properties.region === code).properties.regionName, shortName: shortNames[code], count: communes.filter(c => c.region === code).length }));
if (communes.length !== 346 || provinces.length !== 56 || regions.length !== 16) throw new Error(`Cobertura inesperada: ${regions.length} regiones / ${provinces.length} provincias / ${communes.length} comunas.`);
for (const g of topology.objects.communes.geometries) g.properties = { cut: String(g.id) };
const dataDir = path.join(ROOT, 'public/data');
await fs.mkdir(path.join(dataDir, 'regions'), { recursive: true });
await fs.mkdir(path.join(ROOT, 'src/data/catalog'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'src/data/catalog/catalog.json'), JSON.stringify({ regions, provinces, communes }, null, 2));
await fs.writeFile(path.join(dataDir, 'chile.topo.json'), JSON.stringify(topology));
for (const region of regions) {
  const ids = new Set(communes.filter(c => c.region === region.code && c.available).map(c => c.cut));
  const subset = { ...topology, objects: { communes: { type: 'GeometryCollection', geometries: topology.objects.communes.geometries.filter(g => ids.has(String(g.id))) } } };
  // Mapshaper prunes unused arcs. Simplification was global; shared borders retain identical coordinates.
  const result = await mapshaper.applyCommands('-i subset.json -o format=topojson no-quantization id-field=cut', { 'subset.json': JSON.stringify(subset) });
  const regional = JSON.parse(Object.values(result)[0]);
  regional.objects.communes = Object.values(regional.objects)[0];
  for (const key of Object.keys(regional.objects)) if (key !== 'communes') delete regional.objects[key];
  for (const g of regional.objects.communes.geometries) g.properties = { cut: String(g.id) };
  await fs.writeFile(path.join(dataDir, 'regions', `${region.code}.topo.json`), JSON.stringify(regional));
}
const source = args.includes('--metadata') ? JSON.parse(await fs.readFile(option('--metadata'), 'utf8')) : {
  institution: 'Biblioteca del Congreso Nacional de Chile', page: 'https://www.bcn.cl/siit/mapas_vectoriales/', download: URL,
  layer: 'comunas_final.zip / comunas.shp', version: 'Archivo BCN consultado el 2026-10-10',
  update: 'La página declara ediciones 2014, 2017 y diciembre 2018. XML creado 2019-10-16, últimos procesos de atributos 2019-06-14. No declara actualización única de los límites.',
  originalCrs: 'WGS_1984_Web_Mercator_Auxiliary_Sphere / EPSG:3857', targetCrs: 'WGS84 / EPSG:4326',
  terms: 'Uso libre con atribución a la Biblioteca del Congreso Nacional de Chile. Cartografía referencial, sin precisión geodésica.',
};
const manifest = { ...source, sha256: sourceHash, mapshaperVersion: JSON.parse(await fs.readFile(path.join(ROOT, 'node_modules/mapshaper/package.json'), 'utf8')).version, simplifyTargetPercent: simplified.percent, simplifyRetainedPercent: retained, protectedArcs: simplified.protectedArcs, simplificationPasses: simplified.passes, geometryRepairs: repairs,
  transforms: ['Reproyección WGS84', 'Mapshaper -clean y JSTS buffer(0) solo para geometrías originales inválidas; incidencias registradas en geometryRepairs', 'CUT desde cod_comuna con cinco dígitos; provincia derivada de sus tres primeros dígitos', 'Simplificación global con islas y agujeros protegidos como formas individuales; validez OGC y recuentos comprobados después de la reparación', 'Topologías nacionales y regionales sin cuantización', 'Puntos internos polylabel sobre el mayor polígono de cada comuna'],
  coverage: { regions: regions.length, provinces: provinces.length, catalogCommunes: communes.length, geometryCommunes: geometries.length, unavailable: communes.filter(c => !c.available).map(c => c.cut) },
  limitations: ['No hay polígono de Antártica (12202) en esta capa.', 'El registro Zona sin demarcar (CUT 0) no es una comuna; se conserva por separado como referencia y no participa en selecciones.', 'Los territorios insulares presentes se mantienen en su posición real; no se utilizan recuadros desplazados. La vista nacional resulta muy extendida.', 'Nombres oficiales de presentación tomados de los atributos BCN; Antártica y CUT 12202 verificados en el catálogo público MINSAL.', 'La vigencia de los límites no equivale a 2026.'],
};
await fs.writeFile(path.join(dataDir, 'source.json'), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(ROOT, 'src/data/catalog/source.json'), JSON.stringify(manifest, null, 2));
const references = raw.features.filter(f => Number(f.properties[mapFields.cut]) === 0);
await fs.writeFile(path.join(dataDir, 'reference.geojson'), JSON.stringify({ type: 'FeatureCollection', features: references }));
console.log(`Importación completa: ${regions.length} regiones, ${provinces.length} provincias, ${communes.length} comunas catalogadas, ${geometries.length} con geometría; retención ${retained}%.`);
