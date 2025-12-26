export interface Locality {
  id: string;
  name: string;
  region?: string;
  isActive?: boolean;
  createdAt?: string;
  isLocal?: boolean;
  isSync?: boolean;
  syncHash?: string;
}