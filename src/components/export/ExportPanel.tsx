import { useState } from 'react';
import { useEditor } from '../../store/editor';
import { sceneFor } from '../../lib/geo/service';
import { downloadBlob, filename, rasterizeSvg, svgString } from '../../lib/svg/export';
import { NumberField } from '../controls/Fields';
import type { Notify } from '../controls/Fields';
import type { ExportOptions, MapScene, Navigation } from '../../types';

export function ExportPanel({ scene, navigation, notify, close }: { scene?: MapScene; navigation: Navigation; notify: Notify; close: () => void }) {
  const { project, exporting } = useEditor();
  const [busy, setBusy] = useState(false);
  async function download(format: 'svg' | 'png') {
    setBusy(true);
    try {
      const output = await sceneFor(project);
      const svg = svgString(output, project, project.export.frame === 'viewport' ? navigation : undefined);
      const blob = format === 'svg' ? new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }) : await rasterizeSvg(svg, output.width, output.height, project.export.scale);
      downloadBlob(blob, filename(project, format));
      notify(`${format.toUpperCase()} exportado: ${filename(project, format)}.`);
    } catch (error) { notify((error as Error).message, true); } finally { setBusy(false); }
  }
  return <aside className="export-panel" aria-label="Opciones de exportación"><div className="export-heading"><span className="eyebrow">EXPORTAR</span><button className="icon-button" onClick={close} aria-label="Cerrar exportación">×</button></div><h2>Del mapa al diseño.</h2><p className="muted">Vectorial, editable y listo para usar.</p>
    <label className="field">Proporción<select aria-label="Proporción" value={project.export.aspect} onChange={e => exporting({ aspect: e.target.value as ExportOptions['aspect'] })}><option value="auto">Automática · según territorio</option><option value="square">1:1 · cuadrada</option><option value="portrait">4:5 · vertical</option><option value="wide">16:9 · horizontal</option><option value="a4p">A4 vertical</option><option value="a4l">A4 horizontal</option><option value="custom">Dimensiones personalizadas</option></select></label>
    <NumberField label="Ancho" unit="px" value={project.export.width} min={100} max={6000} onChange={width => exporting({ width: Math.round(width) })} />
    {project.export.aspect === 'custom' && <NumberField label="Alto" unit="px" value={project.export.height} min={100} max={6000} onChange={height => exporting({ height: Math.round(height) })} />}
    <label className="field">Encuadre de exportación<select aria-label="Encuadre de exportación" value={project.export.frame} onChange={e => exporting({ frame: e.target.value as ExportOptions['frame'] })}><option value="scope">Ajustar al contenido del mapa</option><option value="selection">Ajustar a comunas seleccionadas</option><option value="viewport">Usar zoom y desplazamiento actuales</option></select></label>
    <p className="source-note">El zoom de navegación solo se exporta si eliges el encuadre actual. Los formatos ajustan el mapa sin deformarlo.</p>
    <label className="field">Nombre del archivo<input maxLength={100} value={project.export.filename} onChange={e => { if (e.target.value) exporting({ filename: e.target.value }); }} /></label>
    <div className="export-preview"><span className="file-icon">SVG</span><div><strong>Gráficos vectoriales</strong><small>{scene ? `${scene.width} × ${scene.height} px` : 'Calculando dimensiones…'} · fondo {project.map.transparent ? 'transparente' : 'sólido'}</small></div></div>
    <button className="primary full download" onClick={() => void download('svg')} disabled={busy || !scene?.paths.length}>{busy ? 'Preparando…' : '↓ Descargar SVG'}</button>
    <div className="export-divider" />
    <label className="field">Resolución PNG<select aria-label="Resolución PNG" value={project.export.scale} onChange={e => exporting({ scale: Number(e.target.value) as 1 | 2 | 4 })}><option value={1}>1× · tamaño original</option><option value={2}>2× · alta resolución</option><option value={4}>4× · máxima resolución</option></select></label>
    <button className="full" onClick={() => void download('png')} disabled={busy || !scene?.paths.length}>↓ Descargar PNG</button>
    {scene && <p className="source-note">PNG: {scene.width * project.export.scale} × {scene.height * project.export.scale} px.</p>}
    <p className="export-credit">Los SVG incluyen atribución a BCN, nombres y códigos CUT. Editables en Inkscape e Illustrator.</p>
  </aside>;
}
