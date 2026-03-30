"use client";

import React, { useEffect, useRef } from 'react';

export function SherlockBackground() {
  const tileSize = "120px 140px";
  const dimPattern = 'url("/patterns/sherlock-pattern.svg")';
  const glowPattern = 'url("/patterns/sherlock-pattern-glow.svg")';

  // Mouse torch — updated directly on DOM, zero re-renders
  const mouseTorchRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = mouseTorchRef.current;
    if (!el) return;

    // Start off-screen so it doesn't flash at (0,0) on mount
    el.style.setProperty('--mx', '-300px');
    el.style.setProperty('--my', '-300px');

    const onMove = (e: MouseEvent) => {
      el.style.setProperty('--mx', `${e.clientX}px`);
      el.style.setProperty('--my', `${e.clientY}px`);
      el.style.opacity = '1';

      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        el.style.opacity = '0';
      }, 1500);
    };

    const onLeave = () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      el.style.opacity = '0';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-surface-bg">

      <style dangerouslySetInnerHTML={{ __html: `
        /*
          mask-size: 24vw × 56vh  →  center at (12vw, 28vh) from box origin
          mask-position = (cx - 12vw,  cy - 28vh)

          Torch 1: diagonal TL→BR  — enters top-left, exits bottom-right
          Torch 2: diagonal BL→TR  — enters bottom-left, exits top-right
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

        /* Mouse torch — tighter beam, fades out on idle */
        .mask-mouse-torch {
          mask-image: radial-gradient(
            ellipse 8vw 14vh at var(--mx, -300px) var(--my, -300px),
            black 0%,
            rgba(0,0,0,0.65) 30%,
            rgba(0,0,0,0.1) 60%,
            transparent 78%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 8vw 14vh at var(--mx, -300px) var(--my, -300px),
            black 0%,
            rgba(0,0,0,0.65) 30%,
            rgba(0,0,0,0.1) 60%,
            transparent 78%
          );
          mask-size: 100% 100%;
          -webkit-mask-size: 100% 100%;
          opacity: 0;
          transition: opacity 0.7s ease-out;
        }
      `}} />

      {/* LAYER 0: Dim base — always-visible ghost of the full pattern */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: dimPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
        }}
      />

      {/* LAYER 1a: Torch 1 — diagonal TL→BR, with hesitation */}
      <div
        className="absolute inset-0 mask-torch-shared mask-torch-1 opacity-[0.92] mix-blend-screen"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: "drop-shadow(0 0 14px rgba(251,191,36,0.65))",
        }}
      />

      {/* LAYER 1b: Torch 2 — diagonal BL→TR, counter-diagonal, out of phase */}
      <div
        className="absolute inset-0 mask-torch-shared mask-torch-2 opacity-[0.80] mix-blend-screen"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: "drop-shadow(0 0 10px rgba(212,165,70,0.52))",
        }}
      />

      {/* LAYER 2: Mouse torch — follows cursor, fades out after 1.5s idle */}
      <div
        ref={mouseTorchRef}
        className="absolute inset-0 mask-mouse-torch mix-blend-screen"
        style={{
          backgroundImage: glowPattern,
          backgroundRepeat: "repeat",
          backgroundSize: tileSize,
          filter: "drop-shadow(0 0 18px rgba(251,191,36,0.80))",
        }}
      />

      {/* LAYER 3: Soft center veil — suppresses pattern brightness behind hero content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 52% at 50% 42%, rgba(3,4,6,0.22) 0%, rgba(3,4,6,0.08) 55%, transparent 78%)",
        }}
      />

      {/* Edge fades — blend pattern into page boundaries */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-surface-bg to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-surface-bg to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-surface-bg to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-surface-bg to-transparent pointer-events-none" />
    </div>
  );
}
