import { useRef } from 'react';
import { Avatar, Box, Button, CircularProgress, IconButton, Link, Paper, Typography } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useProjectSummaryStore } from '../../../store/projectSummaryStore';
import type { ActivityGroup } from '../../../types/projectSummary.types';
import { resolvePresenceDisplay, usePresenceStore } from '../../../store/presenceStore';

const RecentActivityWidget = ({ groups, projectId }: { groups: ActivityGroup[]; projectId: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { hasMoreActivity, isLoadingMore, loadMoreActivity } = useProjectSummaryStore();
  const getPresence = usePresenceStore((state) => state.getPresence);
  return (
    <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 1, p: 2.5, minHeight: 280 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Activite recente</Typography>
          <Typography sx={{ fontSize: 13, color: '#6B778C' }}>Restez informe de ce qui se passe.</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
        <IconButton size="small" onClick={() => scrollRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}><ExpandLess fontSize="small" /></IconButton>
        <IconButton size="small" onClick={() => scrollRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}><ExpandMore fontSize="small" /></IconButton>
      </Box>
      <Box ref={scrollRef} sx={{ maxHeight: 250, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#C1C7D0', borderRadius: 4 } }}>
        {groups.length === 0 ? (
          <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B778C' }}>Aucune activite recente</Box>
        ) : groups.map((group) => (
          <Box key={`${group.dateISO}-${group.items.length}`}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#6B778C', pt: 1.5, pb: 0.5 }}>{group.dateLabel}</Typography>
            {group.items.map((item, index) => {
              const online = item.userId != null && resolvePresenceDisplay(getPresence(item.userId)) === 'LIVE';
              return (
                <Box key={`${item.dateISO}-${index}`} sx={{ display: 'flex', gap: 1.25, py: 1, borderBottom: '1px solid #F0F1F3' }}>
                  <Avatar src={item.userAvatarUrl ?? undefined} sx={{ width: 28, height: 28, fontSize: 11, bgcolor: item.userAvatarColor, border: online ? '2px solid #44b700' : undefined }}>{item.userInitiales}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13 }}>
                      <Link component="span" sx={{ fontWeight: 700 }}>{item.userName}</Link> {item.action} <strong>{item.fieldName}</strong> {item.preposition}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#0052CC', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.taskTitre}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B778C' }}>{item.dateRelative}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
        {hasMoreActivity && groups.length > 0 && (
          <Button size="small" onClick={() => void loadMoreActivity(projectId)} disabled={isLoadingMore} sx={{ mt: 1 }}>
            {isLoadingMore ? <CircularProgress size={16} /> : "Charger plus d'activites"}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default RecentActivityWidget;
