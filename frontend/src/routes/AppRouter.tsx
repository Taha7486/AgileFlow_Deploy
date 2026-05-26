import { lazy, Suspense, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useActiveProject } from '../hooks/useActiveProject';
import LoginPage from '../pages/auth/LoginPage';
import OAuthRedirectPage from '../pages/auth/OAuthRedirectPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ProjectInvitePage from '../pages/auth/ProjectInvitePage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsListPage from '../pages/projects/ProjectsListPage';
import TeamsPage from '../pages/teams/TeamsPage';
import TeamDetailsPage from '../pages/teams/TeamDetailsPage';
import UserProfilePage from '../pages/users/UserProfilePage';
import UsersListPage from '../pages/users/UsersListPage';
import BacklogPage from '../pages/backlog/BacklogPage';
import KanbanBoard from '../pages/kanban/KanbanBoard';
import ProfileLayout from '../components/profile/ProfileLayout';
import ProfileAccountTab from '../pages/profile/ProfileAccountTab';
import ProfileNotificationsTab from '../pages/profile/ProfileNotificationsTab';
import ProfilePresenceTab from '../pages/profile/ProfilePresenceTab';
import AdminPage from '../pages/admin/AdminPage';
import ActivityLogsPage from '../pages/admin/ActivityLogsPage';
import NotifCenter from '../pages/notifications/NotifCenter';

const AnalyticsDashboard = lazy(() => import('../pages/analytics/AnalyticsDashboard'));
const StatsPage = lazy(() => import('../pages/stats/StatsPage'));
const DiagramListPage = lazy(() => import('../pages/DiagramFlow/DiagramListPage'));
const DiagramEditorPage = lazy(() => import('../pages/DiagramFlow/DiagramEditorPage'));
const PlanningPage = lazy(() => import('../pages/planning/PlanningPage'));
const TimelinePage = lazy(() => import('../pages/timeline/TimelinePage'));
const ProjectSummaryPage = lazy(() => import('../pages/projects/summary/ProjectSummaryPage'));

const LazyPage = ({ children }: { children: ReactNode }) => (
  <Suspense
    fallback={
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    }
  >
    {children}
  </Suspense>
);

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <AppLayout />;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProjectHomeRedirect = () => {
  const { activeProject, isLoading } = useActiveProject();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (activeProject) {
    return <Navigate to={`/projects/${activeProject.id}/summary`} replace />;
  }

  return <DashboardPage />;
};

const UnauthorizedPage = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 24 }}>
    Acces refuse
  </div>
);

const AppRouter = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth2/redirect" element={<OAuthRedirectPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/project-invite" element={<ProjectInvitePage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route index element={<ProjectHomeRedirect />} />
        <Route path="/dashboard" element={<ProjectHomeRedirect />} />
        <Route path="/analytics" element={<LazyPage><AnalyticsDashboard /></LazyPage>} />
        <Route path="/stats" element={<LazyPage><StatsPage /></LazyPage>} />
        <Route path="/diagrams" element={<LazyPage><DiagramListPage /></LazyPage>} />
        <Route path="/diagrams/:id" element={<LazyPage><DiagramEditorPage /></LazyPage>} />
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/:projectId/summary" element={<LazyPage><ProjectSummaryPage /></LazyPage>} />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <UsersListPage />
            </AdminRoute>
          }
        />
        <Route path="/users/:id" element={<UserProfilePage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamDetailsPage />} />
        <Route path="/planning" element={<LazyPage><PlanningPage /></LazyPage>} />
        <Route path="/timeline" element={<LazyPage><TimelinePage /></LazyPage>} />
        <Route path="/backlog" element={<BacklogPage />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/profile" element={<ProfileLayout />}>
          <Route index element={<Navigate to="/profile/account" replace />} />
          <Route path="account" element={<ProfileAccountTab />} />
          <Route path="notifications" element={<ProfileNotificationsTab />} />
          <Route path="presence" element={<ProfilePresenceTab />} />
        </Route>
        <Route path="/settings" element={<Navigate to="/profile/notifications" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/activity-logs" element={<ActivityLogsPage />} />
        <Route path="/notifications" element={<NotifCenter />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
