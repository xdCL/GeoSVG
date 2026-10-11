import type { CommuneTopology, MapScene, Project } from '../../types';
import { knownCuts } from '../../data/catalog';
let worker: Worker | undefined;
let sequence = 0;
const pending = new Map<number, { resolve: (result: MapScene | boolean) => void; reject: (error: Error) => void }>();
const cache = new Map<string, Promise<void>>();
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; result: MapScene | boolean; error?: string }>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      if (event.data.error) job.reject(new Error(event.data.error)); else job.resolve(event.data.result);
    };
    worker.onerror = () => {
      pending.forEach(job => job.reject(new Error('El proceso cartográfico falló. Vuelve a cargar el mapa.')));
      pending.clear(); cache.clear(); worker?.terminate(); worker = undefined;
    };
  }
  return worker;
}
function request(message: { key: string; topology?: CommuneTopology; project?: Project; dimensions?: [number, number] }): Promise<MapScene | boolean> {
  return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); getWorker().postMessage({ ...message, id }); });
}
async function load(key: string): Promise<void> {
  if (!cache.has(key)) {
    const path = key === 'chile' ? 'data/chile.topo.json' : `data/regions/${key}.topo.json`;
    cache.set(key, (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
      if (!response.ok) throw new Error('No se pudo descargar la cartografía. Comprueba la conexión e intenta nuevamente.');
      const data = await response.json() as CommuneTopology;
      if (data.type !== 'Topology' || !Array.isArray(data.arcs) || !data.objects?.communes?.geometries?.length) throw new Error('El archivo cartográfico está incompleto.');
      if (data.objects.communes.geometries.some(g => !knownCuts.has(String(g.id)))) throw new Error('La capa contiene códigos CUT desconocidos.');
      await request({ key, topology: data });
    })().catch(error => { cache.delete(key); throw error; }));
  }
  return cache.get(key)!;
}
export async function sceneFor(project: Project, dimensions?: [number, number]): Promise<MapScene> {
  const key = project.scope.region || 'chile';
  await load(key);
  return await request({ key, project, dimensions }) as MapScene;
}
