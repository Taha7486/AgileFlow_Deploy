import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import { STATUT_CONFIG } from '../../types/timeline.types';
import type { TimelineEpic, TimelineTask } from '../../types/timeline.types';
import { formatDateFR } from '../../utils/timelineHelpers';

interface Props {
  item: TimelineTask | TimelineEpic;
  isEpic: boolean;
}

const TimelineTooltip = ({ item, isEpic }: Props) => {
  const status = STATUT_CONFIG[item.statut] ?? STATUT_CONFIG.TODO;
  const progress = isEpic
    ? ((item as TimelineEpic).tacheCount > 0 ? ((item as TimelineEpic).tachesDoneCount / (item as TimelineEpic).tacheCount) * 100 : 0)
    : 0;

  return (
    <Box sx={{ minWidth: 220, p: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <TaskTypeIcon type={isEpic ? 'EPIC' : (item as TimelineTask).typeTache} showTooltip={false} />
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>{item.titre}</Typography>
      </Box>
      <Typography sx={{ fontSize: 11, color: '#A8B3CF', mb: 0.75 }}>PJ-{item.id}</Typography>
      <Typography sx={{ fontSize: 12, color: '#FFFFFF', mb: 1 }}>
        {formatDateFR(item.dateDebut)} - {formatDateFR(isEpic ? (item as TimelineEpic).dateFin : (item as TimelineTask).dateFin)}
      </Typography>
      <Chip label={status.labelFR} size="small" sx={{ height: 20, bgcolor: status.bgColor, color: status.textColor, fontSize: 11, fontWeight: 700 }} />
      {isEpic && (
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 11, color: '#FFFFFF', mb: 0.5 }}>
            {(item as TimelineEpic).tachesDoneCount}/{(item as TimelineEpic).tacheCount} taches terminees
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 3, borderRadius: 2 }} />
        </Box>
      )}
    </Box>
  );
};

export default TimelineTooltip;
