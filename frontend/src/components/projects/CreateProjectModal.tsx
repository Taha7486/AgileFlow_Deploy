import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, GitHub, InfoOutlined, RocketLaunch, Palette, TrendingUp } from '@mui/icons-material';
import type { CreateProjectPayload, ProjectListItem, ProjectStatus } from '../../types';
import type { GitHubConnectRequest } from '../../types/github';

const projectTypes = [
  { id: 'software', label: 'Logiciel', icon: <RocketLaunch /> },
  { id: 'marketing', label: 'Marketing', icon: <TrendingUp /> },
  { id: 'design', label: 'Design', icon: <Palette /> },
];

const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'TERMINE', label: 'Termine' },
];

type Props = {
  open: boolean;
  saving: boolean;
  teams?: unknown[];
  project?: ProjectListItem | null;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload, options?: ProjectCreationOptions) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

export type ProjectCreationOptions = {
  invitedEmails: string[];
  githubConnection: GitHubConnectRequest | null;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: 'white',
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 1 },
  },
  '& .MuiInputLabel-root': {
    color: '#64748B',
    fontWeight: 700,
  },
};

const CreateProjectModal = ({ open, saving, project, onClose, onSubmit }: Props) => {
  const [name, setName] = useState('');
  const [issuePrefix, setIssuePrefix] = useState('KAN');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIF');
  const [projectType, setProjectType] = useState('software');
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(project?.name ?? '');
    setIssuePrefix(project?.issuePrefix ?? '');
    setDescription(project?.description ?? '');
    setIconUrl(project?.iconUrl ?? null);
    setStartDate(project?.startDate ?? today);
    setEndDate(project?.endDate ?? '');
    setStatus(project?.status ?? 'ACTIF');
    setProjectType('software');
    setGithubEnabled(false);
    setInviteEmail('');
    setInvitedEmails([]);
    setRepoOwner('');
    setRepoName('');
    setAccessToken('');
  }, [open, project]);

  const addInviteEmail = () => {
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized) return;
    if (!emailRegex.test(normalized)) {
      setError('Adresse email invalide pour invitation.');
      return;
    }
    if (!invitedEmails.includes(normalized)) {
      setInvitedEmails((current) => [...current, normalized]);
    }
    setInviteEmail('');
    setError(null);
  };

  const handleInviteKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addInviteEmail();
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom du projet est obligatoire.');
      return;
    }
    const normalizedPrefix = issuePrefix.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(normalizedPrefix)) {
      setError('La cle du projet doit contenir 2 a 10 lettres ou chiffres, sans espace.');
      return;
    }
    if (!startDate) {
      setError('La date de debut est obligatoire.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('La date de fin doit etre posterieure a la date de debut.');
      return;
    }
    if (githubEnabled && (!repoOwner.trim() || !repoName.trim() || !accessToken.trim())) {
      setError('Renseignez owner, repository et token GitHub, ou desactivez la connexion GitHub.');
      return;
    }

    setError(null);
    await onSubmit({
      name: name.trim(),
      issuePrefix: normalizedPrefix,
      description: description.trim() || undefined,
      iconUrl,
      startDate,
      endDate: endDate || undefined,
      status,
      teamId: project?.teamId ?? null,
    }, {
      invitedEmails,
      githubConnection: githubEnabled
        ? {
            repoOwner: repoOwner.trim(),
            repoName: repoName.trim(),
            accessToken: accessToken.trim(),
          }
        : null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: '1px solid #E2E8F0',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.24)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ p: 3.5, pb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/agileflow-icon.png"
              alt=""
              sx={{ width: 38, height: 38, objectFit: 'contain' }}
            />
            <Box>
              <Typography fontWeight={900} fontSize={20} color="#111827">
                {project ? 'Modifier le projet' : 'Creer un nouveau projet'}
              </Typography>
              <Typography fontSize={14} color="#6B7280">
                Configurez votre espace de travail.
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} disabled={saving} size="small">
            <Close />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ borderTop: '1px solid #E2E8F0' }} />

      <Box sx={{ p: 3.5, display: 'grid', gap: 2.25, bgcolor: '#FFFFFF', overflowY: 'auto', minHeight: 0 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!project && (
          <Alert severity="info">
            Vous serez le proprietaire de ce projet. Les invitations se feront ensuite depuis le header ou la page Equipes.
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={iconUrl ?? undefined}
            sx={{ width: 52, height: 52, bgcolor: '#2563EB', fontWeight: 900 }}
          >
            {(name.trim()[0] ?? 'P').toUpperCase()}
          </Avatar>
          <Box>
            <Button component="label" variant="outlined" size="small" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>
              {iconUrl ? 'Modifier l icon' : 'Ajouter une icon'}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void readImageAsDataUrl(file)
                    .then(setIconUrl)
                    .catch(() => setError('Impossible de lire cette image.'));
                }}
              />
            </Button>
            {iconUrl && (
              <Button size="small" color="error" onClick={() => setIconUrl(null)} sx={{ ml: 1, textTransform: 'none' }}>
                Retirer
              </Button>
            )}
            <Typography fontSize={12} color="#9CA3AF" sx={{ mt: 0.5 }}>
              PNG, JPG ou SVG. L'image sera utilisee dans le header du projet.
            </Typography>
          </Box>
        </Box>

        <Box>
          <TextField
            label="Nom du projet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="ex. Mon Super Projet"
            sx={fieldSx}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
            <Typography fontSize={14} color="#6B7280">Cle :</Typography>
            <TextField
              value={issuePrefix}
              onChange={(e) => setIssuePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              size="small"
              placeholder="KAN"
              disabled={Boolean(project)}
              inputProps={{ maxLength: 10, style: { textAlign: 'center', fontWeight: 900, color: '#2563EB' } }}
              sx={{
                width: 96,
                '& .MuiOutlinedInput-root': {
                  height: 34,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))',
                  '& fieldset': { borderColor: 'rgba(37,99,235,0.32)' },
                },
              }}
            />
            <Tooltip title={`Utilisee dans les taches : ${issuePrefix || 'KAN'}-1, ${issuePrefix || 'KAN'}-2...`}>
              <InfoOutlined fontSize="small" sx={{ color: '#9CA3AF' }} />
            </Tooltip>
            {project && (
              <Typography fontSize={12} color="#9CA3AF">
                Non modifiable apres creation.
              </Typography>
            )}
          </Box>
        </Box>

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          placeholder="Description du projet (optionnel)"
          sx={fieldSx}
        />

        <Box>
          <Typography fontSize={13} fontWeight={900} color="#374151" sx={{ mb: 1.25 }}>
            Type de projet
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.25 }}>
            {projectTypes.map((type) => {
              const selected = projectType === type.id;
              return (
                <Button
                  key={type.id}
                  type="button"
                  onClick={() => setProjectType(type.id)}
                  sx={{
                    height: 86,
                    flexDirection: 'column',
                    gap: 0.5,
                    borderRadius: 2.5,
                    border: selected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    bgcolor: selected ? 'rgba(37, 99, 235, 0.05)' : 'white',
                    color: selected ? '#2563EB' : '#111827',
                    textTransform: 'none',
                    fontWeight: 800,
                    '&:hover': { bgcolor: selected ? 'rgba(37, 99, 235, 0.08)' : '#F8FAFC' },
                  }}
                >
                  {type.icon}
                  {type.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField label="Date de debut" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} required sx={fieldSx} />
          <TextField label="Date de fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={fieldSx} />
        </Box>

        {project && status === 'ARCHIVE' && (
          <TextField
            label="Etat du projet"
            value="Archive"
            fullWidth
            disabled
            sx={fieldSx}
            helperText="Un projet archive ne peut plus etre choisi par les utilisateurs."
          />
        )}

        {project && status !== 'ARCHIVE' && (
          <TextField
            select
            label="Etat du projet"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            fullWidth
            sx={fieldSx}
          >
            {projectStatusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {!project && (
          <Box>
            <Typography fontSize={13} fontWeight={900} color="#374151" sx={{ mb: 1 }}>
              Inviter des membres
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={handleInviteKeyDown}
                fullWidth
                placeholder="email@exemple.com"
                size="small"
                sx={fieldSx}
              />
              <Button
                type="button"
                variant="outlined"
                onClick={addInviteEmail}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
              >
                Ajouter
              </Button>
            </Box>
            {invitedEmails.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                {invitedEmails.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => setInvitedEmails((current) => current.filter((item) => item !== email))}
                    size="small"
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {!project && (
          <Box sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#F8F9FA' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitHub sx={{ color: '#374151' }} />
                <Box>
                  <Typography fontSize={14} fontWeight={900} color="#374151">Connecter un depot GitHub</Typography>
                  <Typography fontSize={12} color="#9CA3AF">Optionnel. Le token reste stocke uniquement cote backend.</Typography>
                </Box>
              </Box>
              <Switch checked={githubEnabled} onChange={(e) => setGithubEnabled(e.target.checked)} />
            </Box>
            {githubEnabled && (
              <Box sx={{ display: 'grid', gap: 1.25, mt: 1.75, pt: 1.75, borderTop: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                  <TextField
                    value={repoOwner}
                    onChange={(e) => setRepoOwner(e.target.value)}
                    label="Owner"
                    placeholder="achrafes20"
                    size="small"
                    sx={fieldSx}
                  />
                  <TextField
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    label="Repository"
                    placeholder="test1"
                    size="small"
                    sx={fieldSx}
                  />
                </Box>
                <TextField
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  label="GitHub token"
                  type="password"
                  size="small"
                  sx={fieldSx}
                />
                <Typography fontSize={12} color="#9CA3AF">
                  Scope recommande : repo. Ajoutez admin:repo_hook seulement pour creer le webhook.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: '#374151', textTransform: 'none', fontWeight: 800 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontWeight: 900,
            borderRadius: 2,
            px: 3,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 12px 28px rgba(37, 99, 235, 0.22)' },
          }}
        >
          {saving ? (project ? 'Enregistrement...' : 'Creation...') : project ? 'Enregistrer' : 'Creer le projet'}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CreateProjectModal;
