export interface Commercial {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  isSync?: boolean;
  syncDate?: string;
  syncHash?: string;
}