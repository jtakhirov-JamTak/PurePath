interface LeafLogoProps {
  className?: string;
  size?: number;
}

export function LeafLogo({ className = "", size = 32 }: LeafLogoProps) {
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
        d="M32 4C32 4 8 16 8 36C8 49.255 18.745 60 32 60C45.255 60 56 49.255 56 36C56 16 32 4 32 4Z"
        fill="#50C878"
      />
      <path
        d="M32 4C32 4 8 16 8 36C8 49.255 18.745 60 32 60C45.255 60 56 49.255 56 36C56 16 32 4 32 4Z"
        stroke="#3DA660"
        strokeWidth="1.5"
      />
      <path
        d="M32 18V50"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M32 28C26 24 20 26 18 28"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 34C38 30 44 32 46 34"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 40C26 36 20 38 18 40"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 58C32 58 28 54 28 50"
        stroke="#3DA660"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M32 58C32 58 36 54 36 50"
        stroke="#3DA660"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
