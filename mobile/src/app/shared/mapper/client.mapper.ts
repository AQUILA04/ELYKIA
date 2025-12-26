import { Client } from '../../models/client.model';
import { Util } from '../../core/util/util';

export class ClientMapper {
  static toLocal(clientBackend: any): Client {
    return {
      id: clientBackend.id,
      firstname: clientBackend.firstname,
      lastname: clientBackend.lastname,
      fullName: clientBackend.fullName || `${clientBackend.firstname} ${clientBackend.lastname}`,
      phone: clientBackend.phone,
      address: clientBackend.address,
      dateOfBirth: clientBackend.dateOfBirth,
      occupation: clientBackend.occupation,
      clientType: clientBackend.clientType || 'CLIENT',
      cardType: clientBackend.cardType,
      cardID: clientBackend.cardID,
      quarter: clientBackend.quarter,
      commercial: clientBackend.collector || clientBackend.commercial || '',
      isLocal: !!clientBackend.isLocal,
      isSync: clientBackend.isSync ?? true,
      syncDate: clientBackend.syncDate ?? new Date().toISOString(),
      latitude: clientBackend.latitude ?? 0,
      longitude: clientBackend.longitude ?? 0,
      mll: clientBackend.mll ||'',
      profilPhoto: clientBackend.profilPhoto,
      contactPersonName: clientBackend.contactPersonName || '',
      contactPersonPhone: clientBackend.contactPersonPhone || '',
      contactPersonAddress: clientBackend.contactPersonAddress || '',
      creditInProgress: Boolean(clientBackend.creditInProgress),
      createdAt: clientBackend.createdAt ?? new Date().toISOString(),
      syncHash: clientBackend.syncHash,
      code: clientBackend.code,
      cardPhoto: clientBackend.cardPhoto || clientBackend.iddoc || '',
      profilPhotoUrl: clientBackend.profilPhotoUrl || '',
      cardPhotoUrl: clientBackend.cardPhotoUrl || ''
    };
  }
  static toBackend(clientLocal: Client, base64Photo: string | null): any {
    return {
      id: clientLocal.id,
      firstname: clientLocal.firstname,
      lastname: clientLocal.lastname,
      phone: clientLocal.phone,
      address: clientLocal.address,
      dateOfBirth: clientLocal.dateOfBirth,
      occupation: clientLocal.occupation,
      clientType: clientLocal.clientType || 'CLIENT',
      cardType: clientLocal.cardType,
      cardID: clientLocal.cardID,
      quarter: clientLocal.quarter,
      collector: clientLocal.commercial,
      isLocal: clientLocal.isLocal,
      isSync: clientLocal.isSync,
      syncDate: clientLocal.syncDate,
      latitude: clientLocal.latitude,
      longitude: clientLocal.longitude,
      mll: clientLocal.mll,
      profilPhoto: base64Photo || '',
      contactPersonName: clientLocal.contactPersonName || '',
      contactPersonPhone: clientLocal.contactPersonPhone || '',
      contactPersonAddress: clientLocal.contactPersonAddress || '',
      creditInProgress: Boolean(clientLocal.creditInProgress),
      createdAt: clientLocal.createdAt,
      syncHash: clientLocal.syncHash,
    };
  }
}
