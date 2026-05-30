import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type RefObject,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { ChatBubbleOutline } from '@mui/icons-material';
import {
  ArrowRight,
  Calendar,
  Check,
  Columns3,
  List,
  Share2,
  Users,
} from 'lucide-react';
import { connectGitHub } from '../api/github';
import { createProject, fetchProjects, inviteProjectMember } from '../api/projectsApi';
import { fetchTeams } from '../api/teamsApi';
import ChatPanel from '../components/chat/ChatPanel';
import NotificationBell from '../components/notifications/NotificationBell';
import ProfileMenuButton from '../components/profile/ProfileMenuButton';
import CreateProjectModal, { type ProjectCreationOptions } from '../components/projects/CreateProjectModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import { useCurrentRoleBadge } from '../hooks/useCurrentRoleBadge';
import { useActiveProjectStore } from '../store/activeProjectStore';
import type { CreateProjectPayload, TeamListItem } from '../types';
import './LandingPage.css';

type LogoVariant = 'full' | 'icon' | 'white' | 'small';

interface AgileFlowLogoProps {
  variant?: LogoVariant;
  size?: number;
}

const AgileFlowLogo = ({ variant = 'full', size }: AgileFlowLogoProps) => {
  const className = [
    'landing-logo-image',
    variant === 'full' ? 'landing-logo-full' : '',
    variant === 'icon' ? 'landing-logo-icon' : '',
    variant === 'small' ? 'landing-logo-small' : '',
    variant === 'white' ? 'landing-logo-white' : '',
  ].filter(Boolean).join(' ');

  const fallbackSize = variant === 'full' ? 390 : variant === 'small' ? 32 : 40;

  return (
    <img
      src="/agileflow-icon.png"
      alt="AgileFlow"
      className={className}
      style={{ width: size ?? fallbackSize, height: size ?? fallbackSize }}
    />
  );
};

const useInView = <T extends HTMLElement>(threshold = 0.1): [RefObject<T>, boolean] => {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};

type RevealSectionProps = ComponentPropsWithoutRef<'section'> & {
  children: ReactNode;
};

const RevealSection = ({ children, className = '', ...props }: RevealSectionProps) => {
  const [ref, visible] = useInView<HTMLElement>();
  return (
    <section ref={ref} className={`${className} landing-reveal ${visible ? 'is-visible' : ''}`} {...props}>
      {children}
    </section>
  );
};

const GitHubMark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const features = [
  {
    icon: List,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    title: 'Planification en liste',
    desc: 'Vue Jira-style avec edition inline et groupement par epic.',
  },
  {
    icon: Columns3,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    title: 'Tableau Kanban temps reel',
    desc: 'Drag & drop fluide. WebSocket pour mises a jour instantanees.',
  },
  {
    icon: Calendar,
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    title: 'Chronologie Gantt',
    desc: 'Visualisez epics et taches dans le temps. Dependances automatiques.',
  },
  {
    icon: GitHubMark,
    iconBg: '#f8fafc',
    iconColor: '#374151',
    title: 'Integration GitHub',
    desc: 'Issues, PR et commits lies directement a vos taches.',
    badge: 'Nouveau',
  },
  {
    icon: Share2,
    iconBg: '#f5f3ff',
    iconColor: '#7c3aed',
    title: 'Diagrammes collaboratifs',
    desc: 'UML, sequence, BPMN - edition multi-utilisateurs temps reel.',
  },
  {
    icon: Users,
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    title: 'Gestion des equipes',
    desc: 'Invitations, roles projet, stats et suivi de charge.',
  },
];

const transitions = [
  'Issues GitHub -> taches AgileFlow automatiquement',
  'Branche creee -> tache passe en IN_PROGRESS',
  'PR ouverte -> tache passe en REVIEW',
  'PR mergee -> tache passe en DONE',
];

const webhookPayload = `{
  "event": "pull_request",
  "action": "closed",
  "merged": true,
  "pull_request": {
    "title": "Fix auth KAN-42",
    "number": 42
  }
}`;

const LandingPage = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);
  const [scrolled, setScrolled] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [hasProjects, setHasProjects] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const { totalUnreadCount } = useChat({ isMonitor: true, projectNames: {}, contactNames: {} });
  const roleInfo = useCurrentRoleBadge();

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'ROLE_ADMIN';

  const openDemoVideo = () => setVideoOpen(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setHasProjects(false);
      return undefined;
    }
    void fetchProjects()
      .then((projects) => {
        if (active) setHasProjects(projects.length > 0);
      })
      .catch(() => {
        if (active) setHasProjects(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const openProjectModal = async () => {
    if (isAdmin) {
      navigate('/admin');
      return;
    }
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    try {
      setTeams(await fetchTeams());
    } catch {
      setTeams([]);
    }
    setProjectModalOpen(true);
  };

  const handleCreateProject = async (payload: CreateProjectPayload, options?: ProjectCreationOptions) => {
    setProjectSaving(true);
    try {
      const project = await createProject(payload);
      if (options?.invitedEmails.length) {
        await Promise.all(options.invitedEmails.map((email) => inviteProjectMember(project.id, { email })));
      }
      if (options?.githubConnection) {
        await connectGitHub(project.id, options.githubConnection);
      }
      setActiveProject(project);
      setHasProjects(true);
      setProjectModalOpen(false);
      navigate(`/projects/${project.id}/summary`, { replace: true });
    } finally {
      setProjectSaving(false);
    }
  };

  const handleProjectCta = () => {
    if (isAdmin) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      void openProjectModal();
    } else {
      navigate('/register');
    }
  };

  const handleGitHubCta = () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    if (hasProjects) {
      navigate('/development');
      return;
    }
    if (isAdmin) {
      navigate('/admin');
      return;
    }
    void openProjectModal();
  };

  return (
    <div className="landing-page">
      <nav className={`landing-navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-container landing-nav-inner">
          <div className="landing-brand">
            <AgileFlowLogo variant="icon" size={40} />
            <span className="landing-gradient-text">AgileFlow</span>
          </div>

          <div className="landing-nav-links">
            
          </div>

          <div className="landing-nav-actions">
            {isAuthenticated ? (
              <>
                {hasProjects && (
                  <button type="button" className="landing-button landing-button-secondary" onClick={() => navigate('/dashboard')}>
                    Ouvrir AgileFlow
                  </button>
                )}
                {!isAdmin && (
                  <button type="button" className="landing-button landing-button-primary" onClick={openProjectModal}>
                    Creer un projet
                  </button>
                )}
                <div className="landing-user-tools">
                  <span className="landing-presence-pill">
                    <span />
                    En ligne
                  </span>
                  <NotificationBell />
                  <Tooltip title="Messages">
                    <IconButton onClick={() => setChatOpen(true)} size="small" sx={{ color: 'text.secondary' }}>
                      <Badge badgeContent={totalUnreadCount} color="error">
                        <ChatBubbleOutline fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <ProfileMenuButton />
                  {roleInfo.label && (
                    <Tooltip title={roleInfo.title}>
                      <span className="landing-role-pill">{roleInfo.label}</span>
                    </Tooltip>
                  )}
                </div>
              </>
            ) : (
              <>
                <button type="button" className="landing-button landing-button-secondary" onClick={() => navigate('/login')}>
                  Se connecter
                </button>
                <button type="button" className="landing-button landing-button-primary" onClick={() => navigate('/register')}>
                  Commencer gratuitement
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-dot-grid" />
        <div className="landing-container landing-hero-grid">
          <div>
            <div className="landing-badge">Kanban - Gantt - GitHub - Diagrammes</div>
            <h1>
              La plateforme <span className="landing-gradient-text">Agile</span> de votre equipe.
            </h1>
            <p className="landing-hero-copy">
              Planification, Kanban, Chronologie Gantt, diagrammes collaboratifs et GitHub reunis en une seule plateforme.
            </p>
            <div className="landing-cta-row">
              {!isAdmin && (
                <button type="button" className="landing-button landing-button-primary" onClick={handleProjectCta}>
                  Creer un projet gratuitement <ArrowRight size={16} />
                </button>
              )}
              <button type="button" className="landing-button landing-button-secondary" onClick={openDemoVideo}>
                Voir une demo
              </button>
            </div>
            <div className="landing-proof">
              <div className="landing-avatars">
                {[
                  { bg: '#2563eb', initials: 'AR' },
                  { bg: '#16a34a', initials: 'ML' },
                  { bg: '#7c3aed', initials: 'TC' },
                ].map((avatar) => (
                  <div key={avatar.initials} className="landing-avatar" style={{ background: avatar.bg }}>{avatar.initials}</div>
                ))}
              </div>
              <span>Rejoint par <strong>+500 equipes</strong></span>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-glow" />
            <div className="landing-logo-orbit">
              <AgileFlowLogo variant="full" />
              <div className="landing-floating-card top animate-float-slow">
                <span className="landing-status-dot" />
                <strong>6 taches terminees</strong>
                <span>aujourd'hui</span>
              </div>
              <div className="landing-floating-card left animate-float-medium">
                <GitHubMark size={17} />
                <strong>GitHub connecte</strong>
                <span className="landing-status-dot" />
                <span style={{ color: '#16a34a', fontSize: 12 }}>En ligne</span>
              </div>
              <div className="landing-floating-card right animate-float-delay">
                <div className="landing-pr-row">
                  <span className="landing-pill-blue">PR #8</span>
                  <ArrowRight size={13} />
                  <span className="landing-pill-green">DONE</span>
                </div>
                <span style={{ color: '#6b7280' }}>Merge automatique detecte</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    

      <RevealSection className="landing-section" id="fonctionnalites">
        <div className="landing-container">
          <div className="landing-section-heading">
            <p className="landing-eyebrow landing-gradient-text">FONCTIONNALITES</p>
            <h2>Tout ce dont votre equipe a besoin</h2>
            <p>Une plateforme unifiee pour planifier, collaborer et livrer.</p>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="landing-feature-card">
                  {feature.badge && <span className="landing-new-badge">{feature.badge}</span>}
                  <div className="landing-feature-icon" style={{ background: feature.iconBg, color: feature.iconColor }}>
                    <Icon size={22} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="landing-section landing-spotlight" id="github">
        <div className="landing-container landing-spotlight-grid">
          <div>
            <div className="landing-badge"><GitHubMark size={15} /> Integration GitHub</div>
            <h2>Votre code et vos taches, connectes.</h2>
            <div className="landing-check-list">
              {transitions.map((item) => (
                <div key={item} className="landing-check-item">
                  <span className="landing-check"><Check size={14} /></span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <button type="button" className="landing-button landing-button-secondary" onClick={handleGitHubCta}>
              Connecter GitHub <ArrowRight size={16} />
            </button>
          </div>
          <div className="landing-code-card">
            <div className="landing-code-head">webhook payload</div>
            <div className="landing-code-body">
              <pre>{webhookPayload}</pre>
              <div className="landing-task-card">
                <div className="landing-task-title">
                  <span className="landing-pill-blue">KAN-42</span>
                  <strong>Fix auth</strong>
                </div>
                <span className="landing-pill-green">DONE</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', margin: '18px 0 0' }}>
                Prefixe configurable : KAN, GRF, PROJ...
              </p>
            </div>
          </div>
        </div>
      </RevealSection>

      <section className="landing-cta">
        <div className="landing-watermark"><AgileFlowLogo variant="white" size={190} /></div>
        <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
          <h2>Pret a accelerer votre equipe ?</h2>
          <p>Creez votre premier projet en moins de 2 minutes.</p>
          <div className="landing-cta-row" style={{ justifyContent: 'center', marginBottom: 18 }}>
            {!isAdmin && (
              <button type="button" className="landing-button landing-button-white" onClick={handleProjectCta}>
                <span className="landing-gradient-text">Commencer gratuitement</span>
              </button>
            )}
            <button type="button" className="landing-button landing-button-outline-white" onClick={openDemoVideo}>
              Voir la demo
            </button>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.68)', margin: 0 }}>Aucune carte bancaire requise</p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-copyright">Copyright 2026 AgileFlow. Tous droits reserves.</div>
        </div>
      </footer>
      <CreateProjectModal
        open={projectModalOpen}
        saving={projectSaving}
        teams={teams}
        onClose={() => {
          if (!projectSaving) setProjectModalOpen(false);
        }}
        onSubmit={handleCreateProject}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      {videoOpen && (
        <div className="landing-video-overlay" role="dialog" aria-modal="true" aria-label="Video demo AgileFlow">
          <button type="button" className="landing-video-backdrop" aria-label="Fermer la video" onClick={() => setVideoOpen(false)} />
          <div className="landing-video-panel">
            <div className="landing-video-header">
              <div>
                <h3>Demo AgileFlow</h3>
                <p>Decouvrez les principaux flux de la plateforme.</p>
              </div>
              <button type="button" className="landing-video-close" aria-label="Fermer la video" onClick={() => setVideoOpen(false)}>
                x
              </button>
            </div>
            <video className="landing-video-player" src="/Demo_AgileFlow.mp4" controls autoPlay />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
