import { useCallback, useEffect, useState } from 'react';
import { useEditor } from '../store/editor';
import { scopeName } from '../data/catalog';
import { slepPreset } from '../data/presets';
import { useScene } from '../hooks/useScene';
import { TerritoryPanel } from '../components/selectors/TerritoryPanel';
import { DesignPanel } from '../components/palette/DesignPanel';
import { GroupsPanel } from '../components/palette/GroupsPanel';
import { ProjectPanel } from '../components/presets/ProjectPanel';
import { MapCanvas } from '../components/map/MapCanvas';
import { ExportPanel } from '../components/export/ExportPanel';
import type { MapMode, Navigation } from '../types';
import source from '../data/catalog/source.json';

const tabs = [{ id: 'territory', label: 'Territorio', icon: '◈' }, { id: 'design', label: 'Diseño', icon: '◐' }, { id: 'groups', label: 'Grupos', icon: '▦' }, { id: 'project', label: 'Proyecto', icon: '▤' }];
const modes: { id: MapMode; label: string; icon: string }[] = [{ id: 'context', label: 'Contextual', icon: '▦' }, { id: 'selected', label: 'Selección', icon: '◈' }, { id: 'silhouette', label: 'Silueta', icon: '⬟' }];
export default function App() {
  const { project, map, theme, load, storageError } = useEditor();
  const [tab, setTab] = useState('territory');
  const [panelOpen, setPanelOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [navigation, setNavigation] = useState<Navigation>({ zoom: 1, x: 0, y: 0 });
  const [notice, setNotice] = useState<{ message: string; error: boolean }>();
  const notify = useCallback((message: string, error = false) => setNotice({ message, error }), []);
  const { scene, loading, error } = useScene(project, retry);
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const apply = () => { document.documentElement.dataset.theme = project.theme === 'auto' ? media.matches ? 'dark' : 'light' : project.theme; }; apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply); }, [project.theme]);
  useEffect(() => { setNavigation({ zoom: 1, x: 0, y: 0 }); }, [project.scope.region, project.scope.province, project.map.mode, project.export.width, project.export.height, project.export.aspect, project.export.frame]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(undefined), notice.error ? 10000 : 4500); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setExportOpen(false); setPanelOpen(false); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  return <div className="app">
    <a className="skip-link" href="#editor-panel">Ir a controles territoriales</a>
    <header className="topbar"><a href="#" className="brand" aria-label="GeoSVG, inicio"><svg viewBox="0 0 30 36" aria-hidden="true"><path d="M19 2L11 11L15 18L10 34L19 24L18 17L23 8Z" fill="currentColor" /></svg><span>GeoSVG<small>CARTOGRAFÍA PARA CREAR</small></span></a><div className="topbar-right"><span className="local-badge"><i />Todo queda en tu navegador</span><label className="theme-select"><span className="sr-only">Tema de la interfaz</span><select aria-label="Tema de la interfaz" value={project.theme} onChange={e => theme(e.target.value as 'auto' | 'light' | 'dark')}><option value="auto">◐ Auto</option><option value="light">☀ Claro</option><option value="dark">☾ Oscuro</option></select></label><button className="primary" onClick={() => setExportOpen(v => !v)}>Exportar mapa <span aria-hidden="true">↗</span></button></div></header>
    <div className="editor-layout">
      <aside id="editor-panel" className={`editor-panel ${panelOpen ? 'mobile-open' : ''}`} aria-label="Configuración del mapa"><nav className="panel-tabs" aria-label="Secciones del editor">{tabs.map(t => <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}><span aria-hidden="true">{t.icon}</span>{t.label}</button>)}</nav><div className="panel-content">{tab === 'territory' && <TerritoryPanel />}{tab === 'design' && <DesignPanel notify={notify} />}{tab === 'groups' && <GroupsPanel />}{tab === 'project' && <ProjectPanel notify={notify} />}</div><footer className="panel-footer"><span>Un proyecto abierto por <strong>xdCL</strong></span><span>v1.0</span></footer></aside>
      <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">CHILE / {project.scope.province ? 'PROVINCIA' : project.scope.region ? 'REGIÓN' : 'NACIONAL'}</span><h1>{scopeName(project.scope)}<span className="map-count">{scene?.paths.length ?? '…'} comunas</span></h1></div><button className="preset-shortcut" onClick={() => { load(slepPreset.project); setNavigation({ zoom: 1, x: 0, y: 0 }); notify('Territorio SLEP Los Álamos: 7 comunas seleccionadas.'); }}>◈ Preset SLEP Los Álamos</button></div>
        <div className="workspace-toolbar"><div className="mode-switch" aria-label="Modo de representación">{modes.map(m => <button key={m.id} aria-pressed={project.map.mode === m.id} onClick={() => map({ mode: m.id, ...(m.id === 'selected' ? { transparent: true } : {}) })}><span aria-hidden="true">{m.icon}</span>{m.label}</button>)}</div><span className="selected-count"><i style={{ backgroundColor: project.map.colors.selected }} />{project.selected.length} seleccionadas</span><button className="mobile-panel-button" aria-expanded={panelOpen} onClick={() => setPanelOpen(v => !v)}>{panelOpen ? 'Cerrar panel' : 'Editar mapa'}</button></div>
        <MapCanvas scene={scene} loading={loading} error={error} retry={() => setRetry(v => v + 1)} navigation={navigation} setNavigation={setNavigation} />
        <div className="workspace-footer"><span>Fuente: {source.institution}</span><span>SVG nativo <i>·</i> WGS84 <i>·</i> Cartografía referencial</span></div>
      </main>
      {exportOpen && <ExportPanel scene={scene} navigation={navigation} notify={notify} close={() => setExportOpen(false)} />}
    </div>
    {storageError && <div className="storage-warning" role="alert">El navegador no permite guardar cambios. Exporta tu proyecto JSON para conservarlo.</div>}
    {notice && <div className={`toast ${notice.error ? 'toast-error' : ''}`} role={notice.error ? 'alert' : 'status'}><span>{notice.message}</span><button onClick={() => setNotice(undefined)} aria-label="Cerrar mensaje">×</button></div>}
  </div>;
}
