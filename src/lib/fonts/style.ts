import type { LabelStyle, Project } from '../../types';
import { mapFont } from './catalog';

export const defaultLabelStyle: LabelStyle = {
  weight: 400, italic: false, underline: false, uppercase: false, letterSpacing: 0, opacity: 1,
  haloEnabled: false, haloColor: '#FFFFFF', haloWidth: 2,
};
export const labelText = (name: string, style: LabelStyle) => style.uppercase ? name.toLocaleUpperCase('es-CL') : name;
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
