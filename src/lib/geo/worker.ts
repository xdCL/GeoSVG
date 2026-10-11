import { buildScene, colorFor } from './scene';
import type { CommuneTopology, MapScene, Project } from '../../types';
const topologies = new Map<string, CommuneTopology>();
let lastScene: { signature: string; scene: MapScene } | undefined;
self.onmessage = (event: MessageEvent<{ id: number; key: string; topology?: CommuneTopology; project?: Project; dimensions?: [number, number] }>) => {
  const { id, key, topology, project, dimensions } = event.data;
  try {
    if (topology) topologies.set(key, topology);
    if (!project) { self.postMessage({ id, result: true }); return; }
    const data = topologies.get(key);
    if (!data) throw new Error('La cartografía todavía no está cargada.');
    const signature = JSON.stringify([key, project.scope, [...project.selected].sort(), project.map.mode, project.map.margin, project.map.labels, project.map.labelSize, project.map.hideCollisions, project.map.legend, project.map.showInternal, project.export.width, project.export.height, project.export.aspect, project.export.frame, project.groups.map(g => g.cuts), dimensions]);
    if (lastScene?.signature !== signature) lastScene = { signature, scene: buildScene(data, project, dimensions) };
    const scene = { ...lastScene.scene, paths: lastScene.scene.paths.map(p => ({ ...p, fill: colorFor(p.cut, project) })) };
    self.postMessage({ id, result: scene });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'No se pudo procesar la cartografía.' }); }
};
