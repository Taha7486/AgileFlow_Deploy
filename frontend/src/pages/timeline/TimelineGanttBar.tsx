import { useRef, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import type { TimelineEpic, TimelineTask, TimelineVue } from '../../types/timeline.types';
import { dateToPixel, dureeEnPixels, pixelToDate } from '../../utils/timelineHelpers';
import { useTimelineStore } from '../../store/timelineStore';
import TimelineTooltip from './TimelineTooltip';

interface Props {
  item: TimelineTask | TimelineEpic;
  isEpic: boolean;
  dateMin: string;
  vue: TimelineVue;
  rowIndex: number;
  color?: string;
}

const TimelineGanttBar = ({ item, isEpic, dateMin, vue, rowIndex, color }: Props) => {
  const openTask = useTimelineStore((state) => state.openTask);
  const updateTaskDates = useTimelineStore((state) => state.updateTaskDates);
  const [draftX, setDraftX] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ startX: number; originalX: number } | null>(null);

  if (!item.dateDebut || !(isEpic ? (item as TimelineEpic).dateFin : (item as TimelineTask).dateFin)) return null;
  const dateFin = isEpic ? (item as TimelineEpic).dateFin : (item as TimelineTask).dateFin;
  if (!dateFin) return null;

  const baseX = dateToPixel(item.dateDebut, dateMin, vue);
  const x = draftX ?? baseX;
  const width = dureeEnPixels(item.dateDebut, dateFin, vue);
  const y = rowIndex * 44 + 12;
  const barColor = color ?? (isEpic ? (item as TimelineEpic).couleur : '#A855F7');

  const onMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDragging(true);
    startRef.current = { startX: event.clientX, originalX: x };
    const move = (moveEvent: MouseEvent) => {
      if (!startRef.current) return;
      const next = Math.max(0, startRef.current.originalX + moveEvent.clientX - startRef.current.startX);
      setDraftX(next);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setDragging(false);
      if (draftX != null && !isEpic) {
        const newStart = pixelToDate(draftX, dateMin, vue);
        const duration = width;
        const newEnd = pixelToDate(draftX + duration, dateMin, vue);
        void updateTaskDates(item.id, newStart, newEnd);
      }
      startRef.current = null;
      setDraftX(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <Tooltip
      title={<TimelineTooltip item={item} isEpic={isEpic} />}
      placement="top"
      disableHoverListener={dragging}
      componentsProps={{ tooltip: { sx: { bgcolor: '#172B4D', borderRadius: 1 } } }}
    >
      <Box
        onMouseDown={onMouseDown}
        onClick={(event) => {
          event.stopPropagation();
          openTask(item.id);
        }}
        sx={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height: 20,
          borderRadius: 10,
          px: 1,
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          bgcolor: barColor,
          background: isEpic ? `linear-gradient(90deg, ${barColor}DD, ${barColor}88)` : `linear-gradient(90deg, ${barColor}AA, ${barColor}66)`,
          boxShadow: `0 2px 4px ${barColor}44`,
          '&:hover': { filter: 'brightness(0.97)' },
        }}
      >
        {width > 60 && <Typography sx={{ color: '#FFFFFF', fontSize: 11, fontWeight: 700 }} noWrap>{item.titre}</Typography>}
      </Box>
    </Tooltip>
  );
};

export default TimelineGanttBar;
