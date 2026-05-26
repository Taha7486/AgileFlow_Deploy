import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { inviteToProject, searchUsers } from '../../api/invitationApi';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import type { InvitationResult, UserSearchResult } from '../../types';

type Option = UserSearchResult & { inputEmail?: string; label?: string };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onClose: () => void;
}

const InviteModal = ({ open, onClose }: Props) => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Option[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [role, setRole] = useState('ROLE_DEVELOPER');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InvitationResult[]>([]);

  useEffect(() => {
    if (!open || !activeProject?.id || inputValue.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setSuggestions(await searchUsers(inputValue.trim(), activeProject.id));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeProject?.id, inputValue, open]);

  const options = useMemo(() => {
    const rows: Option[] = [...suggestions];
    const email = inputValue.trim().toLowerCase();
    if (emailRegex.test(email) && !rows.some((row) => row.email.toLowerCase() === email) && !selectedEmails.includes(email)) {
      rows.push({ id: -1, nom: '', prenom: '', email, inputEmail: email, label: `Inviter ${email} par email` });
    }
    return rows;
  }, [inputValue, selectedEmails, suggestions]);

  const addEmail = (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!emailRegex.test(normalized) || selectedEmails.includes(normalized)) return;
    setSelectedEmails((current) => [...current, normalized]);
    setInputValue('');
  };

  const submit = async () => {
    if (!activeProject?.id || selectedEmails.length === 0) return;
    setLoading(true);
    setResults([]);
    const nextResults: InvitationResult[] = [];
    for (const email of selectedEmails) {
      try {
        const res = await inviteToProject(activeProject.id, email, role);
        nextResults.push({ email, status: res.status, message: res.message });
      } catch (e: any) {
        nextResults.push({ email, status: 'ERROR', message: e?.response?.data?.message ?? 'Erreur invitation.' });
      }
      setResults([...nextResults]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter des personnes a {activeProject?.name ?? 'ce projet'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Autocomplete
            freeSolo
            options={options}
            inputValue={inputValue}
            onInputChange={(_, value) => setInputValue(value)}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.label ?? `${option.prenom} ${option.nom} ${option.email}`}
            onChange={(_, value) => {
              if (!value) return;
              if (typeof value === 'string') addEmail(value);
              else addEmail(value.email);
            }}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={`${option.id}-${option.email}`} sx={{ gap: 1 }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                  {(option.prenom?.[0] ?? option.email[0]).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2">{option.label ?? `${option.prenom} ${option.nom}`}</Typography>
                  {!option.inputEmail && <Typography variant="caption" color="text.secondary">{option.email}</Typography>}
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Email ou nom"
                required
                placeholder="Rechercher ou saisir un email..."
                InputProps={{ ...params.InputProps, startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            )}
          />

          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Selectionnes</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {selectedEmails.map((email) => (
                <Chip key={email} label={email} onDelete={() => setSelectedEmails((current) => current.filter((item) => item !== email))} />
              ))}
            </Stack>
          </Box>

          <Alert severity="info">Les personnes non inscrites recevront un lien d'invitation valable 72h.</Alert>

          <TextField select label="Role" value={role} onChange={(event) => setRole(event.target.value)} fullWidth>
            <MenuItem value="ROLE_DEVELOPER">Developpeur</MenuItem>
          </TextField>

          {results.length > 0 && (
            <Stack spacing={1}>
              {results.map((result) => (
                <Alert key={result.email} severity={result.status === 'ERROR' ? 'error' : 'success'}>
                  {result.status === 'ADDED' ? 'Utilisateur ajoute: ' : result.status === 'INVITED' ? 'Invitation envoyee: ' : ''}
                  {result.email} - {result.message}
                </Alert>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Annuler</Button>
        <Button variant="contained" onClick={submit} disabled={selectedEmails.length === 0 || loading}>
          {loading ? 'Envoi...' : 'Inviter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteModal;
