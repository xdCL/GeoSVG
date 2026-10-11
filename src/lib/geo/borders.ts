import type { MapScene, Project, SelectionBorder } from '../../types';

export const defaultSelectionBorder: SelectionBorder = { enabled: false, color: '#E45D47', width: 4, target: 'territory' };

// Both renderers use these paths so the interactive preview and downloads agree.
export function selectionBorderPaths(scene: MapScene, project: Project): { id: string; d: string }[] {
  const border = project.map.selectionBorder;
  if (!border.enabled || border.width === 0) return [];
  if (border.target === 'territory') return scene.selectionBoundary ? [{ id: 'borde-seleccion-territorial', d: scene.selectionBoundary }] : [];
  return scene.paths.filter(p => p.selected).map(p => ({ id: `borde-seleccion-${p.cut}`, d: p.d }));
}
