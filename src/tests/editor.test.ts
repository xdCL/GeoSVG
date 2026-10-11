import { beforeEach, describe, expect, it } from 'vitest';
import { useEditor, readStorage, STORAGE_KEY } from '../store/editor';
import { freshProject } from '../store/defaults';
import { catalog, searchCommunes, knownCuts } from '../data/catalog';
import { isHex, builtInPalettes } from '../lib/colors/palettes';
import { parseProject, palettesFileSchema, migrateProject } from '../lib/validation/project';
import { slepPreset } from '../data/presets';

const validate = (value: unknown) => parseProject(value, knownCuts, new Set(catalog.regions.map(r => r.code)), new Map(catalog.provinces.map(p => [p.code, p.region])));
beforeEach(() => useEditor.getState().reset());
describe('Catálogo y selección', () => {
  it('tiene 16 regiones, 56 provincias y 346 CUT únicos; declara la ausencia de geometría de Antártica', () => {
    expect(catalog.regions).toHaveLength(16); expect(catalog.provinces).toHaveLength(56); expect(catalog.communes).toHaveLength(346); expect(knownCuts.size).toBe(346);
    expect(catalog.communes.filter(c => c.available)).toHaveLength(345); expect(catalog.communes.filter(c => !c.available).map(c => c.cut)).toEqual(['12202']);
    for (const c of catalog.communes) { expect(c.cut.slice(0, 2)).toBe(c.region); expect(c.cut.slice(0, 3)).toBe(c.province); expect(catalog.provinces.find(p => p.code === c.province)?.region).toBe(c.region); }
  });
  it('selecciona, deselecciona y mantiene selección al cambiar de región', () => {
    const s = useEditor.getState(); s.toggle('07401'); s.toggle('07402'); s.setScope({ region: '13', province: '' }); expect(useEditor.getState().project.selected).toEqual(['07401', '07402']);
    s.toggle('07401'); expect(useEditor.getState().project.selected).toEqual(['07402']); s.clear(); expect(useEditor.getState().project.selected).toEqual([]);
  });
  it('selecciona todas, invierte dentro del ámbito y conserva comunas exteriores', () => {
    const s = useEditor.getState(); s.toggle('13101'); s.select(['07401', '07402'], 'add'); s.select(['07401', '07402', '07403'], 'invert'); expect(useEditor.getState().project.selected).toEqual(['13101', '07403']);
  });
  it('busca sin tildes, con espacios y por CUT', () => {
    expect(searchCommunes({ region: '07', province: '' }, ' colbun ').map(c => c.cut)).toEqual(['07402']);
    expect(searchCommunes({ region: '07', province: '' }, '07403').map(c => c.name)).toEqual(['Longaví']);
    expect(searchCommunes({ region: '05', province: '' }, 'rapa nui').map(c => c.cut)).toEqual(['05201']);
    expect(searchCommunes({ region: '11', province: '' }, 'ohiggins').map(c => c.cut)).toEqual(['11302']);
  });
  it('el preset solicitado tiene exactamente siete comunas verificadas del Maule', () => {
    expect(slepPreset.project.selected).toHaveLength(7); expect(new Set(slepPreset.project.selected).size).toBe(7);
    expect(slepPreset.project.selected.map(cut => catalog.communes.find(c => c.cut === cut)?.name).sort()).toEqual(['Colbún', 'Linares', 'Longaví', 'Parral', 'Retiro', 'Villa Alegre', 'Yerbas Buenas'].sort()); expect(validate(slepPreset.project)).toEqual(slepPreset.project);
  });
});
describe('Paletas, grupos y portabilidad', () => {
  it.each(['#0066CC', '#aaff09', '#FFFFFF'])('acepta HEX %s', value => expect(isHex(value)).toBe(true));
  it.each(['blue', '#abc', '#00000000', '#GGFFFF', '0066CC'])('rechaza HEX %s', value => expect(isHex(value)).toBe(false));
  it('valida intercambio y persistencia de paletas', () => {
    const palettes = palettesFileSchema.parse({ version: 1, palettes: builtInPalettes }); expect(palettes.palettes).toHaveLength(4);
    const project = freshProject(); project.map.colors.selected = '#123456';
    const raw = JSON.stringify({ project, library: { palettes: [builtInPalettes[0]], presets: [] } });
    const restored = readStorage({ getItem: key => key === STORAGE_KEY ? raw : null }); expect(restored.project.map.colors.selected).toBe('#123456'); expect(restored.library.palettes[0].name).toBe('Institucional');
  });
  it('recupera la biblioteca anterior y prioriza los datos guardados de GeoSVG', () => {
    const project = freshProject(); project.selected = ['07401'];
    const previous = { project, library: { palettes: [builtInPalettes[0]], presets: [slepPreset] } };
    const raw = JSON.stringify(previous);
    expect(readStorage({ getItem: key => key === 'comunas-svg:v1' ? raw : null })).toEqual(previous);
    const current = { project: freshProject(), library: { palettes: [], presets: [] } };
    expect(readStorage({ getItem: key => key === STORAGE_KEY ? JSON.stringify(current) : raw })).toEqual(current);
  });
  it('rechaza JSON inválido, versiones futuras y CUT inexistentes', () => {
    expect(() => migrateProject({ version: 9 })).toThrow(); const p = freshProject(); p.selected = ['99999']; expect(() => validate(p)).toThrow();
    p.selected = []; p.scope = { region: '07', province: '131' }; expect(() => validate(p)).toThrow();
    expect(() => validate({ ...freshProject(), script: 'alert(1)' })).toThrow(); expect(readStorage({ getItem: () => '{bad}' }).project).toEqual(freshProject());
  });
  it('mantiene la tipografía de proyectos anteriores y valida las nuevas fuentes', () => {
    const previous = freshProject(); previous.map.labels = 'selected';
    const { labelFont: _font, ...oldMap } = previous.map;
    const legacy = { ...previous, map: oldMap };
    expect(validate(legacy).map).toEqual({ ...oldMap, labelFont: 'arial' });
    expect(validate({ ...previous, map: { ...previous.map, labelFont: 'fraunces' } }).map.labelFont).toBe('fraunces');
    expect(() => validate({ ...previous, map: { ...previous.map, labelFont: 'url(https://example.com/font)' } })).toThrow();
    const restored = readStorage({ getItem: () => JSON.stringify({ project: legacy, library: { palettes: [], presets: [{ ...slepPreset, project: legacy }] } }) });
    expect(restored.project.map.labelFont).toBe('arial'); expect(restored.library.presets[0].project.map.labelFont).toBe('arial');
  });
  it('recupera proyectos y presets anteriores con el borde opcional desactivado', () => {
    const p = freshProject(); p.selected = ['07401'];
    const { selectionBorder: _border, ...oldMap } = p.map;
    const legacy = { ...p, map: oldMap };
    expect(validate(legacy)).toEqual(p);
    const saved = readStorage({ getItem: key => key === STORAGE_KEY ? JSON.stringify({ project: legacy, library: { palettes: [], presets: [{ id: 'old', name: 'Anterior', description: '', project: legacy }] } }) : null });
    expect(saved.project).toEqual(p); expect(saved.library.presets[0].project.map.selectionBorder.enabled).toBe(false);
  });
  it('guarda el borde de selección y rechaza grosor, color o destino inválidos', () => {
    const p = freshProject(); p.map.selectionBorder = { enabled: true, color: '#aabbcc', width: 12.5, target: 'communes' };
    expect(validate(p).map.selectionBorder).toEqual({ ...p.map.selectionBorder, color: '#AABBCC' });
    for (const patch of [{ width: -1 }, { width: 31 }, { color: 'red' }, { target: 'all' }]) expect(() => validate({ ...p, map: { ...p.map, selectionBorder: { ...p.map.selectionBorder, ...patch } } })).toThrow();
  });
  it('recupera proyectos y presets anteriores conservando el color del texto y su estilo regular', () => {
    const p = freshProject(); p.map.colors.labels = '#123456'; p.map.labels = 'selected';
    const { labelStyle: _style, ...oldMap } = p.map;
    const legacy = { ...p, map: oldMap };
    expect(validate(legacy)).toEqual(p);
    const saved = readStorage({ getItem: key => key === STORAGE_KEY ? JSON.stringify({ project: legacy, library: { palettes: [], presets: [{ id: 'old', name: 'Anterior', description: '', project: legacy }] } }) : null });
    expect(saved.project).toEqual(p); expect(saved.library.presets[0].project.map.labelStyle).toEqual(p.map.labelStyle);
  });
  it('valida todos los estilos del texto y sus límites sin aceptar CSS externo', () => {
    const p = freshProject(); p.map.labelSize = 80;
    p.map.labelStyle = { weight: 700, italic: true, underline: true, uppercase: true, letterSpacing: 8, opacity: 0.5, haloEnabled: true, haloColor: '#aabbcc', haloWidth: 6 };
    expect(validate(p).map.labelStyle).toEqual({ ...p.map.labelStyle, haloColor: '#AABBCC' });
    for (const patch of [{ weight: 900 }, { letterSpacing: -1 }, { letterSpacing: 9 }, { opacity: 1.1 }, { haloWidth: 7 }, { haloColor: 'url(https://example.com)' }, { italic: 'true' }]) expect(() => validate({ ...p, map: { ...p.map, labelStyle: { ...p.map.labelStyle, ...patch } } })).toThrow();
  });
  it('reasigna comunas sin duplicar pertenencia y permite quitar y ordenar grupos', () => {
    const s = useEditor.getState(); s.addGroup('A', '#0066CC'); s.addGroup('B', '#FFCC00');
    const [a, b] = useEditor.getState().project.groups; s.toggle('07401'); s.assignGroup(a.id); s.assignGroup(b.id);
    expect(useEditor.getState().project.groups[0].cuts).toEqual([]); expect(useEditor.getState().project.groups[1].cuts).toEqual(['07401']);
    s.moveGroup(b.id, -1); expect(useEditor.getState().project.groups[0].id).toBe(b.id); s.ungroup(); expect(useEditor.getState().project.groups.flatMap(g => g.cuts)).toEqual([]);
  });
});
