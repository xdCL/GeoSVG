import { buildScene, colorFor } from './scene';
import type { CommuneTopology, MapScene, Project } from '../../types';
import { catalog } from '../../data/catalog';
import { mapFont } from '../fonts/catalog';
import { loadEmbeddedFont } from '../fonts/embedded';
import { labelText } from '../fonts/style';
const topologies = new Map<string, CommuneTopology>();
const loadedFonts = new Map<string, Promise<void>>();
let lastScene: { signature: string; scene: MapScene } | undefined;
async function measureLabels(project: Project): Promise<Record<string, number> | undefined> {
  if (project.map.labels === 'none' || typeof OffscreenCanvas === 'undefined') return undefined;
  const font = mapFont(project.map.labelFont);
  const style = project.map.labelStyle;
  const fontKey = `${font.id}:${style.weight}:${style.italic}`;
  const fontSet = (self as unknown as { fonts?: FontFaceSet }).fonts;
  if (font.id !== 'arial') {
    if (typeof FontFace === 'undefined' || !fontSet) return undefined;
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
  }
  const context = new OffscreenCanvas(1, 1).getContext('2d');
  if (!context) return undefined;
  context.font = `${style.italic ? 'italic' : 'normal'} ${style.weight} ${project.map.labelSize}px ${font.family}`;
  return Object.fromEntries(catalog.communes.map(commune => { const text = labelText(commune.name, style); return [commune.cut, context.measureText(text).width + Math.max(0, [...text].length - 1) * style.letterSpacing]; }));
}
self.onmessage = async (event: MessageEvent<{ id: number; key: string; topology?: CommuneTopology; project?: Project; dimensions?: [number, number] }>) => {
  const { id, key, topology, project, dimensions } = event.data;
  try {
    if (topology) topologies.set(key, topology);
    if (!project) { self.postMessage({ id, result: true }); return; }
    const data = topologies.get(key);
    if (!data) throw new Error('La cartografía todavía no está cargada.');
    const signature = JSON.stringify([key, project.scope, [...project.selected].sort(), project.map.mode, project.map.margin, project.map.labels, project.map.labelSize, project.map.labelFont, project.map.labelStyle.weight, project.map.labelStyle.italic, project.map.labelStyle.uppercase, project.map.labelStyle.letterSpacing, project.map.labelStyle.haloEnabled, project.map.labelStyle.haloWidth, project.map.labelStyle.underline, project.map.hideCollisions, project.map.legend, project.map.showInternal, project.map.selectionBorder.enabled, project.map.selectionBorder.target, project.export.width, project.export.height, project.export.aspect, project.export.frame, project.groups.map(g => g.cuts), dimensions]);
    if (lastScene?.signature !== signature) lastScene = { signature, scene: buildScene(data, project, dimensions, await measureLabels(project)) };
    const scene = { ...lastScene.scene, paths: lastScene.scene.paths.map(p => ({ ...p, fill: colorFor(p.cut, project) })) };
    self.postMessage({ id, result: scene });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'No se pudo procesar la cartografía.' }); }
};
