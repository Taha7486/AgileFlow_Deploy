import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountTree,
  Cancel,
  CheckCircle,
  GitHub,
  HelpOutline,
  HourglassEmpty,
  Merge,
  OpenInNew,
  Source,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useGitHubStore } from '../../store/githubStore';
import type { GitHubPullRequest } from '../../types/github';
import { formatIssueKey, issueKeySearchValues } from '../../utils/issueKey';
import GitHubIntegrationPanel from '../../components/github/GitHubIntegrationPanel';

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

const ChecksIcon = ({ status }: { status: GitHubPullRequest['checksStatus'] }) => {
  if (status === 'success') return <CheckCircle color="success" fontSize="small" />;
  if (status === 'failure') return <Cancel color="error" fontSize="small" />;
  if (status === 'pending') return <HourglassEmpty color="warning" fontSize="small" />;
  return <HelpOutline color="disabled" fontSize="small" />;
};

const PrStatusChip = ({ pr }: { pr: GitHubPullRequest }) => {
  if (pr.merged) return <Chip size="small" label="Merged" sx={{ bgcolor: '#8B5CF6', color: 'white', fontWeight: 700 }} />;
  if (pr.state === 'closed') return <Chip size="small" color="error" label="Closed" />;
  return <Chip size="small" color="warning" label="Open" />;
};

const StatCard = ({ label, value, icon, danger = false }: { label: string; value: number; icon: ReactNode; danger?: boolean }) => (
  <Paper elevation={0} sx={{ p: 2, border: '1px solid #DFE1E6', borderRadius: 2, minHeight: 104 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Box>
        <Typography fontSize={28} fontWeight={900} color={danger ? 'error.main' : 'text.primary'}>{value}</Typography>
        <Typography fontSize={13} color="text.secondary">{label}</Typography>
      </Box>
      <Avatar sx={{ bgcolor: danger ? '#FFEBE6' : '#E9F2FF', color: danger ? '#DE350B' : '#0052CC' }}>{icon}</Avatar>
    </Stack>
  </Paper>
);

const DevelopmentPage = () => {
  const navigate = useNavigate();
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { projectDevelopment, isLoadingDevelopment, developmentError, fetchProjectDevelopment } = useGitHubStore();
  const [tab, setTab] = useState(0);
  const [branchSearch, setBranchSearch] = useState('');
  const [commitSearch, setCommitSearch] = useState('');
  const issuePrefix = projectDevelopment?.issuePrefix ?? activeProject?.issuePrefix;

  useEffect(() => {
    if (activeProject?.id) void fetchProjectDevelopment(activeProject.id);
  }, [activeProject?.id, fetchProjectDevelopment]);

  useEffect(() => {
    if (!activeProject?.id) return undefined;
    const interval = window.setInterval(() => {
      void fetchProjectDevelopment(activeProject.id);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [activeProject?.id, fetchProjectDevelopment]);

  const prs = useMemo(() => {
    if (!projectDevelopment) return [];
    const rows = tab === 0
      ? projectDevelopment.openPullRequests
      : tab === 1
        ? projectDevelopment.mergedPullRequests
        : [...projectDevelopment.openPullRequests, ...projectDevelopment.mergedPullRequests];
    return rows;
  }, [projectDevelopment, tab]);

  const filteredBranches = useMemo(() => {
    if (!projectDevelopment) return [];
    const q = branchSearch.trim().toLowerCase();
    if (!q) return projectDevelopment.activeBranches;
    return projectDevelopment.activeBranches.filter((branch) =>
      branch.name.toLowerCase().includes(q)
      || branch.sha?.toLowerCase().includes(q)
      || issueKeySearchValues(issuePrefix, branch.taskId).some((value) => value.includes(q))
    );
  }, [branchSearch, issuePrefix, projectDevelopment]);

  const filteredCommits = useMemo(() => {
    if (!projectDevelopment) return [];
    const q = commitSearch.trim().toLowerCase();
    if (!q) return projectDevelopment.recentCommits;
    return projectDevelopment.recentCommits.filter((commit) =>
      commit.message.toLowerCase().includes(q)
      || commit.shortSha.toLowerCase().includes(q)
      || commit.sha.toLowerCase().includes(q)
      || commit.authorLogin.toLowerCase().includes(q)
      || issueKeySearchValues(issuePrefix, commit.linkedTaskId).some((value) => value.includes(q))
      || commit.mentionedTaskIds.some((id) => issueKeySearchValues(issuePrefix, id).some((value) => value.includes(q)))
    );
  }, [commitSearch, issuePrefix, projectDevelopment]);

  if (!activeProject) {
    return <Alert severity="info">Selectionnez un projet pour afficher le developpement.</Alert>;
  }

  if (isLoadingDevelopment && !projectDevelopment) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2 }}>
        <PageHeader icon={<GitHub />} title="Developpement" subtitle="Branches, pull requests et commits GitHub du projet" />
      </Stack>

      {developmentError && <Alert severity="error" sx={{ mb: 2 }}>{developmentError}</Alert>}

      <Box sx={{ mb: 2 }}>
        <GitHubIntegrationPanel projectId={activeProject.id} onChanged={() => fetchProjectDevelopment(activeProject.id)} />
      </Box>

      {!projectDevelopment?.connected ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Connectez un depot GitHub pour afficher les branches, pull requests et commits du projet.
        </Alert>
      ) : (
        <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Chip
              icon={<GitHub />}
              label={projectDevelopment.repoFullName}
              component="a"
              href={`https://github.com/${projectDevelopment.repoFullName}`}
              target="_blank"
              clickable
            />
            <OpenInNew sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><StatCard label="PRs ouvertes" value={projectDevelopment.totalOpenPRs} icon={<Source />} /></Grid>
            <Grid item xs={6} md={3}><StatCard label="PRs mergees" value={projectDevelopment.totalMergedPRs} icon={<Merge />} /></Grid>
            <Grid item xs={6} md={3}><StatCard label="Branches actives" value={projectDevelopment.totalBranches} icon={<AccountTree />} /></Grid>
            <Grid item xs={6} md={3}><StatCard label="Checks echoues" value={projectDevelopment.failingChecks} icon={<Cancel />} danger={projectDevelopment.failingChecks > 0} /></Grid>
          </Grid>

          <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 2, mb: 2 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2, borderBottom: '1px solid #EBECF0' }}>
              <Tab label={`Ouvertes (${projectDevelopment.totalOpenPRs})`} />
              <Tab label={`Mergees (${projectDevelopment.totalMergedPRs})`} />
              <Tab label="Toutes" />
            </Tabs>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Statut</TableCell>
                    <TableCell>Titre</TableCell>
                    <TableCell>Tache liee</TableCell>
                    <TableCell>Branches</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Checks</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>+/-</TableCell>
                    <TableCell>Auteur</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prs.map((pr) => (
                    <TableRow key={pr.number} hover>
                      <TableCell><PrStatusChip pr={pr} /></TableCell>
                      <TableCell><Link href={pr.url || pr.htmlUrl} target="_blank" rel="noreferrer" fontWeight={700}>#{pr.number} {pr.title}</Link></TableCell>
                      <TableCell>{pr.linkedTaskId ? <Chip size="small" label={formatIssueKey(issuePrefix, pr.linkedTaskId)} onClick={() => navigate('/planning')} /> : '-'}</TableCell>
                      <TableCell>{pr.headBranch} {'->'} {pr.baseBranch}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><ChecksIcon status={pr.checksStatus} /></TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Box component="span" color="success.main">+{pr.additions}</Box> <Box component="span" color="error.main">-{pr.deletions}</Box></TableCell>
                      <TableCell><Stack direction="row" alignItems="center" spacing={1}><Avatar src={pr.authorAvatarUrl} sx={{ width: 24, height: 24 }} /> <Typography fontSize={13}>{pr.authorLogin}</Typography></Stack></TableCell>
                      <TableCell>{formatRelative(pr.updatedAt ?? pr.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {prs.length === 0 && <TableRow><TableCell colSpan={8}><Typography color="text.secondary">Aucune pull request.</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={tab === 0 ? projectDevelopment.totalOpenPRs : prs.length}
              page={projectDevelopment.page}
              rowsPerPage={projectDevelopment.size}
              rowsPerPageOptions={[20]}
              onPageChange={(_, page) => activeProject.id && void fetchProjectDevelopment(activeProject.id, page)}
              onRowsPerPageChange={() => undefined}
            />
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #DFE1E6', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                  <Typography fontWeight={900}>Branches actives</Typography>
                  <TextField
                    size="small"
                    label="Rechercher"
                    value={branchSearch}
                    onChange={(event) => setBranchSearch(event.target.value)}
                    sx={{ width: { xs: '100%', sm: 220 } }}
                  />
                </Stack>
                <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
                  {filteredBranches.map((branch) => (
                    <Stack key={`${branch.taskId}-${branch.name}`} direction="row" spacing={1} alignItems="center" sx={{ py: 0.75, borderTop: '1px solid #F0F1F3' }}>
                      <Typography fontFamily="monospace" fontSize={13} sx={{ flex: 1 }}>{branch.name}</Typography>
                      {branch.taskId && <Chip size="small" label={formatIssueKey(issuePrefix, branch.taskId)} />}
                      <Typography fontFamily="monospace" fontSize={12} color="text.secondary">{branch.sha?.slice(0, 7)}</Typography>
                    </Stack>
                  ))}
                </Box>
                {filteredBranches.length === 0 && <Typography color="text.secondary">Aucune branche liee.</Typography>}
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #DFE1E6', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                  <Typography fontWeight={900}>Commits recents</Typography>
                  <TextField
                    size="small"
                    label="Rechercher"
                    value={commitSearch}
                    onChange={(event) => setCommitSearch(event.target.value)}
                    sx={{ width: { xs: '100%', sm: 240 } }}
                  />
                </Stack>
                <List dense sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
                  {filteredCommits.map((commit) => (
                    <ListItem key={commit.sha} divider secondaryAction={commit.linkedTaskId ? <Chip size="small" label={formatIssueKey(issuePrefix, commit.linkedTaskId)} /> : undefined}>
                      <ListItemAvatar><Avatar src={commit.authorAvatarUrl}>{commit.authorLogin?.[0]}</Avatar></ListItemAvatar>
                      <ListItemText
                        primary={<Link href={commit.url || commit.htmlUrl} target="_blank" rel="noreferrer" fontFamily="monospace">{commit.shortSha}</Link>}
                        secondary={`${commit.message.length > 80 ? `${commit.message.slice(0, 80)}...` : commit.message} · ${commit.authorLogin} · ${formatRelative(commit.committedAt)}`}
                      />
                    </ListItem>
                  ))}
                </List>
                {filteredCommits.length === 0 && <Typography color="text.secondary">Aucun commit.</Typography>}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default DevelopmentPage;
