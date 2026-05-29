import { Link } from "react-router";
import { Logo } from "../components/Logo";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { List, Columns3, Calendar, Github, Share2, Users, ArrowRight, Star } from "lucide-react";
import { useState } from "react";

export function LandingPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <CreateProjectModal isOpen={showModal} onClose={() => setShowModal(false)} />
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] h-14">
        <div className="max-w-[1440px] mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="gradient" size={40} />
            <span className="text-xl font-bold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
              AgileFlow
            </span>
          </div>

          <div className="flex items-center gap-8 text-sm text-[#374151]">
            <a href="#" className="hover:text-[#2563EB] transition-colors">Fonctionnalités</a>
            <a href="#" className="hover:text-[#2563EB] transition-colors">Équipes</a>
            <a href="#" className="hover:text-[#2563EB] transition-colors">Tarifs</a>
            <a href="#" className="hover:text-[#2563EB] transition-colors">Documentation</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 h-9 flex items-center border border-[#E2E8F0] text-[#374151] rounded-md hover:bg-[#F9FAFB] transition-colors"
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="px-4 h-9 flex items-center text-white rounded-md transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'var(--gradient-brand)' }}
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white py-24">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-[55%_45%] gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-full text-[#7C3AED] text-[13px] mb-6">
                ✦ Kanban · Gantt · GitHub · Diagrammes
              </div>

              <h1 className="text-[56px] leading-[1.15] font-bold text-[#111827] mb-6">
                La plateforme{" "}
                <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent relative">
                  Agile
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M0 4 Q50 0, 100 4 T200 4" stroke="url(#underlineGradient)" strokeWidth="3" fill="none" />
                    <defs>
                      <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <br />
                de votre équipe.
              </h1>

              <p className="text-lg text-[#6B7280] max-w-[460px] mb-9">
                Planification, Kanban, Chronologie Gantt, diagrammes collaboratifs et GitHub — réunis en une seule plateforme.
              </p>

              <div className="flex items-center gap-3 mb-7">
                <button
                  onClick={() => setShowModal(true)}
                  className="h-11 px-6 text-white rounded-md transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                  style={{ background: 'var(--gradient-brand)' }}
                >
                  Créer un projet gratuitement →
                </button>
                <button className="h-11 px-6 bg-[#F9FAFB] border border-[#E2E8F0] text-[#374151] rounded-md hover:bg-[#F3F4F6] transition-colors">
                  Voir une démo
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full bg-[#2563EB] border-2 border-white"></div>
                  <div className="w-9 h-9 rounded-full bg-[#16A34A] border-2 border-white"></div>
                  <div className="w-9 h-9 rounded-full bg-[#7C3AED] border-2 border-white"></div>
                </div>
                <span className="text-[13px] text-[#6B7280]">Rejoint par +500 équipes</span>
                <div className="flex gap-0.5 text-[#F59E0B]">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-[rgba(37,99,235,0.06)] to-transparent rounded-full blur-3xl"></div>
              <div className="relative flex items-center justify-center">
                <Logo variant="gradient" size={400} />

                <div className="absolute top-8 right-8 bg-white rounded-lg shadow-lg p-3 border border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#16A34A]"></div>
                    <span className="text-[13px]"><span className="font-bold text-[#374151]">6 tâches</span> <span className="text-[#6B7280]">terminées aujourd'hui</span></span>
                  </div>
                </div>

                <div className="absolute bottom-16 left-8 bg-white rounded-lg shadow-lg p-3 border border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <Github size={16} className="text-[#6B7280]" />
                    <span className="text-[13px] font-bold text-[#374151]">GitHub connecté</span>
                    <div className="w-2 h-2 rounded-full bg-[#16A34A]"></div>
                  </div>
                </div>

                <div className="absolute bottom-8 right-16 bg-white rounded-lg shadow-lg p-3 border border-[#E2E8F0]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs rounded border border-[#BFDBFE]">PR #8</span>
                    <ArrowRight size={12} className="text-[#6B7280]" />
                    <span className="px-2 py-0.5 bg-[#F0FDF4] text-[#16A34A] text-xs rounded border border-[#BBF7D0]">DONE</span>
                  </div>
                  <p className="text-[12px] text-[#6B7280]">Merge automatique détecté</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.03
        }}></div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-[#F8F9FA] py-12">
        <div className="max-w-[1440px] mx-auto px-8 text-center">
          <p className="text-sm text-[#6B7280] mb-6">Utilisé par des équipes qui construisent de grands produits</p>
          <div className="flex items-center justify-center gap-12">
            {["Nexora", "Devlift", "Stackly", "Buildco", "Codevault"].map((name) => (
              <span key={name} className="text-lg font-bold text-[#CBD5E1]">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-24">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-wider mb-3 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
              FONCTIONNALITÉS
            </p>
            <h2 className="text-[40px] font-bold text-[#111827] mb-4">Tout ce dont votre équipe a besoin</h2>
            <p className="text-lg text-[#6B7280]">Une plateforme complète pour gérer vos projets Agile</p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {[
              {
                icon: List,
                iconBg: "#EFF6FF",
                iconColor: "#2563EB",
                title: "Planification en liste",
                desc: "Vue Jira-style avec édition inline et groupement par épic."
              },
              {
                icon: Columns3,
                iconBg: "#EFF6FF",
                iconColor: "#2563EB",
                title: "Tableau Kanban temps réel",
                desc: "Drag & drop fluide. WebSocket pour mises à jour instantanées.",
                badge: null
              },
              {
                icon: Calendar,
                iconBg: "#F0FDF4",
                iconColor: "#16A34A",
                title: "Chronologie Gantt",
                desc: "Visualisez épics et tâches dans le temps. Dépendances automatiques."
              },
              {
                icon: Github,
                iconBg: "#F8F9FA",
                iconColor: "#374151",
                title: "Intégration GitHub",
                desc: "Issues, PR et commits liés directement à vos tâches.",
                badge: "Nouveau"
              },
              {
                icon: Share2,
                iconBg: "#F5F3FF",
                iconColor: "#7C3AED",
                title: "Diagrammes collaboratifs",
                desc: "UML, séquence, BPMN — édition multi-utilisateurs temps réel."
              },
              {
                icon: Users,
                iconBg: "#F0FDF4",
                iconColor: "#16A34A",
                title: "Gestion des équipes",
                desc: "Invitations, rôles projet, stats et suivi de charge."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="relative bg-white border border-[#E2E8F0] rounded-lg p-7 hover:shadow-lg transition-all group"
              >
                {feature.badge && (
                  <span className="absolute top-4 right-4 px-2 py-1 bg-[#F5F3FF] text-[#7C3AED] text-xs rounded-full">
                    {feature.badge}
                  </span>
                )}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: feature.iconBg }}
                >
                  <feature.icon size={20} style={{ color: feature.iconColor }} />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Spotlight */}
      <section className="bg-[#F8F9FA] py-24">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F3FF] rounded-full text-[#7C3AED] text-[13px] mb-6">
                🐙 Intégration GitHub
              </div>

              <h2 className="text-4xl font-bold text-[#111827] mb-8">
                Votre code et vos tâches, connectés.
              </h2>

              <div className="space-y-4 mb-8">
                {[
                  "Issues GitHub → tâches AgileFlow automatiquement",
                  "Branche créée → tâche passe en IN_PROGRESS",
                  "PR ouverte → tâche passe en REVIEW",
                  "PR mergée → tâche passe en DONE"
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#16A34A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-[#374151]">→ {text}</span>
                  </div>
                ))}
              </div>

              <button className="px-6 h-11 border-2 text-[#7C3AED] rounded-md hover:bg-[#F5F3FF] transition-colors"
                style={{ borderImage: 'var(--gradient-brand) 1' }}>
                Connecter GitHub →
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-lg overflow-hidden">
              <div className="bg-[#1A1F2E] px-4 py-3 text-white font-mono text-sm">
                webhook payload
              </div>
              <div className="p-6">
                <pre className="text-[13px] font-mono text-[#374151] mb-6">
{`{
  "event": "pull_request",
  "action": "closed",
  "merged": true,
  "pull_request": {
    "title": "Fix auth KAN-42",
    "number": 42
  }
}`}
                </pre>

                <div className="flex items-center justify-center mb-6">
                  <ArrowRight size={32} className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent" style={{ strokeWidth: 3 }} />
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-md p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 border rounded text-sm font-bold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
                      KAN-42
                    </span>
                    <span className="font-semibold text-[#111827]">Fix auth</span>
                  </div>
                  <span className="px-2 py-1 bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] rounded text-xs">
                    DONE
                  </span>
                </div>

                <p className="text-[12px] text-[#9CA3AF] italic mt-4 text-center">
                  Préfixe configurable : KAN, GRF, PROJ...
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A3FD4 0%, #2563EB 40%, #7C3AED 100%)' }}
      >
        <div className="absolute right-24 top-1/2 -translate-y-1/2 opacity-10">
          <Logo variant="white" size={120} />
        </div>

        <div className="max-w-[1440px] mx-auto px-8 text-center relative z-10">
          <h2 className="text-[44px] font-bold text-white mb-4">
            Prêt à accélérer votre équipe ?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Créez votre premier projet en moins de 2 minutes.
          </p>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setShowModal(true)}
              className="h-11 px-6 bg-white font-bold rounded-md hover:opacity-90 transition-opacity bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent"
            >
              Commencer gratuitement
            </button>
            <button className="h-11 px-6 border-2 border-white text-white rounded-md hover:bg-white/10 transition-colors">
              Voir la démo
            </button>
          </div>

          <p className="text-white/60 text-[13px]">✓ Aucune carte bancaire requise</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1F2E] text-white py-16">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Logo variant="white" size={32} />
                <span className="text-lg font-bold">AgileFlow</span>
              </div>
              <p className="text-[#94A3B8] text-sm">Gérez vos projets Agile. Simplement.</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Produit</h4>
              <div className="space-y-2 text-sm text-[#94A3B8]">
                <a href="#" className="block hover:text-white transition-colors">Fonctionnalités</a>
                <a href="#" className="block hover:text-white transition-colors">Kanban</a>
                <a href="#" className="block hover:text-white transition-colors">Planification</a>
                <a href="#" className="block hover:text-white transition-colors">Chronologie</a>
                <a href="#" className="block hover:text-white transition-colors">GitHub</a>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4">Ressources</h4>
              <div className="space-y-2 text-sm text-[#94A3B8]">
                <a href="#" className="block hover:text-white transition-colors">Documentation</a>
                <a href="#" className="block hover:text-white transition-colors">API</a>
                <a href="#" className="block hover:text-white transition-colors">Changelog</a>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4">Entreprise</h4>
              <div className="space-y-2 text-sm text-[#94A3B8]">
                <a href="#" className="block hover:text-white transition-colors">À propos</a>
                <a href="#" className="block hover:text-white transition-colors">Contact</a>
                <a href="#" className="block hover:text-white transition-colors">Confidentialité</a>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2D3748] pt-8">
            <p className="text-[#64748B] text-sm text-center">© 2026 AgileFlow</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
