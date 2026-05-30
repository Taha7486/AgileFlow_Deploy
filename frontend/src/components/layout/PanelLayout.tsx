import { useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChatBubbleOutline } from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import ChatPanel from '../chat/ChatPanel';
import NotificationBell from '../notifications/NotificationBell';
import ProfileMenuButton from '../profile/ProfileMenuButton';
import { useCurrentRoleBadge } from '../../hooks/useCurrentRoleBadge';

const PanelLayout = () => {
  const navigate = useNavigate();
  const { totalUnreadCount } = useChat({ isMonitor: true, projectNames: {}, contactNames: {} });
  const [chatOpen, setChatOpen] = useState(false);
  const role = useCurrentRoleBadge();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8F9' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', minWidth: 0 }}
          >
            <Box component="img" src="/agileflow-icon.png" alt="AgileFlow" sx={{ width: 40, height: 40, objectFit: 'contain' }} />
            <Typography
              variant="h6"
              fontWeight={900}
              noWrap
              sx={{
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AgileFlow
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.25 }, flexShrink: 0 }}>
            <NotificationBell />
            <Tooltip title="Messages">
              <IconButton onClick={() => setChatOpen(true)} size="small" sx={{ color: 'text.secondary' }}>
                <Badge badgeContent={totalUnreadCount} color="error">
                  <ChatBubbleOutline fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <ProfileMenuButton />
            {role.label && (
              <Tooltip title={role.title}>
                <Chip label={role.label} color={role.color} size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ width: 'min(100% - 32px, 1200px)', mx: 'auto', py: { xs: 3, md: 4 } }}>
        <Outlet />
      </Box>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </Box>
  );
};

export default PanelLayout;
