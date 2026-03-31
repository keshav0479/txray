"use client";

/**
 * InteractiveBackground — "Coin Smith" Edition
 * 
 * Dense grid of small BTC moulds. Grid lines carry a subtle orange pulse.
 * Only the BTC logo shape glows inside the mould, not the surrounding plate.
 * 
 * Performance: All animations use CSS @keyframes (compositor-thread)
 * instead of JS-driven Framer Motion for minimal CPU/GPU overhead.
 */

const BTC_PATH = "M46.103,27.444c0.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-0.875-1.4,5.616c-0.923-0.23-1.871-0.447-2.813-0.662l1.41-5.653-3.509-0.875-1.439,5.766c-0.764-0.174-1.514-0.346-2.242-0.527l0.004-0.018-4.842-1.209-0.934,3.75s2.605,0.597,2.55,0.634c1.422,0.355,1.679,1.296,1.636,2.042l-1.638,6.571c0.098,0.025,0.225,0.061,0.365,0.117-0.117-0.029-0.242-0.061-0.371-0.092l-2.296,9.205c-0.174,0.432-0.615,1.08-1.609,0.834,0.035,0.051-2.552-0.637-2.552-0.637l-1.743,4.019,4.569,1.139c0.85,0.213,1.683,0.436,2.503,0.646l-1.453,5.834,3.507,0.875,1.439-5.772c0.958,0.26,1.888,0.5,2.798,0.726l-1.434,5.745,3.511,0.875,1.453-5.823c5.987,1.133,10.489,0.676,12.384-4.739,1.527-4.36-0.076-6.875-3.226-8.515,2.294-0.529,4.022-2.038,4.483-5.155zm-8.022,11.249c-1.085,4.36-8.426,2.003-10.806,1.412l1.928-7.729c2.38,0.594,10.012,1.77,8.878,6.317zm1.086-11.312c-0.99,3.966-7.1,1.951-9.082,1.457l1.748-7.01c1.982,0.494,8.365,1.416,7.334,5.553z";

const LOGO_TRANSFORM = "translate(13.27, 12.88) scale(1.5)";

// Inject keyframe animations once via a <style> tag
const KEYFRAMES_CSS = `
@keyframes mould-glow {
  0%, 12% { opacity: 0; }
  18% { opacity: 0.8; }
  25% { opacity: 1; }
  32% { opacity: 0.8; }
  38%, 100% { opacity: 0; }
}

@keyframes pulse-h {
  from { stroke-dashoffset: 2080; }
  to { stroke-dashoffset: -2080; }
}

@keyframes pulse-v {
  from { stroke-dashoffset: 1860; }
  to { stroke-dashoffset: -1860; }
}
`;

function MouldTile({ delay, uniqueId }: { delay: number; uniqueId: string }) {
  const gradId = `fill-sweep-${uniqueId}`;
  
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Directional fill gradient — sweeps left-to-right across the logo shape */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f7931a" />
          <stop offset="40%" stopColor="#ffcc66" />
          <stop offset="100%" stopColor="#f7931a" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Outer metallic base plate (Elevated physical stone texture) */}
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#161413" stroke="#2a2522" strokeWidth="1" />
      
      {/* Corner Rivets — filled solid for subtle visibility */}
      {/* Corner Rivets */}
      <circle cx="22" cy="22" r="3" fill="rgba(255,255,255,0.02)" />
      <circle cx="98" cy="22" r="3" fill="rgba(255,255,255,0.02)" />
      <circle cx="22" cy="98" r="3" fill="rgba(255,255,255,0.02)" />
      <circle cx="98" cy="98" r="3" fill="rgba(255,255,255,0.02)" />

      {/* Inner darker chamber (Hollowed core) */}
      <rect x="24" y="24" width="72" height="72" rx="14" fill="#090807" stroke="#1c1917" strokeWidth="1" />

      {/* Dormant BTC Logo — ghost outline only */}
      <g fill="none" stroke="#2a2522" strokeWidth="1.5" transform={LOGO_TRANSFORM}>
        <path d={BTC_PATH} />
      </g>

      {/* ====== GLOW: Only the BTC logo shape fills with orange ====== */}
      <g 
        style={{ 
          animation: `mould-glow 20s ease-in-out ${delay}s infinite`,
          opacity: 0
        }}
      >
        {/* The filled BTC logo — only the path shape glows, nothing else */}
        <g 
          fill={`url(#${gradId})`} 
          transform={LOGO_TRANSFORM}
          style={{ filter: "drop-shadow(0 0 6px rgba(247,147,26,0.3))" }}
        >
          <path d={BTC_PATH} />
        </g>
      </g>
    </svg>
  );
}

export function SmithBackground() {
  const spacingX = 150;
  const spacingY = 140;
  const tileSize = 65;
  
  const cols = Array.from({ length: 14 }, (_, i) => -70 + i * spacingX);
  const rows = Array.from({ length: 9 }, (_, i) => -50 + i * spacingY);
  const half = tileSize / 2;
  
  const nodes = cols.flatMap((x, ci) => 
    rows.map((y, ri) => ({ 
      x, y, 
      id: `${ci}-${ri}`,
      delay: ((ci * 3.1 + ri * 2.3) % 18)
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent">
      {/* Inject CSS keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* 1. Mould tiles — the tile arrangement implies the grid, no need for explicit lines */}
      <div className="absolute w-full h-full opacity-[0.32]">
        {nodes.map(({ x, y, id, delay }) => (
          <div 
            key={id}
            className="absolute"
            style={{ 
              left: `${x}px`, 
              top: `${y}px`, 
              width: `${tileSize}px`, 
              height: `${tileSize}px`,
              transform: `translate(-${half}px, -${half}px)` 
            }}
          >
            <MouldTile delay={delay} uniqueId={id} />
          </div>
        ))}
      </div>

    </div>
  );
}
