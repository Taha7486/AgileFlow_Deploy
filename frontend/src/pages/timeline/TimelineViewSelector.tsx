import { Box, Button, Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { useTimelineStore } from '../../store/timelineStore';
import type { TimelineVue } from '../../types/timeline.types';

const VIEWS: { value: TimelineVue; label: string }[] = [
  { value: 'SEMAINES', label: 'Semaines' },
  { value: 'MOIS', label: 'Mois' },
  { value: 'TRIMESTRES', label: 'Trimestres' },
];

const TimelineViewSelector = () => {
  const { vue, setVue, scrollToToday } = useTimelineStore();
  return (
    <Box sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 200, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: 1.5, p: 0.5, boxShadow: '0 2px 8px rgba(9,30,66,0.15)' }}>
      <Button size="small" onClick={scrollToToday}>Aujourd'hui</Button>
      {VIEWS.map((item) => (
        <Button key={item.value} size="small" variant={vue === item.value ? 'contained' : 'text'} onClick={() => setVue(item.value)}>
          {item.label}
        </Button>
      ))}
      <Tooltip title="Chronologie du projet">
        <InfoOutlined sx={{ fontSize: 18, color: '#6B778C', mx: 1 }} />
      </Tooltip>
    </Box>
  );
};

export default TimelineViewSelector;
