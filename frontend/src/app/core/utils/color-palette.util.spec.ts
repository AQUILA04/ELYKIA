import { describe, expect, it } from 'vitest';
import {
  buildBrandCssVariables,
  darkenHex,
  getContrastTextColor,
  hexToRgbTuple,
  isValidHexColor,
  lightenHex,
  normalizeHexColor,
} from './color-palette.util';
import { DEFAULT_BRAND_COLORS } from '@core/models/company-branding.model';

describe('color-palette.util', () => {
  it('validates and normalizes 6-digit hex colors', () => {
    expect(isValidHexColor('#003366')).toBe(true);
    expect(isValidHexColor('#AbCdEf')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('003366')).toBe(false);
    expect(isValidHexColor(null)).toBe(false);

    expect(normalizeHexColor(' #1B4D3E ', '#003366')).toBe('#1b4d3e');
    expect(normalizeHexColor('invalid', '#003366')).toBe('#003366');
  });

  it('converts hex to RGB tuple and computes darken/lighten ramps', () => {
    expect(hexToRgbTuple('#003366')).toBe('0, 51, 102');
    expect(darkenHex('#ffffff', 0.5)).toBe('#808080');
    expect(lightenHex('#000000', 0.5)).toBe('#808080');
  });

  it('computes readable WCAG contrast text color', () => {
    expect(getContrastTextColor('#003366')).toBe('#ffffff');
    expect(getContrastTextColor('#ffffff')).toBe('#0f172a');
    expect(getContrastTextColor('#f2f4f8')).toBe('#0f172a');
  });

  it('builds a full harmonious CSS custom property map from brand colors', () => {
    const vars = buildBrandCssVariables({
      ...DEFAULT_BRAND_COLORS,
      primaryColor: '#065f46',
      secondaryColor: '#0d9488',
      accentColor: '#f59e0b',
      sidebarBgColor: '#042f2e',
      sidebarTextColor: '#e2f1ed',
      backgroundColor: '#f1f7f5',
    });

    expect(vars['--brand-primary']).toBe('#065f46');
    expect(vars['--brand-primary-rgb']).toBe('6, 95, 70');
    expect(vars['--brand-primary-contrast']).toBe('#ffffff');
    expect(vars['--navy-700']).toBe('#065f46');
    expect(vars['--navy-500']).toBe('#0d9488');
    expect(vars['--teal-500']).toBe('#f59e0b');
    expect(vars['--surface-page']).toBe('#f1f7f5');
    expect(vars['--brand-sidebar-bg']).toBe('#042f2e');
    expect(vars['--brand-sidebar-active-text']).toBe('#ffffff');
  });
});
