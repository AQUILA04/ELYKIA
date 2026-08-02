export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  /** User profile name from JwtResponse (e.g. PROMOTER, RECOVERY_MANAGER). */
  profil?: string;
  accessToken: string;
  refreshToken: string;
  passwordHash?: string; // For local storage
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
  roles: string[];
  profil?: string;
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  deviceRestrictionActive?: boolean;
  mustChangePassword?: boolean;
}

export const RECOVERY_MANAGER_PROFIL = 'RECOVERY_MANAGER';

export interface MobileSsoPayload {
  accessToken: string;
  refreshToken: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
  profil?: string;
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  deviceId?: string;
  deviceLabel?: string;
  platform?: string;
  model?: string;
  appVersion?: string;
}
