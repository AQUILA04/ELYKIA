import { BrandPaletteColors, DEFAULT_BRAND_COLORS } from '@core/models/company-branding.model';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function isValidHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (isValidHexColor(value)) {
    return value.trim().toLowerCase();
  }
  return fallback.toLowerCase();
}

export function hexToRgb(hex: string): RgbColor {
  const clean = normalizeHexColor(hex, '#003366').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgbTuple(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/**
 * Linearly blends two hex colors. weightA in [0, 1] is the proportion of hexA.
 */
export function mixHex(hexA: string, hexB: string, weightA: number): string {
  const w = Math.max(0, Math.min(1, weightA));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

export function darkenHex(hex: string, amount: number): string {
  return mixHex('#000000', hex, amount);
}

export function lightenHex(hex: string, amount: number): string {
  return mixHex('#ffffff', hex, amount);
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function isDarkColor(hex: string): boolean {
  return getRelativeLuminance(hex) < 0.35;
}

export function getContrastTextColor(bgHex: string): '#ffffff' | '#0f172a' {
  return isDarkColor(bgHex) ? '#ffffff' : '#0f172a';
}

/**
 * Generates the complete set of CSS custom properties applied on `:root` so that
 * all legacy `--navy*`, `--teal*`, `--ad-*` tokens and new `--brand-*` tokens
 * stay harmoniously synchronized with the configured company color chart.
 */
export function buildBrandCssVariables(colors: Partial<BrandPaletteColors>): Record<string, string> {
  const primary = normalizeHexColor(colors.primaryColor, DEFAULT_BRAND_COLORS.primaryColor);
  const secondary = normalizeHexColor(colors.secondaryColor, DEFAULT_BRAND_COLORS.secondaryColor);
  const accent = normalizeHexColor(colors.accentColor, DEFAULT_BRAND_COLORS.accentColor);
  const sidebarBg = normalizeHexColor(colors.sidebarBgColor, DEFAULT_BRAND_COLORS.sidebarBgColor);
  const sidebarText = normalizeHexColor(colors.sidebarTextColor, DEFAULT_BRAND_COLORS.sidebarTextColor);
  const bg = normalizeHexColor(colors.backgroundColor, DEFAULT_BRAND_COLORS.backgroundColor);

  const primaryDark = darkenHex(primary, 0.26);
  const primaryDarker = darkenHex(primary, 0.42);
  const primaryMid = lightenHex(primary, 0.14);
  const primaryLight = lightenHex(primary, 0.3);
  const primary100 = lightenHex(primary, 0.76);
  const primaryPale = lightenHex(primary, 0.89);
  const primaryXpale = lightenHex(primary, 0.94);

  const secondaryDark = darkenHex(secondary, 0.2);
  const secondaryPale = lightenHex(secondary, 0.88);

  const accentDark = darkenHex(accent, 0.18);
  const accentLight = lightenHex(accent, 0.18);
  const accentSoft = lightenHex(accent, 0.45);
  const accentPale = lightenHex(accent, 0.86);

  const sidebarIsDark = isDarkColor(sidebarBg);
  const sidebarHoverBg = sidebarIsDark
    ? lightenHex(sidebarBg, 0.1)
    : lightenHex(primary, 0.92);
  const sidebarBorder = sidebarIsDark
    ? 'rgba(255, 255, 255, 0.10)'
    : '#e5eaef';
  const sidebarMutedText = sidebarIsDark
    ? mixHex(sidebarText, sidebarBg, 0.65)
    : mixHex(sidebarText, '#94a3b8', 0.45);
  const sidebarActiveBg = sidebarIsDark ? primaryMid : primary;
  const sidebarActiveText = getContrastTextColor(sidebarActiveBg);

  const primaryRgb = hexToRgbTuple(primary);
  const secondaryRgb = hexToRgbTuple(secondary);
  const accentRgb = hexToRgbTuple(accent);

  return {
    // New semantic brand tokens
    '--brand-primary': primary,
    '--brand-primary-dark': primaryDark,
    '--brand-primary-darker': primaryDarker,
    '--brand-primary-mid': primaryMid,
    '--brand-primary-light': primaryLight,
    '--brand-primary-pale': primaryPale,
    '--brand-primary-xpale': primaryXpale,
    '--brand-primary-rgb': primaryRgb,
    '--brand-primary-contrast': getContrastTextColor(primary),

    '--brand-secondary': secondary,
    '--brand-secondary-dark': secondaryDark,
    '--brand-secondary-pale': secondaryPale,
    '--brand-secondary-rgb': secondaryRgb,

    '--brand-accent': accent,
    '--brand-accent-dark': accentDark,
    '--brand-accent-pale': accentPale,
    '--brand-accent-rgb': accentRgb,

    '--brand-sidebar-bg': sidebarBg,
    '--brand-sidebar-bg-hover': sidebarHoverBg,
    '--brand-sidebar-text': sidebarText,
    '--brand-sidebar-text-muted': sidebarMutedText,
    '--brand-sidebar-border': sidebarBorder,
    '--brand-sidebar-active-bg': sidebarActiveBg,
    '--brand-sidebar-active-text': sidebarActiveText,

    '--brand-bg': bg,

    // Synchronized legacy ELYKIA global design tokens (styles.scss)
    '--navy-900': primaryDarker,
    '--navy-800': primaryDark,
    '--navy-700': primary,
    '--navy-600': primaryMid,
    '--navy-500': secondary,
    '--navy-400': primaryLight,
    '--navy-100': primary100,
    '--navy-50': primaryPale,
    '--navy-pale': primaryXpale,

    '--teal-500': accent,
    '--teal-400': accentLight,
    '--teal-300': accentSoft,
    '--teal-100': accentPale,

    '--color-success': accent,
    '--color-info': secondary,
    '--color-success-bg': `rgba(${accentRgb}, 0.12)`,
    '--color-info-bg': `rgba(${secondaryRgb}, 0.12)`,

    '--surface-page': bg,
    '--shadow-glow': `0 0 8px rgba(${accentRgb}, 0.55)`,

    // Article detail tokens
    '--ad-navy': primary,
    '--ad-navy-mid': primaryMid,
    '--ad-navy-light': primaryPale,
    '--ad-navy-pale': primaryXpale,
    '--ad-accent': secondary,
  };
}
