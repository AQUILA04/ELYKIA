import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { isE2eMode } from './e2e';
import {
  DeviceAccessDismissedError,
  DeviceAccessPrompter,
  DevicePermissionDeniedError,
  ensureDevicePermission,
  isDeviceAccessDismissed,
  isLocationServicesDisabled,
  locationGate,
  LocationServicesDisabledError,
} from './device-access';

export interface RegistrationLocation {
  latitude: number;
  longitude: number;
  mll: string;
}

const E2E_LOCATION: RegistrationLocation = {
  latitude: 6.13145,
  longitude: 1.22267,
  mll: 'https://www.google.com/maps/search/?api=1&query=6.13145,1.22267',
};

function toMll(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Capture GPS pour l'inscription. Demande la permission Android si besoin.
 * En mode E2E, retourne des coordonnées mock.
 * Avec un prompter, un refus ou un GPS éteint ouvre une fenêtre au lieu d'un message de formulaire.
 */
export async function captureRegistrationLocation(
  prompter?: DeviceAccessPrompter,
): Promise<RegistrationLocation> {
  if (isE2eMode()) {
    return E2E_LOCATION;
  }

  try {
    if (Capacitor.getPlatform() !== 'web') {
      await ensureDevicePermission(
        'location',
        async () => locationGate(await Geolocation.checkPermissions()),
        async () => {
          try {
            return locationGate(await Geolocation.requestPermissions());
          } catch (error) {
            if (isLocationServicesDisabled(error)) {
              throw error;
            }
            return { granted: false, canRequest: false };
          }
        },
        prompter,
      );
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
    });
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    return {
      latitude,
      longitude,
      mll: toMll(latitude, longitude),
    };
  } catch (error) {
    if (isDeviceAccessDismissed(error) || error instanceof DevicePermissionDeniedError) {
      throw error;
    }
    if (isLocationServicesDisabled(error)) {
      if (prompter) {
        await prompter.askEnableGps();
        throw new DeviceAccessDismissedError();
      }
      throw new LocationServicesDisabledError();
    }
    throw error;
  }
}
