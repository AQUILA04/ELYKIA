import { TestBed } from '@angular/core/testing';
import { DatabaseService } from '../services/database.service';
import { ArticleRepository } from './article.repository';
import { ClientRepository } from './client.repository';
import { LocalityRepository } from './locality.repository';
import { CommercialRepository } from './commercial.repository';
import { DistributionRepository } from './distribution.repository';
import { AccountRepository } from './account.repository';
import { StockOutputRepository } from './stock-output.repository';
import { OrderRepository } from './order.repository';
import { RecoveryRepository } from './recovery.repository';
import { TontineSessionRepository } from './tontine-session.repository';
import { TontineMemberRepository } from './tontine-member.repository';
import { TontineCollectionRepository } from './tontine-collection.repository';
import { TontineDeliveryRepository } from './tontine-delivery.repository';
import { DailyReportRepository } from './daily-report.repository';
import { TransactionRepository } from './transaction.repository';

describe('Repositories Compilation Check', () => {
    let dbService: DatabaseService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [DatabaseService]
        });
        dbService = TestBed.inject(DatabaseService);
    });

    it('should instantiate all repositories', () => {
        const articleRepo = new ArticleRepository(dbService);
        const clientRepo = new ClientRepository(dbService);
        const localityRepo = new LocalityRepository(dbService);
        const commercialRepo = new CommercialRepository(dbService);
        const distributionRepo = new DistributionRepository(dbService);
        const accountRepo = new AccountRepository(dbService);
        const stockOutputRepo = new StockOutputRepository(dbService);
        const orderRepo = new OrderRepository(dbService);
        const recoveryRepo = new RecoveryRepository(dbService);
        const tontineSessionRepo = new TontineSessionRepository(dbService);
        const tontineMemberRepo = new TontineMemberRepository(dbService);
        const tontineCollectionRepo = new TontineCollectionRepository(dbService);
        const tontineDeliveryRepo = new TontineDeliveryRepository(dbService);
        const dailyReportRepo = new DailyReportRepository(dbService);
        const transactionRepo = new TransactionRepository(dbService);

        expect(articleRepo).toBeTruthy();
        expect(clientRepo).toBeTruthy();
        expect(localityRepo).toBeTruthy();
        expect(commercialRepo).toBeTruthy();
        expect(distributionRepo).toBeTruthy();
        expect(accountRepo).toBeTruthy();
        expect(stockOutputRepo).toBeTruthy();
        expect(orderRepo).toBeTruthy();
        expect(recoveryRepo).toBeTruthy();
        expect(tontineSessionRepo).toBeTruthy();
        expect(tontineMemberRepo).toBeTruthy();
        expect(tontineCollectionRepo).toBeTruthy();
        expect(tontineDeliveryRepo).toBeTruthy();
        expect(dailyReportRepo).toBeTruthy();
        expect(transactionRepo).toBeTruthy();
    });
});
