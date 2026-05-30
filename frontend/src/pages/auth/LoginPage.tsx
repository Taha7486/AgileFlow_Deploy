import React, { useEffect, useState } from 'react';
import { Alert, CircularProgress, IconButton } from '@mui/material';
import { GitHub, Google, Visibility, VisibilityOff } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/axiosInterceptor';
import { fetchProjects } from '../../api/projectsApi';
import './AuthPages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const OAUTH_BASE_URL = API_URL.replace(/\/api\/?$/, '');
const homeAfterAuth = async (role: string) => {
  if (role === 'ROLE_ADMIN') return '/admin';
  try {
    const projects = await fetchProjects();
    return projects.length > 0 ? '/dashboard' : '/';
  } catch {
    return '/dashboard';
  }
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauthError');
    if (oauthError) {
      const oauthDetail = params.get('oauthDetail');
      setError(oauthDetail || `Connexion OAuth impossible: ${oauthError}`);
    }
  }, []);

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    window.location.href = `${OAUTH_BASE_URL}/oauth2/authorization/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.accessToken, {
        id: data.userId,
        email: data.email,
        role: data.role,
        firstName: data.prenom ?? '',
        lastName: data.nom ?? '',
        avatarUrl: data.avatarUrl ?? null,
      }, data.refreshToken);
      navigate(await homeAfterAuth(data.role), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell auth-login">
      <section className="auth-panel-dark">
        <div className="auth-dark-content">
          <div className="auth-brand-block">
            <img src="/agileflow-icon.png" alt="AgileFlow" className="auth-logo" />
            <span className="auth-brand-name">AgileFlow</span>
          </div>

          <h1>Bon retour parmi vous</h1>
          <p>Retrouvez vos projets, taches, equipes et integrations GitHub dans un espace unifie.</p>

          <div className="auth-pills">
            {['Kanban', 'Gantt', 'GitHub', 'Diagrammes'].map((item) => (
              <span key={item} className="auth-pill">{item}</span>
            ))}
          </div>

          <div className="auth-testimonial">

  <blockquote>
    "AgileFlow a transformé notre gestion de sprints et l'intégration GitHub nous fait gagner des heures."
  </blockquote>

  <div className="auth-person">
    <img
  className="auth-avatar"
  src="/marie.jpg"
  alt="Marie D."
/>
    <span>Marie D., Lead Dev @Stackly</span>
  </div>
</div>
        </div>
      </section>

      <section className="auth-panel-light">
        <div className="auth-card">
          <Link className="auth-home-link" to="/">Retour a l'accueil</Link>
          <div className="auth-card-header">
            <h2>Se connecter</h2>
            <p>
              Pas de compte ? <Link to="/register">Creer un compte</Link>
            </p>
          </div>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <div className="auth-oauth-stack">
            <button type="button" className="auth-oauth-button" onClick={() => handleOAuthLogin('github')}>
              <GitHub fontSize="small" />
              Continuer avec GitHub
            </button>
            <button type="button" className="auth-oauth-button" onClick={() => handleOAuthLogin('google')}>
              <Google fontSize="small" />
              Continuer avec Google
            </button>
          </div>

          <div className="auth-separator">ou</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-label-row">
                <label htmlFor="login-password">Mot de passe</label>
                <Link className="auth-link" to="/forgot-password">Oublie ?</Link>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <IconButton
                  className="auth-eye-button"
                  size="small"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Se connecter'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
