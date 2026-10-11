import rawCatalog from './catalog.json';
import type { Catalog, Scope } from '../../types';
import { normalizeSearch } from '../../lib/colors/palettes';
export const catalog: Catalog = rawCatalog as Catalog;
export const communeByCut = new Map(catalog.communes.map(c => [c.cut, c]));
export const knownCuts = new Set(communeByCut.keys());
const searchAliases: Record<string, string[]> = { '05201': ['Rapa Nui', 'Isla de Pascua'], '11101': ['Coyhaique', 'Coihaique'], '11201': ['Aysén', 'Aisén'], '11302': ['O Higgins', 'OHiggins'] };
export function scopeCommunes(scope: Scope) { return catalog.communes.filter(c => (!scope.region || c.region === scope.region) && (!scope.province || c.province === scope.province)); }
export function searchCommunes(scope: Scope, query: string) {
  const needle = normalizeSearch(query);
  return scopeCommunes(scope).filter(c => [c.name, ...(searchAliases[c.cut] || [])].some(n => normalizeSearch(n).includes(needle)) || c.cut.includes(needle));
}
export function scopeName(scope: Scope): string {
  if (scope.province) return catalog.provinces.find(p => p.code === scope.province)?.name || 'Provincia';
  return catalog.regions.find(r => r.code === scope.region)?.shortName || 'Chile';
}
