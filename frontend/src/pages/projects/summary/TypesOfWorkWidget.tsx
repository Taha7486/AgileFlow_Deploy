import { Box, LinearProgress, Link, Paper, Tooltip, Typography } from '@mui/material';
import { Apps, Bookmark, BugReport, CheckBox, FlashOn, SubdirectoryArrowRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { TypesOfWork } from '../../../types/projectSummary.types';

const TypesOfWorkWidget = ({ data }: { data?: TypesOfWork }) => {
  const navigate = useNavigate();
  const total = Math.max(data?.total ?? 0, 1);
  const items = [
    { label: 'Story', count: data?.story ?? 0, icon: <CheckBox />, color: '#0052CC' },
    { label: 'Epique', count: data?.epic ?? 0, icon: <FlashOn />, color: '#6B3DC9' },
    { label: 'Tache', count: data?.task ?? 0, icon: <Bookmark />, color: '#36B37E' },
    { label: 'Fonctionnalite', count: data?.feature ?? 0, icon: <Apps />, color: '#00875A' },
    { label: 'Bug', count: data?.bug ?? 0, icon: <BugReport />, color: '#DE350B' },
    { label: 'Sous-tache', count: data?.subtask ?? 0, icon: <SubdirectoryArrowRight />, color: '#6B778C' },
  ];
  return (
    <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 1, p: 2.5, minHeight: 280 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Types de travail</Typography>
      <Typography sx={{ fontSize: 13, color: '#6B778C', mb: 2 }}>Repartition par type. <Link component="button" onClick={() => navigate('/planning')}>Voir tous les elements</Link></Typography>
      <Box sx={{ display: 'flex', pb: 1, borderBottom: '1px solid #DFE1E6' }}>
        <Typography sx={{ width: 150, fontSize: 12, fontWeight: 800, color: '#6B778C' }}>TYPE</Typography>
        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#6B778C' }}>DISTRIBUTION</Typography>
      </Box>
      {items.map((item) => {
        const pct = Math.round((item.count / total) * 100);
        return (
          <Tooltip key={item.label} title={`${item.label} : ${item.count} tache(s) (${pct}%)`}>
            <Box sx={{ height: 36, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F0F1F3', '&:hover': { bgcolor: '#F4F5F7' } }}>
              <Box sx={{ width: 150, display: 'flex', alignItems: 'center', gap: 0.75, color: item.color }}>
                {item.icon}
                <Typography sx={{ fontSize: 13, color: '#172B4D' }}>{item.label}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#DFE1E6', '& .MuiLinearProgress-bar': { bgcolor: item.color } }} />
            </Box>
          </Tooltip>
        );
      })}
    </Paper>
  );
};

export default TypesOfWorkWidget;
