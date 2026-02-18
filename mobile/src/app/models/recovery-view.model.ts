
import { Recovery } from './recovery.model';
import { Client } from './client.model';
import { Distribution } from './distribution.model';

export interface RecoveryView extends Omit<Recovery, 'clientId' | 'distributionId'> {
  client: Client | undefined;
  distribution: Distribution | undefined;

  // Flat fields for Native View performance
  clientName?: string;
  clientQuarter?: string;
  distributionReference?: string;
}
