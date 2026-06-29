import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { DeviceIdentityService } from './device-identity.service';

describe('DeviceIdentityService', () => {
  let service: DeviceIdentityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceIdentityService);
    spyOn(Preferences, 'get').and.resolveTo({ value: null });
    spyOn(Preferences, 'set').and.resolveTo();
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
  });

  it('should generate and cache an installation identity on web', async () => {
    const identity = await service.getDeviceIdentity();

    expect(identity.deviceId).toBeTruthy();
    expect(identity.platform).toBeTruthy();
    expect(identity.appVersion).toBeTruthy();
    expect(service.getCachedDeviceId()).toBe(identity.deviceId);
  });
});
