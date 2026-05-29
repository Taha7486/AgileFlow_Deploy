export function Logo({ variant = "gradient", size = 40 }: { variant?: "gradient" | "white"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="50%" stopColor="#1A3FD4" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M50 10 L85 90 L70 90 L50 45 L30 90 L15 90 L50 10 Z M45 60 L65 60 L60 70 L40 70 L45 60 Z"
        fill={variant === "gradient" ? "url(#logoGradient)" : "white"}
        className="transition-all duration-300"
      />
      <path
        d="M75 25 L85 25 Q90 25 90 30 L90 40 Q90 45 85 45 L75 45 Z"
        fill={variant === "gradient" ? "url(#logoGradient)" : "white"}
        opacity="0.7"
      />
    </svg>
  );
}
