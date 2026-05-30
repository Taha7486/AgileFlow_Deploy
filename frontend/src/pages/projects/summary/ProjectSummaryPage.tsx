import { useEffect } from 'react';
import { Alert, Box, Grid, Skeleton, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useParams } from 'react-router-dom';
import { useProjectSummaryStore } from '../../../store/projectSummaryStore';
import { useAuthStore } from '../../../store/authStore';
import EpicProgressWidget from './EpicProgressWidget';
import KpiCards from './KpiCards';
import PriorityBreakdownWidget from './PriorityBreakdownWidget';
import RecentActivityWidget from './RecentActivityWidget';
import StatusOverviewWidget from './StatusOverviewWidget';
import SummaryToolbar from './SummaryToolbar';
import TeamWorkloadWidget from './TeamWorkloadWidget';
import TypesOfWorkWidget from './TypesOfWorkWidget';
import ProjectReceivedInvitations from '../../../components/projects/ProjectReceivedInvitations';
import PageHeader from '../../../components/layout/PageHeader';
import GitHubActivitySection from '../../../components/github/GitHubActivitySection';

const SkeletonWidget = ({ height = 250 }: { height?: number }) => (
  <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 1 }} />
);

const ProjectSummaryPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const pId = Number(projectId);
  const { data, isLoading, error, loadSummary } = useProjectSummaryStore();
  const user = useAuthStore((state) => state.user);
  const validProjectId = Number.isFinite(pId) && pId > 0;

  useEffect(() => {
    if (validProjectId) {
      void loadSummary(pId);
    }
  }, [validProjectId, pId, loadSummary]);

  if (!validProjectId) {
    return <Alert severity="error">Projet invalide. Selectionnez un projet depuis la liste.</Alert>;
  }

  return (
    <Box sx={{ bgcolor: '#F7F8F9', minHeight: '100vh', mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 } }}>
      <Box sx={{ maxWidth: 1500, mx: 'auto', width: '100%', px: { xs: 2, md: 4, xl: 6 }, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <PageHeader icon={<DashboardIcon />} title="Résumé" subtitle="Tableau de bord du projet" disablePadding />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
          <Typography variant="h5" fontWeight={700} color="#172B4D">
            Bonjour, {user?.firstName ?? 'bienvenue'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Voici le resume du projet {data?.project.nom ?? 'selectionne'}.
          </Typography>
          </Box>
          <SummaryToolbar projectId={pId} />
        </Box>
        <ProjectReceivedInvitations onAccepted={() => void loadSummary(pId)} />

        {isLoading ? (
          <Grid container spacing={1.5}>{[1, 2, 3, 4].map((item) => <Grid item xs={12} sm={6} md={3} key={item}><SkeletonWidget height={72} /></Grid>)}</Grid>
        ) : <KpiCards kpi={data?.kpi} />}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>{isLoading ? <SkeletonWidget height={280} /> : <StatusOverviewWidget data={data?.statusOverview} />}</Grid>
          <Grid item xs={12} md={6}>{isLoading ? <SkeletonWidget height={280} /> : <RecentActivityWidget groups={data?.recentActivity ?? []} projectId={pId} />}</Grid>
        </Grid>

        <GitHubActivitySection projectId={pId} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>{isLoading ? <SkeletonWidget height={280} /> : <PriorityBreakdownWidget data={data?.priorityBreakdown} />}</Grid>
          <Grid item xs={12} md={6}>{isLoading ? <SkeletonWidget height={280} /> : <TypesOfWorkWidget data={data?.typesOfWork} />}</Grid>
        </Grid>

        <Grid container spacing={2} sx={{ pb: 4 }}>
          <Grid item xs={12} md={6}>{isLoading ? <SkeletonWidget height={260} /> : <TeamWorkloadWidget items={data?.teamWorkload ?? []} projectId={pId} />}</Grid>
          <Grid item xs={12} md={6}>{isLoading ? <SkeletonWidget height={260} /> : <EpicProgressWidget epics={data?.epicProgress ?? []} />}</Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProjectSummaryPage;
