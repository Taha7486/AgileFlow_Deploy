import { useCallback, useEffect, useState } from 'react';
import { fetchProjects } from '../api/projectsApi';
import { useActiveProjectStore } from '../store/activeProjectStore';
import type { ProjectListItem } from '../types';

export const useActiveProject = () => {
  const { activeProject, setActiveProject, clearActiveProject } = useActiveProjectStore();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await fetchProjects();
      setProjects(rows);
      const stillExists = activeProject ? rows.some((project) => project.id === activeProject.id) : false;
      if (activeProject && !stillExists) {
        clearActiveProject();
      }
      if (!activeProject || !stillExists) {
        const next = rows.find((project) => project.status === 'ACTIF') ?? rows[0] ?? null;
        setActiveProject(next);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeProject, clearActiveProject, setActiveProject]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return { activeProject, setActiveProject, clearActiveProject, projects, isLoading, reloadProjects: loadProjects };
};
