import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { fetchMyProfile, updateMyProfile } from '../../api/usersApi';
import type { UserDetail } from '../../types';
import { formatDateTime } from '../../utils/formatDate';
import { useAuthStore } from '../../store/authStore';

const roleChip = (role: string) => {
  const map: Record<string, { label: string; color: 'error' | 'warning' | 'info' }> = {
    ROLE_ADMIN: { label: 'Administrateur', color: 'error' },
    ROLE_DEVELOPER: { label: 'Developpeur', color: 'info' },
  };
  const cfg = map[role] ?? { label: role, color: 'info' as const };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const ProfileAccountTab = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyProfile();
      setProfile(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setAvatarUrl(data.avatarUrl ?? null);
    } catch {
      setError('Impossible de charger votre profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl,
      });
      if (user && token) {
        useAuthStore.getState().setAuth(token, {
          ...user,
          firstName: updated.firstName,
          lastName: updated.lastName,
          avatarUrl: updated.avatarUrl ?? null,
        });
      }
      setSnack('Profil mis a jour.');
      await load();
    } catch {
      setSnack('Erreur lors de la mise a jour.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = profile && (firstName !== profile.firstName || lastName !== profile.lastName || avatarUrl !== (profile.avatarUrl ?? null));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return <Alert severity="error">{error ?? 'Profil introuvable.'}</Alert>;
  }

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Informations du compte
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Votre identite affichee dans AgileFlow et sur les assignations.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={avatarUrl ?? undefined} sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 24, fontWeight: 900 }}>
              {(firstName[0] ?? profile.email[0] ?? '?').toUpperCase()}
            </Avatar>
            <Box>
              <Button component="label" variant="outlined" sx={{ textTransform: 'none', fontWeight: 700 }}>
                {avatarUrl ? 'Modifier la photo' : 'Ajouter une photo'}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void readImageAsDataUrl(file)
                      .then(setAvatarUrl)
                      .catch(() => setSnack('Impossible de lire cette image.'));
                  }}
                />
              </Button>
              {avatarUrl && (
                <Button color="error" onClick={() => setAvatarUrl(null)} sx={{ ml: 1, textTransform: 'none' }}>
                  Retirer
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                Cette photo apparaitra dans le profil, les assignations et les commentaires.
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Prenom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Email" value={profile.email} fullWidth disabled helperText="Contactez un admin pour changer l'email." />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">Role</Typography>
          <Box sx={{ mt: 0.5 }}>{roleChip(profile.role)}</Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">Statut</Typography>
          <Typography>{profile.active !== false ? 'Compte actif' : 'Compte inactif'}</Typography>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" disabled={!dirty || saving} onClick={handleSave}>
          Enregistrer
        </Button>
        <Button
          variant="outlined"
          disabled={!dirty || saving}
          onClick={() => {
            setFirstName(profile.firstName);
            setLastName(profile.lastName);
            setAvatarUrl(profile.avatarUrl ?? null);
          }}
        >
          Annuler
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">Membre depuis</Typography>
          <Typography>{formatDateTime(profile.createdAt)}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">Derniere connexion</Typography>
          <Typography>{formatDateTime(profile.lastLogin)}</Typography>
        </Grid>
      </Grid>

      <Snackbar open={snack != null} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
    </Paper>
  );
};

export default ProfileAccountTab;
