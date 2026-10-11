import { scopeName, scopeCommunes } from '../../data/catalog';
import { normalizeSearch } from '../colors/palettes';
import type { MapScene, Navigation, Project } from '../../types';
import source from '../../data/catalog/source.json';
import { mapFont } from '../fonts/catalog';
import { loadEmbeddedFont } from '../fonts/embedded';
import type { EmbeddedFont } from '../fonts/embedded';
import { selectionBorderPaths } from '../geo/borders';

export const escapeXml = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
export const dashArray = (project: Project) => project.map.lineStyle === 'dashed' ? '6 4' : project.map.lineStyle === 'dotted' ? '1 4' : undefined;
export function svgString(scene: MapScene, project: Project, navigation?: Navigation, embeddedFont?: EmbeddedFont): string {
  if (!scene.paths.length) throw new Error('No hay comunas para exportar. Selecciona al menos una en este ámbito.');
  if (project.map.mode === 'silhouette' && !scene.silhouette) throw new Error('La unión no está disponible. No se exportará una silueta inválida.');
  const { map } = project;
  const font = mapFont(map.labelFont);
  const fontStyle = embeddedFont ? `<style id="map-font" type="text/css"><![CDATA[@font-face{font-family:'${font.name}';src:url('${embeddedFont.dataUrl}') format('woff2');font-weight:400;font-style:normal;}]]></style>` : '';
  const dash = dashArray(project);
  const stroke = `stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}`;
  const transform = navigation ? ` transform="translate(${navigation.x} ${navigation.y}) scale(${navigation.zoom})"` : '';
  const background = map.transparent ? '' : `<rect id="fondo" width="${scene.width}" height="${scene.height}" fill="${map.colors.background}" opacity="${map.backgroundOpacity}"/>`;
  const metadata = { application: 'GeoSVG', author: 'xdCL', source: source.institution, sourceUrl: source.page, layer: source.layer, edition: source.update, sourceHash: source.sha256, terms: source.terms, crs: source.targetCrs, projection: 'Mercator', selected: project.selected, scope: project.scope, typography: { family: font.name, weight: 400, labels: map.labels, size: map.labelSize, embedded: !!embeddedFont, ...(embeddedFont ? { license: embeddedFont.license } : {}) }, limitations: source.limitations };
  const shapes = scene.silhouette
    ? `<path id="silueta-territorial" d="${scene.silhouette}" fill="${map.colors.selected}" fill-rule="evenodd"><title>${escapeXml(`Unión de ${scene.paths.length} comunas`)}</title></path>`
    : scene.paths.map(p => `<path id="comuna-${p.cut}" data-cut="${p.cut}" d="${p.d}" fill="${p.fill}" fill-rule="evenodd"><title>${escapeXml(p.name)} · CUT ${p.cut}</title></path>`).join('');
  const boundaries = `${scene.internal ? `<path id="limites-comunales" d="${scene.internal}" fill="none" stroke="${map.colors.internal}" stroke-width="${map.internalWidth}" ${stroke}/>` : ''}<path id="contorno-exterior" d="${scene.external}" fill="none" stroke="${map.colors.external}" stroke-width="${map.externalWidth}" ${stroke}/>`;
  const selectionBorder = selectionBorderPaths(scene, project).map(p => `<path id="${p.id}" d="${p.d}" fill="none" stroke="${map.selectionBorder.color}" stroke-width="${map.selectionBorder.width}" ${stroke}/>`).join('');
  const labels = scene.labels.map(l => `<text id="etiqueta-${l.cut}" x="${l.x}" y="${l.y}" fill="${map.colors.labels}" font-family="${font.family}" font-weight="400" font-size="${map.labelSize}" text-anchor="middle" dominant-baseline="central">${escapeXml(l.name)}</text>`).join('');
  const entries = [...project.groups.filter(g => scene.paths.some(p => g.cuts.includes(p.cut))).map(g => ({ name: g.name, color: g.color })), { name: 'Comunas destacadas', color: map.colors.selected }, ...(map.mode === 'context' ? [{ name: 'Resto del territorio', color: map.colors.unselected }] : [])];
  const legend = map.legend ? `<g id="leyenda" font-family="${font.family}" font-weight="400" font-size="12" fill="${map.colors.labels}">${entries.map((e, i) => `<rect x="${map.margin}" y="${scene.height - 22 - i * 18}" width="10" height="10" fill="${e.color}"/><text x="${map.margin + 17}" y="${scene.height - 13 - i * 18}">${escapeXml(e.name)}</text>`).join('')}</g>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="map-title map-desc"><title id="map-title">${escapeXml(scopeName(project.scope))} — GeoSVG</title><desc id="map-desc">${scene.paths.length} comunas representadas. Fuente: Biblioteca del Congreso Nacional de Chile. Cartografía referencial.</desc><metadata>${escapeXml(JSON.stringify(metadata))}</metadata><defs>${fontStyle}<clipPath id="encuadre"><rect width="${scene.width}" height="${scene.height}"/></clipPath></defs>${background}<g clip-path="url(#encuadre)"><g${transform}><g id="territorio" opacity="${map.opacity}">${shapes}${boundaries}${selectionBorder}</g><g id="etiquetas">${labels}</g></g></g>${legend}</svg>`;
}
export async function svgForDownload(scene: MapScene, project: Project, navigation?: Navigation): Promise<string> {
  const embeddedFont = scene.labels.length || project.map.legend ? await loadEmbeddedFont(project.map.labelFont) : undefined;
  return svgString(scene, project, navigation, embeddedFont);
}
export function filename(project: Project, extension: 'svg' | 'png' | 'json') {
  const slug = (s: string) => normalizeSearch(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'mapa';
  const count = scopeCommunes(project.scope).filter(c => project.selected.includes(c.cut)).length;
  return `${slug(project.export.filename)}_${slug(scopeName(project.scope))}_${count}comunas.${extension}`;
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadJson(value: unknown, name: string) { downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), name); }
export async function rasterizeSvg(svg: string, width: number, height: number, scale: 1 | 2 | 4): Promise<Blob> {
  if (width * height * scale * scale > 64_000_000 || Math.max(width, height) * scale > 16000) throw new Error('La imagen supera el límite de 64 megapíxeles o 16.000 px por lado. Reduce dimensiones o resolución.');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = width * scale; canvas.height = height * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador no permite crear imágenes PNG.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el PNG.')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
