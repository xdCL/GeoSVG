import type { LabelFont } from '../../types';

export const mapFonts: { id: LabelFont; name: string; family: string; description: string }[] = [
  { id: 'inter', name: 'Inter', family: 'Inter, sans-serif', description: 'Inter · Google Fonts' },
  { id: 'fraunces', name: 'Fraunces', family: 'Fraunces, serif', description: 'Fraunces · Google Fonts' },
  { id: 'arial', name: 'Arial', family: 'Arial, sans-serif', description: 'Arial · sistema' },
];
export const mapFont = (id: LabelFont) => mapFonts.find(font => font.id === id) ?? mapFonts[2];
