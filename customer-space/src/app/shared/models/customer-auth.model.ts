/**
 * Modèles d'authentification — Espace Client ELYKIA
 */

export interface CustomerCheckPhoneRequest {
  phone: string;
}

export interface CustomerCheckPhoneResponse {
  exists: boolean;
  pinConfigured: boolean;
  maskedName?: string;
}

export interface CustomerLoginRequest {
  phone: string;
  pin: string;
}

export interface CustomerSetupPinRequest {
  phone: string;
  pin: string;
  firebaseIdToken: string;
}

export interface CustomerLoginResponse {
  token: string;
  clientId: string;
  fullName: string;
  phone: string;
  expiresAt: string;
}

export interface CustomerSession {
  token: string;
  clientId: string;
  fullName: string;
  phone: string;
  expiresAt: string;
  isAuthenticated: boolean;
}

export type AuthStep = 'phone' | 'pin' | 'otp' | 'setup-pin';
