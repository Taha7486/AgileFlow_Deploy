import { Logo } from "../components/Logo";
import { useEffect, useState } from "react";

export function LoadingPage() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center relative">
      <div className="text-center">
        <div className="mb-6 animate-pulse">
          <Logo variant="gradient" size={120} />
        </div>

        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
          AgileFlow
        </h2>

        <p className="text-[#6B7280] mb-8">Chargement de votre espace de travail...</p>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: i === 0 ? '#2563EB' : i === 1 ? '#7C3AED' : '#00BFFF',
                animationDelay: `${i * 0.15}s`
              }}
            ></div>
          ))}
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 max-w-sm mx-auto shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
              <Logo variant="white" size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-[#111827]">Mon Super Projet</p>
              <p className="text-sm text-[#9CA3AF]">Accès en cours...</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#E2E8F0] overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00BFFF, #2563EB, #7C3AED)'
          }}
        ></div>
      </div>
    </div>
  );
}
