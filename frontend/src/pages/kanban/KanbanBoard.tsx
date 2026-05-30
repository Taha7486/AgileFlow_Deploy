import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Add, ViewColumn } from '@mui/icons-material';
import PageHeader from '../../components/layout/PageHeader';
import { useActiveProject } from '../../hooks/useActiveProject';
import { useAuth } from '../../context/AuthContext';
import { useKanbanWebSocket } from '../../hooks/useKanbanWebSocket';
import { useKanbanStore } from '../../store/kanbanStore';
import type { KanbanStatut, KanbanTask } from '../../types/kanban.types';
import KanbanCard from './KanbanCard';
import KanbanCardDetail from './KanbanCardDetail';
import KanbanColumn from './KanbanColumn';
import KanbanToolbar from './KanbanToolbar';

const DETAIL_WIDTH = 460;

const KanbanBoard = () => {
  const {
    columns,
    filters,
    isLoading,
    error,
    selectedTaskId,
    loadBoard,
    setProjectId,
    moveTaskOptimistic,
    moveTaskConfirm,
    moveTaskRollback,
    openTask,
  } = useKanbanStore();
  const { activeProject, isLoading: projectLoading } = useActiveProject();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const dragFromStatut = useRef<KanbanStatut | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useKanbanWebSocket(filters.projectId);

  useEffect(() => {
    setProjectId(activeProject?.id ?? null);
  }, [activeProject?.id, setProjectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allTasks = useMemo(() => columns.flatMap((column) => column.tasks), [columns]);

  const findTaskColumn = useCallback((taskId: number): KanbanStatut | null => {
    for (const column of columns) {
      if (column.tasks.some((task) => task.id === taskId)) return column.statut;
    }
    return null;
  }, [columns]);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = Number(event.active.id);
    dragFromStatut.current = findTaskColumn(taskId);
    setActiveTask(allTasks.find((task) => task.id === taskId) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = Number(active.id);
    const fromStatut = dragFromStatut.current;
    const toStatut = String(over.id) as KanbanStatut;
    dragFromStatut.current = null;

    if (!fromStatut || fromStatut === toStatut) return;

    moveTaskOptimistic(taskId, fromStatut, toStatut);
    try {
      await moveTaskConfirm(taskId, toStatut);
    } catch {
      moveTaskRollback(taskId, fromStatut, toStatut);
      setSnack('Deplacement impossible');
    }
  };

  const handleSearch = (value: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    useKanbanStore.getState().setFilter('search', value);
    searchDebounce.current = setTimeout(() => void loadBoard(), 400);
  };

  const showNoProject = !projectLoading && !filters.projectId;

  return (
    <Box sx={{ mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#F7F8F9', overflow: 'hidden' }}>
      {error && <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>}

      <PageHeader icon={<ViewColumn />} title="Kanban" subtitle="Tableau visuel des tâches par statut" />
      <KanbanToolbar onSearch={handleSearch} />

      {showNoProject ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
          <Typography color="text.secondary">Selectionnez un projet dans le header pour afficher le tableau.</Typography>
          {!isAdmin && <Button variant="contained" startIcon={<Add />}>Creer un projet</Button>}
        </Box>
      ) : isLoading || projectLoading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', mr: selectedTaskId ? `${DETAIL_WIDTH}px` : 0, transition: 'margin-right 0.2s' }}>
            <Box sx={{ display: 'flex', gap: 1.5, p: '16px 24px', overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
              {columns.map((column) => <KanbanColumn key={column.statut} column={column} />)}
            </Box>
          </Box>

          <DragOverlay>{activeTask ? <KanbanCard task={activeTask} isDragging /> : null}</DragOverlay>
        </DndContext>
      )}

      {selectedTaskId && (
        <Box sx={{ position: 'fixed', right: 0, top: 64, bottom: 0, width: DETAIL_WIDTH, borderLeft: '1px solid #DFE1E6', bgcolor: '#FFFFFF', overflow: 'hidden', zIndex: 200, boxShadow: '-4px 0 12px rgba(9,30,66,0.1)' }}>
          <KanbanCardDetail taskId={selectedTaskId} onClose={() => openTask(null)} />
        </Box>
      )}

      <Snackbar open={Boolean(snack)} autoHideDuration={3500} onClose={() => setSnack(null)} message={snack} />
    </Box>
  );
};

export default KanbanBoard;
