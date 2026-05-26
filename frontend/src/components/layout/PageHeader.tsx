import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  disablePadding?: boolean;
}

const PageHeader = ({ icon, title, subtitle, action, disablePadding = false }: PageHeaderProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      px: disablePadding ? 0 : { xs: 2, md: 3 },
      py: disablePadding ? 0 : 2,
      bgcolor: '#F7F8F9',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ color: '#2563EB', display: 'flex', alignItems: 'center', '& svg': { fontSize: 30 } }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ color: '#091E42', fontWeight: 800, fontSize: { xs: 24, md: 30 }, lineHeight: 1.05 }} noWrap>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ color: '#5E6C84', mt: 0.35 }} noWrap>
          {subtitle}
        </Typography>
      </Box>
    </Box>
    {action}
  </Box>
);

export default PageHeader;
