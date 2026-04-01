/**
 * Centralized theme configuration for txray tools
 * 
 * Each tool (Lens, Sherlock, Smith) has its own color palette
 * but shares the same component structure.
 */

export type ToolTheme = "lens" | "sherlock" | "smith";

export interface ThemeColors {
  // Primary accent color (hex)
  primary: string;
  // Lighter variant for text/highlights
  light: string;
  // RGB values for rgba() usage
  rgb: string;
  // Tailwind class prefix (e.g., "lens" for "lens-500")
  tw: string;
}

export const THEMES: Record<ToolTheme, ThemeColors> = {
  lens: {
    primary: "#3b82f6", // blue-500
    light: "#60a5fa",   // blue-400
    rgb: "59,130,246",
    tw: "lens",
  },
  sherlock: {
    primary: "#d4a546", // amber/gold
    light: "#fbbf24",   // amber-400
    rgb: "212,165,70",
    tw: "sherlock",
  },
  smith: {
    primary: "#10b981", // emerald-500
    light: "#34d399",   // emerald-400
    rgb: "16,185,129",
    tw: "smith",
  },
};

/**
 * Get computed styles for a theme
 */
export function getThemeStyles(theme: ToolTheme) {
  const colors = THEMES[theme];
  
  return {
    // Badge background when active
    badgeBgActive: `rgba(${colors.rgb}, 0.15)`,
    badgeBgInactive: "rgba(255,255,255,0.05)",
    
    // Badge border when active
    badgeBorderActive: `rgba(${colors.rgb}, 0.3)`,
    badgeBorderInactive: "rgba(255,255,255,0.1)",
    
    // Text color when active
    textActive: colors.light,
    textInactive: "#a1a1aa", // zinc-400
    
    // Graphic container border
    containerBorder: `${colors.tw}-500/30`,
    
    // Glow/shadow
    glow: `rgba(${colors.rgb}, 0.15)`,
    subtleGlow: `rgba(${colors.rgb}, 0.04)`,
    
    // Timeline node color
    nodeActive: colors.primary,
    nodeInactive: "#27272a", // zinc-800
    
    // Timeline line color
    lineColor: colors.primary,
  };
}
