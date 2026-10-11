import { useState } from 'react';
import { catalog, searchCommunes, scopeCommunes } from '../../data/catalog';
import { useEditor } from '../../store/editor';

export function TerritoryPanel() {
  const { project, setScope, toggle, select, clear } = useEditor();
  const [query, setQuery] = useState('');
  const visible = searchCommunes(project.scope, query).sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
  const selectedHere = scopeCommunes(project.scope).filter(c => project.selected.includes(c.cut)).length;
  const available = visible.filter(c => c.available).map(c => c.cut);
  const missing = catalog.communes.filter(c => !c.available);
  return <>
    <div className="panel-heading"><span className="eyebrow">01 / TERRITORIO</span><h2>Elige tu mapa</h2><p>El ámbito define lo que ves. La selección define lo que destacas.</p></div>
    <label className="field">Región<select aria-label="Región" value={project.scope.region} onChange={e => { setScope({ region: e.target.value, province: '' }); setQuery(''); }}><option value="">Chile · todas las regiones</option>{catalog.regions.map(r => <option key={r.code} value={r.code}>{r.shortName}</option>)}</select></label>
    <label className="field">Provincia<select aria-label="Provincia" value={project.scope.province} disabled={!project.scope.region} onChange={e => setScope({ ...project.scope, province: e.target.value })}><option value="">Todas las provincias</option>{catalog.provinces.filter(p => p.region === project.scope.region).map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
    <div className="selection-summary"><strong>{project.selected.length}</strong><span>comunas seleccionadas<small>{selectedHere} en este ámbito</small></span><button className="text-button" onClick={clear} disabled={!project.selected.length}>Limpiar</button></div>
    <label className="search"><span aria-hidden="true">⌕</span><input placeholder="Buscar comuna o CUT…" aria-label="Buscar comuna o CUT" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="list-actions"><button onClick={() => select(available, 'add')}>Seleccionar visibles</button><button onClick={() => select(available, 'invert')}>Invertir visibles</button></div>
    <div className="commune-list" aria-label="Comunas del ámbito">
      {visible.length === 0 && <p className="muted">No hay comunas que coincidan.</p>}
      {visible.map(c => <label key={c.cut} className={`commune-row ${project.selected.includes(c.cut) ? 'is-selected' : ''}`}><input type="checkbox" checked={project.selected.includes(c.cut)} onChange={() => toggle(c.cut)} disabled={!c.available} /><span>{c.name}{!c.available && <small>Sin geometría en la fuente</small>}</span><code>{c.cut}</code>{project.groups.some(g => g.cuts.includes(c.cut)) && <span className="group-dot" style={{ background: project.groups.find(g => g.cuts.includes(c.cut))?.color }} title={project.groups.find(g => g.cuts.includes(c.cut))?.name} />}</label>)}
    </div>
    <p className="source-note">{catalog.regions.length} regiones · {catalog.provinces.length} provincias · {catalog.communes.filter(c => c.available).length} comunas con geometría.{missing.length > 0 && ` Sin polígono en esta capa: ${missing.map(c => c.name).join(', ')}.`}</p>
  </>;
}
