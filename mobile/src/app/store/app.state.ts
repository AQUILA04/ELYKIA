import { AuthState } from './auth/auth.reducer';
import { ClientState } from './client/client.reducer';
import { ArticleState } from './article/article.reducer';
import { CommercialState } from './commercial/commercial.reducer';
import { StockOutputState } from './stock-output/stock-output.reducer';
import { DistributionState } from './distribution/distribution.reducer';
import { AccountState } from './account/account.reducer';
import { HealthCheckState } from './health-check/health-check.reducer';
import { RecoveryState } from './recovery/recovery.reducer';
import { TransactionState } from './transaction/transaction.reducer';
import { SyncState } from './sync/sync.reducer';
import { LocalityState } from './locality/locality.reducer';

export interface AppState {
  auth: AuthState | undefined;
  client: ClientState | undefined;
  article: ArticleState | undefined;
  commercial: CommercialState | undefined;
  stockOutput: StockOutputState | undefined;
  distribution: DistributionState | undefined;
  account: AccountState | undefined;
  healthCheck: HealthCheckState | undefined;
  recovery: RecoveryState | undefined;
  transaction: TransactionState | undefined;
  sync: SyncState | undefined;
  locality: LocalityState | undefined;
}
