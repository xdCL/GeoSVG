import { useState } from 'react';
import { useEditor } from '../../store/editor';
import { ColorField } from '../controls/Fields';
export function GroupsPanel() {
  const { project, addGroup, updateGroup, assignGroup, removeGroup, ungroup, moveGroup } = useEditor();
  const [name, setName] = useState('Grupo 1');
  const [color, setColor] = useState('#FFCC00');
  const unassigned = project.selected.filter(c => !project.groups.some(g => g.cuts.includes(c))).length;
  return <><div className="panel-heading"><span className="eyebrow">03 / GRUPOS</span><h2>Organiza por color</h2><p>Selecciona comunas y asígnalas a un grupo. Cada comuna pertenece a un solo grupo.</p></div>
    <p className="callout">{project.selected.length} seleccionadas · {unassigned} sin grupo</p>
    <label className="field">Nombre del nuevo grupo<input value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label>
    <ColorField label="Color del nuevo grupo" value={color} onChange={setColor} />
    <button className="primary full" disabled={!name.trim() || project.groups.length >= 30} onClick={() => { addGroup(name.trim(), color); setName(`Grupo ${project.groups.length + 2}`); }}>+ Crear grupo</button>
    {project.groups.map((g, i) => <div className="group-card" key={g.id}><label className="field">Nombre del grupo<input aria-label={`Nombre grupo ${i + 1}`} value={g.name} maxLength={80} onChange={e => { if (e.target.value.trim()) updateGroup(g.id, { name: e.target.value }); }} /></label><ColorField label={`Color de ${g.name}`} value={g.color} onChange={color => updateGroup(g.id, { color })} /><p className="muted">{g.cuts.length} comunas asignadas</p><button className="full" disabled={!project.selected.length} onClick={() => assignGroup(g.id)}>Asignar selección a este grupo</button><div className="button-row"><button aria-label={`Subir ${g.name}`} disabled={i === 0} onClick={() => moveGroup(g.id, -1)}>↑</button><button aria-label={`Bajar ${g.name}`} disabled={i === project.groups.length - 1} onClick={() => moveGroup(g.id, 1)}>↓</button><button className="danger" onClick={() => removeGroup(g.id)}>Eliminar</button></div></div>)}
    <button className="full" disabled={!project.selected.length} onClick={ungroup}>Quitar selección de todos los grupos</button>
    <p className="source-note">Prioridad: grupo → selección → resto del territorio. La silueta usa el color general de selección.</p>
  </>;
}
