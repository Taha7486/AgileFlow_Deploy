import React, { useEffect, useRef, useState } from 'react';
import { Alert, CircularProgress, IconButton } from '@mui/material';
import {
  Cancel,
  CheckCircle,
  GitHub,
  Google,
  Refresh,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { ArrowRight, CheckCircle2, Lock, Mail, User, Users } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/axiosInterceptor';
import { validateInvitationToken } from '../../api/invitationApi';
import { fetchProjects } from '../../api/projectsApi';
import { useAuth } from '../../context/AuthContext';
import { passwordMeetsPolicy, PASSWORD_REQUIREMENTS_TEXT } from '../../utils/passwordPolicy';
import './AuthPages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const OAUTH_BASE_URL = API_URL.replace(/\/api\/?$/, '');
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const homeAfterAuth = async (role: string) => {
  if (role === 'ROLE_ADMIN') return '/admin';
  try {
    const projects = await fetchProjects();
    return projects.length > 0 ? '/dashboard' : '/';
  } catch {
    return '/dashboard';
  }
};

const passwordColor = (strength: number) => {
  if (strength === 1) return '#ef4444';
  if (strength === 2) return '#f59e0b';
  if (strength === 3) return '#2563eb';
  if (strength >= 4) return '#16a34a';
  return '#e2e8f0';
};

const RegisterPage = () => {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [invitationProjectName, setInvitationProjectName] = useState('');
  const [invitationLoading, setInvitationLoading] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const invitationEmail = searchParams.get('email');
  const { setAuth } = useAuth();

  useEffect(() => {
    if (!invitationToken) return;

    if (invitationEmail) {
      setForm((current) => ({ ...current, email: invitationEmail }));
    }

    const validateInvitation = async () => {
      setInvitationLoading(true);
      setError('');
      try {
        const invitation = await validateInvitationToken(invitationToken);
        setInvitationProjectName(invitation.projectName);
        setForm((current) => ({ ...current, email: invitation.email }));
        setEmailError('');
      } catch (err: any) {
        setError(err.response?.data?.message || "Lien d'invitation invalide ou expire.");
      } finally {
        setInvitationLoading(false);
      }
    };

    void validateInvitation();
  }, [invitationEmail, invitationToken]);

  useEffect(() => {
    if (otpSent) return;
    if (invitationToken) return;

    const checkEmail = async () => {
      if (!form.email) {
        setEmailError('');
        return;
      }
      if (!emailRegex.test(form.email)) {
        setEmailError("Format d'email invalide.");
        return;
      }

      const domain = form.email.split('@')[1]?.toLowerCase();
      const typos = ['gail.co', 'gml.co', 'gmail.co', 'gmal.com', 'gamil.com', 'gmil.com'];
      if (typos.includes(domain)) {
        setEmailError('Domaine invalide. Voulez-vous dire gmail.com ?');
        return;
      }

      setCheckingEmail(true);
      try {
        const { data } = await api.get(`/auth/check-email?email=${encodeURIComponent(form.email)}`);
        setEmailError(data.available ? '' : 'Cet email est deja utilise.');
      } catch (err) {
        console.error("Erreur de validation de l'email.", err);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [form.email, invitationToken, otpSent]);

  const evaluatePassword = (pass: string) => {
    let score = 0;
    if (!pass) {
      setPasswordStrength(0);
      return;
    }
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    setPasswordStrength(Math.min(4, score));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    if (e.target.name === 'password') {
      evaluatePassword(e.target.value);
    }
  };

  const getPwdLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Faible';
    if (passwordStrength === 2) return 'Moyen';
    if (passwordStrength === 3) return 'Bon';
    return 'Fort';
  };

  const validate = () => {
    if (emailError) return "Veuillez corriger l'adresse email.";
    if (!emailRegex.test(form.email)) return "Format d'email invalide.";
    if (!passwordMeetsPolicy(form.password)) return PASSWORD_REQUIREMENTS_TEXT;
    if (form.password !== form.confirm) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        password: form.password,
        invitationToken,
      });
      setOtpSent(true);
      setOtp('');
      setSuccess(data.message || 'Un code OTP a ete envoye a votre email.');
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', {
        email: form.email,
        otp,
      });
      setAuth(data.accessToken, {
        id: data.userId,
        email: data.email,
        role: data.role,
        firstName: data.prenom ?? form.prenom,
        lastName: data.nom ?? form.nom,
        avatarUrl: data.avatarUrl ?? null,
      }, data.refreshToken);
      navigate(await homeAfterAuth(data.role), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code OTP incorrect ou expire.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);
    try {
      const { data } = await api.post('/auth/resend-verification', { email: form.email });
      setSuccess(data.message || 'Un nouveau code OTP a ete envoye.');
      setOtp('');
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de renvoyer le code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    window.location.href = `${OAUTH_BASE_URL}/oauth2/authorization/${provider}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = otp.split('');
    next[index] = digit;
    const joined = Array.from({ length: 6 }, (_, idx) => next[idx] ?? '').join('');
    setOtp(joined);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const renderRegisterForm = () => (
    <>
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
        <div className="auth-grid-2">
          <div className="auth-field">
            <label htmlFor="register-prenom">Prenom</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><User size={16} /></span>
              <input id="register-prenom" name="prenom" value={form.prenom} onChange={handleChange} placeholder="Alice" required />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="register-nom">Nom</label>
            <input id="register-nom" name="nom" value={form.nom} onChange={handleChange} placeholder="Martin" required />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="register-email">Email</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Mail size={16} /></span>
            <input
              id="register-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="vous@exemple.com"
              disabled={Boolean(invitationToken)}
              autoComplete="email"
              required
            />
            <span className="auth-inline-state">
              {checkingEmail && <CircularProgress size={18} />}
              {!checkingEmail && emailError && <Cancel color="error" fontSize="small" />}
              {!checkingEmail && !emailError && form.email && emailRegex.test(form.email) && <CheckCircle color="success" fontSize="small" />}
            </span>
          </div>
          {(emailError || invitationToken) && (
            <p className={`auth-helper ${emailError ? 'error' : ''}`}>
              {emailError || 'Adresse imposee par le lien invitation.'}
            </p>
          )}
        </div>

        <div className="auth-field">
          <label htmlFor="register-password">Mot de passe</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Lock size={16} /></span>
            <input
              id="register-password"
              name="password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="Votre mot de passe"
              autoComplete="new-password"
              required
            />
            <IconButton className="auth-eye-button" size="small" onClick={() => setShowPass((current) => !current)}>
              {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </div>
          {form.password && (
            <div className="auth-password-meter">
              <div className="auth-meter-bars">
                {[1, 2, 3, 4].map((idx) => (
                  <span key={idx} style={{ background: passwordStrength >= idx ? passwordColor(passwordStrength) : '#e2e8f0' }} />
                ))}
              </div>
              <div className="auth-meter-label" style={{ color: passwordColor(passwordStrength) }}>{getPwdLabel()}</div>
            </div>
          )}
        </div>

        <div className="auth-field">
          <label htmlFor="register-confirm">Confirmer le mot de passe</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Lock size={16} /></span>
            <input
              id="register-confirm"
              name="confirm"
              type={showConfirmPass ? 'text' : 'password'}
              value={form.confirm}
              onChange={handleChange}
              placeholder="Confirmez le mot de passe"
              autoComplete="new-password"
              required
            />
            <IconButton className="auth-eye-button" size="small" onClick={() => setShowConfirmPass((current) => !current)}>
              {showConfirmPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </div>
          {form.confirm.length > 0 && form.password !== form.confirm && (
            <p className="auth-helper error">Les mots de passe ne correspondent pas.</p>
          )}
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || invitationLoading || checkingEmail || !!emailError || !passwordMeetsPolicy(form.password) || form.password !== form.confirm}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Creer mon compte'}
        </button>
      </form>
    </>
  );

  const renderOtpForm = () => (
    <form className="auth-form auth-otp-card" onSubmit={handleVerify}>
      <div className="auth-otp-logo">
        <img src="/agileflow-icon.png" alt="AgileFlow" className="auth-logo-sm" />
      </div>
      <p className="auth-helper" style={{ marginTop: 0 }}>
        Code envoye a {form.email}
      </p>
      <div className="auth-otp-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            ref={(node) => { otpRefs.current[index] = node; }}
            value={otp[index] ?? ''}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              setOtp(pasted);
              otpRefs.current[Math.min(pasted.length, 5)]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Chiffre OTP ${index + 1}`}
          />
        ))}
      </div>
      <button type="submit" className="auth-submit" disabled={loading || otp.length !== 6}>
        {loading ? <CircularProgress size={20} color="inherit" /> : 'Verifier'}
      </button>
      <button type="button" className="auth-secondary-action" disabled={resendLoading} onClick={handleResend}>
        {resendLoading ? <CircularProgress size={18} /> : <Refresh fontSize="small" />} Renvoyer le code
      </button>
      <button
        type="button"
        className="auth-secondary-action"
        onClick={() => {
          setOtpSent(false);
          setOtp('');
          setSuccess('');
          setError('');
        }}
      >
        Modifier l'email
      </button>
    </form>
  );

  return (
    <main className="auth-shell auth-register">
      <section className="auth-panel-light">
        <div className="auth-card auth-card-wide">
          <Link className="auth-home-link" to="/">Retour a l'accueil</Link>
          <div className="auth-card-header">
            <h2>{otpSent ? 'Verifiez votre email' : 'Creer un compte'}</h2>
            <p>
              {otpSent ? 'Validation par code OTP' : (
                <>Deja inscrit ? <Link to="/login">Se connecter</Link></>
              )}
            </p>
          </div>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {invitationProjectName && <Alert severity="info" sx={{ mb: 2 }}>Vous rejoignez le projet {invitationProjectName}.</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {otpSent ? renderOtpForm() : renderRegisterForm()}

          {!otpSent && (
            <div className="auth-footer-link">
              Vous avez deja un compte ? <Link className="auth-link" to="/login">Se connecter</Link>
            </div>
          )}
        </div>
      </section>

      <section className="auth-panel-dark">
        <div className="auth-dark-content">
          <div className="auth-brand-block">
            <img src="/agileflow-icon.png" alt="AgileFlow" className="auth-logo" />
          </div>

          <h2>Lancez votre espace AgileFlow</h2>
          <p>Creer un compte, configurer un projet, inviter l'equipe et livrer avec un workflow clair.</p>

          <div className="auth-steps">
            {[
              { label: 'Creer un compte', icon: CheckCircle2, active: true },
              { label: 'Creer votre premier projet', icon: ArrowRight },
              { label: 'Inviter votre equipe', icon: Users },
              { label: 'Commencer a collaborer', icon: ArrowRight },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className={`auth-step ${step.active ? 'active' : ''}`}>
                  <span className="auth-step-marker">{step.active ? <Icon size={16} /> : index + 1}</span>
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>

          
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;
