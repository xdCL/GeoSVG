import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { feature, merge, neighbors } from 'topojson-client';
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js';
import IsValidOp from 'jsts/org/locationtech/jts/operation/valid/IsValidOp.js';
import { normalizeUnion } from '../../src/lib/geo/union.mjs';
const ROOT = path.resolve(import.meta.dirname, '../..');
const read = async p => JSON.parse(await fs.readFile(path.join(ROOT, p), 'utf8'));
const catalog = await read('src/data/catalog/catalog.json');
const manifest = await read('public/data/source.json');
assert.equal(catalog.regions.length, 16);
assert.equal(catalog.provinces.length, 56);
assert.equal(catalog.communes.length, 346);
assert.equal(new Set(catalog.communes.map(c => c.cut)).size, 346);
const all = await read('public/data/chile.topo.json');
const fc = feature(all, all.objects.communes);
assert.equal(fc.features.length, manifest.coverage.geometryCommunes);
const expectedMissing = new Set(manifest.coverage.unavailable);
assert.deepEqual(catalog.communes.filter(c => !c.available).map(c => c.cut).sort(), [...expectedMissing].sort());
const ids = new Set(fc.features.map(f => String(f.id)));
for (const c of catalog.communes) {
  assert.equal(c.cut.slice(0, 2), c.region);
  assert.equal(c.cut.slice(0, 3), c.province);
  assert(catalog.provinces.some(p => p.code === c.province && p.region === c.region));
  assert.equal(ids.has(c.cut), c.available);
}
const reader = new GeoJSONReader();
const topologicalUnion = (topology, geometries) => normalizeUnion(merge(topology, geometries));
function checkGeometry(f) {
  const validation = new IsValidOp(reader.read(f.geometry));
  assert(validation.isValid(), `Geometría inválida: ${f.id}: ${validation.getValidationError()}`);
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) {
    assert(ring.length >= 4, `Anillo incompleto: ${f.id}`);
    assert.deepEqual(ring[0], ring.at(-1));
    for (const [x, y] of ring) assert(Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90);
  }
}
fc.features.forEach(checkGeometry);
for (const region of catalog.regions) {
  const topo = await read(`public/data/regions/${region.code}.topo.json`);
  const features = feature(topo, topo.objects.communes).features;
  assert.deepEqual(features.map(f => String(f.id)).sort(), catalog.communes.filter(c => c.region === region.code && c.available).map(c => c.cut).sort());
  features.forEach(checkGeometry);
  checkGeometry({ type: 'Feature', id: `union-region-${region.code}`, properties: {}, geometry: topologicalUnion(topo, topo.objects.communes.geometries) });
}
const slep = await read('src/data/presets/slep-los-alamos.json');
assert.equal(slep.selected.length, 7);
assert(slep.selected.every(c => ids.has(c)));
const selected = all.objects.communes.geometries.filter(g => slep.selected.includes(String(g.id)));
checkGeometry({ type: 'Feature', id: 'SLEP', properties: {}, geometry: topologicalUnion(all, selected) });
assert(neighbors(selected).some(n => n.length > 0), 'Se esperaban fronteras compartidas.');
console.log(`Datos válidos: 16 regiones / 56 provincias / 346 comunas en catálogo / ${ids.size} geometrías. Ausencias declaradas: ${[...expectedMissing].join(', ') || 'ninguna'}.`);
