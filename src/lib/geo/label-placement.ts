import type { LabelBounds, MapLabel, MapOptions } from '../../types';
import { labelLines } from '../fonts/style';
import { labelSignGeometry } from './signs';

const clamp = (value: number, min: number, max: number) => min <= max ? Math.max(min, Math.min(value, max)) : (min + max) / 2;
const overlaps = (a: LabelBounds, b: LabelBounds) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export function placeLabel(cut: string, name: string, anchor: [number, number], map: MapOptions, limits: LabelBounds,
  measuredWidth: number | undefined, occupied: LabelBounds[], avoidCollisions: boolean): { label: MapLabel; box: LabelBounds } | undefined {
  const lines = labelLines(name, map.labelStyle);
  const style = map.labelStyle;
  const w = measuredWidth ?? Math.max(...lines.map(line => [...line].length * map.labelSize * 0.56 + Math.max(0, [...line].length - 1) * style.letterSpacing));
  const h = map.labelSize * ((style.underline ? 1.4 : 1.2) + (lines.length - 1) * 1.2);
  const padding = 2 + (style.haloEnabled ? style.haloWidth / 2 : 0);
  const sx = Math.min(90, w / 2 + 12), sy = Math.min(72, h + 10);
  const offsets: [number, number][] = avoidCollisions
    ? [[0, 0], [sx, 0], [-sx, 0], [0, sy], [0, -sy], [sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy], [2 * sx, 0], [-2 * sx, 0], [0, 2 * sy], [0, -2 * sy]]
    : [[0, 0]];
  const [ax, ay] = anchor;
  for (const offset of offsets) {
    const sign = map.labelSign.enabled ? labelSignGeometry(w, map, [limits[0] - ax, limits[1] - ay, limits[2] - ax, limits[3] - ay], lines.length, offset) : undefined;
    const x = sign ? ax : clamp(ax + offset[0], limits[0] + w / 2 + padding, limits[2] - w / 2 - padding);
    const y = sign ? ay : clamp(ay + offset[1], limits[1] + h / 2 + padding, limits[3] - h / 2 - padding);
    const box: LabelBounds = sign
      ? [ax + sign.bounds[0] - 2, ay + sign.bounds[1] - 2, ax + sign.bounds[2] + 2, ay + sign.bounds[3] + 2]
      : [x - w / 2 - padding, y - h / 2 - padding, x + w / 2 + padding, y + h / 2 + padding];
    if (avoidCollisions && occupied.some(other => overlaps(box, other))) continue;
    let leader: MapLabel['leader'];
    if (!sign && (Math.abs(x - ax) > 1 || Math.abs(y - ay) > 1)) {
      const factor = Math.min(1, 1 / Math.max(Math.abs(ax - x) / (w / 2 + padding), Math.abs(ay - y) / (h / 2 + padding)));
      leader = [ax, ay, x + (ax - x) * factor, y + (ay - y) * factor];
    }
    return { label: { cut, name, lines, x, y, sign, leader }, box };
  }
}
