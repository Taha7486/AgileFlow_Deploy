import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import GroupIcon from '@mui/icons-material/Group';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { TeamStats } from '../../../types/team';

interface Props {
  stats: TeamStats | null;
  loading: boolean;
}

const TeamStatsCards = ({ stats, loading }: Props) => {
  const cards = [
    {
      label: 'Membres actifs',
      value: stats?.activeMembers,
      icon: <GroupIcon sx={{ color: '#0052CC' }} />,
      bgColor: '#E9F2FF',
    },
    {
      label: 'Invitations en attente',
      value: stats?.pendingInvitations,
      icon: <MailOutlineIcon sx={{ color: '#FF8B00' }} />,
      bgColor: '#FFF7E6',
    },
    {
      label: 'Taches assignees',
      value: stats?.assignedTasks,
      icon: <AssignmentTurnedInIcon sx={{ color: '#36B37E' }} />,
      bgColor: '#E3FCEF',
    },
    {
      label: 'Taux de completion',
      value: stats ? `${stats.completionRate}%` : undefined,
      icon: <TrendingUpIcon sx={{ color: '#6554C0' }} />,
      bgColor: '#EAE6FF',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.label}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: '1px solid #DFE1E6',
              bgcolor: '#FFFFFF',
            }}
          >
            <Avatar sx={{ bgcolor: card.bgColor }}>{card.icon}</Avatar>
            <Box>
              <Typography variant="h4" fontWeight={600} color="#172B4D">
                {loading ? <Skeleton width={44} /> : card.value ?? '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default TeamStatsCards;
