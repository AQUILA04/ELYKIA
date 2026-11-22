import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardV2Service } from './dashboard-v2.service';
import { CreditService } from '@features/credit/service/credit.service';
import { ClientService } from '@features/client/service/client.service';
import { TontineCollecteService } from '@features/tontine/services/tontine-collecte.service';
import { ItemService } from '@features/article/service/item.service';
import { CommercialStockService } from '@features/stock/services/commercial-stock.service';
import { DailyOperationService } from '@features/report/service/daily-operation.service';
import { BiSalesService } from '@features/bi/services/bi-sales.service';
import { BiCollectionsService } from '@features/bi/services/bi-collections.service';

describe('DashboardV2Service', () => {
    let service: DashboardV2Service;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DashboardV2Service,
                {
                    provide: CreditService,
                    useValue: {
                        getListSummary: () => of({
                            statusCode: 200,
                            data: {
                                inProgressCredit: {
                                    count: 2,
                                    totalAmount: 100000,
                                    totalMargin: 20000,
                                    totalAmountRemaining: 40000
                                }
                            }
                        }),
                        searchCredits: () => of({ data: { content: [] } })
                    }
                },
                {
                    provide: ClientService,
                    useValue: {
                        getClientKpis: () => of({
                            totalRegistered: 10,
                            withActiveCredit: 3,
                            tontineMembers: 2,
                            withoutCreditNorTontine: 5
                        })
                    }
                },
                {
                    provide: TontineCollecteService,
                    useValue: {
                        getSummary: () => of({ data: { totalMontant: 5000, totalMises: 4, totalSocietyShare: 800 } })
                    }
                },
                {
                    provide: ItemService,
                    useValue: {
                        getArticleStockKpis: () => of({
                            inStockCount: 50,
                            lowStockCount: 5,
                            outOfStockCount: 2,
                            creditSaleTotal: 1200000,
                            purchaseTotal: 0,
                            estimatedMargin: 0,
                            sellingSaleTotal: 0,
                            estimatedSellingMargin: 0
                        })
                    }
                },
                {
                    provide: CommercialStockService,
                    useValue: {
                        getStockByDate: () => of({ items: [] }),
                        getCurrentStock: () => of({ items: [] })
                    }
                },
                {
                    provide: DailyOperationService,
                    useValue: {
                        getOperations: () => of({ content: [] })
                    }
                },
                {
                    provide: BiSalesService,
                    useValue: { getSalesTrends: () => of([]) }
                },
                {
                    provide: BiCollectionsService,
                    useValue: { getCollectionTrends: () => of([]) }
                }
            ]
        });

        service = TestBed.inject(DashboardV2Service);
    });

    it('computes recovered amount as total minus remaining', async () => {
        const period = service.buildPeriod(2026, 6);
        service.loadDashboard(period, undefined, false).subscribe((data) => {
            expect(data.credit.recoveredAmount).toBe(60000);
            expect(data.credit.remainingAmount).toBe(40000);
            expect(data.stock.mode).toBe('warehouse');
            ;
        });
    });
});
