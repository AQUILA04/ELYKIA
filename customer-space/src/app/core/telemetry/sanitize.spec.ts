import { sanitizeProps } from './sanitize';

describe('sanitizeProps', () => {
  it('strips pin otp token password and photo fields', () => {
    const result = sanitizeProps({
      pin: '1234',
      otp: '999999',
      code: 'abc',
      password: 'x',
      token: 'secret',
      otpProofToken: 'proof',
      profilPhoto: 'data:image/png;base64,AAAA',
      amount: 5000,
      reason: 'ok',
    });
    expect(result).toEqual({ amount: 5000, reason: 'ok' });
  });

  it('truncates very long strings', () => {
    const long = 'a'.repeat(600);
    const result = sanitizeProps({ note: long });
    expect(String(result!['note'])).toContain('[truncated 600]');
  });
});
