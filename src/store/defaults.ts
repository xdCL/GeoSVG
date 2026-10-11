import { builtInPalettes } from '../lib/colors/palettes';
import type { Project } from '../types';

export const defaultProject: Project = {
  version: 1, scope: { region: '07', province: '' }, selected: [], groups: [], theme: 'auto',
  map: {
    mode: 'context', colors: { ...builtInPalettes[0].colors }, transparent: true, opacity: 1,
    backgroundOpacity: 1, internalWidth: 1, externalWidth: 1.5, lineStyle: 'solid',
    showInternal: true, margin: 36, labels: 'none', labelSize: 12, hideCollisions: true, legend: false,
  },
  export: { width: 1000, height: 800, aspect: 'auto', scale: 2, frame: 'scope', filename: 'comunas' },
};
export const freshProject = (): Project => structuredClone(defaultProject);
