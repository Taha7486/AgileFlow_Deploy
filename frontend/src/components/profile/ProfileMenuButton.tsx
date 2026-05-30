import { useState, type ReactNode } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close,
  Logout,
  NotificationsOutlined,
  PersonOutline,
  RadioButtonChecked,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationPreferences from '../users/NotificationPreferences';
import ProfilePresencePanel from './ProfilePresencePanel';
import ProfileAccountTab from '../../pages/profile/ProfileAccountTab';
import { usePresenceStore } from '../../store/presenceStore';
import { useCurrentRoleBadge } from '../../hooks/useCurrentRoleBadge';

type ProfilePanel = 'account' | 'notifications' | 'presence';

const LINKS: Array<{ panel: ProfilePanel; label: string; icon: ReactNode }> = [
  { panel: 'account', label: 'Mon compte', icon: <PersonOutline fontSize="small" /> },
  { panel: 'notifications', label: 'Notifications', icon: <NotificationsOutlined fontSize="small" /> },
  { panel: 'presence', label: 'Presence', icon: <RadioButtonChecked fontSize="small" /> },
];

const ProfileMenuButton = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activePanel, setActivePanel] = useState<ProfilePanel | null>(null);
  const myVisibilityStatus = usePresenceStore((state) => state.myVisibilityStatus);

  const open = Boolean(anchorEl);
  const role = useCurrentRoleBadge();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? ''}`;
  const isProfilePage = location.pathname.startsWith('/profile');
  const isLive = myVisibilityStatus === 'LIVE';

  const openPanel = (panel: ProfilePanel) => {
    setAnchorEl(null);
    setActivePanel(panel);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/', { replace: true });
  };

  const panelTitle = activePanel === 'account'
    ? 'Mon compte'
    : activePanel === 'notifications'
      ? 'Notifications'
      : 'Presence';

  return (
    <>
      <Tooltip title="Mon profil">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="small"
          aria-label="Mon profil"
          sx={{
            p: 0.25,
            border: '2px solid',
            borderColor: isLive ? '#44b700' : isProfilePage ? 'primary.main' : 'transparent',
            borderRadius: '50%',
          }}
        >
          <Avatar src={user?.avatarUrl ?? undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
            {initials}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 280, mt: 1, borderRadius: 2, boxShadow: 4 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={700} noWrap>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
          <Tooltip title={role.title}>
            <Chip label={role.label} color={role.color} size="small" sx={{ mt: 1 }} />
          </Tooltip>
        </Box>

        <Divider />

        {LINKS.map((link) => (
          <MenuItem
            key={link.panel}
            selected={location.pathname === `/profile/${link.panel}`}
            onClick={() => openPanel(link.panel)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{link.icon}</ListItemIcon>
            {link.label}
          </MenuItem>
        ))}

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          Se deconnecter
        </MenuItem>
      </Menu>

      <Dialog
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        fullWidth
        maxWidth={activePanel === 'account' ? 'md' : 'sm'}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
          <Typography fontWeight={900}>{panelTitle}</Typography>
          <IconButton size="small" onClick={() => setActivePanel(null)} aria-label="Fermer">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f8fafc', p: { xs: 2, md: 3 } }}>
          {activePanel === 'account' && <ProfileAccountTab />}
          {activePanel === 'notifications' && (
            <NotificationPreferences
              title="Notifications par email"
              description="Choisissez les evenements pour lesquels AgileFlow vous envoie un email."
              embedded
            />
          )}
          {activePanel === 'presence' && <ProfilePresencePanel />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileMenuButton;
