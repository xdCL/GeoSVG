import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { useEditor, readStorage, STORAGE_KEY } from '../store/editor';
import { freshProject } from '../store/defaults';
import { slepPreset } from '../data/presets';
import { catalog, knownCuts } from '../data/catalog';
import { parseProject } from '../lib/validation/project';
import { buildScene, colorFor } from '../lib/geo/scene';
import { layerFor, layerLabelGeometry, projectForLabel } from '../lib/geo/layers';
import { svgString } from '../lib/svg/export';
import type { CommuneTopology } from '../types';

const topology = JSON.parse(readFileSync('public/data/regions/07.topo.json', 'utf8')) as CommuneTopology;
const validate = (value: unknown) => parseProject(value, knownCuts, new Set(catalog.regions.map(r => r.code)), new Map(catalog.provinces.map(p => [p.code, p.region])));
beforeEach(() => useEditor.getState().reset());

describe('Capas por comuna', () => {
  it('conserva selección y grupos al editar, quitar y recuperar un estilo individual', () => {
    const store = useEditor.getState(); store.load(slepPreset.project);
    store.addGroup('Equipo', '#FFCC00'); store.assignGroup(useEditor.getState().project.groups[0].id);
    store.layer('07402', { fill: '#123456', opacity: 0.6 });
    const selected = [...useEditor.getState().project.selected];
    expect(colorFor('07402', useEditor.getState().project)).toBe('#123456');
    expect(colorFor('07401', useEditor.getState().project)).toBe('#FFCC00');
    expect(useEditor.getState().project.selected).toEqual(selected);
    store.toggle('07402'); expect(layerFor('07402', useEditor.getState().project)).toBeUndefined();
    store.toggle('07402'); expect(colorFor('07402', useEditor.getState().project)).toBe('#123456');
    store.resetLayer('07402'); expect(colorFor('07402', useEditor.getState().project)).toBe('#FFCC00');
    store.colorLayers('#339966');
    expect(Object.keys(useEditor.getState().project.layers).sort()).toEqual([...selected].sort());
    store.layer('13101', { fill: '#111111' }); expect(useEditor.getState().project.layers['13101']).toBeUndefined();
  });

  it('migra proyectos y presets sin capas y rechaza CUT, estilos y colores inválidos', () => {
    const p = freshProject(); const { layers: _layers, ...old } = p;
    const raw = JSON.stringify({ project: old, library: { palettes: [], presets: [{ ...slepPreset, project: old }] } });
    const saved = readStorage({ getItem: key => key === STORAGE_KEY ? raw : null });
    expect(saved.project).toEqual(p); expect(saved.library.presets[0].project.layers).toEqual({});
    for (const layers of [{ '99999': { fill: '#123456' } }, { '07402': { fill: 'red' } }, { '07402': { opacity: 2 } },
      { '07402': { label: { text: 'x'.repeat(101) } } }, { '07402': { label: { sign: { tilt: 31 } } } }]) {
      expect(() => validate({ ...p, layers })).toThrow();
    }
  });

  it('hereda ajustes generales y personaliza únicamente los campos elegidos', () => {
    const p = structuredClone(slepPreset.project);
    p.layers['07402'] = { label: { font: 'fraunces', style: { weight: 700 }, sign: { enabled: true } } };
    p.map.labelStyle.italic = true; p.map.labelSign.depth = 10;
    const local = projectForLabel('07402', p).map;
    expect(local.labelStyle).toMatchObject({ weight: 700, italic: true });
    expect(local.labelSign).toMatchObject({ enabled: true, depth: 10 });
    expect(projectForLabel('07401', p).map.labelFont).toBe('inter');
    expect(p.map.labelStyle.weight).toBe(400); expect(p.map.labelSign.enabled).toBe(false);
  });

  it('exporta relleno, opacidad, borde, alias, fuente y letrero por CUT sin alterar los demás', () => {
    const p = structuredClone(slepPreset.project);
    p.layers['07402'] = { fill: '#D34D68', opacity: 0.6, border: { color: '#273B71', width: 5, lineStyle: 'dashed' },
      label: { visible: true, text: 'Colbún <Norte>', color: '#153B56', font: 'fraunces', size: 18, style: { weight: 700 }, sign: { enabled: true, faceColor: '#FFCF70' } } };
    const scene = buildScene(topology, p);
    const xml = new JSDOM(svgString(scene, p), { contentType: 'image/svg+xml' }).window.document;
    expect(scene.labels.map(l => l.cut)).toEqual(['07402']);
    expect(xml.querySelector('#comuna-07402')?.getAttribute('fill')).toBe('#D34D68');
    expect(xml.querySelector('#comuna-07402')?.getAttribute('opacity')).toBe('0.6');
    expect(xml.querySelector('#comuna-07401')?.getAttribute('fill')).toBe('#0066CC');
    expect(xml.querySelector('#comuna-07402 title')?.textContent).toBe('Colbún · CUT 07402');
    const text = xml.querySelector('#etiqueta-07402')!;
    expect(text.textContent).toBe('Colbún <Norte>'); expect(text.getAttribute('font-family')).toBe('Fraunces, serif');
    expect(xml.querySelector('#borde-capa-07402')?.getAttribute('stroke-dasharray')).toBe('6 4');
    expect(xml.querySelector('#letrero-07402 [data-face="front"]')?.getAttribute('fill')).toBe('#FFCF70');
    p.map.labels = 'all'; p.layers['07402'].label!.visible = false;
    expect(buildScene(topology, p).labels.some(label => label.cut === '07402')).toBe(false);
  });

  it('actualiza la geometría de rótulos al cambiar un alias sin recalcular por colores u opacidad', () => {
    const p = structuredClone(slepPreset.project); p.layers['07402'] = { label: { visible: true } };
    const signature = JSON.stringify(layerLabelGeometry(p));
    Object.assign(p.layers['07402'], { fill: '#123456', opacity: 0.5 });
    p.layers['07402'].label!.color = '#112233';
    expect(JSON.stringify(layerLabelGeometry(p))).toBe(signature);
    p.layers['07402'].label!.text = 'Nombre personalizado';
    expect(JSON.stringify(layerLabelGeometry(p))).not.toBe(signature);
  });
});
