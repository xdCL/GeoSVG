import type { LabelStyle, Project } from '../../types';
import { mapFont } from './catalog';

export const defaultLabelStyle: LabelStyle = {
  weight: 400, italic: false, underline: false, uppercase: false, wrap: 'auto', letterSpacing: 0, opacity: 1,
  haloEnabled: false, haloColor: '#FFFFFF', haloWidth: 2,
};
export const labelText = (name: string, style: LabelStyle) => style.uppercase ? name.toLocaleUpperCase('es-CL') : name;
export function labelLines(name: string, style: LabelStyle): string[] {
  const text = labelText(name, style);
  const manual = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (manual.length > 1) return [manual[0], manual.slice(1).join(' ')];
  const words = text.trim().split(/\s+/);
  if (words.length < 2 || style.wrap === 'single' || (style.wrap === 'auto' && text.length < 12)) return [words.join(' ')];
  let split = 1;
  for (let i = 2; i < words.length; i++) {
    if (Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length) <
      Math.abs(words.slice(0, split).join(' ').length - words.slice(split).join(' ').length)) split = i;
  }
  return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
}
export const lineOffset = (index: number, count: number, size: number) => (index - (count - 1) / 2) * size * 1.2;
export function labelAppearance(project: Project) {
  const { map } = project;
  const style = map.labelStyle;
  return {
    fill: map.colors.labels, fontFamily: mapFont(map.labelFont).family, fontWeight: style.weight,
    fontStyle: style.italic ? 'italic' : 'normal', fontSize: map.labelSize,
    letterSpacing: style.letterSpacing, textDecoration: style.underline ? 'underline' : 'none',
    opacity: style.opacity, stroke: style.haloEnabled ? style.haloColor : 'none',
    strokeWidth: style.haloEnabled ? style.haloWidth : 0, strokeLinejoin: 'round' as const, paintOrder: 'stroke fill',
  };
}
