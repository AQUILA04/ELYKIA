/**
 * Modèles d'authentification — Espace Client ELYKIA
 */

export interface CustomerCheckPhoneRequest {
  phone: string;
}

export interface CustomerCheckPhoneResponse {
  exists: boolean;
  pinConfigured: boolean;
  canRegister?: boolean;
  maskedName?: string;
  activationStatus?: string;
}

export interface CustomerLoginRequest {
  phone: string;
  pin: string;
}

export interface CustomerOtpSendResponse {
  sessionId?: string;
  expiresAt?: string;
  channel?: string;
}

export interface CustomerOtpVerifyRequest {
  phone: string;
  code: string;
}

export interface CustomerOtpVerifyResponse {
  verified: boolean;
  otpProofToken: string;
}

export interface CustomerSetupPinRequest {
  phone: string;
  pin: string;
  /** Preuve OTP émise par /auth/verify-otp (remplace firebaseIdToken). */
  otpProofToken: string;
}

export interface CustomerRegisterRequest {
  phone: string;
  otpProofToken: string;
  firstname: string;
  lastname: string;
  address: string;
  quarter: string;
  dateOfBirth: string;
  occupation: string;
  cardType: string;
  cardID: string;
  profilPhoto: string;
  pin: string;
}

export interface CustomerLoginResponse {
  token: string;
  clientId: string;
  fullName: string;
  phone: string;
  expiresAt: string;
  activationStatus?: string;
}

export interface CustomerSession {
  token: string;
  clientId: string;
  fullName: string;
  phone: string;
  expiresAt: string;
  isAuthenticated: boolean;
  activationStatus?: string;
}

export type AuthStep =
  | 'phone'
  | 'pin'
  | 'otp'
  | 'setup-pin'
  | 'register-otp'
  | 'register-form'
  | 'register-pin';

export const CARD_TYPE_OPTIONS = [
  { value: 'CENI', label: "Carte d'électeur" },
  { value: 'Passport', label: 'Passport' },
  { value: 'ID Card', label: "Carte d'identité" },
  { value: 'NIU', label: 'Carte e-ID (NIU)' },
  { value: 'Driver License', label: 'Permis de conduire' },
];
