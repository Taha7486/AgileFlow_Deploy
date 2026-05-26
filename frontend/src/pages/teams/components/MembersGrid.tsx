import MailOutlineIcon from '@mui/icons-material/MailOutline';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { MouseEvent } from 'react';
import type { TeamMember } from '../../../types/team';
import { formatRelativeDate, getAvatarColor, getInitials, RoleBadge } from './MembersTable';

interface Props {
  members: TeamMember[];
  loading: boolean;
  isOwner: boolean;
  onMenuOpen: (event: MouseEvent<HTMLElement>, member: TeamMember) => void;
}

const MembersGrid = ({ members, loading, isOwner, onMenuOpen }: Props) => {
  if (loading) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Skeleton variant="rectangular" height={230} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      {members.map((member) => (
        <Grid item xs={12} sm={6} md={4} key={`${member.status}-${member.id}`}>
          <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #EBECF0', p: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pb: 2 }}>
              {member.avatarUrl ? (
                <Avatar src={member.avatarUrl} sx={{ width: 56, height: 56 }} />
              ) : member.status === 'INVITED' ? (
                <Avatar sx={{ width: 56, height: 56, bgcolor: '#F4F5F7' }}>
                  <MailOutlineIcon sx={{ color: '#6B778C' }} />
                </Avatar>
              ) : (
                <Avatar sx={{ width: 56, height: 56, bgcolor: getAvatarColor(member.role), fontSize: 20 }}>
                  {getInitials(member)}
                </Avatar>
              )}
              <Typography variant="subtitle2" fontWeight={600} textAlign="center" color="#172B4D">
                {member.status === 'INVITED' ? member.email : `${member.prenom ?? ''} ${member.nom ?? ''}`.trim() || member.email}
              </Typography>
              {member.status !== 'INVITED' && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  {member.email}
                </Typography>
              )}
              <RoleBadge role={member.role} disabled={member.status === 'DISABLED'} />
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
              <Box textAlign="center">
                <Typography variant="h6" fontWeight={600}>{member.status === 'INVITED' ? '-' : member.tasksCount}</Typography>
                <Typography variant="caption" color="text.secondary">Taches</Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" fontWeight={500}>{formatRelativeDate(member.lastActivity)}</Typography>
                <Typography variant="caption" color="text.secondary">Derniere activite</Typography>
              </Box>
            </Box>

            {isOwner && member.role !== 'OWNER' && (
              <Button
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mt: 1.5, borderColor: '#DFE1E6' }}
                onClick={(event) => onMenuOpen(event, member)}
              >
                Gerer
              </Button>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default MembersGrid;
