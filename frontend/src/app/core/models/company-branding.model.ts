export interface CompanyBranding {
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
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CompanyBrandingUpdatePayload {
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
}

export type BrandPaletteColors = Pick<
  CompanyBranding,
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'sidebarBgColor'
  | 'sidebarTextColor'
  | 'backgroundColor'
>;

export interface BrandThemePreset {
  id: string;
  name: string;
  description: string;
  colors: BrandPaletteColors;
}

export const DEFAULT_BRAND_COLORS: BrandPaletteColors = {
  primaryColor: '#003366',
  secondaryColor: '#0095c8',
  accentColor: '#00c2a8',
  sidebarBgColor: '#ffffff',
  sidebarTextColor: '#1e293b',
  backgroundColor: '#f2f4f8',
};

export const DEFAULT_COMPANY_BRANDING: CompanyBranding = {
  companyName: 'AMENOUVEVE-YAVEH',
  shortName: 'ELYKIA',
  tagline: 'Gestion Elykia',
  address: null,
  phone: null,
  email: null,
  website: null,
  taxId: null,
  ...DEFAULT_BRAND_COLORS,
  hasLogo: false,
  logoFilename: null,
  logoUrl: null,
  themeVersion: 1,
  updatedAt: null,
  updatedBy: null,
};

export const BRAND_THEME_PRESETS: readonly BrandThemePreset[] = [
  {
    id: 'elykia-navy',
    name: 'Elykia Navy (Défaut)',
    description: 'Bleu marine institutionnel et cyan, menu clair',
    colors: { ...DEFAULT_BRAND_COLORS },
  },
  {
    id: 'navy-dark-sidebar',
    name: 'Marine Prestige',
    description: 'Bleu marine profond avec menu latéral sombre',
    colors: {
      primaryColor: '#003366',
      secondaryColor: '#0095c8',
      accentColor: '#00c2a8',
      sidebarBgColor: '#071540',
      sidebarTextColor: '#e2e8f0',
      backgroundColor: '#f0f4f9',
    },
  },
  {
    id: 'emerald-corporate',
    name: 'Émeraude Corporate',
    description: 'Vert forêt & turquoise, idéal finance/microfinance',
    colors: {
      primaryColor: '#065f46',
      secondaryColor: '#0d9488',
      accentColor: '#f59e0b',
      sidebarBgColor: '#042f2e',
      sidebarTextColor: '#e2f1ed',
      backgroundColor: '#f1f7f5',
    },
  },
  {
    id: 'bordeaux-prestige',
    name: 'Bordeaux Institutionnel',
    description: 'Bordeaux & or ambré, signature haut de gamme',
    colors: {
      primaryColor: '#7f1d1d',
      secondaryColor: '#b45309',
      accentColor: '#d97706',
      sidebarBgColor: '#ffffff',
      sidebarTextColor: '#291515',
      backgroundColor: '#f8f5f5',
    },
  },
  {
    id: 'indigo-slate',
    name: 'Indigo & Ardoise',
    description: 'Indigo moderne avec menu ardoise sombre',
    colors: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#2563eb',
      accentColor: '#10b981',
      sidebarBgColor: '#0f172a',
      sidebarTextColor: '#e2e8f0',
      backgroundColor: '#f3f5fa',
    },
  },
];
