import React, { useState } from 'react';
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  PlayCircle,
  RadioButtonUnchecked,
  CheckCircle,
  Visibility,
  WarningAmber,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Checkbox,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { usePlanningStore } from '../../store/planningStore';
import type { PlanningTask, TaskPriorite, TaskStatut } from '../../types/planning.types';
import { ALLOWED_CHILD_TYPES } from '../../types/planning.types';
import { formatDateFR, isOverdue, PRIORITE_CONFIG, STATUT_CONFIG, userFullName } from '../../utils/planningHelpers';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import CreateSubtaskModal from '../../components/planning/CreateSubtaskModal';
import { formatIssueKey } from '../../utils/issueKey';

interface Props {
  task: PlanningTask;
  selected: boolean;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  depth?: number;
}

const statusIcon: Record<TaskStatut, JSX.Element> = {
  TODO: <RadioButtonUnchecked fontSize="small" />,
  IN_PROGRESS: <PlayCircle fontSize="small" />,
  REVIEW: <Visibility fontSize="small" />,
  DONE: <CheckCircle fontSize="small" />,
};

const PlanningTaskRow = ({ task, selected, onSelect, onOpen, depth = 0 }: Props) => {
  const { inlineEditTask, visibleColumns, addSubtaskToParent, selectedTaskIds } = usePlanningStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.titre);
  const [statusAnchor, setStatusAnchor] = useState<HTMLElement | null>(null);
  const [priorityAnchor, setPriorityAnchor] = useState<HTMLElement | null>(null);
  
  const [expanded, setExpanded] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const canHaveChildren = (ALLOWED_CHILD_TYPES[task.typeTache] || []).length > 0;
  const hasChildren = (task.sousTaskes || []).length > 0;

  const saveTitle = () => {
    setEditingTitle(false);
    const next = title.trim();
    if (next && next !== task.titre) void inlineEditTask(task.id, 'titre', next);
    else setTitle(task.titre);
  };

  const renderCell = (column: string) => {
    switch (column) {
      case 'titre':
        return (
          <TableCell sx={{ minWidth: 340, paddingLeft: `${8 + depth * 24}px !important` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              {hasChildren ? (
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(prev => !prev);
                  }} 
                  sx={{ p: 0.25 }}
                >
                  {expanded ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              ) : (
                <Box sx={{ width: 24, flexShrink: 0 }} />
              )}
              
              <TaskTypeIcon type={task.typeTache} size={16} isChild={depth > 0} />
              
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{formatIssueKey(task.project?.issuePrefix, task.id)}</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1, minWidth: 0 }}>
                {editingTitle ? (
                  <TextField
                    value={title}
                    autoFocus
                    size="small"
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle();
                      if (e.key === 'Escape') {
                        setTitle(task.titre);
                        setEditingTitle(false);
                      }
                    }}
                    sx={{ minWidth: 260 }}
                  />
                ) : (
                  <Typography
                    noWrap
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTitle(true);
                    }}
                    sx={{ maxWidth: 330, fontSize: 14, color: '#172B4D' }}
                  >
                    {task.titre}
                  </Typography>
                )}
                
                {hasChildren && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(task.sousTaskesDoneCount / task.sousTaskeCount) * 100} 
                      sx={{ width: 60, height: 4, borderRadius: 2 }} 
                      color={task.sousTaskesDoneCount === task.sousTaskeCount ? 'success' : 'primary'} 
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      {task.sousTaskesDoneCount}/{task.sousTaskeCount}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {task.isUrgent && <Chip label="URGENT" color="error" size="small" sx={{ height: 20, fontSize: 10, ml: 1 }} />}
              {canHaveChildren && (
                <Tooltip title="Ajouter une sous-tache">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    setCreateModalOpen(true);
                  }}>
                    <AddIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </TableCell>
        );
      case 'assignee':
        return (
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: task.assignee?.avatarColor ?? 'grey.400', fontSize: 11 }}>{task.assignee?.initiales ?? '?'}</Avatar>
              <Typography variant="body2" noWrap>{userFullName(task.assignee)}</Typography>
            </Box>
          </TableCell>
        );
      case 'reporter':
        return (
          <TableCell>
            {task.reporter ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: task.reporter.avatarColor, fontSize: 11 }}>{task.reporter.initiales}</Avatar>
                <Typography variant="body2" noWrap>{userFullName(task.reporter)}</Typography>
              </Box>
            ) : <Typography variant="body2" color="text.secondary">-</Typography>}
          </TableCell>
        );
      case 'priorite':
        return (
          <TableCell>
            <Chip
              size="small"
              label={PRIORITE_CONFIG[task.priorite].label}
              onClick={(e) => {
                e.stopPropagation();
                setPriorityAnchor(e.currentTarget);
              }}
              sx={{ color: PRIORITE_CONFIG[task.priorite].color, bgcolor: PRIORITE_CONFIG[task.priorite].bgColor, fontWeight: 700 }}
            />
          </TableCell>
        );
      case 'statut':
        return (
          <TableCell>
            <Chip
              size="small"
              icon={statusIcon[task.statut]}
              label={STATUT_CONFIG[task.statut].label}
              color={STATUT_CONFIG[task.statut].color}
              onClick={(e) => {
                e.stopPropagation();
                setStatusAnchor(e.currentTarget);
              }}
              sx={{ fontWeight: 700 }}
            />
          </TableCell>
        );
      case 'dateEcheance':
        return (
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isOverdue(task.dateEcheance) && task.statut !== 'DONE' ? 'error.main' : 'text.secondary' }}>
              {isOverdue(task.dateEcheance) && task.statut !== 'DONE' && <WarningAmber fontSize="small" />}
              <Typography variant="body2">{formatDateFR(task.dateEcheance)}</Typography>
            </Box>
          </TableCell>
        );
      case 'dateMiseAJour':
        return (
          <TableCell>
            <Tooltip title={task.dateMiseAJour ? new Date(task.dateMiseAJour).toLocaleString('fr-FR') : ''}>
              <Typography variant="body2" color="text.secondary">{task.updatedAgo}</Typography>
            </Tooltip>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TableRow 
        hover 
        selected={selected} 
        onClick={() => onOpen(task.id)} 
        sx={{ 
          height: 44, 
          cursor: 'pointer', 
          bgcolor: depth > 0 ? 'rgba(0, 0, 0, 0.02)' : 'inherit',
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onSelect(task.id)}
            size="small"
          />
        </TableCell>
        {visibleColumns.map((column) => <React.Fragment key={column}>{renderCell(column)}</React.Fragment>)}
      </TableRow>

      {/* Recursive rendering of children */}
      {expanded && hasChildren && task.sousTaskes.map((child) => (
        <PlanningTaskRow 
          key={child.id} 
          task={child} 
          depth={depth + 1}
          selected={selectedTaskIds.has(child.id)}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}

      {createModalOpen && (
        <CreateSubtaskModal 
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          parentTask={task}
          onCreated={(newTask) => {
            addSubtaskToParent(task.id, newTask);
            setExpanded(true);
          }}
        />
      )}

      <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)}>
        {(Object.keys(STATUT_CONFIG) as TaskStatut[]).map((status) => (
          <MenuItem key={status} onClick={() => { void inlineEditTask(task.id, 'statut', status); setStatusAnchor(null); }}>
            {STATUT_CONFIG[status].label}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={priorityAnchor} open={Boolean(priorityAnchor)} onClose={() => setPriorityAnchor(null)}>
        {(Object.keys(PRIORITE_CONFIG) as TaskPriorite[]).map((priority) => (
          <MenuItem key={priority} onClick={() => { void inlineEditTask(task.id, 'priorite', priority); setPriorityAnchor(null); }}>
            {PRIORITE_CONFIG[priority].label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default PlanningTaskRow;
