import type { CommuneLayerStyle, Project } from '../../types';

export const layerFor = (cut: string, project: Project): CommuneLayerStyle | undefined =>
  project.selected.includes(cut) ? project.layers[cut] : undefined;

export function projectForLabel(cut: string, project: Project): Project {
  const label = layerFor(cut, project)?.label;
  if (!label) return project;
  const map = project.map;
  return { ...project, map: {
    ...map, labelFont: label.font ?? map.labelFont, labelSize: label.size ?? map.labelSize,
    colors: label.color ? { ...map.colors, labels: label.color } : map.colors,
    labelStyle: { ...map.labelStyle, ...label.style }, labelSign: { ...map.labelSign, ...label.sign },
  } };
}

export function labelVisible(cut: string, project: Project): boolean {
  return layerFor(cut, project)?.label?.visible ??
    (project.map.labels === 'all' || (project.map.labels === 'selected' && project.selected.includes(cut)));
}

export const labelName = (cut: string, original: string, project: Project) => layerFor(cut, project)?.label?.text?.trim() || original;

// Keep purely visual edits out of the Worker geometry cache key.
export function layerLabelGeometry(project: Project) {
  return project.selected.map(cut => {
    const label = layerFor(cut, project)?.label;
    if (!label) return [cut];
    const map = projectForLabel(cut, project).map;
    const { weight, italic, underline, uppercase, letterSpacing, haloEnabled, haloWidth } = map.labelStyle;
    const sign = map.labelSign;
    return [cut, label.visible, label.text, map.labelSize, map.labelFont, weight, italic, underline, uppercase, letterSpacing,
      haloEnabled, haloWidth, sign.enabled && [sign.tilt, sign.depth, sign.padding, sign.height]];
  });
}

export function layerBorders(scene: { paths: { cut: string; d: string }[] }, project: Project) {
  return scene.paths.flatMap(path => {
    const border = layerFor(path.cut, project)?.border;
    return border && border.width > 0 ? [{ ...border, cut: path.cut, d: path.d }] : [];
  });
}
