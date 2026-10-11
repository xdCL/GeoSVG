import { useRef, useState } from 'react';
import { builtInPresets } from '../../data/presets';
import { useEditor } from '../../store/editor';
import { downloadJson, filename } from '../../lib/svg/export';
import { migrateProject, readJsonFile } from '../../lib/validation/project';
import type { Notify } from '../controls/Fields';

export function ProjectPanel({ notify }: { notify: Notify }) {
  const { project, library, load, savePreset, deletePreset, reset } = useEditor();
  const [name, setName] = useState('Mi mapa');
  const [resetting, setResetting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <><div className="panel-heading"><span className="eyebrow">04 / PROYECTO</span><h2>Guarda tus ideas</h2><p>Configuraciones reutilizables, almacenadas en tu navegador.</p></div>
    <h3>Presets territoriales</h3>{builtInPresets(project.scope).map(p => <button className="preset-card" key={p.id} onClick={() => { load(p.project); notify(`Preset aplicado: ${p.name}.`); }}><span aria-hidden="true">{p.id === 'slep-los-alamos' ? '◈' : p.id === 'full' ? '▰' : '□'}</span><div><strong>{p.name}</strong><small>{p.id === 'slep-los-alamos' ? 'Maule · 7 comunas · Institucional' : p.description}</small></div><span aria-hidden="true">↗</span></button>)}
    <h3>Mis presets</h3><label className="field">Nombre del preset<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label><button className="full" disabled={!name.trim() || library.presets.length >= 100} onClick={() => { savePreset({ id: crypto.randomUUID(), name: name.trim(), description: 'Configuración personal', project: structuredClone(project) }); notify('Preset guardado.'); }}>Guardar configuración actual</button>
    {library.presets.map(p => <div className="personal-preset" key={p.id}><button onClick={() => { try { load(p.project); notify(`Preset aplicado: ${p.name}.`); } catch { notify('Este preset contiene códigos territoriales desconocidos.', true); } }}>{p.name}</button><button aria-label={`Eliminar preset ${p.name}`} onClick={() => deletePreset(p.id)}>×</button></div>)}
    <details open><summary>Portabilidad</summary><p className="muted">El proyecto JSON incluye selección, colores, grupos, encuadre y preferencias. Las geometrías oficiales se mantienen separadas.</p><div className="button-row"><button onClick={() => downloadJson(project, filename(project, 'json'))}>Exportar proyecto</button><button onClick={() => input.current?.click()}>Importar proyecto</button></div>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { load(migrateProject(await readJsonFile(f))); notify('Proyecto validado e importado.'); } catch (error) { notify(error instanceof Error && !('issues' in error) ? error.message : 'Proyecto inválido: verifica la versión, los CUT y los colores.', true); } e.target.value = ''; }} />
    </details>
    <details><summary>Fuente y cobertura</summary><p className="muted">Biblioteca del Congreso Nacional de Chile. Ediciones declaradas 2014, 2017 y 2018; metadatos XML de 2019. Consulta: 10 de octubre de 2026.</p><p className="muted">345 comunas con geometría. Antártica (12202) solo está en el catálogo. La zona sin demarcar se guarda como referencia separada. Islas y archipiélagos de la capa se conservan en su ubicación real. Cartografía referencial.</p><a href="https://www.bcn.cl/siit/mapas_vectoriales/" target="_blank" rel="noreferrer">Ver fuente y condiciones de uso ↗</a></details>
    {resetting ? <div className="callout"><p>Se eliminarán de este navegador tus paletas, presets y cambios guardados.</p><div className="button-row"><button className="danger" onClick={() => { reset(); setResetting(false); notify('Aplicación restablecida.'); }}>Confirmar restablecimiento</button><button onClick={() => setResetting(false)}>Cancelar</button></div></div> : <button className="text-button danger" onClick={() => setResetting(true)}>Restablecer aplicación</button>}
  </>;
}
