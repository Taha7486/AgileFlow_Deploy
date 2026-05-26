import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  InputLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AccountTree, Add, DeleteOutline, Edit, OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { createDiagram, deleteDiagram, fetchDiagrams } from '../../api/diagramsApi';
import { useActiveProject } from '../../hooks/useActiveProject';
import type { CreateDiagramPayload, DiagramData, DiagramType } from '../../types';
import { DIAGRAM_TYPE_LABELS, EDITOR_DIAGRAM_TYPES, getTemplate } from '../../data/diagramTemplates';
import { buildCanvasData, toEdgeDTO, toNodeDTO } from '../../utils/diagramSerialization';
import PageHeader from '../../components/layout/PageHeader';

const typeColor: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'default'> = {
  USE_CASE: 'primary',
  CLASS: 'secondary',
  SEQUENCE: 'info',
  ACTIVITY: 'success',
  COMPONENT: 'warning',
  DEPLOYMENT: 'default',
};

const DiagramListPage = () => {
  const navigate = useNavigate();
  const { activeProject } = useActiveProject();
  const selectedProjectId = activeProject?.id ?? '';
  const [diagrams, setDiagrams] = useState<DiagramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DiagramType | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DiagramType>('USE_CASE');
  const [shared, setShared] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedProjectId) {
      setDiagrams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const diagramRows = await fetchDiagrams(selectedProjectId);
      setDiagrams(diagramRows);
    } catch {
      setError('Impossible de charger DiagramFlow.');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return diagrams.filter((diagram) => {
      const matchesType = typeFilter === 'ALL' || diagram.type === typeFilter;
      const matchesText = !q
        || (diagram.title ?? diagram.titre).toLowerCase().includes(q)
        || (diagram.projectName ?? '').toLowerCase().includes(q);
      return matchesType && matchesText;
    });
  }, [diagrams, search, typeFilter]);

  const handleCreate = async () => {
    if (!title.trim() || !selectedProjectId) return;
    setSaving(true);
    try {
      const template = getTemplate(type);
      const canvasData = buildCanvasData(title.trim(), type, template.nodes, template.edges);
      const payload: CreateDiagramPayload = {
        title: title.trim(),
        titre: title.trim(),
        description,
        type,
        projectId: Number(selectedProjectId),
        etapes: [],
        shared,
        isShared: shared,
        nodes: template.nodes.map(toNodeDTO),
        edges: template.edges.map(toEdgeDTO),
        canvasData,
        content: canvasData,
      };
      const created = await createDiagram(payload);
      navigate(`/diagrams/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (diagram: DiagramData) => {
    if (!window.confirm(`Supprimer "${diagram.title ?? diagram.titre}" ?`)) return;
    await deleteDiagram(diagram.id);
    setDiagrams((rows) => rows.filter((row) => row.id !== diagram.id));
  };

  return (
    <Box sx={{ mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, bgcolor: '#F7F8F9', minHeight: 'calc(100vh - 64px)' }}>
      <Box sx={{ maxWidth: 1500, mx: 'auto', width: '100%', px: { xs: 2, md: 4, xl: 6 }, py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <PageHeader
          icon={<AccountTree />}
          title="DiagramFlow"
          subtitle={`Editeur collaboratif de diagrammes${activeProject ? ` - ${activeProject.name}` : ''}`}
          disablePadding
          action={<Button variant="contained" startIcon={<Add />} onClick={() => setModalOpen(true)}>Nouveau diagramme</Button>}
        />
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField label="Rechercher" size="small" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: 240 }} />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="Tous" color={typeFilter === 'ALL' ? 'primary' : 'default'} onClick={() => setTypeFilter('ALL')} />
          {EDITOR_DIAGRAM_TYPES.map((item) => (
            <Chip key={item} label={DIAGRAM_TYPE_LABELS[item]} color={typeFilter === item ? 'primary' : 'default'} onClick={() => setTypeFilter(item)} />
          ))}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!activeProject ? (
        <Alert severity="info">Selectionnez un projet dans le header pour afficher ses diagrammes.</Alert>
      ) : loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 260 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((diagram) => (
            <Grid item xs={12} md={6} xl={4} key={diagram.id}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                <Box sx={{ height: 130, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'grey.200', display: 'grid', placeItems: 'center' }}>
                  <AccountTree sx={{ fontSize: 44, color: 'primary.main' }} />
                </Box>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Typography variant="h6" fontWeight={800}>{diagram.title ?? diagram.titre}</Typography>
                    <Chip size="small" color={typeColor[diagram.type] ?? 'default'} label={DIAGRAM_TYPE_LABELS[diagram.type] ?? diagram.type} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{diagram.projectName}</Typography>
                  <Typography variant="caption" color="text.secondary">Modifie le {diagram.updatedAt ? new Date(diagram.updatedAt).toLocaleString() : '-'}</Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button startIcon={<OpenInNew />} onClick={() => navigate(`/diagrams/${diagram.id}`)}>Ouvrir</Button>
                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<Edit />} onClick={() => navigate(`/diagrams/${diagram.id}`)}>Editer</Button>
                    <Button color="error" startIcon={<DeleteOutline />} onClick={() => handleDelete(diagram)}>Supprimer</Button>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {filtered.length === 0 && <Grid item xs={12}><Alert severity="info">Aucun diagramme trouve.</Alert></Grid>}
        </Grid>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouveau diagramme</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Titre" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus />
            <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={2} />
            <InputLabel>Type de diagramme</InputLabel>
            <Grid container spacing={1}>
              {EDITOR_DIAGRAM_TYPES.map((item) => (
                <Grid item xs={6} md={4} key={item}>
                  <Button fullWidth variant={type === item ? 'contained' : 'outlined'} onClick={() => setType(item)} sx={{ py: 1.5 }}>
                    {DIAGRAM_TYPE_LABELS[item]}
                  </Button>
                </Grid>
              ))}
            </Grid>
            <FormControlLabel control={<Switch checked={shared} onChange={(event) => setShared(event.target.checked)} />} label="Partager avec l'equipe du projet" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={saving || !title.trim() || !selectedProjectId} onClick={handleCreate}>{saving ? 'Creation...' : 'Creer'}</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default DiagramListPage;
