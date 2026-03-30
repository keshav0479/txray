"use client";

/**
 * InteractiveBackground
 *
 * 3 layers on top of a dim ₿ base pattern:
 * 1. Orb 1 — large soft spotlight drifting left to right (upper half)
 * 2. Orb 2 — large soft spotlight drifting left to right (lower half)
 */
export function LensBackground() {
  const tileSize = "200px 220px";

  const glowPattern = 'url("/patterns/lens-pattern-glow.svg")';
  const glowFilter = "drop-shadow(0 0 10px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 35px rgba(245, 158, 11, 0.6))";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-surface-bg">

      {/* LAYER 0: Dim base ₿ pattern */}
      <div
        className="absolute inset-0 opacity-[0.20]"
        style={{
          backgroundImage: 'url("/patterns/lens-pattern.svg")',
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
        }}
      />

      {/* LAYER 1: Ambient Glowing Orb 1 (Upper half, drifts L → R) */}
      <div
        className="absolute inset-0 animate-orb-1"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: glowFilter,
          opacity: 0.45,
          maskImage: `radial-gradient(ellipse 60vh 60vh at center, black 0%, rgba(0,0,0,0.3) 40%, transparent 70%)`,
          WebkitMaskImage: `radial-gradient(ellipse 60vh 60vh at center, black 0%, rgba(0,0,0,0.3) 40%, transparent 70%)`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "120vh 120vh",
          WebkitMaskSize: "120vh 120vh",
        }}
      />

      {/* LAYER 2: Ambient Glowing Orb 2 (Lower half, drifts L → R) */}
      <div
        className="absolute inset-0 animate-orb-2"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: glowFilter,
          opacity: 0.45,
          maskImage: `radial-gradient(ellipse 60vh 60vh at center, black 0%, rgba(0,0,0,0.3) 40%, transparent 70%)`,
          WebkitMaskImage: `radial-gradient(ellipse 60vh 60vh at center, black 0%, rgba(0,0,0,0.3) 40%, transparent 70%)`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "120vh 120vh",
          WebkitMaskSize: "120vh 120vh",
        }}
      />
    </div>
  );
}
