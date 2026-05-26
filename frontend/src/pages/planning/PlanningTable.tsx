import {
  ArrowDownward,
  ArrowUpward,
  Refresh,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PlanningGroupRow from './PlanningGroupRow';
import PlanningTaskRow from './PlanningTaskRow';
import { usePlanningStore } from '../../store/planningStore';
import { COLUMN_LABELS } from '../../utils/planningHelpers';
import type { SortByOption } from '../../types/planning.types';

const sortableColumns = new Set(['titre', 'priorite', 'statut', 'dateEcheance', 'dateMiseAJour']);

const PlanningTable = () => {
  const {
    groups,
    isLoading,
    filters,
    visibleColumns,
    selectedTaskIds,
    collapsedGroups,
    currentPage,
    totalPages,
    applyFiltersAndReload,
    toggleGroup,
    toggleTaskSelection,
    openTask,
    selectAll,
    clearSelection,
    resetFilters,
    loadTasks,
  } = usePlanningStore();

  const allIds = groups.flatMap((group) => group.tasks.map((task) => task.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedTaskIds.has(id));
  const someSelected = allIds.some((id) => selectedTaskIds.has(id));
  const colSpan = visibleColumns.length + 1;

  const toggleSort = (column: string) => {
    if (!sortableColumns.has(column)) return;
    const sortBy = column === 'dateMiseAJour' ? 'dateMiseAJour' : column;
    applyFiltersAndReload({
      sortBy: sortBy as SortByOption,
      sortDir: filters.sortBy === sortBy && filters.sortDir === 'ASC' ? 'DESC' : 'ASC',
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <TableContainer sx={{ flex: 1 }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1120 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ bgcolor: '#F4F5F7' }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={() => (allSelected ? clearSelection() : selectAll())}
                  size="small"
                />
              </TableCell>
              {visibleColumns.map((column) => {
                const active = filters.sortBy === column;
                return (
                  <TableCell
                    key={column}
                    onClick={() => toggleSort(column)}
                    sx={{ bgcolor: '#F4F5F7', color: '#6B778C', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', cursor: sortableColumns.has(column) ? 'pointer' : 'default' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {COLUMN_LABELS[column] ?? column}
                      {active && (filters.sortDir === 'ASC' ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />)}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && Array.from({ length: 7 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox"><Skeleton variant="rectangular" width={20} height={20} /></TableCell>
                {visibleColumns.map((column) => <TableCell key={column}><Skeleton /></TableCell>)}
              </TableRow>
            ))}

            {!isLoading && groups.map((group) => {
              const collapsed = collapsedGroups.has(group.groupKey);
              return (
                <>
                  {filters.groupBy !== 'NONE' && (
                    <PlanningGroupRow
                      key={`group-${group.groupKey}`}
                      group={group}
                      collapsed={collapsed}
                      onToggle={() => toggleGroup(group.groupKey)}
                      colSpan={colSpan}
                    />
                  )}
                  {!collapsed && group.tasks.map((task) => (
                    <PlanningTaskRow
                      key={task.id}
                      task={task}
                      depth={0}
                      selected={selectedTaskIds.has(task.id)}
                      onSelect={toggleTaskSelection}
                      onOpen={openTask}
                    />
                  ))}
                </>
              );
            })}

            {!isLoading && groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan}>
                  <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">Aucune tache trouvee</Typography>
                    <Typography variant="body2" color="text.secondary">Essayez de modifier les filtres ou la recherche.</Typography>
                    <Button startIcon={<Refresh />} onClick={resetFilters}>Reinitialiser les filtres</Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {currentPage < totalPages - 1 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={colSpan}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', py: 0.5 }}>
                    <Button disabled={isLoading} onClick={() => void loadTasks(currentPage + 1)}>
                      Charger plus
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PlanningTable;
