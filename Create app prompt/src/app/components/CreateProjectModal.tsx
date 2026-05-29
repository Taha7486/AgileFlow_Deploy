import { useState } from "react";
import { Logo } from "./Logo";
import { X, Info, Github } from "lucide-react";
import { useNavigate } from "react-router";

export function CreateProjectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [projectKey, setProjectKey] = useState("KAN");
  const [projectType, setProjectType] = useState("software");
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCreate = () => {
    setShowSuccess(true);
    setTimeout(() => {
      navigate("/loading");
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-[560px] p-16 text-center">
          <div className="mb-6 animate-scale-in">
            <Logo variant="gradient" size={64} />
          </div>
          <h2 className="text-2xl font-bold text-[#111827] mb-2">🎉 Projet créé avec succès !</h2>
          <p className="text-[#6B7280] mb-6">Redirection vers votre tableau de bord...</p>
          <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full animate-progress"
              style={{ background: 'var(--gradient-brand)' }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-[560px] p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Logo variant="gradient" size={32} />
            <div>
              <h2 className="text-lg font-bold text-[#111827]">Créer un nouveau projet</h2>
              <p className="text-sm text-[#6B7280]">Configurez votre espace de travail.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-t border-[#E2E8F0] my-6"></div>

        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-[#374151] mb-2">
              Nom du projet <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              placeholder="ex. Mon Super Projet"
              className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-[#6B7280]">Clé :</span>
              <input
                type="text"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                maxLength={5}
                className="px-2 py-1 bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 border rounded text-sm font-bold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent w-16"
                style={{ borderColor: 'rgba(37, 99, 235, 0.3)' }}
              />
              <div className="group relative">
                <Info size={14} className="text-[#9CA3AF] cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-[#1A1F2E] text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  Utilisé dans les tâches : KAN-1, KAN-2...
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#374151] mb-2">Description</label>
            <textarea
              placeholder="Description du projet (optionnel)"
              rows={4}
              className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all resize-none"
            ></textarea>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#374151] mb-3">Type de projet</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "software", icon: "🚀", label: "Logiciel" },
                { id: "marketing", icon: "📈", label: "Marketing" },
                { id: "design", icon: "🎨", label: "Design" }
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setProjectType(type.id)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    projectType === type.id
                      ? 'border-transparent bg-gradient-to-br from-[#2563EB]/5 to-[#7C3AED]/5'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                  style={projectType === type.id ? {
                    borderImage: 'linear-gradient(135deg, #2563EB, #7C3AED) 1'
                  } : {}}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-semibold text-[#111827]">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#374151] mb-2">Inviter des membres</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemple.com"
                className="flex-1 h-11 px-4 bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
              />
              <button
                type="button"
                className="px-4 h-11 border-2 text-[#7C3AED] rounded-md hover:bg-[#F5F3FF] transition-colors"
                style={{ borderColor: 'rgba(124, 58, 237, 0.3)' }}
              >
                Ajouter
              </button>
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Github size={20} className="text-[#374151]" />
                <span className="text-sm font-bold text-[#374151]">Connecter un dépôt GitHub</span>
              </div>
              <button
                type="button"
                onClick={() => setGithubEnabled(!githubEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  githubEnabled ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    githubEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                ></div>
              </button>
            </div>

            {githubEnabled && (
              <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Owner"
                    className="h-9 px-3 text-sm bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Repository"
                    className="h-9 px-3 text-sm bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                  />
                </div>
                <input
                  type="password"
                  placeholder="GitHub Token"
                  className="w-full h-9 px-3 text-sm bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
                <div className="flex items-center justify-between">
                  <a href="#" className="text-xs bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent hover:underline">
                    Créer un token →
                  </a>
                  <p className="text-[12px] text-[#9CA3AF]">Scope requis : repo, admin:repo_hook</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-[#E2E8F0]">
          <button
            onClick={onClose}
            className="px-6 h-11 text-[#374151] rounded-md hover:bg-[#F9FAFB] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            className="px-6 h-11 text-white rounded-md hover:opacity-90 transition-opacity"
            style={{ background: 'var(--gradient-brand)' }}
          >
            Créer le projet →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-progress {
          animation: progress 2s ease-out;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
