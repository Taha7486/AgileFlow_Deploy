import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { MemberRole, TeamMember } from '../../../types/team';

interface Props {
  anchorEl: HTMLElement | null;
  member: TeamMember | null;
  onClose: () => void;
  onChangeRole: (role: MemberRole) => void;
  onRemove: () => void;
}

const roleLabels: Record<Exclude<MemberRole, 'OWNER'>, string> = {
  DEVELOPER: 'Developpeur',
  ADMIN: 'Admin',
  VIEWER: 'Lecteur',
};

const MemberActionMenu = ({ anchorEl, member, onClose, onChangeRole, onRemove }: Props) => {
  const [roleSubmenuAnchor, setRoleSubmenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const closeAll = () => {
    setRoleSubmenuAnchor(null);
    onClose();
  };

  const displayName = `${member?.prenom ?? ''} ${member?.nom ?? ''}`.trim() || member?.email || 'ce membre';

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeAll}>
        <MenuItem onClick={(event) => setRoleSubmenuAnchor(event.currentTarget)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Modifier le role</ListItemText>
          <ChevronRightIcon fontSize="small" sx={{ ml: 'auto' }} />
        </MenuItem>

        {member?.userId && (
          <MenuItem component={RouterLink} to={`/users/${member.userId}`} onClick={closeAll}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Voir le profil</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={() => setConfirmRemoveOpen(true)} sx={{ color: '#DE350B' }}>
          <ListItemIcon><PersonRemoveIcon fontSize="small" sx={{ color: '#DE350B' }} /></ListItemIcon>
          <ListItemText>Retirer du projet</ListItemText>
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={roleSubmenuAnchor}
        open={Boolean(roleSubmenuAnchor)}
        onClose={() => setRoleSubmenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {(Object.keys(roleLabels) as Array<Exclude<MemberRole, 'OWNER'>>).map((role) => (
          <MenuItem
            key={role}
            selected={member?.role === role}
            onClick={() => {
              onChangeRole(role);
              setRoleSubmenuAnchor(null);
              onClose();
            }}
          >
            {roleLabels[role]}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={confirmRemoveOpen} onClose={() => setConfirmRemoveOpen(false)} maxWidth="xs">
        <DialogTitle>Retirer ce membre ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Etes-vous sur de vouloir retirer {displayName} du projet ? Cette action est irreversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemoveOpen(false)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onRemove();
              setConfirmRemoveOpen(false);
            }}
          >
            Retirer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemberActionMenu;
