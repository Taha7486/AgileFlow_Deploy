import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Assessment, Refresh } from '@mui/icons-material';
import { useActiveProject } from '../../hooks/useActiveProject';
import { exportStatsCsv, exportStatsPdf, fetchStats, type StatsParams } from '../../api/statsApi';
import ExportButtons from '../../components/stats/ExportButtons';
import type { StatsData } from '../../types';

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const StatsPage = () => {
  const { activeProject } = useActiveProject();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const params: StatsParams = useMemo(() => ({
    ...(activeProject?.id ? { projectId: activeProject.id } : {}),
  }), [activeProject?.id]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStats(params);
      setStats(data);
    } catch {
      setStats(null);
      setError('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      saveBlob(await exportStatsPdf(params), 'agileflow-stats.pdf');
      setSnack('Rapport PDF genere.');
    } catch {
      setSnack('Export PDF impossible.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      saveBlob(await exportStatsCsv(params), 'agileflow-stats.csv');
      setSnack('Export CSV genere.');
    } catch {
      setSnack('Export CSV impossible.');
    } finally {
      setExporting(false);
    }
  };

  const metrics = stats
    ? [
        { label: 'Taches', value: stats.totalTasks },
        { label: 'Terminees', value: stats.completedTasks },
        { label: 'Progression', value: `${stats.completionRate}%` },
        { label: 'Velocite moyenne', value: stats.averageVelocity },
      ]
    : [];

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Assessment color="primary" />
            <Typography variant="h5" fontWeight={800}>Stats & Rapports</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Avancement des taches et exports PDF/CSV{activeProject ? ` pour ${activeProject.name}.` : '.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Button startIcon={<Refresh />} onClick={loadStats} disabled={loading}>Actualiser</Button>
          <ExportButtons exporting={exporting} disabled={loading || !stats} onExportPdf={handleExportPdf} onExportCsv={handleExportCsv} />
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {!activeProject && <Alert severity="info" sx={{ mb: 3 }}>Selectionnez un projet dans le header pour afficher ses statistiques.</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : stats ? (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            {metrics.map((metric) => (
              <Grid item xs={12} sm={6} lg={3} key={metric.label}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                  <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{metric.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} lg={3}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="body2" color="text.secondary">TODO</Typography>
                <Typography variant="h6" fontWeight={800}>{stats.todoTasks}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="body2" color="text.secondary">En cours</Typography>
                <Typography variant="h6" fontWeight={800}>{stats.inProgressTasks}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="body2" color="text.secondary">Review</Typography>
                <Typography variant="h6" fontWeight={800}>{stats.reviewTasks}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      ) : (
        <Alert severity="info">Aucune statistique disponible.</Alert>
      )}

      <Snackbar open={snack != null} autoHideDuration={3500} onClose={() => setSnack(null)} message={snack} />
    </Box>
  );
};

export default StatsPage;
