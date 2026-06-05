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
  FormControl,
  IconButton,
  InputLabel,
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
import type { DevelopmentPanelData, GitHubCommit, GitHubPullRequest } from '../../types/github';
import { formatIssueKey, normalizeIssuePrefix } from '../../utils/issueKey';

interface Props {
  taskId: number;
  compact?: boolean;
}

const formatRelative = (iso: string | null) => {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
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

const getErrorMessage = (error: unknown) => {
  const maybeAxios = error as { response?: { data?: { message?: string } } };
  return maybeAxios.response?.data?.message
    ?? (error instanceof Error ? error.message : 'Impossible de creer la branche');
};

const buildPullRequestTitle = (taskId: number, prefix?: string | null, taskTitre?: string) => {
  const issueKey = formatIssueKey(prefix, taskId);
  const trimmed = taskTitre?.trim() ?? '';
  if (!trimmed) return issueKey;
  return trimmed.toUpperCase().startsWith(issueKey) ? trimmed : `${issueKey} ${trimmed}`;
};

const commitMentionsTask = (commit: GitHubCommit, taskId: number, prefix?: string | null) => {
  if (commit.linkedTaskId === taskId || commit.mentionedTaskIds?.includes(taskId)) {
    return true;
  }
  const normalizedPrefix = normalizeIssuePrefix(prefix);
  const message = commit.message ?? '';
  const escapedPrefix = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\W)(?:${escapedPrefix}-${taskId}|#${taskId}|task/${taskId})(\\W|$)`, 'i').test(message);
};

const CommitRow = ({ commit, issuePrefix }: { commit: GitHubCommit; issuePrefix?: string | null }) => (
  <Box sx={{ py: 0.75, borderTop: '1px solid #F0F1F3' }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography fontSize={12} fontWeight={800} fontFamily="monospace">{commit.shortSha}</Typography>
      <Link href={commit.url || commit.htmlUrl} target="_blank" rel="noreferrer"><OpenInNew sx={{ fontSize: 14 }} /></Link>
      {commit.linkedTaskId && <Chip size="small" label={formatIssueKey(issuePrefix, commit.linkedTaskId)} />}
    </Stack>
    <Typography fontSize={13}>{commit.message.length > 90 ? `${commit.message.slice(0, 90)}...` : commit.message}</Typography>
    <Typography variant="caption" color="text.secondary">{commit.authorLogin} - {formatRelative(commit.committedAt)}</Typography>
  </Box>
);

const GitHubDevelopmentPanel = ({ taskId, compact = false }: Props) => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const {
    integration,
    projectDevelopment,
    taskDevelopmentPanel,
    fetchIntegration,
    fetchProjectDevelopment,
    fetchTaskDevelopmentPanel,
    createBranch,
    createPullRequest,
  } = useGitHubStore();
  const panel = taskDevelopmentPanel[taskId];
  const [createOpen, setCreateOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [fromBranch, setFromBranch] = useState('main');
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prHeadBranch, setPrHeadBranch] = useState('');
  const [prBaseBranch, setPrBaseBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>(['main']);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingPr, setLoadingPr] = useState(false);
  const [loadingPanel, setLoadingPanel] = useState(true);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const issuePrefix = normalizeIssuePrefix(panel?.issuePrefix ?? projectDevelopment?.issuePrefix ?? activeProject?.issuePrefix);

  useEffect(() => {
    let mounted = true;
    setLoadingPanel(true);
    setPanelError(null);
    const load = async () => {
      if (activeProject?.id && integration === null) {
        await fetchIntegration(activeProject.id);
      }
      if (activeProject?.id && !projectDevelopment) {
        await fetchProjectDevelopment(activeProject.id);
      }
      await fetchTaskDevelopmentPanel(taskId);
    };
    void load()
      .catch(() => {
        if (mounted) setPanelError('Aucune information GitHub disponible pour cette tache.');
      })
      .finally(() => {
        if (mounted) setLoadingPanel(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeProject?.id, fetchIntegration, fetchProjectDevelopment, fetchTaskDevelopmentPanel, integration, projectDevelopment, taskId]);

  useEffect(() => {
    if (!createOpen && !prOpen) return;
    if (createOpen) {
      void suggestBranchName(taskId).then(setBranchName).catch(() => setBranchName(`feature/${formatIssueKey(issuePrefix, taskId)}`));
    }
    if (activeProject?.id) {
      void getRepoBranches(activeProject.id).then((items) => {
        setBranches(items.length ? items : ['main']);
        setFromBranch(items[0] ?? 'main');
        setPrBaseBranch(items.includes('main') ? 'main' : items[0] ?? 'main');
      }).catch(() => setBranches(['main', 'develop']));
    }
  }, [activeProject?.id, createOpen, issuePrefix, prOpen, taskId]);

  const isValidBranch = useMemo(() => branchName.trim().length > 0 && !/\s/.test(branchName), [branchName]);
  const isValidPr = useMemo(() =>
    prTitle.trim().length > 0
    && prHeadBranch.trim().length > 0
    && prBaseBranch.trim().length > 0
    && prHeadBranch !== prBaseBranch,
  [prBaseBranch, prHeadBranch, prTitle]);

  const displayPanel = useMemo<DevelopmentPanelData | undefined>(() => {
    if (!projectDevelopment) return panel;

    const projectPullRequests = [
      ...projectDevelopment.openPullRequests,
      ...projectDevelopment.mergedPullRequests,
    ].filter((pr, index, list) =>
      pr.linkedTaskId === taskId && list.findIndex((item) => item.number === pr.number) === index
    );
    const projectBranches = projectDevelopment.activeBranches.filter((branch) => branch.taskId === taskId);
    const projectCommits = projectDevelopment.recentCommits.filter((commit) => commitMentionsTask(commit, taskId, issuePrefix));

    if (!panel) {
      if (projectPullRequests.length === 0 && projectBranches.length === 0 && projectCommits.length === 0) {
        return integration ? {
          taskId,
          issuePrefix,
          taskTitre: formatIssueKey(issuePrefix, taskId),
          taskStatut: '',
          branches: [],
          pullRequests: [],
          commits: [],
        } : undefined;
      }
      return {
        taskId,
        issuePrefix,
        taskTitre: formatIssueKey(issuePrefix, taskId),
        taskStatut: '',
        branches: projectBranches,
        pullRequests: projectPullRequests,
        commits: projectCommits,
      };
    }

    const branchNames = new Set(panel.branches.map((branch) => branch.name));
    const prNumbers = new Set(panel.pullRequests.map((pr) => pr.number));
    const panelCommits = panel.commits.filter((commit) => commitMentionsTask(commit, taskId, issuePrefix));
    const commitShas = new Set(panelCommits.map((commit) => commit.sha));

    return {
      ...panel,
      branches: [
        ...panel.branches,
        ...projectBranches.filter((branch) => !branchNames.has(branch.name)),
      ],
      pullRequests: [
        ...panel.pullRequests,
        ...projectPullRequests.filter((pr) => !prNumbers.has(pr.number)),
      ],
      commits: [
        ...panelCommits,
        ...projectCommits.filter((commit) => !commitShas.has(commit.sha)),
      ],
    };
  }, [integration, issuePrefix, panel, projectDevelopment, taskId]);

  const taskBranchOptions = useMemo(() => (
    [...new Set(displayPanel?.branches.map((branch) => branch.name).filter(Boolean) ?? [])]
  ), [displayPanel?.branches]);

  const handleCreateBranch = async () => {
    if (!isValidBranch) return;
    setLoadingCreate(true);
    try {
      await createBranch(taskId, branchName.trim(), fromBranch);
      setToast({ message: 'Branche creee avec succes', severity: 'success' });
      setCreateOpen(false);
      void fetchTaskDevelopmentPanel(taskId);
      if (activeProject?.id) void fetchProjectDevelopment(activeProject.id);
    } catch (error) {
      setToast({ message: getErrorMessage(error), severity: 'error' });
    } finally {
      setLoadingCreate(false);
    }
  };

  const openPrDialog = () => {
    const firstBranch = taskBranchOptions[0] ?? '';
    setPrHeadBranch(firstBranch);
    setPrTitle(buildPullRequestTitle(taskId, issuePrefix, displayPanel?.taskTitre));
    setPrBody(`Liee a la tache ${formatIssueKey(issuePrefix, taskId)}`);
    setPrOpen(true);
  };

  const handleCreatePullRequest = async () => {
    if (!isValidPr) return;
    setLoadingPr(true);
    try {
      await createPullRequest(taskId, prTitle.trim(), prBody.trim(), prHeadBranch.trim(), prBaseBranch.trim());
      setToast({ message: 'Pull request creee avec succes', severity: 'success' });
      setPrOpen(false);
      void fetchTaskDevelopmentPanel(taskId);
      if (activeProject?.id) void fetchProjectDevelopment(activeProject.id);
    } catch (error) {
      setToast({ message: getErrorMessage(error), severity: 'error' });
    } finally {
      setLoadingPr(false);
    }
  };

  const content = loadingPanel ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
  ) : !displayPanel ? (
    <Alert severity="info" sx={{ py: 0.5 }}>
      {panelError ?? (integration
        ? 'Aucune branche, pull request ou commit GitHub lie a cette tache.'
        : 'Aucune integration GitHub configuree pour ce projet.')}
    </Alert>
  ) : (
    <Stack spacing={compact ? 1.5 : 2}>
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AccountTree fontSize="small" color="success" />
            <Typography fontWeight={800}>Branches ({displayPanel.branches.length})</Typography>
          </Stack>
          <Button size="small" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Creer</Button>
        </Stack>
        {displayPanel.branches.length === 0 ? (
          <Typography fontSize={13} color="text.secondary">Aucune branche liee.</Typography>
        ) : displayPanel.branches.map((branch) => (
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
          <Typography fontWeight={800}>Pull Requests ({displayPanel.pullRequests.length})</Typography>
          <Button size="small" startIcon={<Add />} onClick={openPrDialog}>Creer une PR</Button>
        </Stack>
        {displayPanel.pullRequests.length === 0 ? (
          <Typography fontSize={13} color="text.secondary">Aucune pull request liee.</Typography>
        ) : displayPanel.pullRequests.map((pr) => (
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
        <Typography fontWeight={800} sx={{ mb: 1 }}>Commits ({displayPanel.commits.length})</Typography>
        {displayPanel.commits.length === 0 ? <Typography fontSize={13} color="text.secondary">Aucun commit lie.</Typography> : displayPanel.commits.map((commit) => <CommitRow key={commit.sha} commit={commit} issuePrefix={issuePrefix} />)}
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
            <Alert severity="info">
              Utilisez un nom lie a la tache, par exemple <strong>feature/{formatIssueKey(issuePrefix, taskId)}-fix-login</strong>.
              Les formats <strong>{formatIssueKey(issuePrefix, taskId)}</strong>, <strong>#{taskId}</strong> et <strong>task/{taskId}</strong> sont reconnus.
            </Alert>
            <TextField label="Nom de la branche" value={branchName} onChange={(event) => setBranchName(event.target.value)} error={!isValidBranch} helperText={!isValidBranch ? 'Nom requis, sans espaces.' : undefined} fullWidth />
            <FormControl fullWidth>
              <InputLabel id="create-branch-base-label">Depuis la branche</InputLabel>
              <Select labelId="create-branch-base-label" label="Depuis la branche" value={fromBranch} onChange={(event) => setFromBranch(event.target.value)} fullWidth>
                {branches.map((branch) => <MenuItem key={branch} value={branch}>{branch}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={loadingCreate}>Annuler</Button>
          <Button onClick={handleCreateBranch} variant="contained" disabled={loadingCreate || !isValidBranch}>
            {loadingCreate ? 'Creation...' : 'Creer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={prOpen} onClose={() => setPrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Creer une pull request
          <IconButton onClick={() => setPrOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Exemple: titre <strong>{formatIssueKey(issuePrefix, taskId)} Fix login</strong>. Pour fermer automatiquement la tache via commit:
              <strong> fixes {formatIssueKey(issuePrefix, taskId)}</strong> ou <strong>closes {formatIssueKey(issuePrefix, taskId)}</strong>.
            </Alert>
            <TextField label="Titre" value={prTitle} onChange={(event) => setPrTitle(event.target.value)} fullWidth />
            <TextField label="Description" value={prBody} onChange={(event) => setPrBody(event.target.value)} multiline rows={3} fullWidth />
            <FormControl fullWidth>
              <InputLabel id="create-pr-head-label">Branche source</InputLabel>
              <Select labelId="create-pr-head-label" label="Branche source" value={prHeadBranch} onChange={(event) => setPrHeadBranch(event.target.value)} fullWidth>
                {taskBranchOptions.map((branch) => (
                  <MenuItem key={branch} value={branch}>{branch}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {taskBranchOptions.length === 0 && <Alert severity="info">Creez d'abord une branche pour cette tache.</Alert>}
            <FormControl fullWidth>
              <InputLabel id="create-pr-base-label">Branche cible</InputLabel>
              <Select labelId="create-pr-base-label" label="Branche cible" value={prBaseBranch} onChange={(event) => setPrBaseBranch(event.target.value)} fullWidth>
                {branches.map((branch) => <MenuItem key={branch} value={branch}>{branch}</MenuItem>)}
              </Select>
            </FormControl>
            {prHeadBranch === prBaseBranch && <Alert severity="warning">La branche source doit etre differente de la branche cible.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrOpen(false)} disabled={loadingPr}>Annuler</Button>
          <Button onClick={handleCreatePullRequest} variant="contained" disabled={loadingPr || !isValidPr}>
            {loadingPr ? 'Creation...' : 'Creer la PR'}
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
