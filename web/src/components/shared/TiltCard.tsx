"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees (default 8) */
  maxTilt?: number;
  /** Spotlight glare intensity 0-1 (default 0.12) */
  glareIntensity?: number;
  /** Spring stiffness (default 300) */
  stiffness?: number;
  /** Spring damping (default 30) */
  damping?: number;
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 8,
  glareIntensity = 0.12,
  stiffness = 300,
  damping = 30,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse position as motion values for smooth spring interpolation
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spring-based tilt for buttery smooth movement
  const springConfig = { stiffness, damping, mass: 0.5 };
  const rotateX = useSpring(
    useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]),
    springConfig,
  );

  // Spotlight position for the glare
  const glareX = useSpring(
    useTransform(mouseX, [0, 1], [0, 100]),
    springConfig,
  );
  const glareY = useSpring(
    useTransform(mouseY, [0, 1], [0, 100]),
    springConfig,
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    // Smoothly spring back to center
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
      className={`relative overflow-hidden rounded-3xl ${className}`}
    >
      {children}

      {/* Spotlight glare overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([x, y]) =>
              `radial-gradient(circle at ${x}% ${y}%, rgba(245,158,11,${isHovered ? glareIntensity : 0}) 0%, transparent 60%)`,
          ),
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </motion.div>
  );
}
