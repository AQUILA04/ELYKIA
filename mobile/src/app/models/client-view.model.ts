import { Client } from './client.model';
import { Account } from './account.model';
import { SafeUrl } from '@angular/platform-browser';

export interface ClientView extends Client {
  /** Alias explicite pour l'UI — identique à hasActiveCredit du Client */
  hasActiveCredit?: boolean;
  account?: Account;
  photoUrl?: SafeUrl;
  cardPhotoSafeUrl?: SafeUrl; // Renommé pour éviter le conflit avec Client.cardPhotoUrl
  thumbUrl?: String;
}
