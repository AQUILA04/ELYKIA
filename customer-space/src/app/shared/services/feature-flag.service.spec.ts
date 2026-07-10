import { FeatureFlagService, FeatureFlags } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    sessionStorage.clear();
    service = new FeatureFlagService();
  });

  it('enables customer space by default', () => {
    expect(service.isCustomerSpaceAvailable()).toBeTrue();
  });

  it('reads E2E override when present', () => {
    (window as Window & { __E2E__?: boolean; __E2E_FLAGS__?: Record<string, boolean> }).__E2E__ = true;
    (window as Window & { __E2E_FLAGS__?: Record<string, boolean> }).__E2E_FLAGS__ = {
      [FeatureFlags.CustomerSpaceAvailable]: false,
    };

    expect(service.isCustomerSpaceAvailable()).toBeFalse();

    delete (window as Window & { __E2E__?: boolean }).__E2E__;
    delete (window as Window & { __E2E_FLAGS__?: Record<string, boolean> }).__E2E_FLAGS__;
  });
});
