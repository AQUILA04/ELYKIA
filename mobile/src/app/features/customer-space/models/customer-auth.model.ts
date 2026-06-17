/**
 * Modèles d'authentification pour l'Espace Client ELYKIA
 * @author Francis AHONSU
 */

export interface CustomerLoginRequest {
  phone: string;
  pin: string;
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
