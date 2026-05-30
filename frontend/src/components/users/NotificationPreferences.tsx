import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  fetchMyEmailPreferences,
  updateMyEmailPreferences,
} from '../../api/emailPreferencesApi';
import type {
  EmailNotificationType,
  EmailPreferences,
  UpdateEmailPreferencesPayload,
} from '../../types';
import { useAuth } from '../../context/AuthContext';

type PreferenceKey = keyof Omit<EmailPreferences, 'userId'>;

const OPTIONS: Array<{ key: PreferenceKey; type: EmailNotificationType; label: string; description: string }> = [
  { key: 'taskAssignedEnabled', type: 'TASK_ASSIGNED', label: 'Tache assignee', description: 'Recevoir un email lors d une nouvelle assignation.' },
  { key: 'deadlineEnabled', type: 'DEADLINE', label: 'Rappel echeance', description: 'Recevoir un rappel avant la date limite d une tache.' },
  { key: 'mentionEnabled', type: 'MENTION', label: 'Mentions', description: 'Recevoir un email lorsqu un membre vous mentionne.' },
];

type Props = {
  title?: string;
  description?: string;
  embedded?: boolean;
};

const NotificationPreferences = ({
  title = 'Preferences email',
  description = 'Active ou coupe les emails automatiques par type de notification.',
  embedded = false,
}: Props) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSessionError = (status?: number) => {
    if (status === 401 || status === 403 || status === 404) {
      logout();
      navigate('/', { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const prefs = await fetchMyEmailPreferences();
        setPreferences(prefs);
      } catch (err: unknown) {
        const status = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
        if (handleSessionError(status)) {
          return;
        }
        setError('Impossible de charger les preferences email.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = async (key: PreferenceKey, checked: boolean) => {
    const payload: UpdateEmailPreferencesPayload = { [key]: checked };
    setSavingKey(key);
    setError(null);
    try {
      const updated = await updateMyEmailPreferences(payload);
      setPreferences(updated);
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
      if (handleSessionError(status)) {
        return;
      }
      setError('Impossible de sauvegarder cette preference.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!preferences) {
    return <Alert severity="error">{error ?? 'Preferences introuvables.'}</Alert>;
  }

  const content = (
    <>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{description}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {OPTIONS.map((option) => (
            <Box key={option.type} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(preferences[option.key])}
                    onChange={(_, checked) => handleToggle(option.key, checked)}
                    disabled={savingKey === option.key}
                  />
                }
                label={option.label}
              />
              <Typography variant="body2" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          ))}
        </Grid>
      </Grid>
    </>
  );

  const paperSx = embedded
    ? { p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }
    : { p: 3, borderRadius: 2 };

  return (
    <Paper elevation={0} sx={paperSx} data-testid="notification-preferences">
      {content}
    </Paper>
  );
};

export default NotificationPreferences;
