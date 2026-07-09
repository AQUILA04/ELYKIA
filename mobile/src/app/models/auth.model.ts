export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
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
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  deviceRestrictionActive?: boolean;
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
