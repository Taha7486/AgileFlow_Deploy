import { Avatar, Box, Link, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { WorkloadItem } from '../../../types/projectSummary.types';

const TeamWorkloadWidget = ({ items }: { items: WorkloadItem[]; projectId: number }) => {
  const navigate = useNavigate();
  return (
    <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 1, p: 2.5, minHeight: 260 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Charge de l'equipe</Typography>
      <Typography sx={{ fontSize: 13, color: '#6B778C', mb: 2 }}>Surveillez la capacite de votre equipe. <Link component="button" onClick={() => navigate('/planning?groupBy=ASSIGNEE')}>Reequilibrer</Link></Typography>
      <Box sx={{ display: 'flex', pb: 1, borderBottom: '1px solid #DFE1E6' }}>
        <Typography sx={{ width: 170, fontSize: 12, fontWeight: 800, color: '#6B778C' }}>ASSIGNE</Typography>
        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#6B778C' }}>REPARTITION DU TRAVAIL</Typography>
      </Box>
      {items.length === 0 ? (
        <Box sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B778C' }}>Aucune tache assignee</Box>
      ) : items.map((item) => (
        <Box key={item.userId} onClick={() => navigate(`/users/${item.userId}`)} sx={{ height: 44, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F0F1F3', cursor: 'pointer', '&:hover': { bgcolor: '#F4F5F7' } }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: item.avatarColor }}>{item.initiales}</Avatar>
          <Typography sx={{ width: 124, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prenom} {item.nom}</Typography>
          <Box sx={{ flex: 1, height: 20, borderRadius: 0.5, bgcolor: '#DFE1E6', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${item.pourcentage}%`, bgcolor: '#0052CC', transition: 'width 0.5s ease' }} />
            <Typography sx={{ position: 'absolute', left: item.pourcentage < 10 ? `${item.pourcentage + 2}%` : 6, top: 2, fontSize: 11, color: item.pourcentage < 10 ? '#172B4D' : '#FFFFFF', fontWeight: 700 }}>{Math.round(item.pourcentage)}%</Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

export default TeamWorkloadWidget;
