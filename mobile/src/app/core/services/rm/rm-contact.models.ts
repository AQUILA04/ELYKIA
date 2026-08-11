export interface RmContactPatch {
  localId: string;
  reference: string;
  clientId: number;
  phone?: string;
  latitude?: number;
  longitude?: number;
  mll?: string;
  createdAt: string;
  isSync: boolean;
  lastError?: string | null;
}

export interface RmContactUpdateRequest {
  clientId: number;
  phone?: string;
  latitude?: number;
  longitude?: number;
  mll?: string;
  forceOffline?: boolean;
}

export interface RmContactUpdateResult {
  patch: RmContactPatch;
  mode: 'online' | 'offline';
  client: {
    id: number;
    phone?: string;
    latitude?: number;
    longitude?: number;
    mll?: string;
    firstname?: string;
    lastname?: string;
    fullName?: string;
    quarter?: string;
    collector?: string;
  };
}
