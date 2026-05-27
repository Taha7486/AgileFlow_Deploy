import { useEffect } from 'react';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Chip, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import { useGitHubStore } from '../../store/githubStore';

interface Props {
  projectId: number;
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

const truncate = (value: string, max = 72) => value.length > max ? `${value.slice(0, max - 1)}…` : value;

const GitHubActivitySection = ({ projectId }: Props) => {
  const { integration, commits, pullRequests, fetchIntegration, fetchCommits, fetchPullRequests } = useGitHubStore();
  const safeCommits = Array.isArray(commits) ? commits : [];
  const safePullRequests = Array.isArray(pullRequests) ? pullRequests : [];

  useEffect(() => {
    void fetchIntegration(projectId);
  }, [fetchIntegration, projectId]);

  useEffect(() => {
    if (integration) {
      void fetchCommits(projectId);
      void fetchPullRequests(projectId);
    }
  }, [fetchCommits, fetchPullRequests, integration, projectId]);

  if (!integration) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #DFE1E6', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={800}>Activite GitHub</Typography>
        <Typography variant="body2" color="text.secondary">Aucune integration GitHub configuree.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #DFE1E6', borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <GitHubIcon />
        <Box>
          <Typography variant="h6" fontWeight={800}>Activite GitHub</Typography>
          <Typography variant="body2" color="text.secondary">{integration.repoOwner}/{integration.repoName}</Typography>
        </Box>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Derniers commits</Typography>
          <Stack spacing={1}>
            {safeCommits.slice(0, 5).map((commit) => (
              <Box key={commit.sha} sx={{ p: 1, borderRadius: 1, bgcolor: '#F7F8F9' }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography fontWeight={800} fontSize={13}>{commit.shortSha}</Typography>
                  <Link href={commit.htmlUrl} target="_blank" rel="noreferrer"><OpenInNewIcon sx={{ fontSize: 15 }} /></Link>
                </Stack>
                <Typography fontSize={13}>{truncate(commit.message)}</Typography>
                <Typography variant="caption" color="text.secondary">{commit.authorLogin} - {formatRelative(commit.committedAt)}</Typography>
              </Box>
            ))}
            {safeCommits.length === 0 && <Typography variant="body2" color="text.secondary">Aucun commit recent.</Typography>}
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Pull requests ouvertes</Typography>
          <Stack spacing={1}>
            {safePullRequests.slice(0, 5).map((pr) => (
              <Box key={pr.number} sx={{ p: 1, borderRadius: 1, bgcolor: '#F7F8F9' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Chip size="small" label={`PR #${pr.number}`} color={pr.merged ? 'success' : 'warning'} />
                  <Button size="small" href={pr.htmlUrl} target="_blank" endIcon={<OpenInNewIcon />}>GitHub</Button>
                </Stack>
                <Typography fontSize={13} fontWeight={700}>{pr.title}</Typography>
                <Typography variant="caption" color="text.secondary">{pr.headBranch} vers {pr.baseBranch} - {pr.authorLogin}</Typography>
              </Box>
            ))}
            {safePullRequests.length === 0 && <Typography variant="body2" color="text.secondary">Aucune PR ouverte.</Typography>}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default GitHubActivitySection;
