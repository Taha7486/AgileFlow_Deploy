import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import type { ActivityHeatmapItem } from '../../types';

interface ActivityHeatmapProps {
  items: ActivityHeatmapItem[];
}

type HeatmapCell = {
  date: Date;
  dateKey: string;
  count: number;
  inRange: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const weekDays = ['', 'Lun', '', 'Mer', '', 'Ven', ''];

const levelColor = (count: number) => {
  if (count === 0) return '#EEF2F7';
  if (count <= 1) return '#CFE3FF';
  if (count <= 3) return '#8DBDFF';
  if (count <= 6) return '#4F86F7';
  return '#2457D6';
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDate = (date: string) => new Date(`${date}T00:00:00`);

const formatDay = (date: Date) =>
  date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const monthLabel = (date: Date) =>
  date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
};

const buildWeeks = (items: ActivityHeatmapItem[]) => {
  if (items.length === 0) {
    return { weeks: [] as HeatmapCell[][], monthMarkers: [] as Array<{ weekIndex: number; label: string }>, total: 0 };
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const first = parseDate(sorted[0].date);
  const last = parseDate(sorted[sorted.length - 1].date);
  const firstKey = toDateKey(first);
  const lastKey = toDateKey(last);
  const values = new Map(sorted.map((item) => [item.date, item.activityCount]));
  const total = sorted.reduce((sum, item) => sum + item.activityCount, 0);
  const cursor = startOfWeek(first);
  const weeks: HeatmapCell[][] = [];

  while (cursor.getTime() <= last.getTime()) {
    const week: HeatmapCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(cursor.getTime() + day * DAY_MS);
      const dateKey = toDateKey(date);
      const inRange = dateKey >= firstKey && dateKey <= lastKey;
      week.push({
        date,
        dateKey,
        count: inRange ? values.get(dateKey) ?? 0 : 0,
        inRange,
      });
    }
    weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
  }

  const monthMarkers: Array<{ weekIndex: number; label: string }> = [];
  let previousMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstInRange = week.find((cell) => cell.inRange);
    if (!firstInRange) return;
    const month = firstInRange.date.getMonth();
    if (month !== previousMonth) {
      monthMarkers.push({ weekIndex, label: monthLabel(firstInRange.date) });
      previousMonth = month;
    }
  });

  const readableMarkers = monthMarkers.filter((marker, index) => {
    const next = monthMarkers[index + 1];
    return !next || next.weekIndex - marker.weekIndex >= 3;
  });

  return { weeks, monthMarkers: readableMarkers, total };
};

const ActivityHeatmap = ({ items }: ActivityHeatmapProps) => {
  const { weeks, monthMarkers, total } = buildWeeks(items);
  const columns = Math.max(weeks.length, 1);
  const gridWidth = columns * 17;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'grey.200', bgcolor: '#FFFFFF' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {total} activites sur la periode
          </Typography>
          <Typography variant="body2" color="text.secondary">Distribution quotidienne des evenements.</Typography>
        </Box>
      </Stack>

      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box sx={{ minWidth: gridWidth + 48, width: 'max-content' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `42px ${gridWidth}px`, columnGap: '6px' }}>
            <Box />
            <Box sx={{ position: 'relative', width: gridWidth, height: 22, mb: 0.75 }}>
              {monthMarkers.map((marker) => (
                <Typography
                  key={`${marker.label}-${marker.weekIndex}`}
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    left: marker.weekIndex * 17,
                    top: 0,
                    color: '#475569',
                    fontWeight: 700,
                    lineHeight: '18px',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {marker.label}
                </Typography>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: `42px ${gridWidth}px`, columnGap: '6px' }}>
            <Box sx={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', rowGap: '4px' }}>
              {weekDays.map((label, index) => (
                <Typography key={`${label}-${index}`} variant="caption" sx={{ color: '#475569', lineHeight: '13px', fontSize: 11 }}>
                  {label}
                </Typography>
              ))}
            </Box>

            <Box
              data-testid="activity-heatmap"
              sx={{
                display: 'grid',
                gridTemplateRows: 'repeat(7, 13px)',
                gridAutoFlow: 'column',
                gridAutoColumns: '13px',
                gap: '4px',
                alignItems: 'center',
                width: gridWidth,
              }}
            >
              {weeks.flatMap((week) =>
                week.map((cell) => (
                  <Tooltip
                    key={cell.dateKey}
                    title={cell.inRange ? `${formatDay(cell.date)} : ${cell.count} activite${cell.count > 1 ? 's' : ''}` : ''}
                    arrow
                  >
                    <Box
                      data-testid="heatmap-cell"
                      sx={{
                        width: 13,
                        height: 13,
                        borderRadius: '3px',
                        bgcolor: cell.inRange ? levelColor(cell.count) : 'transparent',
                        border: cell.inRange ? '1px solid rgba(15, 23, 42, 0.08)' : '1px solid transparent',
                      }}
                    />
                  </Tooltip>
                )),
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">Moins</Typography>
        {[0, 1, 3, 6, 10].map((count) => (
          <Box
            key={count}
            sx={{ width: 13, height: 13, borderRadius: '3px', bgcolor: levelColor(count), border: '1px solid rgba(15, 23, 42, 0.08)' }}
          />
        ))}
        <Typography variant="caption" color="text.secondary">Plus</Typography>
      </Stack>
    </Paper>
  );
};

export default ActivityHeatmap;
