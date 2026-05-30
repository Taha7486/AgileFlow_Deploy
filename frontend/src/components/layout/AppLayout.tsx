import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountTree,
  ChevronLeft,
  Dashboard,
  Folder,
  History,
  Group,
  Insights,
  ManageAccounts,
  Menu as MenuIcon,
  ViewColumn,
  ViewList,
  Timeline as TimelineIcon,
  ChatBubbleOutline,
  GitHub,
  NotificationsOutlined,
} from '@mui/icons-material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChatPanel from '../chat/ChatPanel';
import VisibilityStatusControl from '../VisibilityStatusControl';
import NotificationBell from '../notifications/NotificationBell';
import ProfileMenuButton from '../profile/ProfileMenuButton';
import ProjectSelector from './ProjectSelector';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useChat } from '../../hooks/useChat';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { usePresenceStore } from '../../store/presenceStore';
import { useCurrentRoleBadge } from '../../hooks/useCurrentRoleBadge';

const DRAWER_WIDTH = 250;

const NAV_ITEMS = [
  { label: 'DiagramFlow', path: '/diagrams', icon: <AccountTree /> },
  { label: 'Developpement', path: '/development', icon: <GitHub /> },
  { label: 'Planification', path: '/planning', icon: <ViewList /> },
  { label: 'Kanban', path: '/kanban', icon: <ViewColumn /> },
  { label: 'Chronologie', path: '/timeline', icon: <TimelineIcon /> },
  { label: 'Equipes', path: '/teams', icon: <Group /> },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <Dashboard /> },
  { label: 'Projects', path: '/admin/projects', icon: <Folder /> },
  { label: 'Users', path: '/users', icon: <ManageAccounts /> },
  { label: 'Analytics / Reports', path: '/analytics', icon: <Insights /> },
  { label: 'Activity Logs', path: '/activity-logs', icon: <History /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsOutlined /> },
];

const AppLayout = () => {
  const [open, setOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();
  const { connectionState, publish } = useWebSocket();
  const { totalUnreadCount } = useChat({ isMonitor: true, projectNames: {}, contactNames: {} });
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const myVisibilityStatus = usePresenceStore((state) => state.myVisibilityStatus);
  const navigate = useNavigate();
  const location = useLocation();
  const isPlatformAdmin = user?.role === 'ROLE_ADMIN';

  const roleInfo = useCurrentRoleBadge();
  const navItems = activeProject
    ? [
        { label: 'Resume', path: `/projects/${activeProject.id}/summary`, icon: <Dashboard /> },
        ...NAV_ITEMS,
      ]
    : NAV_ITEMS;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <IconButton onClick={() => setOpen(!open)} size="small">
              {open ? <ChevronLeft /> : <MenuIcon />}
            </IconButton>
            <Box
              onClick={() => navigate('/')}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', minWidth: 0 }}
            >
              <Box component="img" src="/agileflow-icon.png" alt="AgileFlow" sx={{ width: 38, height: 38, objectFit: 'contain' }} />
              <Typography
                variant="h6"
                fontWeight={900}
                noWrap
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                AgileFlow
              </Typography>
            </Box>
            {!isPlatformAdmin && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }} />
                <ProjectSelector />
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 }, flexShrink: 0 }}>
            <VisibilityStatusControl connectionState={connectionState} publish={publish} />
            <NotificationBell />
            <ProfileMenuButton />
            <Tooltip title="Ouvrir le chat">
              <IconButton onClick={() => setIsChatOpen(!isChatOpen)} color="inherit" size="small" sx={{ color: 'text.secondary' }}>
                <Badge badgeContent={totalUnreadCount} color="error">
                  <ChatBubbleOutline fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={roleInfo.title}>
              <Chip label={roleInfo.label} color={roleInfo.color} size="small" sx={{ display: { xs: 'none', md: 'flex' } }} />
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 64,
          flexShrink: 0,
          transition: 'width 0.2s',
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : 64,
            overflowX: 'hidden',
            transition: 'width 0.2s',
            bgcolor: 'grey.900',
            color: 'white',
            borderRight: 'none',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: open ? 2 : 0.5, py: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user?.avatarUrl ?? undefined}
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
              border: myVisibilityStatus === 'LIVE' ? '2px solid #44b700' : undefined,
            }}
          >
            {user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase()}
          </Avatar>
          {open && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1" fontWeight={600} noWrap>{user?.firstName} {user?.lastName}</Typography>
              <Typography variant="caption" sx={{ color: 'grey.400' }} noWrap>{user?.email}</Typography>
            </Box>
          )}
        </Box>
        <Divider sx={{ borderColor: 'grey.700', mb: 1 }} />

        <List dense>
          {(isPlatformAdmin ? ADMIN_NAV_ITEMS : navItems).map(({ label, path, icon }) => {
            const active = path === '/dashboard' || path === '/admin'
                ? location.pathname === path
                : location.pathname === path || location.pathname.startsWith(`${path}/`);
            return (
              <ListItem key={path} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={!open ? label : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(path)}
                    sx={{
                      px: open ? 2 : 1.5,
                      py: 1.2,
                      mx: 0.5,
                      borderRadius: 1,
                      bgcolor: active ? 'primary.main' : 'transparent',
                      '&:hover': { bgcolor: active ? 'primary.dark' : 'grey.800' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: active ? 'white' : 'grey.400' }}>{icon}</ListItemIcon>
                    {open && <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? 'white' : 'grey.300' }} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#F7F8F9',
          overflow: 'auto',
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>

      <ChatPanel open={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </Box>
  );
};

export default AppLayout;
