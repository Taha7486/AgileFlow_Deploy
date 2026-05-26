import { Link, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PriorityBreakdown } from '../../../types/projectSummary.types';

const PriorityBreakdownWidget = ({ data }: { data?: PriorityBreakdown }) => {
  const navigate = useNavigate();
  const rows = [
    { name: 'Critique', value: data?.highest ?? 0, couleur: '#DE350B' },
    { name: 'Haute', value: data?.high ?? 0, couleur: '#FF991F' },
    { name: 'Moyenne', value: data?.medium ?? 0, couleur: '#6B778C' },
    { name: 'Basse', value: data?.low ?? 0, couleur: '#0052CC' },
    { name: 'Lowest', value: data?.lowest ?? 0, couleur: '#36B37E' },
  ];
  return (
    <Paper elevation={0} sx={{ border: '1px solid #DFE1E6', borderRadius: 1, p: 2.5, minHeight: 280 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Repartition par priorite</Typography>
      <Typography sx={{ fontSize: 13, color: '#6B778C', mb: 2 }}>Vue d'ensemble des priorites. <Link component="button" onClick={() => navigate('/planning')}>Gerer les priorites</Link></Typography>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F3" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B778C' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B778C' }} />
          <Tooltip formatter={(value) => [`${value} tache(s)`, '']} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {rows.map((entry) => <Cell key={entry.name} fill={entry.couleur} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default PriorityBreakdownWidget;
