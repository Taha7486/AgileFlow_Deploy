import { useState } from 'react';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import { PersonAddAlt1Outlined } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import InviteModal from '../../pages/teams/components/InviteModal';

const InviteButton = () => {
  const { user } = useAuth();
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  if (!activeProject || (user?.role !== 'ROLE_ADMIN' && !activeProject.owner)) {
    return null;
  }

  return (
    <>
      <Tooltip title="Inviter des developpeurs">
        <IconButton size="small" onClick={() => setOpen(true)} sx={{ color: 'text.secondary' }}>
          <PersonAddAlt1Outlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <InviteModal
        open={open}
        projectId={activeProject.id}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          setSuccessOpen(true);
        }}
      />
      <Snackbar
        open={successOpen}
        autoHideDuration={3500}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessOpen(false)} sx={{ width: '100%' }}>
          Invitation envoyee avec succes
        </Alert>
      </Snackbar>
    </>
  );
};

export default InviteButton;
