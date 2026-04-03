interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = "", size = 32 }: BrandLogoProps) {
  const strokeWidth = Math.max(1.5, size * 0.06);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 48 C12 24, 32 8, 52 16"
        stroke="currentColor"
        strokeWidth={strokeWidth * 1.8}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="52" cy="16" r={strokeWidth * 1.5} fill="currentColor" />
    </svg>
  );
}
