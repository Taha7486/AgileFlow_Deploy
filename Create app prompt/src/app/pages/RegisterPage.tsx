import { Link } from "react-router";
import { Logo } from "../components/Logo";
import { Mail, Lock, Eye, User, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [password, setPassword] = useState("");

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: "" };
    if (password.length < 6) return { strength: 1, label: "Faible", color: "#EF4444" };
    if (password.length < 10) return { strength: 2, label: "Moyen", color: "#F59E0B" };
    if (password.length < 14) return { strength: 3, label: "Bon", color: "#84CC16" };
    return { strength: 4, label: "Fort", color: "#16A34A" };
  };

  const passwordStrength = getPasswordStrength();

  if (showOTP) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-16">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-10 w-full max-w-[480px] text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="gradient" size={48} />
          </div>

          <h2 className="text-xl font-bold text-[#111827] mb-2">Vérifiez votre email 📬</h2>
          <p className="text-sm text-[#6B7280] mb-8">Code envoyé à alice@exemple.com</p>

          <div className="flex gap-2 justify-center mb-6">
            {[...Array(6)].map((_, i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                className="w-12 h-14 text-center text-lg font-bold border border-[#E2E8F0] rounded-md focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 bg-[#EFF6FF]"
              />
            ))}
          </div>

          <p className="text-[13px] text-[#9CA3AF] mb-6">Renvoyer le code (59s)</p>

          <button
            className="w-full h-11 text-white rounded-md hover:opacity-90 transition-opacity"
            style={{ background: 'var(--gradient-brand)' }}
          >
            Vérifier →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* Left Panel - Form */}
      <div className="bg-[#F8F9FA] flex items-center justify-center p-16">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-10 w-full max-w-[480px]">
          <h2 className="text-[22px] font-bold text-[#111827] mb-2">Créer un compte</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-[#2563EB] hover:underline">
              Se connecter →
            </Link>
          </p>

          <div className="space-y-2 mb-6">
            <button className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-[#E2E8F0] text-[#374151] rounded-md hover:bg-[#F9FAFB] transition-colors">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" />
              </svg>
              Continuer avec GitHub
            </button>

            <button className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-[#E2E8F0] text-[#374151] rounded-md hover:bg-[#F9FAFB] transition-colors">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" fill="#4285F4"/>
                <path d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z" fill="#34A853"/>
                <path d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z" fill="#FBBC05"/>
                <path d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#E2E8F0]"></div>
            <span className="text-[13px] text-[#9CA3AF]">— ou —</span>
            <div className="flex-1 h-px bg-[#E2E8F0]"></div>
          </div>

          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">Prénom</label>
                <input
                  type="text"
                  placeholder="Alice"
                  className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">Nom</label>
                <input
                  type="text"
                  placeholder="Martin"
                  className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
                >
                  <Eye size={16} />
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1 mb-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i < passwordStrength.strength ? passwordStrength.color : '#E2E8F0'
                        }}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-right" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" className="w-4 h-4 mt-0.5 rounded border-[#E2E8F0]" />
              <label htmlFor="terms" className="text-[13px] text-[#374151]">
                J'accepte les{" "}
                <a href="#" className="text-[#2563EB] hover:underline">conditions d'utilisation</a>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowOTP(true)}
              className="w-full h-11 text-white rounded-md hover:opacity-90 transition-opacity"
              style={{ background: 'var(--gradient-brand)' }}
            >
              Créer mon compte →
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Onboarding Steps */}
      <div
        className="relative flex flex-col items-center justify-center p-16"
        style={{
          background: 'linear-gradient(160deg, #0F1624 0%, #1A1F2E 60%, #1E1535 100%)'
        }}
      >
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-12">
            <Logo variant="white" size={100} />
          </div>

          <div className="space-y-8 mb-12">
            {[
              { number: 1, label: "Créer un compte", active: true },
              { number: 2, label: "Créer votre premier projet", active: false },
              { number: 3, label: "Inviter votre équipe", active: false, icon: Users },
              { number: 4, label: "Commencer à collaborer", active: false, icon: ArrowRight }
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.active
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED]'
                      : 'border-2 border-[#2563EB]/30'
                  }`}
                >
                  {step.icon ? (
                    <step.icon size={16} className="text-white/50" />
                  ) : (
                    <span className={`font-bold ${step.active ? 'text-white' : 'text-white/30'}`}>
                      {step.number}
                    </span>
                  )}
                </div>
                <div className="pt-0.5">
                  <p className={`text-[15px] font-bold ${step.active ? 'text-white' : 'text-[#94A3B8]'}`}>
                    {step.label}
                  </p>
                </div>
                {i < 3 && (
                  <div className="absolute left-[calc(50%-11.5rem)] h-8 w-0.5 bg-gradient-to-b from-[#2563EB] to-[#7C3AED] opacity-30"
                    style={{ top: `calc(${12 + (i + 1) * 8}rem)` }}
                  ></div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-8 opacity-20">
            <div className="w-16 h-12 bg-white/10 rounded"></div>
            <div className="w-16 h-12 bg-white/10 rounded"></div>
            <div className="w-16 h-12 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
