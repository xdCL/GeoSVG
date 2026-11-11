import type { SelectionGradient } from '../../types';
import { NumberField, Toggle } from '../controls/Fields';

export function GradientControls({ value, onChange }: { value: SelectionGradient; onChange: (value: SelectionGradient) => void }) {
  const update = (patch: Partial<SelectionGradient>) => onChange({ ...value, ...patch });
  return <details open><summary>Degradado de selección</summary>
    <Toggle label="Aplicar degradado a las seleccionadas" checked={value.enabled} onChange={enabled => update({ enabled })} />
    {value.enabled && <>
      <NumberField label="Intensidad del degradado" unit="%" value={Math.round(value.intensity * 100)} onChange={intensity => update({ intensity: intensity / 100 })} />
      <NumberField label="Dirección del degradado" unit="°" value={value.angle} min={-180} max={180} step={5} onChange={angle => update({ angle })} />
      <label className="field">Alcance del degradado<select aria-label="Alcance del degradado" value={value.scope} onChange={e => update({ scope: e.target.value as SelectionGradient['scope'] })}><option value="commune">Cada comuna</option><option value="selection">Territorio seleccionado completo</option></select></label>
      <p className="source-note">El efecto parte del color de cada comuna y conserva los colores HEX que elegiste.</p>
    </>}
  </details>;
}
