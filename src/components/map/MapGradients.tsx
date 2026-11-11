import type { MapScene, Project } from '../../types';
import { selectionGradients } from '../../lib/colors/gradients';

export function MapGradients({ scene, project }: { scene: MapScene; project: Project }) {
  return <>{selectionGradients(scene, project, 'preview-').map(gradient => <linearGradient key={gradient.id} id={gradient.id}
    gradientUnits={gradient.units} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
    {gradient.stops.map(stop => <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}
  </linearGradient>)}</>;
}
