import { Locality } from './locality.model';

export interface Client {
  id: string;
  firstname: string;
  lastname: string;
  fullName?: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  occupation: string;
  clientType: string;
  cardType: string;
  cardID: string;
  quarter: string;
  latitude?: number;
  longitude?: number;
  mll?: string;
  profilPhoto?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonAddress?: string;
  commercial: string;
  creditInProgress?: boolean;
  businessCreditInProgress?: boolean;
  businessCreditAuthorized?: boolean;
  businessCreditAuthorizedBy?: string;
  businessCreditAuthorizedAt?: string;
  /** Dérivé des distributions : au moins une distribution avec remainingAmount > 0 */
  hasActiveCredit?: boolean;
  isLocal?: boolean;
  isSync?: boolean;
  syncDate?: string;
  createdAt?: string;
  locality?: Locality;
  syncHash?: string;
  code?: string;
  cardPhoto?: string;
  updated?: boolean;
  updatedInfo?: boolean;
  profilPhotoUrl?: string;
  cardPhotoUrl?: string;
  profilPhotoThumbUrl?: string;
  cardPhotoThumbUrl?: string;
  updatedPhotoUrl?: boolean;
  tontineCollector?: string;
}
