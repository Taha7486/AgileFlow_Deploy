import { useEffect, useState } from 'react';
import GitHubIcon from '@mui/icons-material/GitHub';
import SyncIcon from '@mui/icons-material/Sync';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useGitHubStore } from '../../store/githubStore';

interface Props {
  projectId: number;
  onChanged?: () => void | Promise<void>;
}

const GitHubIntegrationPanel = ({ projectId, onChanged }: Props) => {
  const { integration, loading, error, fetchIntegration, connect, disconnect, sync } = useGitHubStore();
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    void fetchIntegration(projectId);
  }, [fetchIntegration, projectId]);

  const handleConnect = async () => {
    await connect(projectId, { repoOwner, repoName, accessToken });
    setRepoOwner('');
    setRepoName('');
    setAccessToken('');
    setSnackbar('Depot GitHub connecte');
    await onChanged?.();
  };

  const handleDisconnect = async () => {
    await disconnect(projectId);
    setSnackbar('Integration GitHub deconnectee');
    await onChanged?.();
  };

  const handleSync = async () => {
    await sync(projectId);
    setSnackbar('Synchronisation GitHub terminee');
    await onChanged?.();
  };

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #DFE1E6', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <GitHubIcon />
          <Box>
            <Typography variant="h6" fontWeight={800}>GitHub</Typography>
            <Typography variant="body2" color="text.secondary">
              {integration ? `${integration.repoOwner}/${integration.repoName}` : 'Liez un depot au projet actif.'}
            </Typography>
          </Box>
        </Stack>

        {integration && (
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: { sm: 1 } }}>
              Derniere synchronisation : {integration.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleString('fr-FR') : 'jamais'}
            </Typography>
            <Button variant="contained" startIcon={<SyncIcon />} disabled={loading} onClick={() => void handleSync()}>
              Synchroniser
            </Button>
            <Button color="error" variant="outlined" disabled={loading} onClick={() => void handleDisconnect()}>
              Deconnecter
            </Button>
          </Stack>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {!integration ? (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <TextField label="Proprietaire du depot" value={repoOwner} onChange={(event) => setRepoOwner(event.target.value)} />
          <TextField label="Nom du depot" value={repoName} onChange={(event) => setRepoName(event.target.value)} />
          <TextField
            label="Token d'acces GitHub"
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            helperText="Le token est envoye au backend et n'est jamais stocke cote frontend."
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <GitHubIcon />}
            disabled={loading || !repoOwner.trim() || !repoName.trim() || !accessToken.trim()}
            onClick={() => void handleConnect()}
          >
            Connecter
          </Button>
        </Stack>
      ) : null}

      <Snackbar open={Boolean(snackbar)} autoHideDuration={2500} onClose={() => setSnackbar(null)}>
        <Alert severity="success">{snackbar}</Alert>
      </Snackbar>
    </Paper>
  );
};

export default GitHubIntegrationPanel;
