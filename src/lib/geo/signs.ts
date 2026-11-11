import type { LabelBounds, LabelSignGeometry, LabelSignStyle, MapOptions, SignFace } from '../../types';

export const defaultLabelSign: LabelSignStyle = {
  enabled: false, faceColor: '#FFF3D6', edgeColor: '#93653D', postColor: '#3A4B54',
  tilt: 20, depth: 5, padding: 7, height: 12, opacity: 1,
};

type Point = [number, number];
const round = (value: number) => Number(value.toFixed(4));
const polygon = (points: Point[]) => points.map(p => p.map(round).join(',')).join(' ');

function fitOffset(start: number, end: number, min: number, max: number) {
  const low = min - start, high = max - end;
  return low <= high ? Math.max(low, Math.min(0, high)) : (low + high) / 2;
}

export function labelSignGeometry(textWidth: number, map: MapOptions, limits: LabelBounds): LabelSignGeometry {
  const sign = map.labelSign;
  const halo = map.labelStyle.haloEnabled ? map.labelStyle.haloWidth : 0;
  const halfWidth = (Math.max(textWidth, map.labelSize) + 2 * sign.padding + halo + (map.labelStyle.italic ? map.labelSize * 0.15 : 0)) / 2;
  const halfHeight = (map.labelSize * (map.labelStyle.underline ? 1.4 : 1.2) + 2 * Math.max(2, sign.padding * 0.55) + halo) / 2;
  const radians = sign.tilt * Math.PI / 180;
  const scale = Math.cos(radians), slope = -Math.sin(radians);
  const backX = -Math.sign(sign.tilt || 1) * sign.depth * Math.sqrt(3) / 2, backY = -sign.depth / 2;
  const fit = Math.min(1,
    Math.max(1, limits[2] - limits[0] - 1) / (2 * halfWidth * scale + Math.abs(backX)),
    Math.max(1, limits[3] - limits[1] - 1) / (2 * halfHeight + 2 * halfWidth * Math.abs(slope) + Math.abs(backY)));
  const [w, h, dx, dy] = [halfWidth * fit, halfHeight * fit, backX * fit, backY * fit];
  const lift = sign.height ? -sign.height - h - Math.abs(slope) * w : 0;
  const bounds: LabelBounds = [-w * scale + Math.min(dx, 0) - 0.5, lift - h - Math.abs(slope) * w + dy - 0.5,
    w * scale + Math.max(dx, 0) + 0.5, lift + h + Math.abs(slope) * w + 0.5];
  const x = fitOffset(bounds[0], bounds[2], limits[0], limits[2]);
  const y = fitOffset(bounds[1], bounds[3], limits[1], limits[3]);
  const front = (u: number, v: number): Point => [x + scale * u, y + lift + slope * u + v];
  const back = ([u, v]: Point): Point => [u + dx, v + dy];
  const a = front(-w, -h), b = front(w, -h), c = front(w, h), d = front(-w, h);
  const faces: LabelSignGeometry['faces'] = [];
  if (sign.depth) {
    faces.push({ face: 'top', points: polygon([a, b, back(b), back(a)]) });
    const [start, end] = dx > 0 ? [b, c] : [a, d];
    faces.push({ face: 'side', points: polygon([start, end, back(end), back(start)]) });
  }
  faces.push({ face: 'front', points: polygon([a, b, c, d]) });
  return {
    transform: `matrix(${round(scale * fit)} ${round(slope * fit)} 0 ${round(fit)} ${round(x)} ${round(y + lift)})`,
    faces, stem: sign.height ? [round(x), round(y + lift + h - 1)] : undefined,
    bounds: [bounds[0] + x, bounds[1] + y, bounds[2] + x, bounds[3] + y],
  };
}

export function signFaceColor(face: SignFace, style: LabelSignStyle): string {
  if (face === 'front') return style.faceColor;
  if (face === 'side') return style.edgeColor;
  const hex = [1, 3, 5].map(i => {
    const light = parseInt(style.faceColor.slice(i, i + 2), 16);
    const dark = parseInt(style.edgeColor.slice(i, i + 2), 16);
    return Math.round((light + dark) / 2).toString(16).padStart(2, '0');
  });
  return `#${hex.join('')}`;
}
