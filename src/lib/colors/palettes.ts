import type { Colors, Palette } from '../../types';

export const isHex = (value: string) => /^#[\da-f]{6}$/i.test(value);
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL').replace(/['’.-]/g, ' ').replace(/\s+/g, ' ').trim();
export const colorLabels: Record<keyof Colors, string> = {
  selected: 'Comunas destacadas', unselected: 'Resto del territorio', internal: 'Límites comunales',
  external: 'Contorno exterior', background: 'Fondo del mapa', labels: 'Etiquetas', secondary: 'Foco de selección',
};
const colors = (selected: string, unselected: string, internal: string, external: string, background: string, labels: string, secondary: string): Colors => ({ selected, unselected, internal, external, background, labels, secondary });
export const builtInPalettes: Palette[] = [
  { id: 'institutional', name: 'Institucional', transparent: true, colors: colors('#0066CC', '#D9DDE3', '#FFFFFF', '#00264C', '#FFFFFF', '#00264C', '#FFCC00') },
  { id: 'wikimedia', name: 'Wikimedia', transparent: true, colors: colors('#CC3333', '#F4E7A1', '#FFFFFF', '#69582F', '#FFFFFF', '#3E4043', '#0066CC') },
  { id: 'mono', name: 'Monocromática', transparent: false, colors: colors('#111111', '#E5E7EB', '#FFFFFF', '#555555', '#FFFFFF', '#111111', '#555555') },
  { id: 'editorial', name: 'Editorial', transparent: false, colors: colors('#E45D47', '#ECE8E2', '#FFFFFF', '#3E4043', '#ECE8E2', '#3E4043', '#0066CC') },
];
