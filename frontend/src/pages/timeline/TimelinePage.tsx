import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import PageHeader from '../../components/layout/PageHeader';
import { useActiveProject } from '../../hooks/useActiveProject';
import { useTimelineStore } from '../../store/timelineStore';
import CreateEpicModal from './CreateEpicModal';
import TimelineGanttGrid from './TimelineGanttGrid';
import TimelineTaskDetail from './TimelineTaskDetail';
import TimelineTicketPanel from './TimelineTicketPanel';
import TimelineToolbar from './TimelineToolbar';
import TimelineViewSelector from './TimelineViewSelector';

const TICKET_PANEL_WIDTH = 490;
const DETAIL_PANEL_WIDTH = 620;

const TimelinePage = () => {
  const { activeProject, isLoading: projectLoading } = useActiveProject();
  const { data, filters, isLoading, error, selectedTaskId, loadTimeline, setProjectId, openTask } = useTimelineStore();
  const [createEpicOpen, setCreateEpicOpen] = useState(false);
  const ticketPanelRef = useRef<HTMLDivElement>(null);
  const ganttBodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setProjectId(activeProject?.id ?? null);
  }, [activeProject?.id, setProjectId]);

  const handleTicketScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (ganttBodyRef.current && ticketPanelRef.current) {
      ganttBodyRef.current.scrollTop = ticketPanelRef.current.scrollTop;
    }
    syncing.current = false;
  }, []);

  const handleGanttScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (ganttBodyRef.current && ticketPanelRef.current) {
      ticketPanelRef.current.scrollTop = ganttBodyRef.current.scrollTop;
    }
    syncing.current = false;
  }, []);

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    useTimelineStore.getState().setFilter('search', value);
    searchTimeout.current = setTimeout(() => void loadTimeline(), 400);
  };

  return (
    <Box sx={{ mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, height: 'calc(100vh - 64px)', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #DFE1E6' }}>
      {error && <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>}
      <PageHeader icon={<TimelineIcon />} title="Chronologie" subtitle="Planification temporelle des épics et tâches" />
      <TimelineToolbar onSearch={handleSearch} onCreateEpic={() => setCreateEpicOpen(true)} />

      {projectLoading || isLoading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : !filters.projectId ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">Selectionnez un projet dans le header.</Typography>
        </Box>
      ) : !data || data.epics.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">Aucune tache a afficher dans la chronologie.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', mr: selectedTaskId ? `${DETAIL_PANEL_WIDTH}px` : 0, transition: 'margin-right 0.2s' }}>
          <Box ref={ticketPanelRef} onScroll={handleTicketScroll} sx={{ width: TICKET_PANEL_WIDTH, flexShrink: 0, borderRight: '1px solid #DFE1E6', overflowY: 'auto', overflowX: 'hidden' }}>
            <TimelineTicketPanel onCreateEpic={() => setCreateEpicOpen(true)} />
          </Box>
          <TimelineGanttGrid ganttBodyRef={ganttBodyRef} onGanttScroll={handleGanttScroll} />
        </Box>
      )}

      {selectedTaskId && (
        <Box sx={{ position: 'fixed', right: 0, top: 64, bottom: 0, width: DETAIL_PANEL_WIDTH, borderLeft: '1px solid #DFE1E6', bgcolor: '#FFFFFF', zIndex: 250, boxShadow: '-4px 0 16px rgba(9,30,66,0.1)' }}>
          <TimelineTaskDetail taskId={selectedTaskId} onClose={() => openTask(null)} />
        </Box>
      )}

      <TimelineViewSelector />
      {createEpicOpen && filters.projectId && <CreateEpicModal open={createEpicOpen} onClose={() => setCreateEpicOpen(false)} projectId={filters.projectId} />}
    </Box>
  );
};

export default TimelinePage;
