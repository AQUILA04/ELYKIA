import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { DeviceIdentityService } from './device-identity.service';

vi.mock('@capacitor/preferences', () => ({
    Preferences: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
    },
}));

describe('DeviceIdentityService', () => {
    let service: DeviceIdentityService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(DeviceIdentityService);
        vi.mocked(Preferences.get).mockResolvedValue({ value: null });
        vi.mocked(Preferences.set).mockResolvedValue(undefined);
        vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    });

    it('should generate and cache an installation identity on web', async () => {
        const identity = await service.getDeviceIdentity();

        expect(identity.deviceId).toBeTruthy();
        expect(identity.platform).toBeTruthy();
        expect(identity.appVersion).toBeTruthy();
        expect(service.getCachedDeviceId()).toBe(identity.deviceId);
    });
});
