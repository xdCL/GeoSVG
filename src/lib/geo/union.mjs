import polygonClipping from 'polygon-clipping';

function repeatsVertex(ring) {
  const seen = new Set();
  for (let i = 0; i < ring.length - 1; i++) {
    const key = `${ring[i][0]},${ring[i][1]}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
const signedArea = ring => ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);

// A merged topology is already a union. Only self-touching rings need planar normalization.
// Normalizing isolated problematic polygons avoids re-unioning thousands of valid islands.
export function normalizeUnion(geometry) {
  return { type: 'MultiPolygon', coordinates: geometry.coordinates.flatMap(polygon => {
    if (!polygon.some(repeatsVertex)) return [polygon];
    const clockwise = signedArea(polygon[0]) < 0;
    return polygonClipping.union([polygon]).map(p => clockwise ? p.map(r => [...r].reverse()) : p);
  }) };
}
