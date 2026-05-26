import { useCallback, useEffect, useRef } from 'react';
import { Alert, Box } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import PlanningTable from './PlanningTable';
import PlanningTaskDetail from './PlanningTaskDetail';
import PlanningToolbar from './PlanningToolbar';
import PlanningQuickCreate from './PlanningQuickCreate';
import { usePlanningStore } from '../../store/planningStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useActiveProject } from '../../hooks/useActiveProject';
import type { PlanningTask } from '../../types/planning.types';
import PageHeader from '../../components/layout/PageHeader';

const PlanningPage = () => {
  const { error, filters, loadSavedViews, loadTasks, openedTaskId, openTask, handleWsTaskUpdate } = usePlanningStore();
  const { activeProject } = useActiveProject();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    usePlanningStore.getState().setFilters({ projectId: activeProject?.id ?? null });
    void usePlanningStore.getState().loadTasks(0);
    void loadSavedViews();
  }, [activeProject?.id, loadSavedViews]);

  useEffect(() => {
    if (!filters.projectId) return;
    const sub = subscribe(`/topic/kanban/${filters.projectId}`, (message) => {
      try {
        handleWsTaskUpdate(JSON.parse(message.body) as PlanningTask);
      } catch {
        void loadTasks(0);
      }
    });
    return () => sub?.unsubscribe();
  }, [filters.projectId, handleWsTaskUpdate, loadTasks, subscribe]);

  const handleSearchChange = useCallback((value: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    usePlanningStore.getState().setFilter('search', value);
    searchDebounce.current = setTimeout(() => void usePlanningStore.getState().loadTasks(0), 400);
  }, []);

  return (
    <Box sx={{ mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, height: 'calc(100vh - 64px)', minHeight: 620, display: 'flex', flexDirection: 'column', bgcolor: '#F7F8F9', border: '1px solid', borderColor: 'divider' }}>
      {error && <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>}
      <PageHeader icon={<ViewListIcon />} title="Planification" subtitle="Vue liste des tickets du projet" />
      <PlanningToolbar onSearchChange={handleSearchChange} />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <PlanningTable />
        </Box>
        {openedTaskId && (
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(9, 30, 66, 0.38)',
              zIndex: (theme) => theme.zIndex.modal,
              p: { xs: 1.5, sm: 3 },
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) openTask(null);
            }}
          >
            <Box
              sx={{
                width: { xs: '100%', sm: 620, md: 760 },
                maxWidth: 'calc(100vw - 32px)',
                height: { xs: 'calc(100vh - 96px)', sm: 'min(720px, calc(100vh - 96px))' },
                maxHeight: 'calc(100vh - 96px)',
                bgcolor: 'background.paper',
                borderRadius: { xs: 1.5, sm: 2 },
                boxShadow: '0 24px 70px rgba(9, 30, 66, 0.32)',
                overflow: 'hidden',
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <PlanningTaskDetail taskId={openedTaskId} onClose={() => openTask(null)} />
            </Box>
          </Box>
        )}
      </Box>
      <PlanningQuickCreate />
    </Box>
  );
};

export default PlanningPage;
