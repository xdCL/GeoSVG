import { buildScene, colorFor } from './scene';
import type { CommuneTopology, MapScene, Project } from '../../types';
import { catalog } from '../../data/catalog';
import { mapFont } from '../fonts/catalog';
import { loadEmbeddedFont } from '../fonts/embedded';
import { labelLines } from '../fonts/style';
import { labelName, labelVisible, layerLabelGeometry, projectForLabel } from './layers';
const topologies = new Map<string, CommuneTopology>();
const loadedFonts = new Map<string, Promise<void>>();
let lastScene: { signature: string; scene: MapScene } | undefined;
async function measureLabels(project: Project): Promise<Record<string, number> | undefined> {
  if (typeof OffscreenCanvas === 'undefined') return undefined;
  const visible = catalog.communes.filter(c => labelVisible(c.cut, project));
  if (!visible.length) return undefined;
  const fontSet = (self as unknown as { fonts?: FontFaceSet }).fonts;
  await Promise.all(visible.map(async commune => {
    const map = projectForLabel(commune.cut, project).map;
    const font = mapFont(map.labelFont), style = map.labelStyle;
    const fontKey = `${font.id}:${style.weight}:${style.italic}`;
    if (font.id === 'arial' || typeof FontFace === 'undefined' || !fontSet) return;
    if (!loadedFonts.has(fontKey)) {
      const pending = (async () => {
        const embedded = await loadEmbeddedFont(font.id, style.weight, style.italic);
        const face = await new FontFace(font.name, `url(${embedded!.dataUrl})`, { weight: String(style.weight), style: style.italic ? 'italic' : 'normal' }).load();
        fontSet.add(face);
      })();
      loadedFonts.set(fontKey, pending);
      void pending.catch(() => loadedFonts.delete(fontKey));
    }
    await loadedFonts.get(fontKey);
  }));
  const context = new OffscreenCanvas(1, 1).getContext('2d');
  if (!context) return undefined;
  return Object.fromEntries(visible.map(commune => {
    const map = projectForLabel(commune.cut, project).map, style = map.labelStyle;
    const lines = labelLines(labelName(commune.cut, commune.name, project), style);
    context.font = `${style.italic ? 'italic' : 'normal'} ${style.weight} ${map.labelSize}px ${mapFont(map.labelFont).family}`;
    return [commune.cut, Math.max(...lines.map(text => context.measureText(text).width + Math.max(0, [...text].length - 1) * style.letterSpacing))];
  }));
}
self.onmessage = async (event: MessageEvent<{ id: number; key: string; topology?: CommuneTopology; project?: Project; dimensions?: [number, number] }>) => {
  const { id, key, topology, project, dimensions } = event.data;
  try {
    if (topology) topologies.set(key, topology);
    if (!project) { self.postMessage({ id, result: true }); return; }
    const data = topologies.get(key);
    if (!data) throw new Error('La cartografía todavía no está cargada.');
    const sign = project.map.labelSign;
    const signature = JSON.stringify([key, project.scope, [...project.selected].sort(), project.map.mode, project.map.selectionGradient.enabled && project.map.selectionGradient.scope === 'selection', layerLabelGeometry(project), project.map.margin, project.map.labels, project.map.labelSize, project.map.labelFont, project.map.labelStyle.weight, project.map.labelStyle.italic, project.map.labelStyle.uppercase, project.map.labelStyle.wrap, project.map.labelStyle.letterSpacing, project.map.labelStyle.haloEnabled, project.map.labelStyle.haloWidth, project.map.labelStyle.underline, sign.enabled && [sign.tilt, sign.depth, sign.padding, sign.height], project.map.hideCollisions, project.map.legend, project.map.showInternal, project.map.selectionBorder.enabled, project.map.selectionBorder.target, project.export.width, project.export.height, project.export.aspect, project.export.frame, project.groups.map(g => g.cuts), dimensions]);
    if (lastScene?.signature !== signature) lastScene = { signature, scene: buildScene(data, project, dimensions, await measureLabels(project)) };
    const scene = { ...lastScene.scene, paths: lastScene.scene.paths.map(p => ({ ...p, fill: colorFor(p.cut, project) })) };
    self.postMessage({ id, result: scene });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'No se pudo procesar la cartografía.' }); }
};
