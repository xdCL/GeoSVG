import type { LabelSignStyle } from '../../types';
import { ColorField, NumberField } from '../controls/Fields';

export function LabelSignControls({ style, onChange }: { style: LabelSignStyle; onChange: (style: LabelSignStyle) => void }) {
  const update = (patch: Partial<LabelSignStyle>) => onChange({ ...style, ...patch });
  return <>
    <label className="field">Formato de los nombres
      <select aria-label="Formato de los nombres" value={style.enabled ? 'sign' : 'text'} onChange={e => update({ enabled: e.target.value === 'sign' })}>
        <option value="text">Texto plano</option>
        <option value="sign">Letrero isométrico</option>
      </select>
    </label>
    {style.enabled && <details open><summary>Estilo del letrero</summary>
      <ColorField label="Frente del letrero" value={style.faceColor} onChange={faceColor => update({ faceColor })} />
      <ColorField label="Relieve del letrero" value={style.edgeColor} onChange={edgeColor => update({ edgeColor })} />
      <ColorField label="Poste del letrero" value={style.postColor} onChange={postColor => update({ postColor })} />
      <NumberField label="Inclinación del letrero" value={style.tilt} unit="°" min={-30} max={30} onChange={tilt => update({ tilt })} />
      <NumberField label="Profundidad del letrero" value={style.depth} unit="px SVG" min={0} max={16} onChange={depth => update({ depth })} />
      <NumberField label="Margen interno del letrero" value={style.padding} unit="px SVG" min={2} max={24} onChange={padding => update({ padding })} />
      <NumberField label="Altura del letrero" value={style.height} unit="px SVG" min={0} max={48} onChange={height => update({ height })} />
      <NumberField label="Opacidad del letrero" value={Math.round(style.opacity * 100)} unit="%" onChange={opacity => update({ opacity: opacity / 100 })} />
      <p className="source-note">Usa una inclinación negativa para invertir la dirección. Una altura de 0 quita el poste.</p>
    </details>}
  </>;
}
