import mapshaper from 'mapshaper';
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js';
import IsValidOp from 'jsts/org/locationtech/jts/operation/valid/IsValidOp.js';

const counts = geometry => { const p = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates; return [p.length, p.reduce((sum, rings) => sum + rings.length - 1, 0)]; };
function contains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (Math.abs(a[0] - x) < 1e-10 && Math.abs(a[1] - y) < 1e-10) return true;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// These three Mapshaper APIs are pinned by package-lock.json and exercised by data:validate.
// Keeping arc vertices protects the SAME shared boundary on both adjacent communes.
export function simplifyProtected(collection, percent = 5) {
  const originalCounts = new Map(collection.features.map(f => [f.properties.cut, counts(f.geometry)]));
  const helpers = collection.features.flatMap(f => {
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polygons.flatMap((polygon, pi) => polygon.slice(1).map((ring, ri) => ({ type: 'Feature', properties: { cut: `hole-${f.properties.cut}-${pi}-${ri}` }, geometry: { type: 'Polygon', coordinates: [[...ring].reverse()] } })));
  });
  const dataset = mapshaper.internal.importContent({ json: { filename: 'protected.geojson', content: { ...collection, features: [...collection.features, ...helpers] } } }, {});
  dataset.layers = [mapshaper.cmd.explodeFeatures(dataset.layers[0], dataset.arcs, {})];
  mapshaper.cmd.simplify(dataset, { percentage: percent / 100, keep_shapes: true });
  const reader = new GeoJSONReader();
  const protectedArcs = new Set();
  for (let pass = 0; pass < 25; pass++) {
    const content = mapshaper.internal.exportFileContent(dataset, { format: 'geojson' })[0].content;
    const parts = typeof content === 'string' ? JSON.parse(content) : content.type ? content : JSON.parse(Buffer.from(content).toString());
    const grouped = new Map();
    parts.features.forEach(f => { const key = f.properties.cut; if (key.startsWith('hole-')) return; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(...(f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)); });
    const result = { ...collection, features: collection.features.map(f => ({ ...f, geometry: { type: 'MultiPolygon', coordinates: grouped.get(f.properties.cut) || [] } })) };
    const failures = [];
    for (const f of result.features) {
      const validity = new IsValidOp(reader.read(f.geometry));
      const validCounts = JSON.stringify(counts(f.geometry)) === JSON.stringify(originalCounts.get(f.properties.cut));
      if (!validity.isValid() || !validCounts) failures.push({ cut: f.properties.cut, coordinate: validCounts ? validity.getValidationError()?.getCoordinate() : undefined });
    }
    if (!failures.length) return { collection: result, percent, protectedArcs: protectedArcs.size, passes: pass + 1 };
    const data = dataset.arcs.getVertexData();
    let added = 0;
    for (const failure of failures) {
      const matching = parts.features.map((f, index) => ({ f, index })).filter(({ f }) => f.properties.cut === failure.cut);
      let targets = matching;
      if (failure.coordinate) {
        const { x, y } = failure.coordinate;
        const near = matching.filter(({ f }) => { const p = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; return p.some(r => contains(r[0], x, y)); });
        if (near.length) targets = near;
      }
      for (const { index } of targets) for (const ring of dataset.layers[0].shapes[index] || []) for (const signed of ring) {
        const arc = signed < 0 ? ~signed : signed;
        if (protectedArcs.has(arc)) continue;
        protectedArcs.add(arc); added++;
        for (let i = data.ii[arc]; i < data.ii[arc] + data.nn[arc]; i++) data.zz[i] = Infinity;
      }
    }
    if (!added) {
      // A very narrow coastal corridor can require protecting the remaining rings of that commune.
      for (const failure of failures) for (let index = 0; index < parts.features.length; index++) {
        if (parts.features[index].properties.cut !== failure.cut) continue;
        for (const ring of dataset.layers[0].shapes[index] || []) for (const signed of ring) {
          const arc = signed < 0 ? ~signed : signed;
          if (protectedArcs.has(arc)) continue;
          protectedArcs.add(arc); added++;
          for (let i = data.ii[arc]; i < data.ii[arc] + data.nn[arc]; i++) data.zz[i] = Infinity;
        }
      }
    }
    if (!added) throw new Error(`No se pudo simplificar: ${failures.map(f => f.cut).join(', ')}.`);
    console.log(`Protección adicional: ${failures.length} comunas, ${added} arcos en pasada ${pass + 1}.`);
  }
  throw new Error('La simplificación protegida excedió 25 pasadas.');
}
