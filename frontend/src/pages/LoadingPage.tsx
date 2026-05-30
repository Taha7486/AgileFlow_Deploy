import './auth/AuthPages.css';

interface LoadingPageProps {
  compact?: boolean;
  message?: string;
}

const LoadingPage = ({ compact = false, message = 'Chargement de votre espace de travail...' }: LoadingPageProps) => {
  return (
    <div className={`auth-loading-page ${compact ? 'compact' : ''}`}>
      <div className="auth-loading-content">
        <img src="/agileflow-icon.png" alt="AgileFlow" className="auth-loading-logo" />
        <div className="auth-loading-title">AgileFlow</div>
        <p>{message}</p>

        <div className="auth-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="auth-loading-project">
          <img src="/agileflow-icon.png" alt="" className="auth-logo-sm" />
          <div>
            <strong>Workspace AgileFlow</strong>
            <span>Acces en cours...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
