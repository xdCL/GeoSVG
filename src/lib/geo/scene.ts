import { geoArea, geoMercator, geoPath } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import { normalizeUnion } from './union.mjs';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, MultiPolygon as TopoMultiPolygon, Polygon as TopoPolygon } from 'topojson-specification';
import { communeByCut } from '../../data/catalog';
import type { AreaGeometry, CommuneFeature, CommuneTopology, MapScene, Project } from '../../types';

export function d3Geometry(geometry: AreaGeometry): AreaGeometry {
  if (geoArea(geometry) <= 2 * Math.PI) return geometry;
  return geometry.type === 'Polygon'
    ? { ...geometry, coordinates: geometry.coordinates.map(r => [...r].reverse()) }
    : { ...geometry, coordinates: geometry.coordinates.map(p => p.map(r => [...r].reverse())) };
}
export function validateUnion(geometry: MultiPolygon): void {
  if (geometry.type !== 'MultiPolygon' || !geometry.coordinates.length) throw new Error('No se pudo construir una silueta válida.');
  for (const polygon of geometry.coordinates) for (const ring of polygon) {
    if (ring.length < 4 || ring.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1])) || ring[0][0] !== ring.at(-1)?.[0] || ring[0][1] !== ring.at(-1)?.[1]) throw new Error('La unión produjo un anillo inválido. Prueba otra selección.');
  }
}
export function unionCommunes(topology: CommuneTopology, cuts: Set<string>): MultiPolygon {
  const geometries = topology.objects.communes.geometries.filter(g => cuts.has(String(g.id))) as (TopoPolygon | TopoMultiPolygon)[];
  if (!geometries.length) throw new Error('Selecciona al menos una comuna disponible en el ámbito mostrado.');
  const merged = merge(topology, geometries);
  // TopoJSON removes shared arcs. Polygon-clipping separates rings touching at a single vertex,
  // which can otherwise form an OGC-invalid self-touching ring in austral archipelagos.
  const geometry = normalizeUnion(merged);
  validateUnion(geometry);
  return d3Geometry(geometry) as MultiPolygon;
}
export function colorFor(cut: string, project: Project): string {
  return project.groups.find(g => g.cuts.includes(cut))?.color || (project.selected.includes(cut) ? project.map.colors.selected : project.map.colors.unselected);
}
function scopedFeatures(topology: CommuneTopology, project: Project): CommuneFeature[] {
  const all = feature(topology, topology.objects.communes) as FeatureCollection<AreaGeometry, { cut: string }>;
  return all.features.filter(f => {
    const c = communeByCut.get(String(f.id));
    return c && (!project.scope.region || c.region === project.scope.region) && (!project.scope.province || c.province === project.scope.province);
  }).map(f => ({ ...f, geometry: d3Geometry(f.geometry) }));
}
export function exportDimensions(project: Project, features: CommuneFeature[]): [number, number] {
  const { width, height, aspect } = project.export;
  const ratios = { square: 1, portrait: 4 / 5, wide: 16 / 9, a4p: 210 / 297, a4l: 297 / 210 };
  if (aspect === 'custom') return [width, height];
  if (aspect !== 'auto') return [width, Math.round(width / ratios[aspect])];
  if (!features.length) return [width, height];
  const bounds = geoPath(geoMercator().scale(1).translate([0, 0])).bounds({ type: 'FeatureCollection', features });
  const ratio = Math.max(0.1, Math.min(10, (bounds[1][0] - bounds[0][0]) / (bounds[1][1] - bounds[0][1])));
  return [width, Math.min(6000, Math.max(100, Math.round(width / ratio)))];
}
export function buildScene(topology: CommuneTopology, project: Project, fixedDimensions?: [number, number], labelWidths?: Record<string, number>): MapScene {
  const scoped = scopedFeatures(topology, project);
  const selected = new Set(project.selected);
  const displayed = project.map.mode === 'context' ? scoped : scoped.filter(f => selected.has(String(f.id)));
  const fitted = project.export.frame === 'selection' ? displayed.filter(f => selected.has(String(f.id))) : displayed;
  if (project.export.frame === 'selection' && !fitted.length) throw new Error('Selecciona comunas dentro del ámbito para ajustar el encuadre a la selección.');
  const [width, height] = fixedDimensions || exportDimensions(project, fitted.length ? fitted : displayed);
  const blank: MapScene = { width, height, paths: [], external: '', internal: '', silhouette: '', selectionBoundary: '', labels: [] };
  if (!displayed.length) return blank;
  const collection = { type: 'FeatureCollection' as const, features: fitted.length ? fitted : displayed };
  const margin = Math.min(project.map.margin, Math.min(width, height) / 3);
  const legendCount = project.groups.filter(g => displayed.some(f => g.cuts.includes(String(f.id)))).length + (project.map.mode === 'context' ? 2 : 1);
  const legendSpace = project.map.legend ? legendCount * 18 + 16 : 0;
  if (height - margin * 2 - legendSpace <= 0) throw new Error('La leyenda y los márgenes no caben en este formato. Aumenta el alto, reduce el margen o desactiva la leyenda.');
  const projection = geoMercator().fitExtent([[margin, margin], [width - margin, height - margin - legendSpace]], collection);
  const path = geoPath(projection).digits(3);
  const displayedCuts = new Set(displayed.map(f => String(f.id)));
  const objects = topology.objects.communes.geometries.filter(g => displayedCuts.has(String(g.id)));
  const subset: GeometryCollection<{ cut: string }> = { type: 'GeometryCollection', geometries: objects };
  const union = unionCommunes(topology, displayedCuts);
  const external = path(union) || '';
  const selectedCuts = new Set([...displayedCuts].filter(cut => selected.has(cut)));
  const selectionBoundary = project.map.selectionBorder.enabled && project.map.selectionBorder.target === 'territory' && selectedCuts.size
    ? selectedCuts.size === displayedCuts.size ? external : path(unionCommunes(topology, selectedCuts)) || ''
    : '';
  const internal = project.map.showInternal && project.map.mode !== 'silhouette' ? path(mesh(topology, subset, (a, b) => a !== b)) || '' : '';
  const paths = displayed.map(f => {
    const cut = String(f.id);
    const commune = communeByCut.get(cut)!;
    const point = commune.label ? projection(commune.label) : null;
    return { cut, name: commune.name, d: path(f) || '', fill: colorFor(cut, project), selected: selected.has(cut), label: point ? [point[0], point[1]] as [number, number] : undefined };
  });
  const boxes: [number, number, number, number][] = [];
  const labels: MapScene['labels'] = [];
  for (const p of [...paths].sort((a, b) => Number(b.selected) - Number(a.selected))) {
    if (!p.label || project.map.labels === 'none' || (project.map.labels === 'selected' && !p.selected)) continue;
    const [x, y] = p.label;
    if (x < margin || y < margin || x > width - margin || y > height - margin) continue;
    const w = labelWidths?.[p.cut] ?? p.name.length * project.map.labelSize * 0.56;
    const h = project.map.labelSize * 1.2;
    const box: [number, number, number, number] = [x - w / 2 - 2, y - h / 2 - 2, x + w / 2 + 2, y + h / 2 + 2];
    if (project.map.hideCollisions && boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    boxes.push(box);
    labels.push({ cut: p.cut, name: p.name, x, y });
  }
  const bounds = path.bounds({ type: 'FeatureCollection', features: scoped });
  const scopeBounds: [number, number, number, number] = [bounds[0][0], bounds[0][1], bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]];
  return { width, height, paths, external, internal, silhouette: project.map.mode === 'silhouette' ? external : '', selectionBoundary, labels, scopeBounds };
}
export function geometryPartCount(geometry: Polygon | MultiPolygon) { return geometry.type === 'Polygon' ? 1 : geometry.coordinates.length; }
