import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';
import LoadingPage from '../LoadingPage';
import { fetchProjects } from '../../api/projectsApi';

const homeForRole = (role: Role) => (role === 'ROLE_ADMIN' ? '/admin' : '/dashboard');
const homeAfterAuth = async (role: Role) => {
  if (role === 'ROLE_ADMIN') return '/admin';
  try {
    const projects = await fetchProjects();
    return projects.length > 0 ? '/dashboard' : '/';
  } catch {
    return homeForRole(role);
  }
};

const OAuthRedirectPage = () => {
  const navigate = useNavigate();
  const { setAuth, token, user } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken') ?? undefined;
    const userId = Number(params.get('userId'));
    const email = params.get('email');
    const role = params.get('role') as Role | null;
    const firstName = params.get('prenom') ?? '';
    const lastName = params.get('nom') ?? '';
    const avatarUrl = params.get('avatarUrl');

    if (!accessToken || !email || !role || Number.isNaN(userId)) {
      if (token && user) {
        navigate(homeForRole(user.role), { replace: true });
        return;
      }
      navigate('/login?oauthError=missing_token', { replace: true });
      return;
    }

    setAuth(accessToken, {
      id: userId,
      email,
      role,
      firstName,
      lastName,
      avatarUrl,
    }, refreshToken);

    void homeAfterAuth(role).then((path) => navigate(path, { replace: true }));
  }, [navigate, setAuth, token, user]);

  return <LoadingPage message="Finalisation de votre session AgileFlow..." />;
};

export default OAuthRedirectPage;
