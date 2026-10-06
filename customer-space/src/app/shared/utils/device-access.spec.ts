import {
  DeviceAccessDismissedError,
  DeviceAccessPrompter,
  DevicePermissionKind,
  cameraGate,
  cameraOrPhotosGate,
  ensureDevicePermission,
  isLocationServicesDisabled,
  locationGate,
  permissionKindFromError,
} from './device-access';

class FakePrompter implements DeviceAccessPrompter {
  readonly calls: string[] = [];
  acceptRequest = true;

  confirmPermissionRequest(kind: DevicePermissionKind): Promise<boolean> {
    this.calls.push(`confirm:${kind}`);
    return Promise.resolve(this.acceptRequest);
  }

  askOpenAppSettings(kind: DevicePermissionKind): Promise<void> {
    this.calls.push(`settings:${kind}`);
    return Promise.resolve();
  }

  askEnableGps(): Promise<void> {
    this.calls.push('gps');
    return Promise.resolve();
  }
}

describe('device access', () => {
  it('treats a granted location permission as already allowed', () => {
    expect(locationGate({ location: 'granted', coarseLocation: 'prompt' }).granted).toBeTrue();
    expect(locationGate({ location: 'denied', coarseLocation: 'granted' }).canRequest).toBeFalse();
  });

  it('can still ask when Android has not decided yet', () => {
    expect(locationGate({ location: 'prompt', coarseLocation: 'prompt' })).toEqual({
      granted: false,
      canRequest: true,
    });
    expect(cameraGate('prompt-with-rationale').canRequest).toBeTrue();
    expect(cameraOrPhotosGate({ camera: 'denied', photos: 'prompt' }).canRequest).toBeTrue();
    expect(cameraOrPhotosGate({ camera: 'granted', photos: 'denied' }).granted).toBeTrue();
  });

  it('recognises a disabled GPS without treating a permission refusal as GPS off', () => {
    expect(isLocationServicesDisabled(new Error('Location is not enabled'))).toBeTrue();
    expect(isLocationServicesDisabled({ message: 'Location services are not enabled', code: 'OS-PLUG-GLOC-0007' })).toBeTrue();
    expect(isLocationServicesDisabled(new Error('Location permission request was denied'))).toBeFalse();
    expect(permissionKindFromError(new Error('Location permission request was denied'))).toBe('location');
  });

  it('shows the invite, then the system request, when the user accepts', async () => {
    const prompter = new FakePrompter();
    const request = jasmine.createSpy('request').and.resolveTo({ granted: true, canRequest: false });
    await ensureDevicePermission(
      'location',
      async () => ({ granted: false, canRequest: true }),
      request,
      prompter,
    );
    expect(prompter.calls).toEqual(['confirm:location']);
    expect(request).toHaveBeenCalled();
  });

  it('opens app settings when Android will not ask again', async () => {
    const prompter = new FakePrompter();
    await expectAsync(ensureDevicePermission(
      'camera',
      async () => ({ granted: false, canRequest: false }),
      async () => ({ granted: false, canRequest: false }),
      prompter,
    )).toBeRejectedWithError(DeviceAccessDismissedError);
    expect(prompter.calls).toEqual(['settings:camera']);
  });

  it('does not open settings when the system dialog can still be shown again', async () => {
    const prompter = new FakePrompter();
    await expectAsync(ensureDevicePermission(
      'location',
      async () => ({ granted: false, canRequest: true }),
      async () => ({ granted: false, canRequest: true }),
      prompter,
    )).toBeRejectedWithError(DeviceAccessDismissedError);
    expect(prompter.calls).toEqual(['confirm:location']);
  });

  it('stops without requesting when the user dismisses the invite', async () => {
    const prompter = new FakePrompter();
    prompter.acceptRequest = false;
    const request = jasmine.createSpy('request');
    await expectAsync(ensureDevicePermission(
      'photos',
      async () => ({ granted: false, canRequest: true }),
      request,
      prompter,
    )).toBeRejectedWithError(DeviceAccessDismissedError);
    expect(request).not.toHaveBeenCalled();
  });
});
