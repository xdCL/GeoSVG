import type { MapLabel, Project } from '../../types';
import { labelAppearance, lineOffset } from '../../lib/fonts/style';
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
      const text = <text data-label-cut={label.cut} x={sign ? undefined : label.x} y={sign ? undefined : label.y} transform={sign?.transform} {...appearance}>
        {label.lines.length === 1 ? label.lines[0] : label.lines.map((line, i) => <tspan key={i} x={sign ? 0 : label.x} y={(sign ? 0 : label.y) + lineOffset(i, label.lines.length, local.map.labelSize)}>{line}{i < label.lines.length - 1 ? ' ' : ''}</tspan>)}
      </text>;
      if (!sign) return <g key={label.cut}>{label.leader && <line className="label-leader" x1={label.leader[0]} y1={label.leader[1]} x2={label.leader[2]} y2={label.leader[3]} stroke={appearance.fill} opacity={appearance.opacity * 0.65} strokeWidth={0.75} />}{text}</g>;
      return <g key={label.cut} className="map-sign" data-sign-cut={label.cut} transform={`translate(${label.x} ${label.y})`}>
        <g data-sign-board="" opacity={style.opacity}>
          {sign.stem && <g data-sign-post="" fill={style.postColor}>
            <line x2={sign.stem[0]} y2={sign.stem[1]} stroke={style.postColor} strokeWidth={2.1} strokeLinecap="round" />
            <circle r={2.35} />
          </g>}
          {sign.faces.map(({ face, points }) => <polygon key={face} data-face={face} points={points} fill={signFaceColor(face, style)} stroke={face === 'front' ? style.edgeColor : undefined} strokeWidth={0.75} strokeLinejoin="round" />)}
        </g>
        {text}
      </g>;
    })}
  </g>;
}
