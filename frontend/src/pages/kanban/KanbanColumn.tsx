import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Add, CheckCircleOutline } from '@mui/icons-material';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { COLUMN_CONFIG } from '../../types/kanban.types';
import type { KanbanColumn as KanbanColumnType, KanbanStatut } from '../../types/kanban.types';
import KanbanCard from './KanbanCard';
import CreateTaskModal from './CreateTaskModal';

interface Props {
  column: KanbanColumnType;
}

const KanbanColumn = ({ column }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.statut });
  const [createOpen, setCreateOpen] = useState(false);
  const config = COLUMN_CONFIG[column.statut];

  return (
    <Box sx={{ width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ height: 36, display: 'flex', alignItems: 'center', gap: 1, px: 0.5, '&:hover .add-task': { opacity: 1 } }}>
        <Chip
          label={config.labelFR}
          size="small"
          sx={{ height: 24, borderRadius: 20, bgcolor: config.bgColor, color: config.textColor, fontSize: 11, fontWeight: 800 }}
        />
        <Typography sx={{ fontSize: 12, color: '#6B778C' }}>{column.count}</Typography>
        {column.statut === 'DONE' && <CheckCircleOutline sx={{ fontSize: 16, color: '#00875A' }} />}
        <Tooltip title="Ajouter une tache">
          <IconButton className="add-task" size="small" onClick={() => setCreateOpen(true)} sx={{ ml: 'auto', opacity: 0, width: 28, height: 28 }}>
            <Add sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          minHeight: 110,
          borderRadius: '3px',
          p: 0.5,
          bgcolor: isOver ? config.bgColor : 'transparent',
          transition: 'background-color 0.15s',
        }}
      >
        <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => <KanbanCard key={task.id} task={task} />)}
        </SortableContext>
        {column.tasks.length === 0 && (
          <Box
            sx={{
              height: 68,
              border: isOver ? '1px dashed #0052CC' : '1px dashed transparent',
              borderRadius: '3px',
              color: '#6B778C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            {isOver ? 'Deposer ici' : 'Aucune tache'}
          </Box>
        )}
      </Box>

      {column.statut === 'TODO' && (
        <Box
          component="button"
          onClick={() => setCreateOpen(true)}
          sx={{
            border: 0,
            bgcolor: 'transparent',
            color: '#6B778C',
            height: 36,
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1,
            cursor: 'pointer',
            fontSize: 14,
            '&:hover': { bgcolor: '#DFE1E6' },
          }}
        >
          <Add sx={{ fontSize: 18 }} />
          Creer
        </Box>
      )}

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} defaultStatut={column.statut as KanbanStatut} />
    </Box>
  );
};

export default KanbanColumn;
