import { useEffect, useMemo, useState } from 'react';
import {
  ArrowBack,
  Close,
  Send,
  WarningAmber,
} from '@mui/icons-material';
import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { kanbanApi } from '../../api/kanbanApi';
import { fetchProjectMembers } from '../../api/projectsApi';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import { useKanbanStore } from '../../store/kanbanStore';
import { COLUMN_CONFIG, PRIORITE_CONFIG, TYPE_CONFIG } from '../../types/kanban.types';
import type { KanbanPriorite, KanbanStatut, KanbanTask } from '../../types/kanban.types';
import type { CommentItem, ProjectMember } from '../../types';
import { formatDateFR, isOverdue } from '../../utils/kanbanHelpers';

interface Props {
  taskId: number;
  onClose: () => void;
}

const findTask = (tasks: KanbanTask[], taskId: number) => tasks.find((task) => task.id === taskId) ?? null;

const KanbanCardDetail = ({ taskId, onClose }: Props) => {
  const { columns, loadBoard } = useKanbanStore();
  const task = useMemo(() => findTask(columns.flatMap((column) => column.tasks), taskId), [columns, taskId]);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    setTitre(task?.titre ?? '');
    setDescription(task?.description ?? '');
  }, [task]);

  useEffect(() => {
    void kanbanApi.getComments(taskId).then((data: CommentItem[]) => setComments(data)).catch(() => setComments([]));
  }, [taskId]);

  useEffect(() => {
    if (!task?.project?.id) return;
    void fetchProjectMembers(task.project.id).then(setMembers).catch(() => setMembers([]));
  }, [task?.project?.id]);

  if (!task) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Tache introuvable</Typography>
      </Box>
    );
  }

  const saveField = async (field: string, value: string) => {
    await kanbanApi.inlineEdit(task.id, field, value);
    await loadBoard();
  };

  const assignTo = async (member: ProjectMember | null) => {
    if (member) {
      await kanbanApi.assignTask(task.id, member.userId);
    } else {
      await kanbanApi.inlineEdit(task.id, 'assigneeId', '');
    }
    await loadBoard();
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    const created = await kanbanApi.addComment(task.id, comment.trim());
    setComments((current) => [...current, created]);
    setComment('');
  };

  const selectedMember = members.find((member) => member.userId === task.assignee?.id) ?? null;
  const subtaskPercent = task.sousTaskeCount > 0 ? (task.sousTaskesDoneCount / task.sousTaskeCount) * 100 : 0;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF' }}>
      <Box sx={{ height: 52, display: 'flex', alignItems: 'center', px: 1.5, borderBottom: '1px solid #DFE1E6', gap: 1 }}>
        <IconButton onClick={onClose}><ArrowBack /></IconButton>
        <Typography sx={{ flex: 1, fontSize: 13, color: '#6B778C' }}>
          {task.sprint?.nom ?? 'Backlog'} / KAN-{task.id}
        </Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField select size="small" value={task.statut} onChange={(event) => void saveField('statut', event.target.value)} sx={{ minWidth: 150 }}>
            {(Object.keys(COLUMN_CONFIG) as KanbanStatut[]).map((statut) => (
              <MenuItem key={statut} value={statut}>{COLUMN_CONFIG[statut].labelFR}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" value={task.priorite} onChange={(event) => void saveField('priorite', event.target.value)} sx={{ minWidth: 140 }}>
            {(Object.keys(PRIORITE_CONFIG) as KanbanPriorite[]).map((priorite) => (
              <MenuItem key={priorite} value={priorite}>{PRIORITE_CONFIG[priorite].label}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography sx={{ fontSize: 13 }}>Urgent</Typography>
            <Switch size="small" checked={task.isUrgent} onChange={(event) => void saveField('isUrgent', String(event.target.checked))} />
          </Stack>
        </Stack>

        <TextField
          fullWidth
          multiline
          variant="standard"
          value={titre}
          onChange={(event) => setTitre(event.target.value)}
          onBlur={() => titre.trim() !== task.titre && void saveField('titre', titre.trim())}
          InputProps={{ disableUnderline: true, sx: { fontSize: 22, fontWeight: 700, color: '#172B4D' } }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Description"
          placeholder="Ajouter une description..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => description !== (task.description ?? '') && void saveField('description', description)}
          sx={{ mb: 2 }}
        />

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Typography fontWeight={700}>Details</Typography>
          <Autocomplete
            options={members}
            value={selectedMember}
            onChange={(_, value) => void assignTo(value)}
            getOptionLabel={(member) => `${member.firstName} ${member.lastName}`}
            renderInput={(params) => <TextField {...params} label="Assigne" size="small" />}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: 110, color: '#6B778C', fontSize: 13 }}>Reporter</Typography>
            {task.reporter ? (
              <>
                <Avatar sx={{ width: 24, height: 24, bgcolor: task.reporter.avatarColor, fontSize: 11 }}>{task.reporter.initiales}</Avatar>
                <Typography sx={{ fontSize: 14 }}>{task.reporter.prenom} {task.reporter.nom}</Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 14, color: '#6B778C' }}>Non defini</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: 110, color: '#6B778C', fontSize: 13 }}>Type</Typography>
            <Chip icon={<TaskTypeIcon type={task.typeTache} showTooltip={false} />} label={TYPE_CONFIG[task.typeTache].label} size="small" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: 110, color: '#6B778C', fontSize: 13 }}>Echeance</Typography>
            <Typography sx={{ fontSize: 14, color: isOverdue(task.dateEcheance) ? '#DE350B' : '#172B4D', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isOverdue(task.dateEcheance) && <WarningAmber sx={{ fontSize: 16 }} />}
              {formatDateFR(task.dateEcheance)}
            </Typography>
          </Box>
          {task.labels.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {task.labels.map((label) => <Chip key={label} label={label} size="small" />)}
            </Stack>
          )}
        </Stack>

        {task.typeTache !== 'SUBTASK' && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography fontWeight={700}>Sous-taches</Typography>
              <Chip label={`${task.sousTaskesDoneCount}/${task.sousTaskeCount}`} size="small" />
            </Stack>
            <LinearProgress variant="determinate" value={subtaskPercent} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography fontWeight={700} sx={{ mb: 1 }}>Commentaires</Typography>
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {comments.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                {`${item.auteur.firstName?.[0] ?? ''}${item.auteur.lastName?.[0] ?? ''}`.toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.auteur.firstName} {item.auteur.lastName}</Typography>
                <Typography sx={{ fontSize: 14 }}>{item.contenu}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Ajouter un commentaire..."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') void sendComment();
          }}
          InputProps={{ endAdornment: <IconButton onClick={() => void sendComment()}><Send /></IconButton> }}
        />
      </Box>
    </Box>
  );
};

export default KanbanCardDetail;
