import type { MapScene, Project, SelectionGradient } from '../../types';

export const defaultSelectionGradient: SelectionGradient = { enabled: false, intensity: 0.45, angle: 135, scope: 'commune' };
const shade = (hex: string, target: number, amount: number) => `#${[1, 3, 5].map(i =>
  Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + target * amount).toString(16).padStart(2, '0')).join('')}`;

export const gradientPaint = (cut: string, selected: boolean, color: string, project: Project, prefix = '') =>
  selected && project.map.selectionGradient.enabled ? `url(#${prefix}gradiente-${cut})` : color;

export function selectionGradients(scene: MapScene, project: Project, prefix = '') {
  const gradient = project.map.selectionGradient;
  if (!gradient.enabled) return [];
  const colors = scene.silhouette ? [{ cut: 'silueta', fill: project.map.colors.selected }] : scene.paths.filter(path => path.selected);
  const angle = gradient.angle * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle), radius = 0.5 / Math.max(Math.abs(cos), Math.abs(sin));
  const b = gradient.scope === 'selection' ? scene.selectionBounds : undefined;
  const bounds = b ?? [0, 0, 1, 1];
  const [left, top, right, bottom] = bounds;
  return colors.map(path => ({
    id: `${prefix}gradiente-${path.cut}`, units: b ? 'userSpaceOnUse' as const : 'objectBoundingBox' as const,
    x1: left + (0.5 - cos * radius) * (right - left), y1: top + (0.5 - sin * radius) * (bottom - top),
    x2: left + (0.5 + cos * radius) * (right - left), y2: top + (0.5 + sin * radius) * (bottom - top),
    stops: [{ offset: '0%', color: shade(path.fill, 255, gradient.intensity * 0.65) },
      { offset: '55%', color: path.fill }, { offset: '100%', color: shade(path.fill, 0, gradient.intensity * 0.32) }],
  }));
}
