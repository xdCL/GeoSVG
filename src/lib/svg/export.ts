import { scopeName, scopeCommunes } from '../../data/catalog';
import { normalizeSearch } from '../colors/palettes';
import type { MapScene, Navigation, Project } from '../../types';
import source from '../../data/catalog/source.json';
import { mapFont } from '../fonts/catalog';
import { loadEmbeddedFont } from '../fonts/embedded';
import type { EmbeddedFont } from '../fonts/embedded';
import { selectionBorderPaths } from '../geo/borders';
import { labelAppearance, labelText } from '../fonts/style';
import { signFaceColor } from '../geo/signs';
import { layerBorders, layerFor, projectForLabel } from '../geo/layers';

export const escapeXml = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
export const lineDash = (style: Project['map']['lineStyle']) => style === 'dashed' ? '6 4' : style === 'dotted' ? '1 4' : undefined;
export const dashArray = (project: Project) => lineDash(project.map.lineStyle);
export function svgString(scene: MapScene, project: Project, navigation?: Navigation, embeddedFont?: EmbeddedFont | EmbeddedFont[]): string {
  if (!scene.paths.length) throw new Error('No hay comunas para exportar. Selecciona al menos una en este ámbito.');
  if (project.map.mode === 'silhouette' && !scene.silhouette) throw new Error('La unión no está disponible. No se exportará una silueta inválida.');
  const { map } = project;
  const font = mapFont(map.labelFont);
  const fonts = embeddedFont ? Array.isArray(embeddedFont) ? embeddedFont : [embeddedFont] : [];
  const fontStyle = fonts.length ? `<style id="map-font" type="text/css"><![CDATA[${fonts.map(face => `@font-face{font-family:'${mapFont(face.id).name}';src:url('${face.dataUrl}') format('woff2');font-weight:${face.weight};font-style:${face.style};}`).join('')}]]></style>` : '';
  const dash = dashArray(project);
  const stroke = `stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}`;
  const transform = navigation ? ` transform="translate(${navigation.x} ${navigation.y}) scale(${navigation.zoom})"` : '';
  const background = map.transparent ? '' : `<rect id="fondo" width="${scene.width}" height="${scene.height}" fill="${map.colors.background}" opacity="${map.backgroundOpacity}"/>`;
  const metadata = { application: 'GeoSVG', author: 'xdCL', source: source.institution, sourceUrl: source.page, layer: source.layer, edition: source.update, sourceHash: source.sha256, terms: source.terms, crs: source.targetCrs, projection: 'Mercator', selected: project.selected, scope: project.scope, typography: { ...map.labelStyle, family: font.name, labels: map.labels, size: map.labelSize, color: map.colors.labels, embedded: !!fonts.length, ...(fonts.length ? { license: [...new Set(fonts.map(f => f.license))].join('\n'), fonts: fonts.map(f => ({ family: mapFont(f.id).name, weight: f.weight, style: f.style })) } : {}) }, limitations: source.limitations };
  const shapes = scene.silhouette
    ? `<path id="silueta-territorial" d="${scene.silhouette}" fill="${map.colors.selected}" fill-rule="evenodd"><title>${escapeXml(`Unión de ${scene.paths.length} comunas`)}</title></path>`
    : scene.paths.map(p => `<path id="comuna-${p.cut}" data-cut="${p.cut}" d="${p.d}" fill="${p.fill}" opacity="${layerFor(p.cut, project)?.opacity ?? 1}" fill-rule="evenodd"><title>${escapeXml(p.name)} · CUT ${p.cut}</title></path>`).join('');
  const boundaries = `${scene.internal ? `<path id="limites-comunales" d="${scene.internal}" fill="none" stroke="${map.colors.internal}" stroke-width="${map.internalWidth}" ${stroke}/>` : ''}<path id="contorno-exterior" d="${scene.external}" fill="none" stroke="${map.colors.external}" stroke-width="${map.externalWidth}" ${stroke}/>`;
  const selectionBorder = selectionBorderPaths(scene, project).map(p => `<path id="${p.id}" d="${p.d}" fill="none" stroke="${map.selectionBorder.color}" stroke-width="${map.selectionBorder.width}" ${stroke}/>`).join('');
  const borders = layerBorders(scene, project).map(border => `<path id="borde-capa-${border.cut}" d="${border.d}" fill="none" stroke="${border.color}" stroke-width="${border.width}" opacity="${layerFor(border.cut, project)?.opacity ?? 1}" stroke-linejoin="round" stroke-linecap="round"${lineDash(border.lineStyle) ? ` stroke-dasharray="${lineDash(border.lineStyle)}"` : ''}/>`).join('');
  const labels = scene.labels.map(l => {
    const local = projectForLabel(l.cut, project);
    const textAttributes = Object.entries(labelAppearance(local)).map(([key, value]) => `${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}="${escapeXml(String(value))}"`).join(' ');
    const style = local.map.labelSign;
    const sign = style.enabled ? l.sign : undefined;
    const position = sign ? `transform="${sign.transform}"` : `x="${l.x}" y="${l.y}"`;
    const text = `<text id="etiqueta-${l.cut}" ${position} ${textAttributes} text-anchor="middle" dominant-baseline="central">${escapeXml(labelText(l.name, local.map.labelStyle))}</text>`;
    if (!sign) return text;
    const post = sign.stem ? `<g data-sign-post="" fill="${style.postColor}"><line x2="${sign.stem[0]}" y2="${sign.stem[1]}" stroke="${style.postColor}" stroke-width="2.1" stroke-linecap="round"/><circle r="2.35"/></g>` : '';
    const faces = sign.faces.map(({ face, points }) => `<polygon data-face="${face}" points="${points}" fill="${signFaceColor(face, style)}"${face === 'front' ? ` stroke="${style.edgeColor}"` : ''} stroke-width="0.75" stroke-linejoin="round"/>`).join('');
    return `<g id="letrero-${l.cut}" data-sign-cut="${l.cut}" transform="translate(${l.x} ${l.y})"><g data-sign-board="" opacity="${style.opacity}">${post}${faces}</g>${text}</g>`;
  }).join('');
  const entries = [...project.groups.filter(g => scene.paths.some(p => g.cuts.includes(p.cut))).map(g => ({ name: g.name, color: g.color })), { name: 'Comunas destacadas', color: map.colors.selected }, ...(map.mode === 'context' ? [{ name: 'Resto del territorio', color: map.colors.unselected }] : [])];
  const legend = map.legend ? `<g id="leyenda" font-family="${font.family}" font-weight="${map.labelStyle.weight}" font-style="${map.labelStyle.italic ? 'italic' : 'normal'}" font-size="12" fill="${map.colors.labels}">${entries.map((e, i) => `<rect x="${map.margin}" y="${scene.height - 22 - i * 18}" width="10" height="10" fill="${e.color}"/><text x="${map.margin + 17}" y="${scene.height - 13 - i * 18}">${escapeXml(e.name)}</text>`).join('')}</g>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="map-title map-desc"><title id="map-title">${escapeXml(scopeName(project.scope))} — GeoSVG</title><desc id="map-desc">${scene.paths.length} comunas representadas. Fuente: Biblioteca del Congreso Nacional de Chile. Cartografía referencial.</desc><metadata>${escapeXml(JSON.stringify(metadata))}</metadata><defs>${fontStyle}<clipPath id="encuadre"><rect width="${scene.width}" height="${scene.height}"/></clipPath></defs>${background}<g clip-path="url(#encuadre)"><g${transform}><g id="territorio" opacity="${map.opacity}">${shapes}${boundaries}${selectionBorder}${borders}</g><g id="etiquetas">${labels}</g></g></g>${legend}</svg>`;
}
export async function svgForDownload(scene: MapScene, project: Project, navigation?: Navigation): Promise<string> {
  const maps = scene.labels.map(label => projectForLabel(label.cut, project).map);
  if (project.map.legend) maps.push(project.map);
  const variants = new Map(maps.map(map => [`${map.labelFont}:${map.labelStyle.weight}:${map.labelStyle.italic}`, map]));
  const fonts = await Promise.all([...variants.values()].map(map => loadEmbeddedFont(map.labelFont, map.labelStyle.weight, map.labelStyle.italic)));
  return svgString(scene, project, navigation, fonts.filter((font): font is EmbeddedFont => !!font));
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
