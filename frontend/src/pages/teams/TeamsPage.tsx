import GridViewIcon from '@mui/icons-material/GridView';
import GroupIcon from '@mui/icons-material/Group';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ViewListIcon from '@mui/icons-material/ViewList';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  getTeamMembers,
  getTeamStats,
  removeMember,
  resendInvitation,
  updateMemberRole,
} from '../../api/teamApi';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useAuthStore } from '../../store/authStore';
import type { MemberRole, MemberStatus, TeamMember, TeamStats } from '../../types/team';
import InviteModal from './components/InviteModal';
import MemberActionMenu from './components/MemberActionMenu';
import MembersGrid from './components/MembersGrid';
import MembersTable from './components/MembersTable';
import TeamStatsCards from './components/TeamStatsCards';
import PageHeader from '../../components/layout/PageHeader';

type ViewMode = 'table' | 'grid';
type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' };

const roleLabels: Record<MemberRole | 'ALL', string> = {
  ALL: 'Tous les roles',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  DEVELOPER: 'Developpeur',
  VIEWER: 'Lecteur',
};

const statusLabels: Record<MemberStatus | 'ALL', string> = {
  ALL: 'Tous les statuts',
  ACTIVE: 'Actif',
  INVITED: 'Invite',
  DISABLED: 'Desactive',
};

const TeamsPage = () => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const user = useAuthStore((state) => state.user);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>('ALL');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  const notify = (message: string, severity: SnackbarState['severity']) => {
    setSnackbar({ open: true, message, severity });
  };

  const loadData = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [membersData, statsData] = await Promise.all([
        getTeamMembers(activeProject.id),
        getTeamStats(activeProject.id),
      ]);
      setMembers(membersData);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger l equipe du projet.';
      setError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    setMembers([]);
    setStats(null);
    if (activeProject?.id) {
      void loadData();
    }
  }, [activeProject?.id, loadData]);

  const isOwner = useMemo(() => {
    const owner = members.find((member) => member.role === 'OWNER');
    const currentMember = members.find((member) => member.userId === user?.id);
    return user?.role === 'ROLE_ADMIN'
      || (user?.id != null && owner?.userId === user.id)
      || currentMember?.role === 'ADMIN';
  }, [members, user?.id, user?.role]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      const identity = `${member.email} ${member.nom ?? ''} ${member.prenom ?? ''}`.toLowerCase();
      const matchesSearch = !query || identity.includes(query);
      const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || member.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, roleFilter, searchQuery, statusFilter]);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, member: TeamMember) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleResendInvitation = async (member: TeamMember) => {
    if (!activeProject?.id) return;
    try {
      await resendInvitation(activeProject.id, member.id);
      notify('Invitation renvoyee', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de renvoyer l invitation.', 'error');
    }
  };

  const handleChangeRole = async (role: MemberRole) => {
    if (!activeProject?.id || !selectedMember) return;
    try {
      await updateMemberRole(activeProject.id, selectedMember.id, role);
      notify('Role mis a jour', 'success');
      await loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de modifier le role.', 'error');
    }
  };

  const handleRemoveMember = async () => {
    if (!activeProject?.id || !selectedMember) return;
    try {
      await removeMember(activeProject.id, selectedMember.id);
      notify('Membre retire du projet', 'success');
      handleMenuClose();
      await loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de retirer ce membre.', 'error');
    }
  };

  const handleRoleFilter = (event: SelectChangeEvent) => {
    setRoleFilter(event.target.value as MemberRole | 'ALL');
  };

  const handleStatusFilter = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value as MemberStatus | 'ALL');
  };

  if (!activeProject) {
    return (
      <Box sx={{ mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, p: { xs: 2, md: 4, xl: 6 }, bgcolor: '#F7F8F9', minHeight: 'calc(100vh - 64px)' }}>
        <Alert severity="info" sx={{ mt: 4 }}>
          Selectionnez un projet dans le menu en haut pour afficher son equipe.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, bgcolor: '#F7F8F9', minHeight: 'calc(100vh - 64px)' }}>
      <Box sx={{ maxWidth: 1500, mx: 'auto', width: '100%', px: { xs: 2, md: 4, xl: 6 }, py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <PageHeader
          icon={<GroupIcon />}
          title="Équipe"
          subtitle={`Membres et rôles du projet ${activeProject.name}`}
          disablePadding
          action={isOwner && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            sx={{ bgcolor: '#0052CC', '&:hover': { bgcolor: '#0747A6' } }}
            onClick={() => setInviteModalOpen(true)}
          >
            Inviter un membre
          </Button>
          )}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TeamStatsCards stats={stats} loading={loading} />

      <Paper elevation={0} sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #DFE1E6' }}>
        <TextField
          size="small"
          placeholder="Rechercher un membre..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          sx={{ width: 280 }}
        />
        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel>Role</InputLabel>
          <Select value={roleFilter} label="Role" onChange={handleRoleFilter}>
            {(Object.keys(roleLabels) as Array<MemberRole | 'ALL'>).map((role) => (
              <MenuItem key={role} value={role}>{roleLabels[role]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} label="Statut" onChange={handleStatusFilter}>
            {(Object.keys(statusLabels) as Array<MemberStatus | 'ALL'>).map((status) => (
              <MenuItem key={status} value={status}>{statusLabels[status]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setViewMode('table')}
            sx={viewMode === 'table' ? { bgcolor: '#E9F2FF', color: '#0052CC' } : undefined}
          >
            <ViewListIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('grid')}
            sx={viewMode === 'grid' ? { bgcolor: '#E9F2FF', color: '#0052CC' } : undefined}
          >
            <GridViewIcon />
          </IconButton>
        </Box>
      </Paper>

      {!loading && filteredMembers.length === 0 ? (
        <Paper elevation={0} sx={{ textAlign: 'center', py: 6, border: '1px solid #DFE1E6', borderRadius: 2 }}>
          <PeopleOutlineIcon sx={{ fontSize: 64, color: '#DFE1E6', mb: 2 }} />
          <Typography color="text.secondary">Aucun membre ne correspond aux filtres selectionnes.</Typography>
          {isOwner && (
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setInviteModalOpen(true)}>
              Inviter le premier membre
            </Button>
          )}
        </Paper>
      ) : viewMode === 'table' ? (
        <MembersTable
          members={filteredMembers}
          loading={loading}
          isOwner={isOwner}
          onMenuOpen={handleMenuOpen}
          onResendInvitation={handleResendInvitation}
        />
      ) : (
        <MembersGrid
          members={filteredMembers}
          loading={loading}
          isOwner={isOwner}
          onMenuOpen={handleMenuOpen}
        />
      )}

      <MemberActionMenu
        anchorEl={anchorEl}
        member={selectedMember}
        onClose={handleMenuClose}
        onChangeRole={handleChangeRole}
        onRemove={handleRemoveMember}
      />

      <InviteModal
        open={inviteModalOpen}
        projectId={activeProject.id}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          setInviteModalOpen(false);
          notify('Invitation envoyee avec succes', 'success');
          void loadData();
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
};

export default TeamsPage;
