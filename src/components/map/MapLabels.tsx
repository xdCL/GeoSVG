import type { MapLabel, Project } from '../../types';
import { labelAppearance, labelText } from '../../lib/fonts/style';
import { signFaceColor } from '../../lib/geo/signs';
import { projectForLabel } from '../../lib/geo/layers';

export function MapLabels({ labels, project }: { labels: MapLabel[]; project: Project }) {
  const appearance = labelAppearance(project);
  return <g className="map-labels" pointerEvents="none" fontFamily={appearance.fontFamily} textAnchor="middle" dominantBaseline="central">
    {labels.map(label => {
      const local = projectForLabel(label.cut, project);
      const style = local.map.labelSign;
      const appearance = labelAppearance(local);
      const sign = style.enabled ? label.sign : undefined;
      const name = labelText(label.name, local.map.labelStyle);
      if (!sign) return <text key={label.cut} data-label-cut={label.cut} x={label.x} y={label.y} {...appearance}>{name}</text>;
      return <g key={label.cut} className="map-sign" data-sign-cut={label.cut} transform={`translate(${label.x} ${label.y})`}>
        <g data-sign-board="" opacity={style.opacity}>
          {sign.stem && <g data-sign-post="" fill={style.postColor}>
            <line x2={sign.stem[0]} y2={sign.stem[1]} stroke={style.postColor} strokeWidth={2.1} strokeLinecap="round" />
            <circle r={2.35} />
          </g>}
          {sign.faces.map(({ face, points }) => <polygon key={face} data-face={face} points={points} fill={signFaceColor(face, style)} stroke={face === 'front' ? style.edgeColor : undefined} strokeWidth={0.75} strokeLinejoin="round" />)}
        </g>
        <text data-label-cut={label.cut} transform={sign.transform} {...appearance}>{name}</text>
      </g>;
    })}
  </g>;
}
