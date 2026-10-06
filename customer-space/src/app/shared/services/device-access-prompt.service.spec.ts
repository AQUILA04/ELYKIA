import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { DeviceAccessDismissedError } from '../utils/device-access';
import { DeviceAccessPromptService, DeviceSettingsGateway } from './device-access-prompt.service';

describe('DeviceAccessPromptService', () => {
  let create: jasmine.Spy;
  let settings: jasmine.SpyObj<DeviceSettingsGateway>;
  let service: DeviceAccessPromptService;

  beforeEach(() => {
    create = jasmine.createSpy('create').and.callFake(async () => ({
      present: () => Promise.resolve(),
      onDidDismiss: () => new Promise(() => undefined),
    }));
    settings = jasmine.createSpyObj('DeviceSettingsGateway', ['openAppSettings', 'openLocationSettings']);
    settings.openAppSettings.and.resolveTo();
    settings.openLocationSettings.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        DeviceAccessPromptService,
        { provide: AlertController, useValue: { create } },
        { provide: DeviceSettingsGateway, useValue: settings },
      ],
    });
    service = TestBed.inject(DeviceAccessPromptService);
  });

  it('invites to enable GPS and opens the phone location settings', async () => {
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');

    const pending = service.askEnableGps();
    await flushAlert();

    const options = create.calls.mostRecent().args[0];
    expect(options.header).toBe('Activez le GPS');
    expect(options.message).toContain('GPS de votre téléphone');
    const primary = options.buttons.find((button: { text: string }) => button.text === 'Activer le GPS');
    primary.handler();
    await pending;
    expect(settings.openLocationSettings).toHaveBeenCalled();
  });

  it('does not open a second window when the invite was already shown', async () => {
    const handled = await service.presentIfNeeded(new DeviceAccessDismissedError());
    expect(handled).toBeTrue();
    expect(create).not.toHaveBeenCalled();
  });

  async function flushAlert(): Promise<void> {
    for (let i = 0; i < 5 && !create.calls.any(); i += 1) {
      await Promise.resolve();
    }
  }
});
