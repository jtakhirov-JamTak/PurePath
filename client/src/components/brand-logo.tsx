interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = "", size = 32 }: BrandLogoProps) {
  const sw = Math.max(2, size * 0.06);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Leaf body */}
      <path
        d="M32 6 C14 20, 10 42, 32 58 C54 42, 50 20, 32 6Z"
        fill="currentColor"
        opacity={0.15}
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Center vein */}
      <path
        d="M32 14 L32 50"
        stroke="currentColor"
        strokeWidth={sw * 1.2}
        strokeLinecap="round"
      />
      {/* Side veins — only render at larger sizes */}
      {size >= 28 && (
        <>
          <path
            d="M32 24 L22 20 M32 32 L18 30 M32 40 L22 40"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <path
            d="M32 24 L42 20 M32 32 L46 30 M32 40 L42 40"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
