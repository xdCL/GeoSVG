import { useEffect, useState } from 'react';
import { isHex } from '../../lib/colors/palettes';

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setDraft(value); }, [value]);
  const valid = isHex(draft);
  return <div className="color-field">
    <label>{label}<div className="color-inputs">
      <input type="color" aria-label={`Selector de color: ${label}`} value={value} onChange={e => onChange(e.target.value.toUpperCase())} />
      <input className="hex" aria-label={`HEX ${label}`} value={draft} maxLength={7} spellCheck={false} aria-invalid={!valid} onChange={e => { setDraft(e.target.value); if (isHex(e.target.value)) onChange(e.target.value.toUpperCase()); }} />
      <button type="button" className="copy" aria-label={`Copiar HEX ${label}`} onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => { setDraft(value); }); }}>{copied ? '✓' : '⧉'}</button>
    </div></label>
    {!valid && <small className="error-text">Usa #RRGGBB. Se conserva {value}.</small>}
  </div>;
}
export function NumberField({ label, value, onChange, min = 0, max = 100, step = 1, unit = '' }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  return <label className="number-field"><span>{label}{unit && <small>{unit}</small>}</span><input type="number" value={value} min={min} max={max} step={step} onChange={e => { const next = e.target.valueAsNumber; if (Number.isFinite(next) && next >= min && next <= max) onChange(next); }} /></label>;
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /></label>; }
export type Notify = (message: string, error?: boolean) => void;
