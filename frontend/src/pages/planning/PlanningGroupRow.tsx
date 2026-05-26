import { Assignment, Book, ChevronRight, ExpandMore, ListAlt, Person } from '@mui/icons-material';
import { Box, Chip, LinearProgress, TableCell, TableRow, Typography } from '@mui/material';
import type { PlanningGroup } from '../../types/planning.types';

interface Props {
  group: PlanningGroup;
  collapsed: boolean;
  onToggle: () => void;
  colSpan: number;
}

const groupIcon = {
  STORY: <Book fontSize="small" />,
  ASSIGNEE: <Person fontSize="small" />,
  STATUT: <Assignment fontSize="small" />,
  NONE: <ListAlt fontSize="small" />,
};

const PlanningGroupRow = ({ group, collapsed, onToggle, colSpan }: Props) => {
  const progress = group.taskCount ? Math.round((group.doneCount / group.taskCount) * 100) : 0;
  return (
    <TableRow hover onClick={onToggle} sx={{ cursor: 'pointer', bgcolor: 'grey.50' }}>
      <TableCell colSpan={colSpan} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          {collapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
          {groupIcon[group.groupType]}
          <Typography fontWeight={700}>{group.groupLabel}</Typography>
          <Chip size="small" label={`${group.taskCount} tache(s)`} />
          <Box sx={{ width: 130 }}>
            <LinearProgress variant="determinate" value={progress} color="success" sx={{ height: 6, borderRadius: 1 }} />
          </Box>
          <Typography variant="caption" color="text.secondary">{group.doneCount}/{group.taskCount} terminees</Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default PlanningGroupRow;
