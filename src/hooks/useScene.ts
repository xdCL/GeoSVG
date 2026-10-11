import { useEffect, useState } from 'react';
import { sceneFor } from '../lib/geo/service';
import type { MapScene, Project } from '../types';
export function useScene(project: Project, retry: number) {
  const [state, setState] = useState<{ scene?: MapScene; loading: boolean; error?: string }>({ loading: true });
  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, loading: true, error: undefined }));
    const timer = setTimeout(() => { sceneFor(project).then(scene => { if (active) setState({ scene, loading: false }); }).catch(error => { if (active) setState({ loading: false, error: (error as Error).message }); }); }, 40);
    return () => { active = false; clearTimeout(timer); };
  }, [project, retry]);
  return state;
}
