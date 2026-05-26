import { Add, AccountTree, ChevronRight } from '@mui/icons-material';
import { Box, Checkbox, Chip, IconButton, LinearProgress, Typography } from '@mui/material';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import { useTimelineStore } from '../../store/timelineStore';
import { STATUT_CONFIG } from '../../types/timeline.types';
import type { TimelineEpic, TimelineTask } from '../../types/timeline.types';

interface Props {
  onCreateEpic: () => void;
}

const ROW_HEIGHT = 44;

const TimelineTicketPanel = ({ onCreateEpic }: Props) => {
  const { data, expandedEpics, toggleEpic, openTask } = useTimelineStore();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: 36, flexShrink: 0, bgcolor: '#F4F5F7', borderBottom: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', px: 2 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#172B4D', textTransform: 'uppercase' }}>Tickets</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {data?.epics.map((epic) => (
          <Box key={epic.id}>
            <EpicRow epic={epic} expanded={expandedEpics.has(epic.id)} onToggle={() => toggleEpic(epic.id)} onOpen={() => openTask(epic.id)} />
            {expandedEpics.has(epic.id) && epic.taches.map((task) => <TaskRow key={task.id} task={task} onOpen={() => openTask(task.id)} />)}
          </Box>
        ))}
        <Box
          component="button"
          onClick={onCreateEpic}
          sx={{
            width: '100%',
            height: ROW_HEIGHT,
            border: 0,
            borderBottom: '1px solid #F0F1F3',
            bgcolor: 'transparent',
            color: '#6B778C',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: '#F4F5F7' },
          }}
        >
          <Add sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: 14 }}>Creer Epic</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const EpicRow = ({ epic, expanded, onToggle, onOpen }: { epic: TimelineEpic; expanded: boolean; onToggle: () => void; onOpen: () => void }) => {
  const progress = epic.tacheCount > 0 ? (epic.tachesDoneCount / epic.tacheCount) * 100 : 0;
  return (
    <Box sx={{ height: ROW_HEIGHT, borderBottom: '1px solid #F0F1F3', display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, '&:hover': { bgcolor: '#F4F5F7' } }}>
      <Checkbox size="small" />
      <IconButton size="small" onClick={onToggle} sx={{ width: 22, height: 22 }}>
        <ChevronRight sx={{ fontSize: 18, transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s' }} />
      </IconButton>
      <TaskTypeIcon type="EPIC" showTooltip={false} />
      <Typography sx={{ fontSize: 12, color: '#0052CC' }}>PJ-{epic.id}</Typography>
      <Box onClick={onOpen} sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}>
        <Typography sx={{ fontSize: 14, color: '#172B4D' }} noWrap>{epic.titre}</Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ width: 120, height: 3, borderRadius: 2, mt: 0.4 }} />
      </Box>
    </Box>
  );
};

const TaskRow = ({ task, onOpen }: { task: TimelineTask; onOpen: () => void }) => {
  const status = STATUT_CONFIG[task.statut] ?? STATUT_CONFIG.TODO;
  return (
    <Box sx={{ height: ROW_HEIGHT, borderBottom: '1px solid #F0F1F3', display: 'flex', alignItems: 'center', gap: 0.75, pl: task.parentEpicId ? 5 : 1.5, pr: 1.5, '&:hover': { bgcolor: '#F4F5F7' } }}>
      <Checkbox size="small" />
      <Box sx={{ width: 22 }} />
      <TaskTypeIcon type={task.typeTache} showTooltip={false} />
      <Typography sx={{ fontSize: 12, color: '#0052CC' }}>PJ-{task.id}</Typography>
      <Typography onClick={onOpen} sx={{ flex: 1, minWidth: 0, fontSize: 14, color: '#172B4D', cursor: 'pointer' }} noWrap>
        {task.titre}
      </Typography>
      {task.commentCount > 0 && <AccountTree sx={{ fontSize: 14, color: '#6B778C' }} />}
      <Chip label={status.labelFR} size="small" sx={{ maxWidth: 92, height: 20, bgcolor: status.bgColor, color: status.textColor, fontSize: 10, fontWeight: 800 }} />
    </Box>
  );
};

export default TimelineTicketPanel;
