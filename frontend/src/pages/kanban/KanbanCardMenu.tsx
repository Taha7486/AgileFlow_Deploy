import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { DeleteOutline, FlagOutlined, OpenInNew, SwapHoriz } from '@mui/icons-material';
import { kanbanApi } from '../../api/kanbanApi';
import { useKanbanStore } from '../../store/kanbanStore';
import { COLUMN_CONFIG, PRIORITE_CONFIG } from '../../types/kanban.types';
import type { KanbanPriorite, KanbanStatut, KanbanTask } from '../../types/kanban.types';

interface Props {
  task: KanbanTask;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const STATUTS = Object.keys(COLUMN_CONFIG) as KanbanStatut[];
const PRIORITES = Object.keys(PRIORITE_CONFIG) as KanbanPriorite[];

const KanbanCardMenu = ({ task, anchorEl, onClose }: Props) => {
  const { deleteTask, loadBoard, openTask } = useKanbanStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const changeStatus = async (statut: KanbanStatut) => {
    onClose();
    await kanbanApi.moveTask(task.id, statut);
    await loadBoard();
  };

  const changePriority = async (priorite: KanbanPriorite) => {
    onClose();
    await kanbanApi.updatePriority(task.id, priorite);
    await loadBoard();
  };

  const remove = async () => {
    await kanbanApi.deleteTask(task.id);
    deleteTask(task.id);
    setConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
        <MenuItem onClick={() => { openTask(task.id); onClose(); }}>
          <ListItemIcon><OpenInNew fontSize="small" /></ListItemIcon>
          <ListItemText>Ouvrir la tache</ListItemText>
        </MenuItem>
        <Divider />
        {STATUTS.filter((statut) => statut !== task.statut).map((statut) => (
          <MenuItem key={statut} onClick={() => void changeStatus(statut)}>
            <ListItemIcon><SwapHoriz fontSize="small" /></ListItemIcon>
            <ListItemText>{COLUMN_CONFIG[statut].labelFR}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        {PRIORITES.filter((priorite) => priorite !== task.priorite).map((priorite) => (
          <MenuItem key={priorite} onClick={() => void changePriority(priorite)}>
            <ListItemIcon><FlagOutlined fontSize="small" sx={{ color: PRIORITE_CONFIG[priorite].color }} /></ListItemIcon>
            <ListItemText>{PRIORITE_CONFIG[priorite].label}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setConfirmOpen(true)} sx={{ color: '#DE350B' }}>
          <ListItemIcon><DeleteOutline fontSize="small" sx={{ color: '#DE350B' }} /></ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer la tache</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer "{task.titre}" ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void remove()}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KanbanCardMenu;
