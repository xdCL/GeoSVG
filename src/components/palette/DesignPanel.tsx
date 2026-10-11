import { useRef, useState } from 'react';
import { builtInPalettes, colorLabels } from '../../lib/colors/palettes';
import { useEditor } from '../../store/editor';
import { ColorField, NumberField, Toggle } from '../controls/Fields';
import type { Notify } from '../controls/Fields';
import { downloadJson } from '../../lib/svg/export';
import { palettesFileSchema, readJsonFile } from '../../lib/validation/project';
import type { ColorKey, LabelFont, LabelStyle, Palette, SelectionBorder } from '../../types';
import { mapFont, mapFonts } from '../../lib/fonts/catalog';
import { labelText } from '../../lib/fonts/style';

export function DesignPanel({ notify }: { notify: Notify }) {
  const { project, library, map, palette, savePalette, deletePalette } = useEditor();
  const [name, setName] = useState('Mi paleta');
  const [active, setActive] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const chosen = library.palettes.find(p => p.id === active);
  const border = project.map.selectionBorder;
  const updateBorder = (patch: Partial<SelectionBorder>) => map({ selectionBorder: { ...border, ...patch } });
  const textStyle = project.map.labelStyle;
  const updateText = (patch: Partial<LabelStyle>) => map({ labelStyle: { ...textStyle, ...patch } });
  const create = (id?: string) => { if (!name.trim()) { notify('Escribe un nombre para la paleta.', true); return; } const p: Palette = { id: id || crypto.randomUUID(), name: name.trim(), colors: { ...project.map.colors }, transparent: project.map.transparent }; savePalette(p); setActive(p.id); notify('Paleta guardada en este navegador.'); };
  return <>
    <div className="panel-heading"><span className="eyebrow">02 / DISEÑO</span><h2>Color y detalle</h2><p>Colores exactos. Un mapa a tu manera.</p></div>
    <div className="palette-grid">{builtInPalettes.map(p => <button key={p.id} onClick={() => { palette(p); setActive(''); }}><span className="swatches">{Object.values(p.colors).slice(0, 4).map((c, i) => <i key={i} style={{ background: c }} />)}</span>{p.name}</button>)}</div>
    {(Object.keys(colorLabels) as ColorKey[]).filter(key => key !== 'labels').map(key => <ColorField key={key} label={colorLabels[key]} value={project.map.colors[key]} onChange={value => map({ colors: { ...project.map.colors, [key]: value } })} />)}
    <Toggle label="Fondo transparente" checked={project.map.transparent} onChange={transparent => map({ transparent })} />
    <NumberField label="Opacidad del territorio" value={Math.round(project.map.opacity * 100)} unit="%" onChange={v => map({ opacity: v / 100 })} />
    {!project.map.transparent && <NumberField label="Opacidad del fondo" value={Math.round(project.map.backgroundOpacity * 100)} unit="%" onChange={v => map({ backgroundOpacity: v / 100 })} />}
    <details open><summary>Límites y encuadre</summary><Toggle label="Mostrar divisiones comunales" checked={project.map.showInternal} onChange={showInternal => map({ showInternal })} />
      <NumberField label="Límite comunal" unit="px SVG" value={project.map.internalWidth} min={0} max={10} step={0.25} onChange={internalWidth => map({ internalWidth })} />
      <NumberField label="Contorno exterior" unit="px SVG" value={project.map.externalWidth} min={0} max={15} step={0.25} onChange={externalWidth => map({ externalWidth })} />
      <label className="field">Estilo de línea<select value={project.map.lineStyle} onChange={e => map({ lineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}><option value="solid">Continua</option><option value="dashed">Discontinua</option><option value="dotted">Punteada</option></select></label>
      <NumberField label="Margen exterior" unit="px SVG" value={project.map.margin} min={0} max={200} onChange={margin => map({ margin })} />
    </details>
    <details open><summary>Borde de selección</summary>
      <Toggle label="Añadir borde a la selección" checked={border.enabled} onChange={enabled => updateBorder({ enabled })} />
      {border.enabled && <>
        <label className="field">Aplicar borde a<select aria-label="Aplicar borde a" value={border.target} onChange={e => updateBorder({ target: e.target.value as SelectionBorder['target'] })}><option value="territory">Territorio seleccionado unido</option><option value="communes">Cada comuna seleccionada</option></select></label>
        <ColorField label="Borde de selección" value={border.color} onChange={color => updateBorder({ color })} />
        <NumberField label="Grosor del borde de selección" unit="px SVG" value={border.width} min={0} max={30} step={0.25} onChange={width => updateBorder({ width })} />
        <p className="source-note">El territorio unido resalta el perímetro del conjunto. Cada comuna conserva su propio contorno.</p>
      </>}
    </details>
    <details><summary>Nombres y tipografía</summary><label className="field">Nombres de comunas<select aria-label="Nombres de comunas" value={project.map.labels} onChange={e => map({ labels: e.target.value as 'none' | 'selected' | 'all' })}><option value="none">Sin nombres</option><option value="selected">Solo seleccionadas</option><option value="all">Todas las visibles</option></select></label>
      <label className="field">Fuente de nombres y leyenda<select aria-label="Fuente de nombres y leyenda" value={project.map.labelFont} onChange={e => map({ labelFont: e.target.value as LabelFont })}>{mapFonts.map(font => <option key={font.id} value={font.id}>{font.description}</option>)}</select></label>
      <ColorField label="Color de nombres y leyenda" value={project.map.colors.labels} onChange={labels => map({ colors: { ...project.map.colors, labels } })} />
      <label className="field">Peso tipográfico<select aria-label="Peso tipográfico" value={textStyle.weight} onChange={e => updateText({ weight: Number(e.target.value) as LabelStyle['weight'] })}><option value={400}>Regular</option><option value={500}>Medio</option><option value={700}>Negrita</option></select></label>
      <div className="text-style-toggles"><Toggle label="Cursiva" checked={textStyle.italic} onChange={italic => updateText({ italic })} /><Toggle label="Subrayado" checked={textStyle.underline} onChange={underline => updateText({ underline })} /><Toggle label="Mayúsculas" checked={textStyle.uppercase} onChange={uppercase => updateText({ uppercase })} /></div>
      <p className="font-sample" style={{ fontFamily: mapFont(project.map.labelFont).family, fontWeight: textStyle.weight, fontStyle: textStyle.italic ? 'italic' : 'normal', textDecoration: textStyle.underline ? 'underline' : 'none', letterSpacing: textStyle.letterSpacing, color: project.map.colors.labels }}>{labelText('Linares · Yerbas Buenas', textStyle)}</p>
      <NumberField label="Tamaño de etiqueta" unit="px SVG" value={project.map.labelSize} min={6} max={80} onChange={labelSize => map({ labelSize })} />
      <NumberField label="Separación entre letras" unit="px SVG" value={textStyle.letterSpacing} min={0} max={8} step={0.25} onChange={letterSpacing => updateText({ letterSpacing })} />
      <NumberField label="Opacidad de los nombres" unit="%" value={Math.round(textStyle.opacity * 100)} onChange={value => updateText({ opacity: value / 100 })} />
      <Toggle label="Añadir contorno a los nombres" checked={textStyle.haloEnabled} onChange={haloEnabled => updateText({ haloEnabled })} />
      {textStyle.haloEnabled && <><ColorField label="Contorno de los nombres" value={textStyle.haloColor} onChange={haloColor => updateText({ haloColor })} /><NumberField label="Grosor del contorno de los nombres" unit="px SVG" value={textStyle.haloWidth} min={0} max={6} step={0.25} onChange={haloWidth => updateText({ haloWidth })} /></>}
      <Toggle label="Ocultar nombres superpuestos" checked={project.map.hideCollisions} onChange={hideCollisions => map({ hideCollisions })} />
      <Toggle label="Incluir leyenda" checked={project.map.legend} onChange={legend => map({ legend })} />
    </details>
    <details><summary>Mis paletas</summary><label className="field">Paletas guardadas<select value={active} onChange={e => { setActive(e.target.value); const p = library.palettes.find(p => p.id === e.target.value); if (p) { palette(p); setName(p.name); } }}><option value="">Nueva paleta</option>{library.palettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="field">Nombre de paleta<input value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label>
      <div className="button-row"><button onClick={() => create(chosen?.id)}>{chosen ? 'Guardar / renombrar' : 'Guardar paleta'}</button>{chosen && <button onClick={() => create()}>Duplicar</button>}</div>
      {chosen && <button className="text-button danger" onClick={() => { deletePalette(chosen.id); setActive(''); }}>Eliminar paleta</button>}
      <div className="button-row"><button onClick={() => input.current?.click()}>Importar JSON</button><button onClick={() => downloadJson({ version: 1, palettes: library.palettes }, 'paletas_geosvg.json')} disabled={!library.palettes.length}>Exportar JSON</button></div>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const data = palettesFileSchema.parse(await readJsonFile(file)); data.palettes.forEach(p => savePalette({ ...p, id: crypto.randomUUID() })); notify(`${data.palettes.length} paletas importadas.`); } catch { notify('Archivo de paletas inválido. Revisa el esquema y los colores HEX.', true); } e.target.value = ''; }} />
    </details>
    <button className="text-button" onClick={() => palette(builtInPalettes[0])}>Restablecer colores institucionales</button>
  </>;
}
