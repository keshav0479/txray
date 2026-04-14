"use client";

import React from "react";

export function SherlockBackground() {
  const tileSize = "120px 140px";
  const dimPattern = 'url("/patterns/sherlock-pattern.svg")';
  const glowPattern = 'url("/patterns/sherlock-pattern-glow.svg")';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-surface-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /*
          mask-size: 24vw × 56vh  →  center at (12vw, 28vh) from box origin
          mask-position = (cx - 12vw,  cy - 28vh)

          Torch 1: diagonal TL→BR  - enters top-left, exits bottom-right
          Torch 2: diagonal BL→TR  - enters bottom-left, exits top-right
          They cross near screen center → most interesting moment of each cycle.
          Different durations (18s vs 23s) → phase drifts, never feels looping.
        */

        /* --- Torch 1: TL → BR diagonal ---
           Speed is controlled by keyframe spacing, no mid-stops.
           0-18%: fast entry  |  18-38%: slows (upper-left zone)
           38-55%: slow drift (investigation zone)  |  55-100%: picks up, exits BR
        */
        @keyframes torchSweep1 {
          0%   { mask-position: -27vw -10vh; -webkit-mask-position: -27vw -10vh; }
          18%  { mask-position:   8vw   4vh; -webkit-mask-position:   8vw   4vh; }
          38%  { mask-position:  28vw  18vh; -webkit-mask-position:  28vw  18vh; }
          55%  { mask-position:  40vw  26vh; -webkit-mask-position:  40vw  26vh; }
          72%  { mask-position:  65vw  38vh; -webkit-mask-position:  65vw  38vh; }
          100% { mask-position: 101vw  47vh; -webkit-mask-position: 101vw  47vh; }
        }

        /* --- Torch 2: BL → TR diagonal ---
           Mirror rhythm: fast entry from bottom-left, slow through mid, exits top-right
        */
        @keyframes torchSweep2 {
          0%   { mask-position: -27vw  52vh; -webkit-mask-position: -27vw  52vh; }
          18%  { mask-position:   5vw  45vh; -webkit-mask-position:   5vw  45vh; }
          38%  { mask-position:  26vw  34vh; -webkit-mask-position:  26vw  34vh; }
          55%  { mask-position:  38vw  26vh; -webkit-mask-position:  38vw  26vh; }
          72%  { mask-position:  65vw  16vh; -webkit-mask-position:  65vw  16vh; }
          100% { mask-position: 101vw  -6vh; -webkit-mask-position: 101vw  -6vh; }
        }

        .mask-torch-shared {
          mask-image: radial-gradient(
            ellipse 12vw 24vh at 50% 50%,
            black 0%,
            rgba(0,0,0,0.5) 42%,
            rgba(0,0,0,0.06) 68%,
            transparent 82%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 12vw 24vh at 50% 50%,
            black 0%,
            rgba(0,0,0,0.5) 42%,
            rgba(0,0,0,0.06) 68%,
            transparent 82%
          );
          mask-repeat: no-repeat;
          -webkit-mask-repeat: no-repeat;
          mask-size: 24vw 56vh;
          -webkit-mask-size: 24vw 56vh;
        }

        .mask-torch-1 {
          animation: torchSweep1 18s ease-in-out infinite alternate;
        }
        .mask-torch-2 {
          animation: torchSweep2 23s ease-in-out infinite alternate;
          animation-delay: -11s;
        }
      `,
        }}
      />

      {/* LAYER 0: Dim base - always-visible ghost of the full pattern */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: dimPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
        }}
      />

      {/* LAYER 1a: Torch 1 - diagonal TL→BR, with hesitation */}
      <div
        className="absolute inset-0 mask-torch-shared mask-torch-1 opacity-[0.92] mix-blend-screen"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: "drop-shadow(0 0 14px rgba(247,147,26,0.65))",
        }}
      />

      {/* LAYER 1b: Torch 2 - diagonal BL→TR, counter-diagonal, out of phase */}
      <div
        className="absolute inset-0 mask-torch-shared mask-torch-2 opacity-[0.80] mix-blend-screen"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: "drop-shadow(0 0 10px rgba(247,147,26,0.52))",
        }}
      />

      {/* LAYER 3: Soft center veil - suppresses pattern brightness behind hero content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 52% at 50% 42%, rgba(3,4,6,0.22) 0%, rgba(3,4,6,0.08) 55%, transparent 78%)",
        }}
      />

      {/* Edge fades - blend pattern into page boundaries */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-surface-bg to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-surface-bg to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-surface-bg to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-surface-bg to-transparent pointer-events-none" />
    </div>
  );
}
