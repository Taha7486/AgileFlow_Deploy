import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { MouseEvent } from 'react';
import type { MemberRole, MemberStatus, TeamMember } from '../../../types/team';
import { resolvePresenceDisplay, usePresenceStore } from '../../../store/presenceStore';

interface Props {
  members: TeamMember[];
  loading: boolean;
  isOwner: boolean;
  onMenuOpen: (event: MouseEvent<HTMLElement>, member: TeamMember) => void;
  onResendInvitation: (member: TeamMember) => void;
}

export const getInitials = (member: TeamMember): string => {
  const initials = `${member.prenom?.[0] ?? ''}${member.nom?.[0] ?? ''}`.toUpperCase();
  return initials || member.email.slice(0, 2).toUpperCase();
};

export const getAvatarColor = (role: MemberRole): string => {
  if (role === 'OWNER') return '#6554C0';
  if (role === 'ADMIN') return '#0052CC';
  if (role === 'DEVELOPER') return '#00875A';
  return '#42526E';
};

export const formatDate = (iso: string | null): string => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatRelativeDate = (iso: string | null): string => {
  if (!iso) return '-';
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / 86400000);
  if (diffDays === 0) return `Aujourd'hui a ${time}`;
  if (diffDays === 1) return `Hier a ${time}`;
  return formatDate(iso);
};

export const RoleBadge = ({ role, disabled = false }: { role: MemberRole; disabled?: boolean }) => {
  const config: Record<MemberRole, { label: string; bg: string; color: string }> = {
    OWNER: { label: 'Owner', bg: '#EAE6FF', color: '#403294' },
    ADMIN: { label: 'Admin', bg: '#DEEBFF', color: '#0747A6' },
    DEVELOPER: { label: 'Developpeur', bg: '#E3FCEF', color: '#006644' },
    VIEWER: { label: 'Lecteur', bg: '#F4F5F7', color: '#42526E' },
  };
  return (
    <Chip
      size="small"
      label={config[role].label}
      sx={{
        bgcolor: disabled ? '#F4F5F7' : config[role].bg,
        color: disabled ? '#6B778C' : config[role].color,
        fontWeight: 500,
      }}
    />
  );
};

export const StatusChip = ({ status }: { status: MemberStatus }) => {
  const config: Record<MemberStatus, { label: string; bg: string; color: string }> = {
    ACTIVE: { label: 'Actif', bg: '#E3FCEF', color: '#006644' },
    INVITED: { label: 'Invite', bg: '#FFF7E6', color: '#974F0C' },
    DISABLED: { label: 'Desactive', bg: '#F4F5F7', color: '#6B778C' },
  };
  return <Chip size="small" label={config[status].label} sx={{ bgcolor: config[status].bg, color: config[status].color }} />;
};

const MembersTable = ({ members, loading, isOwner, onMenuOpen, onResendInvitation }: Props) => {
  const getPresence = usePresenceStore((state) => state.getPresence);

  const avatarSx = (member: TeamMember, size: number, fontSize?: number) => ({
    width: size,
    height: size,
    fontSize,
    border: member.userId != null && resolvePresenceDisplay(getPresence(member.userId)) === 'LIVE' ? '2px solid #44b700' : undefined,
  });

  return (
  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 2 }}>
    <Table>
      <TableHead sx={{ bgcolor: '#F4F5F7' }}>
        <TableRow>
          {['Membre', 'Role', 'Statut', 'Taches', 'Derniere activite'].map((header) => (
            <TableCell
              key={header}
              sx={{ fontSize: 12, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase' }}
            >
              {header}
            </TableCell>
          ))}
          {isOwner && <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase' }}>Actions</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={isOwner ? 6 : 5}><Skeleton height={42} /></TableCell>
              </TableRow>
            ))
          : members.map((member) => (
              <TableRow key={`${member.status}-${member.id}`} sx={{ '&:hover': { bgcolor: '#F4F5F7' }, borderBottom: '1px solid #EBECF0' }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {member.avatarUrl ? (
                      <Avatar src={member.avatarUrl} sx={avatarSx(member, 36)} />
                    ) : member.status === 'INVITED' ? (
                      <Avatar sx={{ ...avatarSx(member, 36), bgcolor: '#F4F5F7' }}>
                        <MailOutlineIcon sx={{ color: '#6B778C', fontSize: 18 }} />
                      </Avatar>
                    ) : (
                      <Avatar sx={{ ...avatarSx(member, 36, 13), bgcolor: getAvatarColor(member.role) }}>
                        {getInitials(member)}
                      </Avatar>
                    )}
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          color: member.status === 'DISABLED' ? '#6B778C' : '#172B4D',
                          fontStyle: member.status === 'INVITED' ? 'italic' : 'normal',
                        }}
                      >
                        {member.status === 'INVITED' ? member.email : `${member.prenom ?? ''} ${member.nom ?? ''}`.trim() || member.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.status === 'INVITED' ? `Invite le ${formatDate(member.invitedAt)}` : member.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><RoleBadge role={member.role} disabled={member.status === 'DISABLED'} /></TableCell>
                <TableCell><StatusChip status={member.status} /></TableCell>
                <TableCell><Typography variant="body2">{member.status === 'INVITED' ? '-' : member.tasksCount}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{formatRelativeDate(member.lastActivity)}</Typography></TableCell>
                {isOwner && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      {member.status === 'INVITED' && (
                        <Button size="small" variant="text" sx={{ color: '#0052CC', fontSize: 12 }} onClick={() => onResendInvitation(member)}>
                          Renvoyer
                        </Button>
                      )}
                      {member.role !== 'OWNER' && (
                        <IconButton size="small" onClick={(event) => onMenuOpen(event, member)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  </TableContainer>
  );
};

export default MembersTable;
