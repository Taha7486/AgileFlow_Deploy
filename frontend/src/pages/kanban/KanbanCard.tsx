import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  AccountTree,
  Apps,
  Bookmark,
  BugReport,
  ChatBubbleOutline,
  CheckBox,
  CheckCircle,
  FlashOn,
  MoreVert,
  Person,
  Star,
  SubdirectoryArrowRight,
} from '@mui/icons-material';
import { Avatar, Box, Chip, IconButton, Link, Paper, Tooltip, Typography } from '@mui/material';
import { PRIORITE_CONFIG, TYPE_CONFIG } from '../../types/kanban.types';
import type { KanbanTask, KanbanTypeTache } from '../../types/kanban.types';
import { getLabelColor } from '../../utils/kanbanHelpers';
import { useKanbanStore } from '../../store/kanbanStore';
import KanbanCardMenu from './KanbanCardMenu';
import { formatIssueKey } from '../../utils/issueKey';
import { resolvePresenceDisplay, usePresenceStore } from '../../store/presenceStore';

interface Props {
  task: KanbanTask;
  isDragging?: boolean;
}

const TYPE_ICONS: Record<KanbanTypeTache, typeof Bookmark> = {
  EPIC: FlashOn,
  STORY: Bookmark,
  TASK: CheckBox,
  FEATURE: Star,
  BUG: BugReport,
  SUBTASK: SubdirectoryArrowRight,
};

const KanbanCard = ({ task, isDragging: overlayDragging = false }: Props) => {
  const openTask = useKanbanStore((state) => state.openTask);
  const [hovered, setHovered] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const TypeIcon = TYPE_ICONS[task.typeTache] ?? Apps;
  const typeConfig = TYPE_CONFIG[task.typeTache];
  const priorityConfig = PRIORITE_CONFIG[task.priorite];
  const getPresence = usePresenceStore((state) => state.getPresence);
  const assigneePresence = resolvePresenceDisplay(task.assignee ? getPresence(task.assignee.id) : undefined);

  return (
    <Paper
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      elevation={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openTask(task.id)}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 1.5,
        mb: 1,
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        bgcolor: '#FFFFFF',
        opacity: isDragging ? 0.45 : 1,
        cursor: overlayDragging ? 'grabbing' : 'grab',
        transform: CSS.Translate.toString(transform),
        boxShadow: overlayDragging ? '0 8px 22px rgba(9,30,66,0.22)' : 'none',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: '0 2px 8px rgba(9,30,66,0.15)' },
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: priorityConfig.color }} />

      {task.labels.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {task.labels.slice(0, 3).map((label) => {
            const color = getLabelColor(label);
            return <Chip key={label} label={label} size="small" sx={{ height: 18, fontSize: 11, fontWeight: 700, bgcolor: color.bg, color: color.text }} />;
          })}
          {task.labels.length > 3 && <Chip label={`+${task.labels.length - 3}`} size="small" sx={{ height: 18, fontSize: 11 }} />}
        </Box>
      )}

      {task.epicTitre && (
        <Chip
          label={task.epicTitre}
          size="small"
          sx={{
            mb: 1,
            height: 20,
            maxWidth: '100%',
            bgcolor: '#F0EBFF',
            color: '#6B3DC9',
            fontSize: 11,
            fontWeight: 800,
            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        />
      )}

      {task.isUrgent && (
        <Chip
          label="URGENT"
          size="small"
          sx={{
            mb: 1,
            height: 18,
            fontSize: 10,
            fontWeight: 800,
            bgcolor: '#FFEBE6',
            color: '#DE350B',
            '@keyframes kanbanUrgentPulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.55 },
            },
            animation: 'kanbanUrgentPulse 1.5s infinite',
          }}
        />
      )}

      <Typography
        sx={{
          color: '#172B4D',
          fontSize: 14,
          lineHeight: 1.4,
          mb: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {task.titre}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Tooltip title={typeConfig.label}>
            <Box sx={{ width: 16, height: 16, borderRadius: '3px', bgcolor: typeConfig.bgColor, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TypeIcon sx={{ fontSize: 12 }} />
            </Box>
          </Tooltip>
          <Typography sx={{ fontSize: 12, color: '#6B778C', whiteSpace: 'nowrap' }}>{formatIssueKey(task.project?.issuePrefix, task.id)}</Typography>
          {task.sousTaskeCount > 0 && (
            <Tooltip title={`Sous-taches : ${task.sousTaskesDoneCount}/${task.sousTaskeCount}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: '#6B778C' }}>
                <AccountTree sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 11 }}>{task.sousTaskesDoneCount}/{task.sousTaskeCount}</Typography>
              </Box>
            </Tooltip>
          )}
          {task.commentCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: '#6B778C' }}>
              <ChatBubbleOutline sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 11 }}>{task.commentCount}</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {task.githubPrNumber && task.githubPrUrl && (
            <Link
              href={task.githubPrUrl}
              target="_blank"
              rel="noreferrer"
              underline="none"
              onClick={(event) => event.stopPropagation()}
            >
              <Chip
                label={`PR #${task.githubPrNumber}`}
                size="small"
                color={task.statut === 'DONE' ? 'success' : 'warning'}
                sx={{ height: 20, fontSize: 10, fontWeight: 800 }}
              />
            </Link>
          )}
          {task.statut === 'DONE' && <CheckCircle sx={{ fontSize: 16, color: '#00875A' }} />}
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setMenuAnchor(event.currentTarget);
            }}
            sx={{ width: 24, height: 24, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
          >
            <MoreVert sx={{ fontSize: 16 }} />
          </IconButton>
          <Tooltip title={task.assignee ? `${task.assignee.prenom} ${task.assignee.nom}` : 'Non assigne'}>
            <Avatar
              src={task.assignee?.avatarUrl ?? undefined}
              sx={{
                width: 24,
                height: 24,
                fontSize: 11,
                bgcolor: task.assignee?.avatarColor ?? '#DFE1E6',
                color: task.assignee ? '#fff' : '#6B778C',
                border: assigneePresence === 'LIVE' ? '2px solid #44b700' : undefined,
              }}
            >
              {task.assignee ? task.assignee.initiales : <Person sx={{ fontSize: 14 }} />}
            </Avatar>
          </Tooltip>
        </Box>
      </Box>

      <KanbanCardMenu task={task} anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)} />
    </Paper>
  );
};

export default KanbanCard;
