import { Box, Chip, LinearProgress, Link, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { EpicProgress } from '../../../types/projectSummary.types';

const EpicProgressWidget = ({ epics }: { epics: EpicProgress[] }) => {
  const navigate = useNavigate();
  return (
    <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 1, p: 2.5, minHeight: 260 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>Progression des epics</Typography>
      {epics.length === 0 ? (
        <Box sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: '#6B778C' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label="Aucun epic">
            <rect x="14" y="28" width="52" height="14" rx="3" fill="#DFE1E6" />
            <rect x="20" y="47" width="40" height="10" rx="3" fill="#F0F1F3" />
            <path d="M58 12l3 9 9 1-7 6 2 9-7-5-8 5 3-9-7-6 9-1z" fill="#0052CC" />
          </svg>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Progression des epics</Typography>
          <Typography sx={{ fontSize: 13 }}>Utilisez les epics pour suivre vos initiatives. <Link component="button" onClick={() => navigate('/planning')}>Voir la planification</Link></Typography>
        </Box>
      ) : epics.map((epic) => (
        <Box key={epic.epicId} sx={{ mb: 1.5, p: 1, borderRadius: 1, '&:hover': { bgcolor: '#F4F5F7' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{epic.titre}</Typography>
            <Typography sx={{ fontSize: 12, color: '#6B778C' }}>{epic.tachesDone}/{epic.tachesTotal}</Typography>
          </Box>
          <LinearProgress variant="determinate" value={epic.pourcentage} sx={{ my: 0.75, height: 6, borderRadius: 3, bgcolor: '#DFE1E6', '& .MuiLinearProgress-bar': { bgcolor: epic.couleur, transition: 'width 0.8s ease' } }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Chip size="small" label={epic.statut ?? 'TODO'} sx={{ height: 18, fontSize: 10 }} />
            <Typography sx={{ fontSize: 11, color: '#6B778C' }}>{Math.round(epic.pourcentage)}%</Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

export default EpicProgressWidget;
