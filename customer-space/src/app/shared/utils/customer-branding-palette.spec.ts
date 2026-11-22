import {
  buildCustomerBrandCssVariables,
  DEFAULT_CUSTOMER_COMPANY_BRANDING,
  isDefaultElykiaPalette,
  isValidHexColor,
} from './customer-branding-palette';

describe('customer-branding-palette', () => {
  it('validates 6-digit hex codes', () => {
    expect(isValidHexColor('#065f46')).toBeTrue();
    expect(isValidHexColor('#ABC123')).toBeTrue();
    expect(isValidHexColor('#123')).toBeFalse();
    expect(isValidHexColor('not-a-color')).toBeFalse();
  });

  it('preserves default wireflow navy/gold tokens when default ELYKIA palette is active', () => {
    expect(isDefaultElykiaPalette(DEFAULT_CUSTOMER_COMPANY_BRANDING)).toBeTrue();
    const vars = buildCustomerBrandCssVariables(DEFAULT_CUSTOMER_COMPANY_BRANDING);
    expect(vars['--elyk-navy']).toBe('#0D1B2A');
    expect(vars['--elyk-gold']).toBe('#C9922A');
  });

  it('derives cohesive --elyk-* tokens when enterprise customizes colors', () => {
    const vars = buildCustomerBrandCssVariables({
      primaryColor: '#065f46',
      secondaryColor: '#0d9488',
      accentColor: '#f59e0b',
    });

    expect(vars['--elyk-navy-mid']).toBe('#065f46');
    expect(vars['--elyk-navy']).not.toBe('#0D1B2A');
    expect(vars['--elyk-gold']).toBe('#f59e0b');
    expect(vars['--ion-color-primary']).toBe('#f59e0b');
    expect(vars['--elyk-header-gradient']).toContain('#065f46');
  });
});
