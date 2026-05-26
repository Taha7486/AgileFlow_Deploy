import { Component, type ErrorInfo, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Erreur React non interceptee', error, errorInfo);
    }
  }

  private handleReset = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F7F8F9', p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 640, width: '100%' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Impossible d'afficher AgileFlow
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Une erreur locale a bloque le rendu. Reconnectez-vous pour reinitialiser la session.
          </Typography>
          {import.meta.env.DEV && (
            <Typography variant="caption" component="pre" sx={{ display: 'block', whiteSpace: 'pre-wrap', mb: 2 }}>
              {this.state.error.message}
            </Typography>
          )}
          <Button variant="contained" onClick={this.handleReset}>
            Revenir a la connexion
          </Button>
        </Alert>
      </Box>
    );
  }
}

export default AppErrorBoundary;
