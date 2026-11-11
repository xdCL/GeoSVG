import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { slepPreset } from '../data/presets';
import { labelLines } from '../lib/fonts/style';
import { buildScene } from '../lib/geo/scene';
import { svgString } from '../lib/svg/export';
import { selectionGradients } from '../lib/colors/gradients';
import { migrateProject } from '../lib/validation/project';
import type { CommuneTopology } from '../types';

const topology = JSON.parse(readFileSync('public/data/regions/07.topo.json', 'utf8')) as CommuneTopology;
const project = () => structuredClone(slepPreset.project);

describe('Rótulos compuestos', () => {
  it('divide Yerbas Buenas sin cortar palabras y permite elegir una línea o saltos manuales', () => {
    const style = project().map.labelStyle;
    expect(labelLines('Yerbas Buenas', style)).toEqual(['Yerbas', 'Buenas']);
    expect(labelLines('Yerbas Buenas', { ...style, wrap: 'single' })).toEqual(['Yerbas Buenas']);
    expect(labelLines('Villa Alegre', { ...style, wrap: 'two-lines' })).toEqual(['Villa', 'Alegre']);
    expect(labelLines('Yerbas\nBuenas', { ...style, wrap: 'single', uppercase: true })).toEqual(['YERBAS', 'BUENAS']);
  });
  it.each([false, true])('mantiene Yerbas Buenas y las siete comunas visibles, con letrero=%s', sign => {
    const p = project(); p.map.labels = 'selected'; p.map.labelSize = 18; p.map.labelSign.enabled = sign;
    const scene = buildScene(topology, p);
    expect(scene.labels).toHaveLength(7);
    const label = scene.labels.find(label => label.cut === '07408')!;
    expect(label.lines).toEqual(['Yerbas', 'Buenas']);
    const xml = new JSDOM(svgString(scene, p), { contentType: 'image/svg+xml' }).window.document;
    expect([...xml.querySelectorAll('#etiqueta-07408 tspan')].map(line => line.textContent?.trim())).toEqual(['Yerbas', 'Buenas']);
    if (sign) expect(xml.querySelector('#letrero-07408')).not.toBeNull();
  });
});

describe('Degradados de selección', () => {
  it('conserva el HEX original y aplica luz y sombra solo a las seleccionadas', () => {
    const p = project(); p.map.selectionGradient.enabled = true;
    p.layers['07402'] = { fill: '#D34D68' };
    const scene = buildScene(topology, p), gradients = selectionGradients(scene, p);
    expect(gradients).toHaveLength(7);
    const own = gradients.find(gradient => gradient.id === 'gradiente-07402')!;
    expect(own.stops[1].color).toBe('#D34D68'); expect(own.stops[0].color).not.toBe(own.stops[2].color);
    expect(scene.paths.find(path => path.cut === '07401')?.fill).toBe('#0066CC');
    const xml = new JSDOM(svgString(scene, p), { contentType: 'image/svg+xml' }).window.document;
    expect(xml.querySelector('#comuna-07401')?.getAttribute('fill')).toBe('url(#gradiente-07401)');
    expect(xml.querySelector('#comuna-07101')?.getAttribute('fill')).toBe('#D9DDE3');
    expect(p.map.colors.selected).toBe('#0066CC'); expect(p.layers['07402'].fill).toBe('#D34D68');
  });
  it('usa el mismo encuadre para un degradado continuo y exporta una silueta con degradado', () => {
    const p = project(); Object.assign(p.map.selectionGradient, { enabled: true, scope: 'selection' });
    const gradients = selectionGradients(buildScene(topology, p), p);
    expect(gradients.every(g => g.units === 'userSpaceOnUse')).toBe(true);
    expect(new Set(gradients.map(g => JSON.stringify([g.x1, g.y1, g.x2, g.y2]))).size).toBe(1);
    p.map.mode = 'silhouette';
    const xml = new JSDOM(svgString(buildScene(topology, p), p), { contentType: 'image/svg+xml' }).window.document;
    expect(xml.querySelectorAll('linearGradient')).toHaveLength(1);
    expect(xml.querySelector('#silueta-territorial')?.getAttribute('fill')).toBe('url(#gradiente-silueta)');
  });
  it('permite intensidad cero y omite todas las definiciones al desactivar el efecto', () => {
    const p = project(); Object.assign(p.map.selectionGradient, { enabled: true, intensity: 0 });
    expect(selectionGradients(buildScene(topology, p), p).every(g => g.stops.every(stop => stop.color.toUpperCase() === '#0066CC'))).toBe(true);
    p.map.selectionGradient.enabled = false;
    expect(svgString(buildScene(topology, p), p)).not.toContain('<linearGradient');
  });
  it('recupera proyectos anteriores y no añade ajustes de línea a estilos parciales de capas', () => {
    const p = project(); const { selectionGradient: _gradient, ...oldMap } = p.map;
    const { wrap: _wrap, ...oldStyle } = oldMap.labelStyle;
    const old = { ...p, map: { ...oldMap, labelStyle: oldStyle }, layers: { '07402': { label: { style: { weight: 700 } } } } };
    const migrated = migrateProject(old);
    expect(migrated.map.selectionGradient.enabled).toBe(false); expect(migrated.map.labelStyle.wrap).toBe('auto');
    expect(migrated.layers['07402'].label?.style?.wrap).toBeUndefined();
    expect(() => migrateProject({ ...p, map: { ...p.map, selectionGradient: { ...p.map.selectionGradient, intensity: 2 } } })).toThrow();
  });
});
