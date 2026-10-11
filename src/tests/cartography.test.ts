import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { geoContains, geoPath, geoMercator } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { JSDOM } from 'jsdom';
import type { CommuneTopology } from '../types';
import { buildScene, colorFor, d3Geometry, unionCommunes, validateUnion } from '../lib/geo/scene';
import { svgString } from '../lib/svg/export';
import { slepPreset } from '../data/presets';
import { catalog } from '../data/catalog';
import { normalizeUnion } from '../lib/geo/union.mjs';

const topology = JSON.parse(readFileSync('public/data/regions/07.topo.json', 'utf8')) as CommuneTopology;
const project = () => structuredClone(slepPreset.project);
describe('Cartografía auténtica y encuadre', () => {
  it('el mapa contextual conserva las 30 comunas de Maule y sus colores exactos', () => {
    const s = buildScene(topology, project(), [1000, 800]); expect(s.paths).toHaveLength(30); expect(s.paths.filter(p => p.selected)).toHaveLength(7);
    expect(s.paths.find(p => p.cut === '07401')?.fill).toBe('#0066CC'); expect(s.paths.find(p => p.cut === '07101')?.fill).toBe('#D9DDE3'); expect(s.internal.length).toBeGreaterThan(50);
  });
  it('solo selección representa siete comunas y la silueta elimina fronteras internas', () => {
    const p = project(); p.map.mode = 'selected'; expect(buildScene(topology, p).paths).toHaveLength(7);
    p.map.mode = 'silhouette'; const s = buildScene(topology, p); expect(s.paths).toHaveLength(7); expect(s.internal).toBe(''); expect(s.silhouette).toBeTruthy();
    const union = unionCommunes(topology, new Set(p.selected)); expect(union.type).toBe('MultiPolygon'); expect(union.coordinates.length).toBeGreaterThan(0);
    const interior = mesh(topology, { type: 'GeometryCollection', geometries: topology.objects.communes.geometries.filter(g => p.selected.includes(String(g.id))) }, (a, b) => a !== b);
    expect(interior.coordinates.length).toBeGreaterThan(0); expect(s.silhouette).not.toBe(geoPath(geoMercator())(interior));
  });
  it('mantiene selecciones discontinuas como MultiPolygon', () => { const union = unionCommunes(topology, new Set(['07401', '07103'])); expect(union.coordinates.length).toBeGreaterThanOrEqual(2); });
  it('separa un anillo que se toca en un vértice sin conectar territorios', () => { const fixed = normalizeUnion({ type: 'MultiPolygon', coordinates: [[[[0,0],[1,0],[1,1],[2,1],[2,2],[1,2],[1,1],[0,1],[0,0]]]] }); expect(fixed.coordinates).toHaveLength(2); fixed.coordinates.forEach(p => expect(p[0][0]).toEqual(p[0].at(-1))); });
  it('genera un ámbito provincial con sus ocho comunas', () => { const p = project(); p.scope.province = '074'; const s = buildScene(topology, p); expect(s.paths).toHaveLength(8); expect(s.paths.every(c => c.cut.startsWith('074'))).toBe(true); });
  it('reporta errores geométricos y selecciones vacías', () => {
    expect(() => unionCommunes(topology, new Set())).toThrow(); expect(() => validateUnion({ type: 'MultiPolygon', coordinates: [] })).toThrow();
    const p = project(); p.map.mode = 'selected'; p.selected = []; expect(() => svgString(buildScene(topology, p), p)).toThrow();
  });
  it('los puntos de etiqueta quedan dentro de sus polígonos', () => {
    const fc = feature(topology, topology.objects.communes);
    for (const f of fc.features) { const c = catalog.communes.find(c => c.cut === String(f.id))!; expect(geoContains(d3Geometry(f.geometry as never), c.label!)).toBe(true); }
  });
  it('ajusta formatos sin deformar geometrías y respeta márgenes', () => {
    const p = project(); p.export.aspect = 'square'; const s = buildScene(topology, p); expect(s.width).toBe(s.height);
    for (const path of s.paths) { expect(path.d).not.toMatch(/NaN|Infinity/); }
    p.export.aspect = 'wide'; const wide = buildScene(topology, p); expect(wide.width / wide.height).toBeCloseTo(16 / 9, 2);
  });
  it('el color de grupo tiene prioridad y no modifica los datos', () => { const p = project(); p.groups = [{ id: 'g', name: 'A', color: '#FFCC00', cuts: ['07401'] }]; expect(colorFor('07401', p)).toBe('#FFCC00'); expect(topology.objects.communes.geometries.find(g => g.id === '07401')?.properties).toEqual({ cut: '07401' }); });
  it('rechaza una leyenda que no cabe y un encuadre vacío', () => { const p = project(); p.export.aspect = 'custom'; p.export.height = 100; p.map.legend = true; expect(() => buildScene(topology, p)).toThrow(); p.map.legend = false; p.selected = []; p.export.frame = 'selection'; expect(() => buildScene(topology, p)).toThrow(); });
});
describe('Exportación SVG', () => {
  it('produce XML válido, paths editables, metadatos e identificadores estables sin raster', () => {
    const p = project(); p.map.labels = 'selected'; p.map.legend = true; const s = buildScene(topology, p); const svg = svgString(s, p);
    const xml = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
    expect(xml.querySelector('parsererror')).toBeNull(); expect(xml.documentElement.getAttribute('viewBox')).toBe(`0 0 ${s.width} ${s.height}`);
    expect(xml.querySelector('#comuna-07401')?.getAttribute('fill')).toBe('#0066CC'); expect(xml.querySelector('metadata')?.textContent).toContain('Biblioteca del Congreso');
    expect(xml.querySelectorAll('image,script,foreignObject')).toHaveLength(0); expect(xml.querySelectorAll('#etiquetas text').length).toBeGreaterThan(0); expect(xml.querySelector('#leyenda')).toBeTruthy();
  });
  it('la exportación habitual no depende del zoom; el encuadre actual es explícito', () => {
    const p = project(); const s = buildScene(topology, p); const normal = svgString(s, p); expect(normal).not.toContain('scale(');
    expect(svgString(s, p, { zoom: 2, x: 30, y: 40 })).toContain('translate(30 40) scale(2)'); expect(svgString(s, p)).toBe(normal);
  });
  it('exporta la unión como un único path territorial sin límites internos', () => {
    const p = project(); p.map.mode = 'silhouette'; const xml = new JSDOM(svgString(buildScene(topology, p), p), { contentType: 'image/svg+xml' }).window.document;
    expect(xml.querySelectorAll('#territorio path')).toHaveLength(2); expect(xml.querySelector('#silueta-territorial')).toBeTruthy(); expect(xml.querySelector('[id^="comuna-"]')).toBeNull(); expect(xml.querySelector('#limites-comunales')).toBeNull();
  });
});
