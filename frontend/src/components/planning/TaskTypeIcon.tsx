import React from 'react';
import { Tooltip, Box } from '@mui/material';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import StarIcon from '@mui/icons-material/Star';
import BugReportIcon from '@mui/icons-material/BugReport';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { TYPE_CONFIG, TypeTache } from '../../types/planning.types';

interface Props {
  type: TypeTache;
  size?: number;
  showTooltip?: boolean;
  isChild?: boolean;
}

const ICONS: Record<TypeTache, React.ElementType> = {
  EPIC:    FlashOnIcon,
  STORY:   BookmarkIcon,
  TASK:    CheckBoxIcon,
  FEATURE: StarIcon,
  BUG:     BugReportIcon,
  SUBTASK: SubdirectoryArrowRightIcon,
};

const TaskTypeIcon: React.FC<Props> = ({
  type, size = 16, showTooltip = true
}) => {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  const Icon = ICONS[type];

  const icon = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Icon sx={{
        fontSize: size,
        color: config.color,
        flexShrink: 0
      }} />
    </Box>
  );

  if (!showTooltip) return icon;
  return <Tooltip title={config.label}>{icon}</Tooltip>;
};

export default TaskTypeIcon;
