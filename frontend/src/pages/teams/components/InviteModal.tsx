import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { useCallback, useEffect, useState } from 'react';
import { fetchChatContacts, type ChatContact } from '../../../api/chatContactsApi';
import { getTeamMembers, inviteMember } from '../../../api/teamApi';
import type { MemberRole } from '../../../types/team';

interface Props {
  open: boolean;
  projectId: number | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InviteModal = ({ open, projectId, onClose, onSuccess }: Props) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('DEVELOPER');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!projectId || !open) return;
    setLoadingContacts(true);
    try {
      const [contactRows, memberRows] = await Promise.all([
        fetchChatContacts(),
        getTeamMembers(projectId),
      ]);
      const memberIds = new Set(memberRows.map((member) => member.userId).filter((id): id is number => id != null));
      const memberEmails = new Set(memberRows.map((member) => member.email.toLowerCase()));
      setContacts(contactRows.filter((contact) =>
        !memberIds.has(contact.userId) && !memberEmails.has(contact.email.toLowerCase())));
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [open, projectId]);

  useEffect(() => {
    if (open) {
      setError(null);
      setSelectedContact(null);
      void loadContacts();
    }
  }, [loadContacts, open]);

  const handleRoleChange = (event: SelectChangeEvent) => {
    setRole(event.target.value as MemberRole);
  };

  const sendInvite = async (payload: { email?: string; userId?: number }) => {
    if (!projectId) {
      setError('Aucun projet selectionne.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await inviteMember(projectId, { ...payload, role });
      setEmail('');
      setSelectedContact(null);
      setRole('DEVELOPER');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d envoyer l invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEmail = async () => {
    if (!emailRegex.test(email.trim())) {
      setError('Adresse email invalide.');
      return;
    }
    await sendInvite({ email: email.trim() });
  };

  const handleSubmitContact = async () => {
    if (!selectedContact) {
      setError('Choisissez un contact.');
      return;
    }
    await sendInvite({ userId: selectedContact.userId });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Inviter un membre
        <IconButton onClick={onClose} disabled={loading}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Role</InputLabel>
          <Select value={role} onChange={handleRoleChange} label="Role">
            <MenuItem value="DEVELOPER">Developpeur</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="VIEWER">Lecteur</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Inviter un contact
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Les contacts disponibles ne sont pas encore membres et n'ont pas d'invitation en attente.
        </Typography>
        <Autocomplete
          options={contacts}
          loading={loadingContacts}
          value={selectedContact}
          onChange={(_, value) => setSelectedContact(value)}
          getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.email})`}
          renderInput={(params) => <TextField {...params} label="Choisir un contact" size="small" />}
          noOptionsText="Aucun contact disponible"
          sx={{ mb: 1.5 }}
        />
        <Button
          fullWidth
          variant="outlined"
          onClick={handleSubmitContact}
          disabled={loading || !selectedContact}
          sx={{ mb: 2 }}
        >
          Inviter ce contact
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Inviter par email
        </Typography>
        <TextField
          fullWidth
          label="Adresse email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          sx={{ mb: 2 }}
          required
          helperText="L'utilisateur recevra un email d'invitation."
        />

        <Box sx={{ bgcolor: '#E9F2FF', borderLeft: '4px solid #0052CC', borderRadius: 1, p: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#172B4D' }}>
            Si l'adresse email est deja enregistree, l'utilisateur recevra une invitation a accepter dans le projet.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading}>Annuler</Button>
        <Button
          variant="contained"
          onClick={handleSubmitEmail}
          disabled={loading || !email.trim()}
          sx={{ bgcolor: '#0052CC', '&:hover': { bgcolor: '#0747A6' } }}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Envoi...' : 'Envoyer l invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteModal;
