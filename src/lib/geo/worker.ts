import { buildScene, colorFor } from './scene';
import type { CommuneTopology, MapScene, Project } from '../../types';
import { catalog } from '../../data/catalog';
import { mapFont } from '../fonts/catalog';
import { loadEmbeddedFont } from '../fonts/embedded';
const topologies = new Map<string, CommuneTopology>();
const loadedFonts = new Map<string, Promise<void>>();
let lastScene: { signature: string; scene: MapScene } | undefined;
async function measureLabels(project: Project): Promise<Record<string, number> | undefined> {
  if (project.map.labels === 'none' || typeof OffscreenCanvas === 'undefined') return undefined;
  const font = mapFont(project.map.labelFont);
  const fontSet = (self as unknown as { fonts?: FontFaceSet }).fonts;
  if (font.id !== 'arial') {
    if (typeof FontFace === 'undefined' || !fontSet) return undefined;
    if (!loadedFonts.has(font.id)) {
      const pending = (async () => {
        const embedded = await loadEmbeddedFont(font.id);
        const face = await new FontFace(font.name, `url(${embedded!.dataUrl})`, { weight: '400' }).load();
        fontSet.add(face);
      })();
      loadedFonts.set(font.id, pending);
      void pending.catch(() => loadedFonts.delete(font.id));
    }
    await loadedFonts.get(font.id);
  }
  const context = new OffscreenCanvas(1, 1).getContext('2d');
  if (!context) return undefined;
  context.font = `400 ${project.map.labelSize}px ${font.family}`;
  return Object.fromEntries(catalog.communes.map(commune => [commune.cut, context.measureText(commune.name).width]));
}
self.onmessage = async (event: MessageEvent<{ id: number; key: string; topology?: CommuneTopology; project?: Project; dimensions?: [number, number] }>) => {
  const { id, key, topology, project, dimensions } = event.data;
  try {
    if (topology) topologies.set(key, topology);
    if (!project) { self.postMessage({ id, result: true }); return; }
    const data = topologies.get(key);
    if (!data) throw new Error('La cartografía todavía no está cargada.');
    const signature = JSON.stringify([key, project.scope, [...project.selected].sort(), project.map.mode, project.map.margin, project.map.labels, project.map.labelSize, project.map.labelFont, project.map.hideCollisions, project.map.legend, project.map.showInternal, project.export.width, project.export.height, project.export.aspect, project.export.frame, project.groups.map(g => g.cuts), dimensions]);
    if (lastScene?.signature !== signature) lastScene = { signature, scene: buildScene(data, project, dimensions, await measureLabels(project)) };
    const scene = { ...lastScene.scene, paths: lastScene.scene.paths.map(p => ({ ...p, fill: colorFor(p.cut, project) })) };
    self.postMessage({ id, result: scene });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'No se pudo procesar la cartografía.' }); }
};
