import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

export type AreaGeometry = Polygon | MultiPolygon;
export interface Commune { cut: string; name: string; province: string; region: string; label: [number, number] | null; available: boolean }
export interface Province { code: string; name: string; region: string }
export interface Region { code: string; name: string; shortName: string; count: number }
export interface Catalog { regions: Region[]; provinces: Province[]; communes: Commune[] }
export type CommuneFeature = Feature<AreaGeometry, { cut: string }>;
export type CommuneTopology = Topology<{ communes: GeometryCollection<{ cut: string }> }>;
export type MapMode = 'context' | 'selected' | 'silhouette';
export type LabelFont = 'arial' | 'inter' | 'fraunces';
export type ColorKey = 'selected' | 'unselected' | 'internal' | 'external' | 'background' | 'labels' | 'secondary';
export type Colors = Record<ColorKey, string>;
export interface Palette { id: string; name: string; colors: Colors; transparent: boolean }
export interface ColorGroup { id: string; name: string; color: string; cuts: string[] }
export interface Scope { region: string; province: string }
export interface SelectionBorder { enabled: boolean; color: string; width: number; target: 'territory' | 'communes' }
export interface LabelStyle {
  weight: 400 | 500 | 700; italic: boolean; underline: boolean; uppercase: boolean;
  letterSpacing: number; opacity: number; haloEnabled: boolean; haloColor: string; haloWidth: number;
}
export interface MapOptions {
  mode: MapMode; colors: Colors; transparent: boolean; opacity: number; backgroundOpacity: number;
  internalWidth: number; externalWidth: number; lineStyle: 'solid' | 'dashed' | 'dotted';
  showInternal: boolean; margin: number; labels: 'none' | 'selected' | 'all';
  labelSize: number; labelFont: LabelFont; hideCollisions: boolean; legend: boolean;
  selectionBorder: SelectionBorder;
  labelStyle: LabelStyle;
}
export interface ExportOptions {
  width: number; height: number; aspect: 'auto' | 'square' | 'portrait' | 'wide' | 'a4p' | 'a4l' | 'custom';
  scale: 1 | 2 | 4; frame: 'scope' | 'selection' | 'viewport'; filename: string;
}
export interface Project {
  version: 1; scope: Scope; selected: string[]; map: MapOptions; groups: ColorGroup[];
  export: ExportOptions; theme: 'light' | 'dark' | 'auto';
}
export interface Preset { id: string; name: string; description: string; project: Project }
export interface Library { palettes: Palette[]; presets: Preset[] }
export interface Navigation { zoom: number; x: number; y: number }
export interface MapPath { cut: string; name: string; d: string; fill: string; selected: boolean; label?: [number, number] }
export interface MapScene {
  width: number; height: number; paths: MapPath[]; external: string; internal: string;
  silhouette: string; selectionBoundary: string; labels: { cut: string; name: string; x: number; y: number }[];
  scopeBounds?: [number, number, number, number];
}
