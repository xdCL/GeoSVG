import type { LabelFont, LabelStyle, MapOptions } from '../../types';
import { mapFont, mapFonts } from '../../lib/fonts/catalog';
import { labelLines } from '../../lib/fonts/style';
import { ColorField, NumberField, Toggle } from '../controls/Fields';

export function TypographyControls({ map, onChange, individual = false, sample = 'Yerbas Buenas' }: {
  map: MapOptions; onChange: (patch: Partial<MapOptions>) => void; individual?: boolean; sample?: string;
}) {
  const style = map.labelStyle;
  const update = (patch: Partial<LabelStyle>) => onChange({ labelStyle: { ...style, ...patch } });
  const fontLabel = individual ? 'Fuente del nombre' : 'Fuente de nombres y leyenda';
  return <>
    <label className="field">{fontLabel}<select aria-label={fontLabel} value={map.labelFont} onChange={e => onChange({ labelFont: e.target.value as LabelFont })}>{mapFonts.map(font => <option key={font.id} value={font.id}>{font.description}</option>)}</select></label>
    <ColorField label={individual ? 'Color del nombre' : 'Color de nombres y leyenda'} value={map.colors.labels} onChange={labels => onChange({ colors: { ...map.colors, labels } })} />
    <label className="field">Peso tipográfico<select aria-label="Peso tipográfico" value={style.weight} onChange={e => update({ weight: Number(e.target.value) as LabelStyle['weight'] })}><option value={400}>Regular</option><option value={500}>Medio</option><option value={700}>Negrita</option></select></label>
    <div className="text-style-toggles"><Toggle label="Cursiva" checked={style.italic} onChange={italic => update({ italic })} /><Toggle label="Subrayado" checked={style.underline} onChange={underline => update({ underline })} /><Toggle label="Mayúsculas" checked={style.uppercase} onChange={uppercase => update({ uppercase })} /></div>
    <label className="field">Distribución del nombre<select aria-label="Distribución del nombre" value={style.wrap} onChange={e => update({ wrap: e.target.value as LabelStyle['wrap'] })}><option value="auto">Automática</option><option value="single">Una línea</option><option value="two-lines">Dos líneas</option></select></label>
    <p className="font-sample" style={{ fontFamily: mapFont(map.labelFont).family, fontWeight: style.weight, fontStyle: style.italic ? 'italic' : 'normal', textDecoration: style.underline ? 'underline' : 'none', letterSpacing: style.letterSpacing, color: map.colors.labels, whiteSpace: 'pre-line' }}>{labelLines(sample, style).join('\n')}</p>
    <NumberField label="Tamaño de etiqueta" unit="px SVG" value={map.labelSize} min={6} max={80} onChange={labelSize => onChange({ labelSize })} />
    <NumberField label="Separación entre letras" unit="px SVG" value={style.letterSpacing} min={0} max={8} step={0.25} onChange={letterSpacing => update({ letterSpacing })} />
    <NumberField label="Opacidad de los nombres" unit="%" value={Math.round(style.opacity * 100)} onChange={value => update({ opacity: value / 100 })} />
    <Toggle label="Añadir contorno a los nombres" checked={style.haloEnabled} onChange={haloEnabled => update({ haloEnabled })} />
    {style.haloEnabled && <><ColorField label="Contorno de los nombres" value={style.haloColor} onChange={haloColor => update({ haloColor })} /><NumberField label="Grosor del contorno de los nombres" unit="px SVG" value={style.haloWidth} min={0} max={6} step={0.25} onChange={haloWidth => update({ haloWidth })} /></>}
  </>;
}
