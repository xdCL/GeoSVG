import interUrl from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import frauncesUrl from '@fontsource/fraunces/files/fraunces-latin-400-normal.woff2?url';
import interLicense from '../../../docs/licenses/Inter-OFL.txt?raw';
import frauncesLicense from '../../../docs/licenses/Fraunces-OFL.txt?raw';
import type { LabelFont } from '../../types';

export interface EmbeddedFont { dataUrl: string; license: string }
const files = {
  inter: { url: interUrl, license: interLicense },
  fraunces: { url: frauncesUrl, license: frauncesLicense },
};
const cache = new Map<LabelFont, Promise<EmbeddedFont>>();

export async function loadEmbeddedFont(id: LabelFont): Promise<EmbeddedFont | undefined> {
  if (id === 'arial') return undefined;
  const cached = cache.get(id);
  if (cached) return cached;
  const file = files[id];
  const pending = (async () => {
    const response = await fetch(file.url);
    if (!response.ok) throw new Error('No se pudo cargar la tipografía del mapa. Intenta exportar de nuevo.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2') throw new Error('El archivo de tipografía no es válido.');
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { dataUrl: `data:font/woff2;base64,${btoa(binary)}`, license: file.license };
  })();
  cache.set(id, pending);
  void pending.catch(() => cache.delete(id));
  return pending;
}
