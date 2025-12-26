export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
  passwordHash?: string; // For local storage
}

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
  roles: string[];
  tokenType: string;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
