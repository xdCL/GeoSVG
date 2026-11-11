import { useState } from 'react';
import { catalog } from '../../data/catalog';
import { normalizeSearch } from '../../lib/colors/palettes';
import { colorFor } from '../../lib/geo/scene';
import { projectForLabel } from '../../lib/geo/layers';
import { useEditor } from '../../store/editor';
import type { CommuneLayerStyle, MapOptions } from '../../types';
import { ColorField, NumberField, Toggle } from '../controls/Fields';
import { TypographyControls } from './TypographyControls';
import { LabelSignControls } from './LabelSignControls';

function changed<T extends object>(previous: Partial<T> | undefined, next: T, current: T): Partial<T> {
  return { ...previous, ...Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== current[key as keyof T])) };
}

export function LayersPanel() {
  const { project, layer, resetLayer, colorLayers, setScope } = useEditor();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [bulkColor, setBulkColor] = useState(project.map.colors.selected);
  const term = normalizeSearch(search);
  const selected = catalog.communes.filter(c => project.selected.includes(c.cut));
  const visible = selected.filter(c => normalizeSearch(`${c.name} ${c.cut}`).includes(term)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return <>
    <div className="panel-heading"><span className="eyebrow">CAPAS</span><h2>Una comuna, su estilo</h2><p>Edita cada seleccionada sin cambiar el resto del mapa.</p></div>
    <p className="callout">{selected.length} comunas seleccionadas</p>
    {!selected.length ? <p className="muted">Selecciona comunas en Territorio o en el mapa para crear sus capas.</p> : <>
      <details><summary>Color de todas las seleccionadas</summary>
        <ColorField label="Color para todas las capas" value={bulkColor} onChange={setBulkColor} />
        <button className="full" onClick={() => colorLayers(bulkColor)}>Aplicar color a todas las capas</button>
      </details>
      <label className="field">Buscar capa por nombre o CUT<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {project.map.mode === 'silhouette' && <p className="source-note">Para ver los colores y opacidades individuales, usa Contextual o Selección. La silueta mantiene un relleno único.</p>}
      <p className="source-note">Los ajustes propios tienen prioridad sobre los grupos y el diseño general.</p>
      {!visible.length && <p className="muted">No hay capas que coincidan con la búsqueda.</p>}
      <div className="layer-list">{visible.map(commune => {
        const cut = commune.cut;
        const own = project.layers[cut] ?? {};
        const local = projectForLabel(cut, project).map;
        const inScope = (!project.scope.region || project.scope.region === commune.region) && (!project.scope.province || project.scope.province === commune.province);
        const setLabel = (patch: NonNullable<CommuneLayerStyle['label']>) => {
          const label = Object.fromEntries(Object.entries({ ...own.label, ...patch }).filter(([, value]) => value !== undefined));
          layer(cut, { label: Object.keys(label).length ? label : undefined });
        };
        const updateLabelMap = (patch: Partial<MapOptions>) => {
          const label: NonNullable<CommuneLayerStyle['label']> = {};
          if (patch.colors) label.color = patch.colors.labels;
          if (patch.labelFont !== undefined) label.font = patch.labelFont;
          if (patch.labelSize !== undefined) label.size = patch.labelSize;
          if (patch.labelStyle) label.style = changed(own.label?.style, patch.labelStyle, local.labelStyle);
          if (patch.labelSign) label.sign = changed(own.label?.sign, patch.labelSign, local.labelSign);
          setLabel(label);
        };
        return <div className="layer-card" key={cut} data-layer-cut={cut}>
          <button className="layer-row" aria-label={`Editar capa de ${commune.name}`} aria-expanded={active === cut} aria-controls={`layer-${cut}`} onClick={() => setActive(active === cut ? '' : cut)}>
            <i aria-hidden="true" style={{ background: colorFor(cut, project) }} />
            <span><strong>{commune.name}</strong><small>CUT {cut}{!inScope ? ' · Fuera del ámbito' : ''}</small></span>
            <span className="layer-state">{Object.keys(own).length ? 'Propia' : 'General'}</span>
          </button>
          {active === cut && <section id={`layer-${cut}`} className="layer-settings" aria-label={`Opciones de ${commune.name}`}>
            {!inScope && <button className="full" onClick={() => setScope({ region: commune.region, province: '' })}>Mostrar esta comuna en el mapa</button>}
            <Toggle label="Usar color propio" checked={own.fill !== undefined} onChange={enabled => layer(cut, { fill: enabled ? colorFor(cut, project) : undefined })} />
            {own.fill !== undefined && <ColorField label="Color de esta comuna" value={own.fill} onChange={fill => layer(cut, { fill })} />}
            <Toggle label="Usar opacidad propia" checked={own.opacity !== undefined} onChange={enabled => layer(cut, { opacity: enabled ? 1 : undefined })} />
            {own.opacity !== undefined && <><NumberField label="Opacidad de esta comuna" unit="%" value={Math.round(own.opacity * 100)} onChange={value => layer(cut, { opacity: value / 100 })} /><p className="source-note">Se combina con la opacidad general del territorio.</p></>}
            <Toggle label="Añadir borde a esta comuna" checked={!!own.border} onChange={enabled => layer(cut, { border: enabled ? { color: project.map.colors.external, width: 3, lineStyle: 'solid' } : undefined })} />
            {own.border && <>
              <ColorField label="Borde de esta comuna" value={own.border.color} onChange={color => layer(cut, { border: { ...own.border!, color } })} />
              <NumberField label="Grosor del borde de esta comuna" unit="px SVG" value={own.border.width} min={0} max={30} step={0.25} onChange={width => layer(cut, { border: { ...own.border!, width } })} />
              <label className="field">Estilo del borde de esta comuna<select value={own.border.lineStyle} onChange={e => layer(cut, { border: { ...own.border!, lineStyle: e.target.value as MapOptions['lineStyle'] } })}><option value="solid">Continua</option><option value="dashed">Discontinua</option><option value="dotted">Punteada</option></select></label>
            </>}
            <details><summary>Nombre y letrero de esta comuna</summary>
              <label className="field">Visibilidad del nombre<select aria-label="Visibilidad del nombre" value={own.label?.visible === undefined ? 'inherit' : own.label.visible ? 'show' : 'hide'} onChange={e => setLabel({ visible: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}><option value="inherit">Según el diseño general</option><option value="show">Mostrar este nombre</option><option value="hide">Ocultar este nombre</option></select></label>
              <label className="field">Texto del nombre<input value={own.label?.text ?? commune.name} maxLength={100} onChange={e => setLabel({ text: e.target.value })} /></label>
              <LabelSignControls style={local.labelSign} onChange={labelSign => updateLabelMap({ labelSign })} />
              <TypographyControls map={local} onChange={updateLabelMap} individual sample={own.label?.text || commune.name} />
              <button className="text-button" disabled={!own.label} onClick={() => layer(cut, { label: undefined })}>Restablecer nombre y letrero</button>
            </details>
            <button className="full" disabled={!Object.keys(own).length} onClick={() => resetLayer(cut)}>Restablecer esta capa</button>
          </section>}
        </div>;
      })}</div>
    </>}
  </>;
}
