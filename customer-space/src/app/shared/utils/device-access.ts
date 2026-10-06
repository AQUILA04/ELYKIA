import type { PermissionState } from '@capacitor/core';

/** Autorisation Android demandée par l'application. */
export type DevicePermissionKind = 'location' | 'camera' | 'photos';

export interface PermissionGate {
  granted: boolean;
  /** Le dialogue système peut encore s'afficher. */
  canRequest: boolean;
}

export interface DeviceAccessPrompter {
  /** L'utilisateur accepte d'afficher le dialogue système d'autorisation. */
  confirmPermissionRequest(kind: DevicePermissionKind): Promise<boolean>;
  /** Invite à ouvrir les paramètres de l'application pour accorder l'autorisation. */
  askOpenAppSettings(kind: DevicePermissionKind): Promise<void>;
  /** Invite à activer le GPS du téléphone. */
  askEnableGps(): Promise<void>;
}

export const DEVICE_ACCESS_COPY = {
  location: {
    request:
      "Pour finaliser votre inscription, Elykia a besoin d'accéder à votre position. Autorisez la localisation pour cette application.",
    settings:
      "La localisation n'est pas autorisée pour Elykia. Ouvrez les paramètres de l'application, activez la localisation, puis réessayez.",
  },
  camera: {
    request:
      "Pour ajouter votre photo, Elykia a besoin de l'appareil photo. Autorisez l'appareil photo pour cette application.",
    settings:
      "L'appareil photo n'est pas autorisé pour Elykia. Ouvrez les paramètres de l'application, activez l'appareil photo, puis réessayez.",
  },
  photos: {
    request:
      "Pour joindre votre justificatif, Elykia a besoin de l'appareil photo ou de vos photos. Autorisez cet accès pour cette application.",
    settings:
      "L'accès aux photos n'est pas autorisé pour Elykia. Ouvrez les paramètres de l'application, activez l'appareil photo ou les photos, puis réessayez.",
  },
  gps: {
    android:
      'Le GPS de votre téléphone est désactivé. Activez-le pour finaliser votre inscription.',
    other:
      'La localisation de votre appareil est désactivée. Activez-la, puis réessayez.',
  },
} as const;

/** L'utilisateur a fermé la fenêtre : ne pas afficher le message sur le formulaire. */
export class DeviceAccessDismissedError extends Error {
  constructor() {
    super('');
    this.name = 'DeviceAccessDismissedError';
  }
}

export class DevicePermissionDeniedError extends Error {
  constructor(readonly kind: DevicePermissionKind) {
    super(DEVICE_ACCESS_COPY[kind].settings);
    this.name = 'DevicePermissionDeniedError';
  }
}

export class LocationServicesDisabledError extends Error {
  constructor() {
    super(DEVICE_ACCESS_COPY.gps.android);
    this.name = 'LocationServicesDisabledError';
  }
}

export function isDeviceAccessDismissed(error: unknown): boolean {
  return error instanceof DeviceAccessDismissedError;
}

export function locationGate(permissions: {
  location: PermissionState;
  coarseLocation: PermissionState;
}): PermissionGate {
  const granted = permissions.location === 'granted' || permissions.coarseLocation === 'granted';
  return {
    granted,
    canRequest: !granted && canStillRequest(permissions.location, permissions.coarseLocation),
  };
}

export function cameraGate(state: string): PermissionGate {
  return {
    granted: state === 'granted' || state === 'limited',
    canRequest: state === 'prompt' || state === 'prompt-with-rationale',
  };
}

/** Une capture de justificatif suffit avec l'appareil photo ou la galerie. */
export function cameraOrPhotosGate(permissions: {
  camera: string;
  photos: string;
}): PermissionGate {
  const granted = isAccessGranted(permissions.camera) || isAccessGranted(permissions.photos);
  return {
    granted,
    canRequest: !granted && canStillRequest(permissions.camera, permissions.photos),
  };
}

/**
 * Demande l'autorisation si besoin.
 * Sans prompter, lève DevicePermissionDeniedError.
 * Avec prompter, affiche la fenêtre puis lève DeviceAccessDismissedError si l'accès reste refusé.
 */
export async function ensureDevicePermission(
  kind: DevicePermissionKind,
  read: () => Promise<PermissionGate>,
  request: () => Promise<PermissionGate>,
  prompter?: DeviceAccessPrompter,
): Promise<void> {
  let gate = await read();
  if (gate.granted) {
    return;
  }
  if (!prompter) {
    throw new DevicePermissionDeniedError(kind);
  }
  if (gate.canRequest) {
    const accepted = await prompter.confirmPermissionRequest(kind);
    if (!accepted) {
      throw new DeviceAccessDismissedError();
    }
    gate = await request();
    if (gate.granted) {
      return;
    }
  }
  if (!gate.canRequest) {
    await prompter.askOpenAppSettings(kind);
  }
  throw new DeviceAccessDismissedError();
}

export function isLocationServicesDisabled(error: unknown): boolean {
  if (error instanceof LocationServicesDisabledError) {
    return true;
  }
  if (error instanceof DeviceAccessDismissedError || error instanceof DevicePermissionDeniedError) {
    return false;
  }
  const text = errorText(error).toLowerCase();
  if (
    text.includes('os-plug-gloc-0007')
    || text.includes('os-plug-gloc-0009')
    || text.includes('os-plug-gloc-0017')
  ) {
    return true;
  }
  if (text.includes('os-plug-gloc-0003') || text.includes('permission')) {
    return false;
  }
  return (
    text.includes('location services are not enabled')
    || text.includes('location is not enabled')
    || text.includes('location disabled')
    || (text.includes('location') && text.includes('not enabled'))
    || (text.includes('location') && text.includes('turned off'))
  );
}

/** Message d'autorisation refusé remonté par le plugin, hors GPS éteint. */
export function permissionKindFromError(error: unknown): DevicePermissionKind | null {
  if (error instanceof DevicePermissionDeniedError) {
    return error.kind;
  }
  if (isLocationServicesDisabled(error) || isDeviceAccessDismissed(error)) {
    return null;
  }
  const text = errorText(error).toLowerCase();
  if (text.includes('os-plug-gloc-0003') || (text.includes('location') && text.includes('permission'))) {
    return 'location';
  }
  if (text.includes('camera') && (text.includes('denied') || text.includes('permission'))) {
    return 'camera';
  }
  if (
    (text.includes('photo') || text.includes('gallery'))
    && (text.includes('denied') || text.includes('permission'))
  ) {
    return 'photos';
  }
  return null;
}

function canStillRequest(...states: string[]): boolean {
  return states.some((state) => state === 'prompt' || state === 'prompt-with-rationale');
}

function isAccessGranted(state: string): boolean {
  return state === 'granted' || state === 'limited';
}

function errorText(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    const extra = error as Error & { code?: string };
    return `${extra.code ?? ''} ${extra.message}`;
  }
  if (error && typeof error === 'object') {
    const record = error as { message?: string; code?: string; errorMessage?: string };
    return `${record.code ?? ''} ${record.message ?? ''} ${record.errorMessage ?? ''}`;
  }
  return '';
}
