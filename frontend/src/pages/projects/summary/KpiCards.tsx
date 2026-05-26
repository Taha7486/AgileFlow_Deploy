import { Box, Grid, Paper, Typography } from '@mui/material';
import { AddCircleOutline, CheckCircle, Edit, Schedule } from '@mui/icons-material';
import type { KpiStats } from '../../../types/projectSummary.types';

const KpiCards = ({ kpi }: { kpi?: KpiStats }) => {
  const days = kpi?.periodeDays ?? 7;
  const cards = [
    { value: kpi?.completed ?? 0, label: 'complete', helper: `dans les ${days} derniers jours`, icon: <CheckCircle />, color: '#00875A', bg: '#E3FCEF' },
    { value: kpi?.updated ?? 0, label: 'mis a jour', helper: `dans les ${days} derniers jours`, icon: <Edit />, color: '#0052CC', bg: '#DEEBFF' },
    { value: kpi?.created ?? 0, label: 'cree', helper: `dans les ${days} derniers jours`, icon: <AddCircleOutline />, color: '#6B778C', bg: '#F4F5F7' },
    { value: kpi?.dueSoon ?? 0, label: 'a echeance bientot', helper: `dans les ${days} prochains jours`, icon: <Schedule />, color: '#6B778C', bg: '#F4F5F7' },
  ];
  return (
    <Grid container spacing={1.5}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.label}>
          <Paper elevation={0} sx={{ height: 72, border: '1px solid #DFE1E6', borderRadius: 1, px: 2, display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { boxShadow: '0 2px 8px rgba(9,30,66,0.1)' } }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{card.value} <Typography component="span" sx={{ fontSize: 13 }}>{card.label}</Typography></Typography>
              <Typography sx={{ fontSize: 11, color: '#6B778C' }}>{card.helper}</Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default KpiCards;
