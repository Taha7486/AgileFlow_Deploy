import { RefObject, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTimelineStore } from '../../store/timelineStore';
import { dateToPixel, debutMois, formatMois, formatSemaine, formatTrimestre, getVisibleRows, largeurGrille } from '../../utils/timelineHelpers';
import { PX_PAR_UNITE } from '../../types/timeline.types';
import TimelineGanttBar from './TimelineGanttBar';

interface Props {
  ganttBodyRef: RefObject<HTMLDivElement>;
  onGanttScroll: () => void;
}

const ROW_HEIGHT = 44;
const DAY_MS = 24 * 60 * 60 * 1000;

const TimelineGanttGrid = ({ ganttBodyRef, onGanttScroll }: Props) => {
  const { data, vue, expandedEpics, scrollToTodayRequest } = useTimelineStore();
  const [scrollLeft, setScrollLeft] = useState(0);
  const rows = useMemo(() => getVisibleRows(data, expandedEpics), [data, expandedEpics]);
  const width = data ? largeurGrille(data.periode.dateMin, data.periode.dateMax, vue) : 0;

  useEffect(() => {
    if (!scrollToTodayRequest || !data || !ganttBodyRef.current || width <= 0) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const element = ganttBodyRef.current;
      if (!element) return;
      const todayX = dateToPixel(data.periode.dateAujourdhui, data.periode.dateMin, vue);
      const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
      const nextScrollLeft = Math.min(maxScroll, Math.max(0, todayX - element.clientWidth / 2));
      element.scrollLeft = nextScrollLeft;
      setScrollLeft(nextScrollLeft);
      onGanttScroll();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [data, ganttBodyRef, onGanttScroll, scrollToTodayRequest, vue, width]);

  if (!data) return <Box sx={{ flex: 1 }} />;

  const todayX = dateToPixel(data.periode.dateAujourdhui, data.periode.dateMin, vue);

  return (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: 36, overflow: 'hidden', bgcolor: '#F4F5F7', borderBottom: '1px solid #DFE1E6', position: 'relative' }}>
        <Box sx={{ width, height: 36, display: 'flex', transform: `translateX(-${scrollLeft}px)` }}>
          {vue === 'SEMAINES' && data.periode.semaines.map((week) => {
            const start = weekStartDate(week);
            return (
              <Box key={week} sx={{ width: PX_PAR_UNITE.SEMAINES * 7, borderRight: '1px solid #DFE1E6' }}>
                <Box sx={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #DFE1E6' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{formatSemaine(week)}</Typography>
                </Box>
                <Box sx={{ height: 20, display: 'flex' }}>
                  {Array.from({ length: 7 }).map((_, day) => {
                    const current = new Date(start.getTime() + day * DAY_MS);
                    return (
                      <Box key={day} sx={{ width: PX_PAR_UNITE.SEMAINES, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: day < 6 ? '1px solid #EAECF0' : 'none' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#42526E' }}>{current.getDate()}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
          {vue === 'MOIS' && data.periode.mois.map((month) => {
            const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
            return (
              <Box key={month} sx={{ width: PX_PAR_UNITE.MOIS * days, borderRight: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{formatMois(month)}</Typography>
              </Box>
            );
          })}
          {vue === 'TRIMESTRES' && data.periode.trimestres.map((quarter) => (
            <Box key={quarter} sx={{ width: PX_PAR_UNITE.TRIMESTRES * 90, borderRight: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatTrimestre(quarter)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        ref={ganttBodyRef}
        onScroll={(event) => {
          setScrollLeft(event.currentTarget.scrollLeft);
          onGanttScroll();
        }}
        sx={{ flex: 1, overflow: 'auto' }}
      >
        <Box sx={{ position: 'relative', width, height: Math.max(rows.length * ROW_HEIGHT, 240) }}>
          {rows.map((row, index) => (
            <Box key={row.key} sx={{ position: 'absolute', left: 0, top: index * ROW_HEIGHT, width: '100%', height: ROW_HEIGHT, bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC', borderBottom: '1px solid #F0F1F3' }} />
          ))}
          {data.periode.mois.map((month) => (
            <Box key={month} sx={{ position: 'absolute', top: 0, bottom: 0, left: dateToPixel(debutMois(month), data.periode.dateMin, vue), width: 1, bgcolor: '#DFE1E6' }} />
          ))}
          <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: todayX, width: 2, bgcolor: '#0052CC', zIndex: 10 }}>
            <Box sx={{ position: 'absolute', top: 0, left: -4, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #0052CC' }} />
            <Box sx={{ position: 'absolute', top: 8, left: -12, minWidth: 26, height: 18, borderRadius: 9, bgcolor: '#0052CC', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(9,30,66,0.2)' }}>
              <Typography sx={{ color: '#FFFFFF', fontSize: 11, fontWeight: 800 }}>
                {new Date(data.periode.dateAujourdhui).getDate()}
              </Typography>
            </Box>
          </Box>
          {rows.map((row, index) => {
            if (row.kind === 'epic') {
              return <TimelineGanttBar key={row.key} item={row.epic} isEpic dateMin={data.periode.dateMin} vue={vue} rowIndex={index} color={row.epic.couleur} />;
            }
            return <TimelineGanttBar key={row.key} item={row.task} isEpic={false} dateMin={data.periode.dateMin} vue={vue} rowIndex={index} color={row.epic?.couleur} />;
          })}
        </Box>
      </Box>
    </Box>
  );
};

function weekStartDate(weekValue: string): Date {
  const [yearText, weekText] = weekValue.split('-W');
  const year = Number(yearText);
  const week = Number(weekText);
  const jan4 = new Date(year, 0, 4);
  const start = new Date(jan4);
  const day = jan4.getDay() || 7;
  start.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
  return start;
}

export default TimelineGanttGrid;
