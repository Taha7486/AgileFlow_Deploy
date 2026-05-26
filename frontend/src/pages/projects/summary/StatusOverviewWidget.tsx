import { Box, Link, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusOverview } from '../../../types/projectSummary.types';

const StatusOverviewWidget = ({ data }: { data?: StatusOverview }) => {
  const navigate = useNavigate();
  const chartData = (data?.segments ?? []).map((segment) => ({ name: segment.labelFR, value: segment.count, couleur: segment.couleur }));
  return (
    <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 1, p: 2.5, minHeight: 280 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Apercu des statuts</Typography>
      <Typography sx={{ fontSize: 13, color: '#6B778C', mb: 2 }}>Visualisez l'etat de vos taches. <Link component="button" onClick={() => navigate('/planning')}>Voir toutes les taches</Link></Typography>
      {!data || data.total === 0 ? (
        <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B778C' }}>Aucune tache dans ce projet</Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ width: 170, height: 170, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={1}>
                  {chartData.map((entry) => <Cell key={entry.name} fill={entry.couleur} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${value} tache(s)`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{data.total}</Typography>
              <Typography sx={{ fontSize: 11, color: '#6B778C' }}>Total</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            {data.segments.map((segment) => (
              <Box key={segment.statut} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: segment.couleur }} />
                <Typography sx={{ fontSize: 12 }}>{segment.labelFR} : {segment.count}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default StatusOverviewWidget;
