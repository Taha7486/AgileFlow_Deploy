import { useState } from 'react';
import { Box, Button, FormControl, Menu, MenuItem, Select, Typography } from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { useProjectSummaryStore } from '../../../store/projectSummaryStore';

const SummaryToolbar = ({ projectId }: { projectId: number }) => {
  const { periodeDays, setPeriode, refresh } = useProjectSummaryStore();
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button size="small" startIcon={<FilterList />} onClick={(event) => setFilterAnchor(event.currentTarget)}>Filtre</Button>
        <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
          <Box sx={{ px: 2, py: 1.5, width: 220 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Periode</Typography>
            <FormControl fullWidth size="small">
              <Select value={periodeDays} onChange={(event) => setPeriode(Number(event.target.value), projectId)}>
                <MenuItem value={7}>7 derniers jours</MenuItem>
                <MenuItem value={14}>14 jours</MenuItem>
                <MenuItem value={30}>30 jours</MenuItem>
                <MenuItem value={90}>90 jours</MenuItem>
              </Select>
            </FormControl>
            <Button fullWidth size="small" sx={{ mt: 1 }} onClick={() => { void refresh(projectId); setFilterAnchor(null); }}>Actualiser</Button>
          </Box>
        </Menu>
    </Box>
  );
};

export default SummaryToolbar;
