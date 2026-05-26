import { Box, IconButton, Link, Typography } from '@mui/material';
import { Close, InfoOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const BanniereInfo = ({ onDismiss }: { onDismiss: () => void }) => {
  const navigate = useNavigate();
  return (
    <Box sx={{ position: 'relative', display: 'flex', gap: 2, alignItems: 'center', border: '1px solid #B3D4FF', bgcolor: '#DEEBFF', borderRadius: 1, px: 2.5, py: 2 }}>
      <InfoOutlined sx={{ color: '#0052CC' }} />
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Personnalisez votre vue Rapports.</Typography>
        <Typography sx={{ fontSize: 13, color: '#42526E' }}>
          Rendez-vous dans l'onglet Rapports pour personnaliser les indicateurs et exports de ce projet.
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <Link component="button" underline="hover" onClick={() => navigate('/stats')} sx={{ fontSize: 13 }}>Acceder aux Rapports</Link>
          <Typography component="span" sx={{ mx: 1, fontSize: 13, color: '#6B778C' }}>|</Typography>
          <Link component="button" underline="hover" color="inherit" onClick={onDismiss} sx={{ fontSize: 13 }}>Ignorer</Link>
        </Box>
      </Box>
      <Box sx={{ width: 112, height: 56, display: { xs: 'none', sm: 'block' } }}>
        <svg width="112" height="56" viewBox="0 0 112 56" role="img" aria-label="Illustration rapports">
          <rect x="10" y="30" width="12" height="18" rx="2" fill="#0052CC" />
          <rect x="28" y="18" width="12" height="30" rx="2" fill="#36B37E" />
          <rect x="46" y="8" width="12" height="40" rx="2" fill="#FF991F" />
          <circle cx="82" cy="28" r="18" fill="#E3FCEF" />
          <path d="M82 10a18 18 0 0 1 15 28L82 28z" fill="#00875A" />
          <path d="M89 10l2 6 6 1-5 4 1 6-4-3-5 3 2-6-5-4 6-1z" fill="#FF991F" />
        </svg>
      </Box>
      <IconButton size="small" onClick={onDismiss} sx={{ position: 'absolute', top: 6, right: 6 }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default BanniereInfo;
