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
