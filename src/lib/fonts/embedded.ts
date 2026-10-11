import interUrl from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import frauncesUrl from '@fontsource/fraunces/files/fraunces-latin-400-normal.woff2?url';
import interMediumUrl from '@fontsource/inter/files/inter-latin-500-normal.woff2?url';
import interBoldUrl from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import interItalicUrl from '@fontsource/inter/files/inter-latin-400-italic.woff2?url';
import interMediumItalicUrl from '@fontsource/inter/files/inter-latin-500-italic.woff2?url';
import interBoldItalicUrl from '@fontsource/inter/files/inter-latin-700-italic.woff2?url';
import frauncesMediumUrl from '@fontsource/fraunces/files/fraunces-latin-500-normal.woff2?url';
import frauncesBoldUrl from '@fontsource/fraunces/files/fraunces-latin-700-normal.woff2?url';
import frauncesItalicUrl from '@fontsource/fraunces/files/fraunces-latin-400-italic.woff2?url';
import frauncesMediumItalicUrl from '@fontsource/fraunces/files/fraunces-latin-500-italic.woff2?url';
import frauncesBoldItalicUrl from '@fontsource/fraunces/files/fraunces-latin-700-italic.woff2?url';
import interLicense from '../../../docs/licenses/Inter-OFL.txt?raw';
import frauncesLicense from '../../../docs/licenses/Fraunces-OFL.txt?raw';
import type { LabelFont, LabelStyle } from '../../types';

export interface EmbeddedFont { dataUrl: string; license: string; weight: LabelStyle['weight']; style: 'normal' | 'italic' }
const files = {
  inter: { normal: { 400: interUrl, 500: interMediumUrl, 700: interBoldUrl }, italic: { 400: interItalicUrl, 500: interMediumItalicUrl, 700: interBoldItalicUrl }, license: interLicense },
  fraunces: { normal: { 400: frauncesUrl, 500: frauncesMediumUrl, 700: frauncesBoldUrl }, italic: { 400: frauncesItalicUrl, 500: frauncesMediumItalicUrl, 700: frauncesBoldItalicUrl }, license: frauncesLicense },
};
const cache = new Map<string, Promise<EmbeddedFont>>();

export async function loadEmbeddedFont(id: LabelFont, weight: LabelStyle['weight'] = 400, italic = false): Promise<EmbeddedFont | undefined> {
  if (id === 'arial') return undefined;
  const style = italic ? 'italic' : 'normal';
  const key = `${id}:${weight}:${style}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const file = files[id];
  const pending: Promise<EmbeddedFont> = (async () => {
    const response = await fetch(file[style][weight]);
    if (!response.ok) throw new Error('No se pudo cargar la tipografía del mapa. Intenta exportar de nuevo.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2') throw new Error('El archivo de tipografía no es válido.');
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { dataUrl: `data:font/woff2;base64,${btoa(binary)}`, license: file.license, weight, style };
  })();
  cache.set(key, pending);
  void pending.catch(() => cache.delete(key));
  return pending;
}
