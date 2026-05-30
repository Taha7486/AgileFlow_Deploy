import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  Avatar,
  Box,
  CircularProgress,
} from '@mui/material';
import { 
  ALLOWED_CHILD_TYPES, 
  TYPE_CONFIG, 
  PlanningTask, 
  TypeTache, 
  CreateSubtaskRequest 
} from '../../types/planning.types';
import { planningApi } from '../../api/planningApi';
import { fetchProjectMembers } from '../../api/projectsApi';
import { UserListItem } from '../../types';
import TaskTypeIcon from './TaskTypeIcon';
import { useToast } from '../notifications/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  parentTask: PlanningTask;
  onCreated: (newTask: PlanningTask) => void;
}

const CreateSubtaskModal: React.FC<Props> = ({ open, onClose, parentTask, onCreated }) => {
  const allowedTypes = ALLOWED_CHILD_TYPES[parentTask.typeTache] || [];
  const { showToast } = useToast();
  
  const [titre, setTitre] = useState('');
  const [typeTache, setTypeTache] = useState<TypeTache>(allowedTypes[0] || 'SUBTASK');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitre('');
      setTypeTache(allowedTypes[0] || 'SUBTASK');
      setDescription('');
      setPriorite('MEDIUM');
      setAssigneeId(null);
      loadUsers();
    }
  }, [open, parentTask, allowedTypes]);

  const loadUsers = async () => {
    const projectId = parentTask.project?.id;
    if (!projectId) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const members = await fetchProjectMembers(projectId);
      setUsers(members.map((member) => ({
        id: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: 'ROLE_DEVELOPER',
        active: true,
        createdAt: member.joinedAt,
        lastLogin: null,
      })));
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreate = async () => {
    if (!titre.trim()) return;
    
    setSaving(true);
    try {
      const payload: CreateSubtaskRequest = {
        titre: titre.trim(),
        typeTache,
        description: description.trim() || undefined,
        priorite,
        assigneeId: assigneeId || undefined,
      };
      
      const result = await planningApi.createSubtask(parentTask.id, payload);
      onCreated(result);
      showToast('Sous-tâche créée avec succès', 'success');
      onClose();
    } catch (error: any) {
      console.error('Failed to create subtask', error);
      showToast(error.response?.data?.message || 'Erreur lors de la création de la sous-tâche', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6">Ajouter à {parentTask.titre}</Typography>
        <Chip 
          icon={<TaskTypeIcon type={parentTask.typeTache} showTooltip={false} />}
          label={TYPE_CONFIG[parentTask.typeTache].label}
          size="small"
          sx={{ mt: 1, bgcolor: TYPE_CONFIG[parentTask.typeTache].bgColor, color: TYPE_CONFIG[parentTask.typeTache].color }}
        />
      </DialogTitle>
      
      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {allowedTypes.length > 1 ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Type d'enfant</Typography>
              <ToggleButtonGroup
                value={typeTache}
                exclusive
                onChange={(_, val) => val && setTypeTache(val)}
                fullWidth
                size="small"
              >
                {allowedTypes.map(type => (
                  <ToggleButton key={type} value={type} sx={{ gap: 1 }}>
                    <TaskTypeIcon type={type} showTooltip={false} />
                    {TYPE_CONFIG[type].label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Type : {TYPE_CONFIG[typeTache].label}
              </Typography>
            </Box>
          )}

          <TextField
            label="Titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Priorité</InputLabel>
              <Select
                value={priorite}
                label="Priorité"
                onChange={(e) => setPriorite(e.target.value)}
              >
                <MenuItem value="LOW">Faible</MenuItem>
                <MenuItem value="MEDIUM">Moyenne</MenuItem>
                <MenuItem value="HIGH">Haute</MenuItem>
                <MenuItem value="CRITICAL">Critique</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              fullWidth
              options={users}
              getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
              loading={loadingUsers}
              value={users.find(u => u.id === assigneeId) || null}
              onChange={(_, val) => setAssigneeId(val?.id || null)}
              renderOption={(props, user) => (
                <Box component="li" {...props} key={user.id}>
                  <Avatar src={user.avatarUrl ?? undefined} sx={{ width: 28, height: 28, mr: 1, fontSize: 12 }}>
                    {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.email[0]?.toUpperCase()}
                  </Avatar>
                  {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assigné à"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Annuler</Button>
        <Button 
          onClick={handleCreate} 
          variant="contained" 
          disabled={saving || !titre.trim()}
        >
          {saving ? <CircularProgress size={24} /> : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSubtaskModal;
