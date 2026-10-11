import { z } from 'zod';
import type { Library, Project } from '../../types';

const cut = z.string().regex(/^\d{5}$/);
const hex = z.string().regex(/^#[\da-f]{6}$/i).transform(v => v.toUpperCase());
const colors = z.object({ selected: hex, unselected: hex, internal: hex, external: hex, background: hex, labels: hex, secondary: hex }).strict();
const unique = (values: string[]) => new Set(values).size === values.length;
const cuts = z.array(cut).max(346).refine(unique, 'Hay códigos CUT duplicados.');
export const projectSchema = z.object({
  version: z.literal(1),
  scope: z.object({ region: z.string().regex(/^(\d{2})?$/), province: z.string().regex(/^(\d{3})?$/) }).strict(),
  selected: cuts,
  map: z.object({
    mode: z.enum(['context', 'selected', 'silhouette']), colors, transparent: z.boolean(),
    opacity: z.number().min(0).max(1), backgroundOpacity: z.number().min(0).max(1),
    internalWidth: z.number().min(0).max(10), externalWidth: z.number().min(0).max(15),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']), showInternal: z.boolean(), margin: z.number().min(0).max(200),
    labels: z.enum(['none', 'selected', 'all']), labelSize: z.number().min(6).max(40),
    labelFont: z.enum(['arial', 'inter', 'fraunces']).default('arial'),
    hideCollisions: z.boolean(), legend: z.boolean(),
  }).strict(),
  groups: z.array(z.object({ id: z.string().min(1).max(80), name: z.string().min(1).max(80), color: hex, cuts }).strict()).max(30)
    .refine(groups => unique(groups.map(g => g.id)), 'Los grupos deben tener identificadores únicos.')
    .refine(groups => unique(groups.flatMap(g => g.cuts)), 'Una comuna solo puede pertenecer a un grupo.'),
  export: z.object({
    width: z.number().int().min(100).max(6000), height: z.number().int().min(100).max(6000),
    aspect: z.enum(['auto', 'square', 'portrait', 'wide', 'a4p', 'a4l', 'custom']),
    scale: z.union([z.literal(1), z.literal(2), z.literal(4)]), frame: z.enum(['scope', 'selection', 'viewport']),
    filename: z.string().min(1).max(100),
  }).strict(),
  theme: z.enum(['light', 'dark', 'auto']),
}).strict();
export const paletteSchema = z.object({ id: z.string().min(1).max(80), name: z.string().min(1).max(80), colors, transparent: z.boolean() }).strict();
export const palettesFileSchema = z.object({ version: z.literal(1), palettes: z.array(paletteSchema).max(100) }).strict();
export const presetSchema = z.object({ id: z.string().min(1).max(80), name: z.string().min(1).max(100), description: z.string().max(600), project: projectSchema }).strict();
const librarySchema = z.object({ palettes: z.array(paletteSchema).max(100), presets: z.array(presetSchema).max(100) }).strict();

// Every schema version must have an explicit migration. Unknown future versions are rejected.
export function migrateProject(input: unknown): Project { return projectSchema.parse(input); }
export function parseProject(input: unknown, knownCuts: Set<string>, regions: Set<string>, provinces: Map<string, string>): Project {
  const project = migrateProject(input);
  if ([...project.selected, ...project.groups.flatMap(g => g.cuts)].some(c => !knownCuts.has(c))) throw new Error('El proyecto contiene comunas que no existen en el catálogo.');
  if (project.scope.region && !regions.has(project.scope.region)) throw new Error('La región no existe.');
  if (project.scope.province && provinces.get(project.scope.province) !== project.scope.region) throw new Error('La provincia no corresponde a la región.');
  return project;
}
export function safeLibrary(input: unknown): Library { const result = librarySchema.safeParse(input); return result.success ? result.data : { palettes: [], presets: [] }; }
export async function readJsonFile(file: File): Promise<unknown> {
  if (file.size > 2_000_000) throw new Error('El archivo JSON debe pesar menos de 2 MB.');
  try { return JSON.parse(await file.text()) as unknown; } catch { throw new Error('El archivo no contiene JSON válido.'); }
}
