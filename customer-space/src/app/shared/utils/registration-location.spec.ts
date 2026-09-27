import { captureRegistrationLocation } from './registration-location';

describe('captureRegistrationLocation', () => {
  it('returns mock coordinates in E2E mode', async () => {
    (window as unknown as { __E2E__?: boolean }).__E2E__ = true;
    const location = await captureRegistrationLocation();
    expect(location.latitude).toBe(6.13145);
    expect(location.longitude).toBe(1.22267);
    expect(location.mll).toContain('6.13145,1.22267');
    delete (window as unknown as { __E2E__?: boolean }).__E2E__;
  });
});
