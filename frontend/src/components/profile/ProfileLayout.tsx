import {
  Avatar,
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  NotificationsOutlined,
  PersonOutline,
  RadioButtonChecked,
} from '@mui/icons-material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS: Record<string, { label: string; color: 'default' | 'error' | 'warning' | 'info' }> = {
  ROLE_ADMIN: { label: 'Administrateur', color: 'error' },
  ROLE_DEVELOPER: { label: 'Developpeur', color: 'info' },
};

const NAV = [
  { to: '/profile/account', label: 'Mon compte', icon: <PersonOutline /> },
  { to: '/profile/notifications', label: 'Notifications', icon: <NotificationsOutlined /> },
  { to: '/profile/presence', label: 'Presence', icon: <RadioButtonChecked /> },
];

const ProfileLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = ROLE_LABELS[user?.role ?? ''] ?? { label: user?.role ?? '', color: 'default' as const };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 58,
                height: 58,
                bgcolor: 'primary.main',
                fontSize: 22,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" fontWeight={900} noWrap>
                Mon profil
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.firstName} {user?.lastName} - {user?.email}
              </Typography>
              <Chip label={role.label} color={role.color} size="small" sx={{ mt: 1 }} />
            </Box>
          </Box>

          <List
            dense
            disablePadding
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {NAV.map((item) => {
              const active = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: active ? 'primary.main' : 'background.paper',
                    color: active ? 'primary.contrastText' : 'text.primary',
                    px: 1.5,
                    py: 1,
                    '&:hover': {
                      bgcolor: active ? 'primary.dark' : 'grey.50',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: 800, fontSize: 14 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Stack>
      </Paper>

      <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default ProfileLayout;
