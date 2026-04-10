import { useState, useEffect, useRef, type ReactNode } from "react";

interface SeasonBackgroundProps {
  src: string | null;
  children: ReactNode;
}

export function SeasonBackground({ src, children }: SeasonBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      setCurrentSrc(null);
      return;
    }

    setLoaded(false);
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      setCurrentSrc(src);
      setLoaded(true);
    };
    img.onerror = () => {
      setCurrentSrc(null);
      setLoaded(false);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
      imgRef.current = null;
    };
  }, [src]);

  // If no src or image failed to load, render children without wrapper
  if (!currentSrc && !loaded) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      {/* Background image — fades in when loaded */}
      <div
        className="fixed inset-0 top-auto bottom-0 h-[calc(100vh-56px)] bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out will-change-transform"
        style={{
          backgroundImage: currentSrc ? `url(${currentSrc})` : undefined,
          opacity: loaded ? 1 : 0,
        }}
      />
      {/* Overlay for text readability */}
      <div
        className="fixed inset-0 top-auto bottom-0 h-[calc(100vh-56px)] bg-background/65 dark:bg-background/75 transition-opacity duration-700"
        style={{ opacity: loaded ? 1 : 0 }}
      />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
