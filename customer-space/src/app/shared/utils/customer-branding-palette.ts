export interface CustomerCompanyBranding {
  companyName: string;
  shortName: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBgColor: string;
  sidebarTextColor: string;
  backgroundColor: string;
  hasLogo: boolean;
  logoFilename: string | null;
  logoUrl: string | null;
  themeVersion: number;
}

export const DEFAULT_CUSTOMER_COMPANY_BRANDING: CustomerCompanyBranding = {
  companyName: 'AMENOUVEVE-YAVEH',
  shortName: 'Elykia',
  tagline: 'Espace Client',
  address: null,
  phone: null,
  email: null,
  website: null,
  taxId: null,
  primaryColor: '#003366',
  secondaryColor: '#0095c8',
  accentColor: '#00c2a8',
  sidebarBgColor: '#ffffff',
  sidebarTextColor: '#1e293b',
  backgroundColor: '#f2f4f8',
  hasLogo: false,
  logoFilename: null,
  logoUrl: null,
  themeVersion: 1,
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  return isValidHexColor(value) ? value.trim().toLowerCase() : fallback.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#0d1b2a').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

export function mixHex(hexA: string, hexB: string, weightA: number): string {
  const w = Math.max(0, Math.min(1, weightA));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r * w + b.r * (1 - w),
    a.g * w + b.g * (1 - w),
    a.b * w + b.b * (1 - w),
  );
}

export function darkenHex(hex: string, amount: number): string {
  return mixHex('#000000', hex, amount);
}

export function lightenHex(hex: string, amount: number): string {
  return mixHex('#ffffff', hex, amount);
}

export function isDefaultElykiaPalette(branding: Pick<CustomerCompanyBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>): boolean {
  return (
    normalizeHexColor(branding.primaryColor, '#003366') === '#003366' &&
    normalizeHexColor(branding.secondaryColor, '#0095c8') === '#0095c8' &&
    normalizeHexColor(branding.accentColor, '#00c2a8') === '#00c2a8'
  );
}

/**
 * Maps enterprise branding colors onto customer-space `--elyk-*` and `--ion-color-primary*` tokens.
 * Preserves the exact wireflow navy/gold aesthetic when default ELYKIA colors are active, and
 * generates a cohesive luxury palette when a deployed enterprise customizes its color chart.
 */
export function buildCustomerBrandCssVariables(
  branding: Pick<CustomerCompanyBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>,
): Record<string, string> {
  if (isDefaultElykiaPalette(branding)) {
    return {
      '--elyk-navy': '#0D1B2A',
      '--elyk-navy-mid': '#1A2E42',
      '--elyk-header-gradient': 'linear-gradient(180deg, #0D1B2A 0%, #1A2E42 100%)',
      '--elyk-gold': '#C9922A',
      '--elyk-gold-light': '#F0C66A',
      '--elyk-gold-soft': '#FBF1DC',
      '--ion-color-primary': '#C9922A',
      '--ion-color-primary-shade': '#b38325',
      '--ion-color-primary-tint': '#d09d3f',
    };
  }

  const primary = normalizeHexColor(branding.primaryColor, '#003366');
  const secondary = normalizeHexColor(branding.secondaryColor, '#0095c8');
  const accent = normalizeHexColor(branding.accentColor, '#00c2a8');

  const deepNavy = darkenHex(primary, 0.32);
  const midNavy = primary;
  const highlight = accent !== '#00c2a8' ? accent : secondary;
  const highlightLight = lightenHex(highlight, 0.42);
  const highlightSoft = lightenHex(highlight, 0.88);
  const highlightShade = darkenHex(highlight, 0.14);
  const highlightTint = lightenHex(highlight, 0.14);

  return {
    '--elyk-navy': deepNavy,
    '--elyk-navy-mid': midNavy,
    '--elyk-header-gradient': `linear-gradient(180deg, ${deepNavy} 0%, ${midNavy} 100%)`,
    '--elyk-gold': highlight,
    '--elyk-gold-light': highlightLight,
    '--elyk-gold-soft': highlightSoft,
    '--ion-color-primary': highlight,
    '--ion-color-primary-shade': highlightShade,
    '--ion-color-primary-tint': highlightTint,
  };
}
