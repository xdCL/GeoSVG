import slep from './slep-los-alamos.json';
import { freshProject } from '../../store/defaults';
import { scopeCommunes } from '../catalog';
import type { Preset, Scope } from '../../types';
export const slepPreset: Preset = { id: slep.id, name: slep.name, description: slep.description, project: { ...freshProject(), scope: { region: slep.region, province: '' }, selected: slep.selected, export: { ...freshProject().export, filename: 'sleplosalamos' } } };
export function builtInPresets(scope: Scope): Preset[] {
  return [slepPreset,
    { id: 'blank', name: 'Mapa vacío', description: 'Comienza sin comunas destacadas en el ámbito actual.', project: { ...freshProject(), scope } },
    { id: 'full', name: 'Territorio completo', description: 'Destaca todas las comunas disponibles del ámbito actual.', project: { ...freshProject(), scope, selected: scopeCommunes(scope).filter(c => c.available).map(c => c.cut) } },
  ];
}
