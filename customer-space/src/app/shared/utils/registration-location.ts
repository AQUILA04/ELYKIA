import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { isE2eMode } from './e2e';

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
 */
export async function captureRegistrationLocation(): Promise<RegistrationLocation> {
  if (isE2eMode()) {
    return E2E_LOCATION;
  }

  if (Capacitor.getPlatform() !== 'web') {
    let permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
      permissions = await Geolocation.requestPermissions();
    }
    if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
      throw new Error(
        "L'accès à la localisation est nécessaire pour finaliser l'inscription. Autorisez la localisation dans les paramètres de l'application.",
      );
    }
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
}
