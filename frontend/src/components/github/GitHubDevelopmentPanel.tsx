import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountTree,
  Add,
  Cancel,
  CheckCircle,
  Close,
  ExpandMore,
  HelpOutline,
  HourglassEmpty,
  OpenInNew,
  Source,
} from '@mui/icons-material';
import { getRepoBranches, suggestBranchName } from '../../api/github';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useGitHubStore } from '../../store/githubStore';
import type { GitHubCommit, GitHubPullRequest } from '../../types/github';

interface Props {
  taskId: number;
  compact?: boolean;
}

const formatRelative = (iso: string | null) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return "a l'instant";
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 30) return `il y a ${days}j`;
  return new Date(iso).toLocaleDateString('fr-FR');
};

const prStatusChip = (pr: GitHubPullRequest) => {
  if (pr.merged) return <Chip size="small" label="Merged" sx={{ bgcolor: '#8B5CF6', color: 'white', fontWeight: 700 }} />;
  if (pr.state === 'closed') return <Chip size="small" color="error" label="Closed" />;
  return <Chip size="small" color="warning" label="Open" />;
};

const ChecksIcon = ({ status }: { status: GitHubPullRequest['checksStatus'] }) => {
  if (status === 'success') return <CheckCircle color="success" fontSize="small" />;
  if (status === 'failure') return <Cancel color="error" fontSize="small" />;
  if (status === 'pending') return <HourglassEmpty color="warning" fontSize="small" />;
  return <HelpOutline color="disabled" fontSize="small" />;
};

const CommitRow = ({ commit }: { commit: GitHubCommit }) => (
  <Box sx={{ py: 0.75, borderTop: '1px solid #F0F1F3' }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography fontSize={12} fontWeight={800} fontFamily="monospace">{commit.shortSha}</Typography>
      <Link href={commit.url || commit.htmlUrl} target="_blank" rel="noreferrer"><OpenInNew sx={{ fontSize: 14 }} /></Link>
      {commit.linkedTaskId && <Chip size="small" label={`KAN-${commit.linkedTaskId}`} />}
    </Stack>
    <Typography fontSize={13}>{commit.message.length > 90 ? `${commit.message.slice(0, 90)}...` : commit.message}</Typography>
    <Typography variant="caption" color="text.secondary">{commit.authorLogin} - {formatRelative(commit.committedAt)}</Typography>
  </Box>
);

const GitHubDevelopmentPanel = ({ taskId, compact = false }: Props) => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { taskDevelopmentPanel, fetchTaskDevelopmentPanel, createBranch } = useGitHubStore();
  const panel = taskDevelopmentPanel[taskId];
  const [createOpen, setCreateOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [fromBranch, setFromBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>(['main']);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    void fetchTaskDevelopmentPanel(taskId);
  }, [fetchTaskDevelopmentPanel, taskId]);

  useEffect(() => {
    if (!createOpen) return;
    void suggestBranchName(taskId).then(setBranchName).catch(() => setBranchName(`feature/AGF-${taskId}`));
    if (activeProject?.id) {
      void getRepoBranches(activeProject.id).then((items) => {
        setBranches(items.length ? items : ['main']);
        setFromBranch(items[0] ?? 'main');
      }).catch(() => setBranches(['main', 'develop']));
    }
  }, [activeProject?.id, createOpen, taskId]);

  const isValidBranch = useMemo(() => branchName.trim().length > 0 && !/\s/.test(branchName), [branchName]);

  const handleCreateBranch = async () => {
    if (!isValidBranch) return;
    setLoadingCreate(true);
    try {
      await createBranch(taskId, branchName.trim(), fromBranch);
      await fetchTaskDevelopmentPanel(taskId);
      setToast({ message: 'Branche creee avec succes', severity: 'success' });
      setCreateOpen(false);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Impossible de creer la branche', severity: 'error' });
    } finally {
      setLoadingCreate(false);
    }
  };

  const content = !panel ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
  ) : (
    <Stack spacing={compact ? 1.5 : 2}>
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AccountTree fontSize="small" color="success" />
            <Typography fontWeight={800}>Branches ({panel.branches.length})</Typography>
          </Stack>
          <Button size="small" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Creer</Button>
        </Stack>
        {panel.branches.length === 0 ? (
          <Typography fontSize={13} color="text.secondary">Aucune branche liee.</Typography>
        ) : panel.branches.map((branch) => (
          <Stack key={branch.name} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
            <Typography fontSize={13} fontFamily="monospace" sx={{ flex: 1 }}>{branch.name}</Typography>
            <Typography fontSize={12} color="text.secondary">{branch.sha?.slice(0, 7)}</Typography>
          </Stack>
        ))}
      </Box>
      <Divider />
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Source fontSize="small" color="primary" />
          <Typography fontWeight={800}>Pull Requests ({panel.pullRequests.length})</Typography>
        </Stack>
        {panel.pullRequests.length === 0 ? (
          <Typography fontSize={13} color="text.secondary">Aucune pull request liee.</Typography>
        ) : panel.pullRequests.map((pr) => (
          <Box key={pr.number} sx={{ py: 0.75, borderTop: '1px solid #F0F1F3' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {prStatusChip(pr)}
              <Link href={pr.url || pr.htmlUrl} target="_blank" rel="noreferrer" fontWeight={800}>#{pr.number} {pr.title}</Link>
              <Tooltip title={`Checks: ${pr.checksStatus}`}><span><ChecksIcon status={pr.checksStatus} /></span></Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {pr.headBranch} {'->'} {pr.baseBranch} - +{pr.additions} -{pr.deletions} - {pr.authorLogin}
            </Typography>
          </Box>
        ))}
      </Box>
      <Divider />
      <Box>
        <Typography fontWeight={800} sx={{ mb: 1 }}>Commits ({panel.commits.length})</Typography>
        {panel.commits.length === 0 ? <Typography fontSize={13} color="text.secondary">Aucun commit lie.</Typography> : panel.commits.map((commit) => <CommitRow key={commit.sha} commit={commit} />)}
      </Box>
    </Stack>
  );

  return (
    <Paper elevation={0} sx={{ p: compact ? 1.5 : 2, mb: compact ? 2 : 0, border: '1px solid #DFE1E6', borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>Developpement</Typography>
      {compact ? content : (
        <Accordion defaultExpanded elevation={0} sx={{ border: '1px solid #EBECF0' }}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography fontWeight={800}>Details GitHub</Typography></AccordionSummary>
          <AccordionDetails>{content}</AccordionDetails>
        </Accordion>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Creer une branche
          <IconButton onClick={() => setCreateOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Nom de la branche" value={branchName} onChange={(event) => setBranchName(event.target.value)} error={!isValidBranch} helperText={!isValidBranch ? 'Nom requis, sans espaces.' : 'Exemple : feature/AGF-42-fix-login'} fullWidth />
            <Select value={fromBranch} onChange={(event) => setFromBranch(event.target.value)} fullWidth>
              {branches.map((branch) => <MenuItem key={branch} value={branch}>{branch}</MenuItem>)}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={loadingCreate}>Annuler</Button>
          <Button onClick={handleCreateBranch} variant="contained" disabled={loadingCreate || !isValidBranch}>
            {loadingCreate ? 'Creation...' : 'Creer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Paper>
  );
};

export default GitHubDevelopmentPanel;
