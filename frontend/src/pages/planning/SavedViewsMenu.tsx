import { useState } from 'react';
import { Delete, ExpandMore, Save } from '@mui/icons-material';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemText, Menu, MenuItem, TextField, Typography } from '@mui/material';
import { usePlanningStore } from '../../store/planningStore';

const SavedViewsMenu = () => {
  const { savedViews, applySavedView, deleteSavedView, saveCurrentView } = usePlanningStore();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    await saveCurrentView(name.trim());
    setName('');
    setDialogOpen(false);
    setAnchor(null);
  };

  return (
    <>
      <Button endIcon={<ExpandMore />} onClick={(e) => setAnchor(e.currentTarget)} size="small">Vues sauvegardees</Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {savedViews.length === 0 && <MenuItem disabled>Aucune vue sauvegardee</MenuItem>}
        {savedViews.map((view) => (
          <MenuItem key={view.id} onClick={() => { applySavedView(view); setAnchor(null); }}>
            <ListItemText primary={view.nom} />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                void deleteSavedView(view.id);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
        <MenuItem onClick={() => setDialogOpen(true)}>
          <Save fontSize="small" />
          <Typography sx={{ ml: 1 }}>Sauvegarder la vue actuelle</Typography>
        </MenuItem>
      </Menu>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sauvegarder la vue</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField autoFocus fullWidth label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={() => void save()}>Sauvegarder</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SavedViewsMenu;
