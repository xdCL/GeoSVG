import { create } from 'zustand';
import { catalog, knownCuts } from '../data/catalog';
import { freshProject } from './defaults';
import { parseProject, safeLibrary } from '../lib/validation/project';
import type { Library, MapOptions, Palette, Preset, Project, Scope, ExportOptions } from '../types';

export const STORAGE_KEY = 'geosvg:v1';
const LEGACY_STORAGE_KEY = 'comunas-svg:v1';
const parse = (value: unknown) => parseProject(value, knownCuts, new Set(catalog.regions.map(r => r.code)), new Map(catalog.provinces.map(p => [p.code, p.region])));
export function readStorage(storage?: Pick<Storage, 'getItem'>): { project: Project; library: Library } {
  try {
    const raw = storage?.getItem(STORAGE_KEY) ?? storage?.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { project: freshProject(), library: { palettes: [], presets: [] } };
    const data = JSON.parse(raw) as { project: unknown; library: unknown };
    return { project: parse(data.project), library: safeLibrary(data.library) };
  } catch { return { project: freshProject(), library: { palettes: [], presets: [] } }; }
}
interface EditorState {
  project: Project; library: Library; storageError: boolean;
  setScope: (scope: Scope) => void; toggle: (cut: string) => void; select: (cuts: string[], action: 'add' | 'invert' | 'remove') => void;
  clear: () => void; map: (patch: Partial<MapOptions>) => void; exporting: (patch: Partial<ExportOptions>) => void;
  theme: (value: Project['theme']) => void; load: (project: Project) => void; palette: (palette: Palette) => void;
  savePalette: (palette: Palette) => void; deletePalette: (id: string) => void;
  savePreset: (preset: Preset) => void; deletePreset: (id: string) => void;
  addGroup: (name: string, color: string) => void; updateGroup: (id: string, patch: { name?: string; color?: string }) => void;
  assignGroup: (id: string) => void; removeGroup: (id: string) => void; ungroup: () => void; moveGroup: (id: string, delta: number) => void;
  reset: () => void;
}
function initialState() { try { return readStorage(typeof window !== 'undefined' ? window.localStorage : undefined); } catch { return readStorage(); } }
const initial = initialState();
export const useEditor = create<EditorState>((set) => ({
  ...initial, storageError: false,
  setScope: scope => set(s => ({ project: { ...s.project, scope } })),
  toggle: cut => set(s => ({ project: { ...s.project, selected: s.project.selected.includes(cut) ? s.project.selected.filter(c => c !== cut) : [...s.project.selected, cut] } })),
  select: (cuts, action) => set(s => {
    const selected = new Set(s.project.selected);
    cuts.filter(c => knownCuts.has(c)).forEach(c => { if (action === 'remove' || (action === 'invert' && selected.has(c))) selected.delete(c); else selected.add(c); });
    return { project: { ...s.project, selected: [...selected] } };
  }),
  clear: () => set(s => ({ project: { ...s.project, selected: [] } })),
  map: patch => set(s => ({ project: { ...s.project, map: { ...s.project.map, ...patch } } })),
  exporting: patch => set(s => ({ project: { ...s.project, export: { ...s.project.export, ...patch } } })),
  theme: theme => set(s => ({ project: { ...s.project, theme } })),
  load: project => set({ project: parse(project) }),
  palette: palette => set(s => ({ project: { ...s.project, map: { ...s.project.map, colors: { ...palette.colors }, transparent: palette.transparent } } })),
  savePalette: palette => set(s => ({ library: { ...s.library, palettes: [...s.library.palettes.filter(p => p.id !== palette.id), palette] } })),
  deletePalette: id => set(s => ({ library: { ...s.library, palettes: s.library.palettes.filter(p => p.id !== id) } })),
  savePreset: preset => set(s => ({ library: { ...s.library, presets: [...s.library.presets.filter(p => p.id !== preset.id), preset] } })),
  deletePreset: id => set(s => ({ library: { ...s.library, presets: s.library.presets.filter(p => p.id !== id) } })),
  addGroup: (name, color) => set(s => ({ project: { ...s.project, groups: [...s.project.groups, { id: crypto.randomUUID(), name, color, cuts: [] }] } })),
  updateGroup: (id, patch) => set(s => ({ project: { ...s.project, groups: s.project.groups.map(g => g.id === id ? { ...g, ...patch } : g) } })),
  assignGroup: id => set(s => ({ project: { ...s.project, groups: s.project.groups.map(g => ({ ...g, cuts: g.id === id ? [...new Set([...g.cuts, ...s.project.selected])] : g.cuts.filter(c => !s.project.selected.includes(c)) })) } })),
  removeGroup: id => set(s => ({ project: { ...s.project, groups: s.project.groups.filter(g => g.id !== id) } })),
  ungroup: () => set(s => ({ project: { ...s.project, groups: s.project.groups.map(g => ({ ...g, cuts: g.cuts.filter(c => !s.project.selected.includes(c)) })) } })),
  moveGroup: (id, delta) => set(s => { const groups = [...s.project.groups]; const i = groups.findIndex(g => g.id === id); const j = i + delta; if (i >= 0 && j >= 0 && j < groups.length) [groups[i], groups[j]] = [groups[j], groups[i]]; return { project: { ...s.project, groups } }; }),
  reset: () => set({ project: freshProject(), library: { palettes: [], presets: [] } }),
}));
if (typeof window !== 'undefined') useEditor.subscribe(state => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ project: state.project, library: state.library })); }
  catch { if (!state.storageError) useEditor.setState({ storageError: true }); }
});
