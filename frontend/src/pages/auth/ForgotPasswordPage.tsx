import React, { useEffect, useState } from 'react';
import { Alert, CircularProgress, IconButton } from '@mui/material';
import { Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/axiosInterceptor';
import {
  getPasswordChecks,
  PASSWORD_REQUIREMENTS_TEXT,
  passwordMeetsPolicy,
  passwordStrengthLabel,
} from '../../utils/passwordPolicy';
import './AuthPages.css';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type Step = 'email' | 'otp' | 'password';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const checks = getPasswordChecks(newPassword);
  const strength = passwordStrengthLabel(newPassword);
  const resetDone = success.includes('reinitialise');

  useEffect(() => {
    if (step !== 'password' || !resetDone) return;
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    return () => window.clearTimeout(timer);
  }, [step, resetDone, navigate]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailRegex.test(email.trim())) {
      setError("Format d'email invalide.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setStep('otp');
      setOtp('');
      setSuccess(data.message || 'Un code a ete envoye a votre adresse email.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Impossible d'envoyer le code pour le moment.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResendLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password/resend', { email: email.trim() });
      setSuccess(data.message || 'Un nouveau code a ete envoye.');
      setOtp('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Impossible de renvoyer le code.";
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otp.length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email: email.trim(), otp });
      setStep('password');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(data.message || 'Code verifie. Definissez votre nouveau mot de passe.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Code incorrect ou expire.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordMeetsPolicy(newPassword)) {
      setError(PASSWORD_REQUIREMENTS_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.trim(),
        newPassword,
        confirmPassword,
      });
      setSuccess(data.message || 'Mot de passe reinitialise avec succes.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Impossible de reinitialiser le mot de passe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetToEmail = () => {
    setStep('email');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const title =
    step === 'email'
      ? 'Mot de passe oublie'
      : step === 'otp'
        ? 'Verifier le code'
        : 'Nouveau mot de passe';

  const subtitle =
    step === 'email'
      ? 'Recevez un code par email pour reinitialiser votre acces.'
      : step === 'otp'
        ? `Code envoye a ${email}`
        : resetDone
          ? 'Redirection vers la connexion...'
          : 'Choisissez un nouveau mot de passe securise.';

  const renderEmailStep = () => (
    <form className="auth-form" onSubmit={handleRequestCode}>
      <div className="auth-field">
        <label htmlFor="forgot-email">Adresse email</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><Mail size={16} /></span>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
          />
        </div>
        <p className="auth-helper">Nous vous enverrons un code a 6 chiffres valide 10 minutes.</p>
      </div>

      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? <CircularProgress size={20} color="inherit" /> : 'Envoyer le code'}
      </button>
    </form>
  );

  const renderOtpStep = () => (
    <form className="auth-form" onSubmit={handleVerifyOtp}>
      <div className="auth-field">
        <label htmlFor="forgot-otp">Code recu par email</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><KeyRound size={16} /></span>
          <input
            id="forgot-otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            required
          />
        </div>
        <p className="auth-helper">Code a 6 chiffres.</p>
      </div>

      <button type="submit" className="auth-submit" disabled={loading || otp.length !== 6}>
        {loading ? <CircularProgress size={20} color="inherit" /> : 'Verifier le code'}
      </button>
      <button type="button" className="auth-secondary-action" disabled={resendLoading} onClick={handleResend}>
        {resendLoading ? <CircularProgress size={18} /> : <Refresh fontSize="small" />} Renvoyer le code
      </button>
      <button type="button" className="auth-secondary-action" onClick={resetToEmail}>
        Changer d'email
      </button>
    </form>
  );

  const renderPasswordStep = () => (
    <form className="auth-form" onSubmit={handleReset}>
      <div className="auth-field">
        <label htmlFor="forgot-new-password">Nouveau mot de passe</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><Lock size={16} /></span>
          <input
            id="forgot-new-password"
            type={showPass ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Votre nouveau mot de passe"
            autoComplete="new-password"
            required
          />
          <IconButton className="auth-eye-button" size="small" onClick={() => setShowPass((current) => !current)}>
            {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
        </div>
        <p className="auth-helper">{PASSWORD_REQUIREMENTS_TEXT}</p>
        {newPassword && (
          <p className={`auth-helper ${passwordMeetsPolicy(newPassword) ? '' : 'error'}`}>
            Force : {strength} - {[checks.length && '8+ car.', checks.upper && 'majuscule', checks.lower && 'minuscule', checks.digit && 'chiffre', checks.special && 'special'].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      <div className="auth-field">
        <label htmlFor="forgot-confirm-password">Confirmer le mot de passe</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><Lock size={16} /></span>
          <input
            id="forgot-confirm-password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmez le mot de passe"
            autoComplete="new-password"
            required
          />
          <IconButton className="auth-eye-button" size="small" onClick={() => setShowConfirm((current) => !current)}>
            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
        </div>
        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
          <p className="auth-helper error">Les mots de passe ne correspondent pas.</p>
        )}
      </div>

      <button
        type="submit"
        className="auth-submit"
        disabled={loading || resetDone || !passwordMeetsPolicy(newPassword) || newPassword !== confirmPassword}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : 'Reinitialiser le mot de passe'}
      </button>
    </form>
  );

  return (
    <main className="auth-shell auth-forgot">
      <section className="auth-panel-dark">
        <div className="auth-dark-content">
          <div className="auth-brand-block">
            <img src="/agileflow-icon.png" alt="AgileFlow" className="auth-logo" />
            <span className="auth-brand-name">AgileFlow</span>
          </div>

          <h1>Recuperez votre acces</h1>
          <p>Un parcours securise en trois etapes pour verifier votre email et definir un nouveau mot de passe.</p>

          <div className="auth-steps">
            {['Email', 'Code OTP', 'Nouveau mot de passe'].map((label, index) => {
              const activeIndex = step === 'email' ? 0 : step === 'otp' ? 1 : 2;
              return (
                <div key={label} className={`auth-step ${index <= activeIndex ? 'active' : ''}`}>
                  <span className="auth-step-marker">{index + 1}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="auth-panel-light">
        <div className="auth-card">
          <Link className="auth-home-link" to="/">Retour a l'accueil</Link>
          <div className="auth-card-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity={resetDone ? 'success' : 'info'} sx={{ mb: 2 }}>{success}</Alert>}

          {step === 'email' && renderEmailStep()}
          {step === 'otp' && renderOtpStep()}
          {step === 'password' && !resetDone && renderPasswordStep()}

          <div className="auth-footer-link">
            <Link className="auth-link" to="/login">Retour a la connexion</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
