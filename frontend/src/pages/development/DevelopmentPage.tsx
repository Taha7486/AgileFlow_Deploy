import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
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
  Refresh,
  Source,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import GitHubDevelopmentPanel from '../../components/github/GitHubDevelopmentPanel';
import { syncGitHubIssues } from '../../api/github';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useGitHubStore } from '../../store/githubStore';
import type { GitHubPullRequest } from '../../types/github';

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
  const [syncing, setSyncing] = useState(false);

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
    if (tab === 0) return projectDevelopment.openPullRequests;
    if (tab === 1) return projectDevelopment.mergedPullRequests;
    return [...projectDevelopment.openPullRequests, ...projectDevelopment.mergedPullRequests];
  }, [projectDevelopment, tab]);

  const handleSync = async () => {
    if (!activeProject?.id) return;
    setSyncing(true);
    try {
      await syncGitHubIssues(activeProject.id);
      await fetchProjectDevelopment(activeProject.id);
    } finally {
      setSyncing(false);
    }
  };

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
        <Button variant="contained" startIcon={<Refresh />} onClick={handleSync} disabled={syncing}>
          {syncing ? 'Synchronisation...' : 'Synchroniser'}
        </Button>
      </Stack>

      {developmentError && <Alert severity="error" sx={{ mb: 2 }}>{developmentError}</Alert>}

      {!projectDevelopment?.connected ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aucun depot GitHub n'est connecte. Configurez l'integration depuis le resume du projet.
          <Button size="small" onClick={() => navigate(`/projects/${activeProject.id}/summary`)}>Ouvrir le resume</Button>
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
                      <TableCell>{pr.linkedTaskId ? <Chip size="small" label={`KAN-${pr.linkedTaskId}`} onClick={() => navigate('/planning')} /> : '-'}</TableCell>
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
                <Typography fontWeight={900} sx={{ mb: 1 }}>Branches actives</Typography>
                {projectDevelopment.activeBranches.map((branch) => (
                  <Stack key={`${branch.taskId}-${branch.name}`} direction="row" spacing={1} alignItems="center" sx={{ py: 0.75, borderTop: '1px solid #F0F1F3' }}>
                    <Typography fontFamily="monospace" fontSize={13} sx={{ flex: 1 }}>{branch.name}</Typography>
                    {branch.taskId && <Chip size="small" label={`KAN-${branch.taskId}`} />}
                    <Typography fontFamily="monospace" fontSize={12} color="text.secondary">{branch.sha?.slice(0, 7)}</Typography>
                  </Stack>
                ))}
                {projectDevelopment.activeBranches.length === 0 && <Typography color="text.secondary">Aucune branche liee.</Typography>}
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #DFE1E6', borderRadius: 2 }}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Commits recents</Typography>
                <List dense>
                  {projectDevelopment.recentCommits.map((commit) => (
                    <ListItem key={commit.sha} divider secondaryAction={commit.linkedTaskId ? <Chip size="small" label={`KAN-${commit.linkedTaskId}`} /> : undefined}>
                      <ListItemAvatar><Avatar src={commit.authorAvatarUrl}>{commit.authorLogin?.[0]}</Avatar></ListItemAvatar>
                      <ListItemText
                        primary={<Link href={commit.url || commit.htmlUrl} target="_blank" rel="noreferrer" fontFamily="monospace">{commit.shortSha}</Link>}
                        secondary={`${commit.message.length > 80 ? `${commit.message.slice(0, 80)}...` : commit.message} · ${commit.authorLogin} · ${formatRelative(commit.committedAt)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, border: '1px solid #DFE1E6', borderRadius: 2, mt: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Developpement par tache</Typography>
            {projectDevelopment.activeBranches.map((branch) => branch.taskId).filter((id): id is number => Boolean(id)).filter((id, index, list) => list.indexOf(id) === index).map((taskId) => (
              <Box key={taskId} sx={{ mb: 1 }}>
                <GitHubDevelopmentPanel taskId={taskId} />
              </Box>
            ))}
            {projectDevelopment.activeBranches.length === 0 && <Typography color="text.secondary">Aucune tache avec developpement lie.</Typography>}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DevelopmentPage;
