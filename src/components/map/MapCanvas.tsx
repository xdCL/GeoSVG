import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../store/editor';
import { mapFont } from '../../lib/fonts/catalog';
import { dashArray } from '../../lib/svg/export';
import type { MapScene, Navigation } from '../../types';

export function MapCanvas({ scene, loading, error, retry, navigation, setNavigation }: { scene?: MapScene; loading: boolean; error?: string; retry: () => void; navigation: Navigation; setNavigation: (navigation: Navigation) => void }) {
  const project = useEditor(s => s.project);
  const toggle = useEditor(s => s.toggle);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; origin: Navigation; moved: boolean } | null>(null);
  const [hovered, setHovered] = useState('');
  const [panning, setPanning] = useState(false);
  const navRef = useRef(navigation);
  navRef.current = navigation;
  function zoom(factor: number) {
    if (!scene) return;
    const next = Math.max(0.25, Math.min(16, navigation.zoom * factor));
    const ratio = next / navigation.zoom;
    setNavigation({ zoom: next, x: scene.width / 2 - (scene.width / 2 - navigation.x) * ratio, y: scene.height / 2 - (scene.height / 2 - navigation.y) * ratio });
  }
  function coordinates(x: number, y: number) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x, y };
    const p = svg.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(matrix.inverse());
  }
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = coordinates(e.clientX, e.clientY);
      const current = navRef.current;
      const next = Math.max(0.25, Math.min(16, current.zoom * Math.exp(-e.deltaY * 0.0015)));
      const ratio = next / current.zoom;
      setNavigation({ zoom: next, x: p.x - (p.x - current.x) * ratio, y: p.y - (p.y - current.y) * ratio });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [scene, setNavigation]);
  function fitSelection() {
    if (!scene || !svgRef.current) return;
    const elements = [...svgRef.current.querySelectorAll<SVGPathElement>('[data-selected="true"]')];
    if (!elements.length) return;
    const boxes = elements.map(el => el.getBBox());
    const x = Math.min(...boxes.map(b => b.x)); const y = Math.min(...boxes.map(b => b.y));
    const w = Math.max(...boxes.map(b => b.x + b.width)) - x; const h = Math.max(...boxes.map(b => b.y + b.height)) - y;
    const zoom = Math.min(16, Math.min(scene.width / Math.max(w, 1), scene.height / Math.max(h, 1)) * 0.88);
    setNavigation({ zoom, x: scene.width / 2 - (x + w / 2) * zoom, y: scene.height / 2 - (y + h / 2) * zoom });
  }
  function fitScope() {
    if (!scene?.scopeBounds) return;
    const [x, y, w, h] = scene.scopeBounds;
    const zoom = Math.min(16, Math.min(scene.width / Math.max(w, 1), scene.height / Math.max(h, 1)) * 0.9);
    setNavigation({ zoom, x: scene.width / 2 - (x + w / 2) * zoom, y: scene.height / 2 - (y + h / 2) * zoom });
  }
  const { map } = project;
  const dash = dashArray(project);
  return <div className="canvas-shell">
    <div className="canvas-guide"><span>VISTA PREVIA VECTORIAL</span><span>{scene ? `${scene.width} × ${scene.height} px` : 'Cargando…'}</span></div>
    <div className="canvas-area">
      {loading && <div className={scene ? 'canvas-loading' : 'canvas-message'} role="status"><span className="spinner" />Preparando cartografía…</div>}
      {error && <div className="canvas-message" role="alert"><strong>No se pudo crear el mapa</strong><p>{error}</p><button onClick={retry}>Intentar de nuevo</button></div>}
      {scene && <div className={`artboard ${map.transparent || map.backgroundOpacity < 1 ? 'transparent' : ''}`} style={{ aspectRatio: `${scene.width} / ${scene.height}` }}>
        {!scene.paths.length && <div className="canvas-message"><strong>Tu selección comienza aquí</strong><p>Marca comunas en el panel Territorio para verlas en este modo.</p></div>}
        <svg ref={svgRef} className={`map-svg ${panning ? 'panning' : ''}`} viewBox={`0 0 ${scene.width} ${scene.height}`} role="group" aria-label={`Mapa interactivo con ${scene.paths.length} comunas. Usa el panel Territorio como alternativa accesible.`}
          onPointerDown={e => { if (e.button !== 0) return; const p = coordinates(e.clientX, e.clientY); drag.current = { id: e.pointerId, x: p.x, y: p.y, origin: navigation, moved: false }; }}
          onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const p = coordinates(e.clientX, e.clientY); if (Math.hypot(p.x - d.x, p.y - d.y) > 3) { d.moved = true; setPanning(true); svgRef.current?.setPointerCapture(e.pointerId); setNavigation({ ...d.origin, x: d.origin.x + p.x - d.x, y: d.origin.y + p.y - d.y }); } }}
          onPointerUp={e => { const d = drag.current; if (d?.moved) e.preventDefault(); setPanning(false); setTimeout(() => { drag.current = null; }, 0); }} onPointerCancel={() => { drag.current = null; setPanning(false); }}>
          <title>Mapa de comunas de Chile</title><desc>Selecciona polígonos con clic, Enter o espacio. Arrastra para desplazar. La exportación conserva su propio encuadre.</desc>
          <defs><clipPath id="preview-clip"><rect width={scene.width} height={scene.height} /></clipPath></defs>
          {!map.transparent && <rect width={scene.width} height={scene.height} fill={map.colors.background} opacity={map.backgroundOpacity} />}
          <g clipPath="url(#preview-clip)"><g transform={`translate(${navigation.x} ${navigation.y}) scale(${navigation.zoom})`}>
            <g opacity={map.opacity}>
              {scene.silhouette && <path d={scene.silhouette} fill={map.colors.selected} fillRule="evenodd" pointerEvents="none" />}
              {scene.paths.map(p => <path key={p.cut} id={`preview-${p.cut}`} data-cut={p.cut} data-selected={p.selected} d={p.d} fill={scene.silhouette ? 'transparent' : p.fill} fillRule="evenodd" tabIndex={0} role="button" aria-label={`${p.name}, CUT ${p.cut}`} aria-pressed={p.selected}
                onMouseEnter={() => setHovered(`${p.name} · ${p.cut}`)} onMouseLeave={() => setHovered('')} onFocus={() => setHovered(`${p.name} · ${p.cut}`)} onBlur={() => setHovered('')}
                onClick={() => { if (!drag.current?.moved) toggle(p.cut); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(p.cut); } }}><title>{p.name} · CUT {p.cut}{p.selected ? ' · Seleccionada' : ''}</title></path>)}
              <path d={scene.internal} fill="none" stroke={map.colors.internal} strokeWidth={map.internalWidth} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
              <path d={scene.external} fill="none" stroke={map.colors.external} strokeWidth={map.externalWidth} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
            </g>
            <g className="map-labels" pointerEvents="none" fill={map.colors.labels} fontFamily={mapFont(map.labelFont).family} fontWeight={400} fontSize={map.labelSize} textAnchor="middle" dominantBaseline="central">{scene.labels.map(l => <text key={l.cut} data-label-cut={l.cut} x={l.x} y={l.y}>{l.name}</text>)}</g>
          </g></g>
          {map.legend && <g fontFamily={mapFont(map.labelFont).family} fontWeight={400} fontSize={12} fill={map.colors.labels}>{[...project.groups.filter(g => scene.paths.some(p => g.cuts.includes(p.cut))).map(g => ({ name: g.name, color: g.color })), { name: 'Comunas destacadas', color: map.colors.selected }, ...(map.mode === 'context' ? [{ name: 'Resto del territorio', color: map.colors.unselected }] : [])].map((e, i) => <g key={i}><rect x={map.margin} y={scene.height - 22 - i * 18} width={10} height={10} fill={e.color} /><text x={map.margin + 17} y={scene.height - 13 - i * 18}>{e.name}</text></g>)}</g>}
        </svg>
      </div>}
      <div className="map-compass" aria-hidden="true">N<span>↑</span></div>
    </div>
    <div className="canvas-bottom"><span className="hover-label" aria-live="polite">{hovered || 'Haz clic para seleccionar · arrastra para mover'}</span><div className="zoom-controls"><button aria-label="Alejar mapa" onClick={() => zoom(1 / 1.25)}>−</button><span>{Math.round(navigation.zoom * 100)}%</span><button aria-label="Acercar mapa" onClick={() => zoom(1.25)}>+</button><button aria-label="Restablecer vista y ajustar al contenido" title="Ajustar al contenido" onClick={() => setNavigation({ zoom: 1, x: 0, y: 0 })}>⤢</button><button className="region-fit" aria-label="Ajustar vista al ámbito regional o provincial" title="Ajustar a región o provincia" onClick={fitScope}>R</button><button aria-label="Ajustar vista a comunas seleccionadas" title="Ajustar a selección" disabled={!scene?.paths.some(p => p.selected)} onClick={fitSelection}>◈</button></div></div>
  </div>;
}
