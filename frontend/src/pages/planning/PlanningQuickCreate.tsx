import { useState } from 'react';
import {
  Add,
  CalendarToday,
  KeyboardReturn,
  PersonOutline,
  Refresh,
} from '@mui/icons-material';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { createTask } from '../../api/tasksApi';
import { usePlanningStore } from '../../store/planningStore';
import type { TaskIssueType, TypeTache } from '../../types/planning.types';
import { TYPE_CONFIG } from '../../types/planning.types';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';

const TYPE_ORDER: TypeTache[] = ['EPIC', 'STORY', 'TASK', 'FEATURE', 'BUG'];

const PlanningQuickCreate = () => {
  const { filters, totalElements, loadTasks } = usePlanningStore();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TypeTache>('TASK');
  const [typeAnchor, setTypeAnchor] = useState<HTMLElement | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConfig = TYPE_CONFIG[type];
  const canCreate = Boolean(filters.projectId) && title.trim().length > 0 && !creating;

  const handleCreate = async () => {
    if (!canCreate || !filters.projectId) return;
    setCreating(true);
    setError(null);
    try {
      await createTask({
        titre: title.trim(),
        description: '',
        priorite: 'MEDIUM',
        type: type as TaskIssueType,
        projectId: filters.projectId,
        labels: [],
      });
      setTitle('');
      await loadTasks(0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Creation impossible.');
    } finally {
      setCreating(false);
    }
  };

  if (!expanded) {
    return (
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 52, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', px: 1.5 }}>
        <Button startIcon={<Add />} onClick={() => setExpanded(true)} sx={{ justifySelf: 'start', color: '#172B4D', fontWeight: 700 }}>
          Creer
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography fontWeight={700} color="#172B4D">{totalElements} tache(s) au total</Typography>
          <Tooltip title="Actualiser">
            <IconButton size="small" onClick={() => void loadTasks(0)}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box />
      </Box>
    );
  }

  return (
    <Box sx={{ borderTop: '2px solid', borderColor: 'primary.main', bgcolor: 'background.paper', px: 1, py: 0.8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={(event) => setTypeAnchor(event.currentTarget)}
          startIcon={<TaskTypeIcon type={type} showTooltip={false} />}
          sx={{
            minWidth: 90,
            color: selectedConfig.color,
            borderColor: selectedConfig.color,
            bgcolor: selectedConfig.bgColor,
            '&:hover': { borderColor: selectedConfig.color, bgcolor: selectedConfig.bgColor },
          }}
        >
          {selectedConfig.label}
        </Button>
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={title}
          placeholder={filters.projectId ? 'Que souhaitez-vous faire ?' : 'Selectionnez un projet dans le header pour creer'}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleCreate();
            if (event.key === 'Escape') {
              setExpanded(false);
              setTitle('');
              setError(null);
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Date d'echeance a definir apres creation">
                  <CalendarToday fontSize="small" color="disabled" />
                </Tooltip>
                <Tooltip title="Assignation a definir apres creation">
                  <PersonOutline fontSize="small" color="disabled" sx={{ ml: 1 }} />
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          disabled={!canCreate}
          onClick={() => void handleCreate()}
          endIcon={<KeyboardReturn fontSize="small" />}
          sx={{ minWidth: 112 }}
        >
          {creating ? 'Creation...' : 'Creer'}
        </Button>
      </Box>
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, pl: 12 }}>
          {error}
        </Typography>
      )}

      <Menu anchorEl={typeAnchor} open={Boolean(typeAnchor)} onClose={() => setTypeAnchor(null)}>
        {TYPE_ORDER.map((option) => {
          const config = TYPE_CONFIG[option];
          return (
            <MenuItem
              key={option}
              selected={option === type}
              onClick={() => {
                setType(option);
                setTypeAnchor(null);
              }}
              sx={{ minWidth: 250, gap: 1.2 }}
            >
              <TaskTypeIcon type={option} showTooltip={false} />
              {config.label}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
};

export default PlanningQuickCreate;
