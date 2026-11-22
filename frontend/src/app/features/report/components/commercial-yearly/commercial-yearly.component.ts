import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { CommercialYearlySummary } from '../../models/commercial-yearly-summary.model';
import { CommercialTontineYearlySummary } from '../../models/commercial-tontine-yearly-summary.model';
import { DailyReportService } from '../../service/daily-report.service';
import { RemainingAtClientsDialogComponent } from '../remaining-at-clients-dialog/remaining-at-clients-dialog.component';

/**
 * Bilans crédit et tontine de l'année d'un commercial. Créé par un bloc @defer (on viewport) ;
 * se recharge quand on passe au commercial suivant.
 */
@Component({
    selector: 'app-commercial-yearly',
    templateUrl: './commercial-yearly.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class CommercialYearlyComponent implements OnChanges, OnDestroy {
    @Input({ required: true }) commercial!: string;
    @Input({ required: true }) year!: number;

    credit: CommercialYearlySummary | null = null;
    tontine: CommercialTontineYearlySummary | null = null;
    loading = true;

    private readonly load$ = new Subject<void>();
    private readonly destroy$ = new Subject<void>();

    constructor(
        private dailyReportService: DailyReportService,
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef
    ) {
        this.load$.pipe(
            switchMap(() => forkJoin({
                credit: this.dailyReportService.getYearlySummary(this.year, this.commercial).pipe(catchError(() => of(null))),
                tontine: this.dailyReportService.getYearlyTontineSummary(this.year, this.commercial).pipe(catchError(() => of(null)))
            })),
            takeUntil(this.destroy$)
        ).subscribe(({ credit, tontine }) => {
            this.credit = credit;
            this.tontine = tontine;
            this.loading = false;
            this.cdr.markForCheck();
        });
    }

    ngOnChanges(): void {
        if (this.commercial) {
            this.loading = true;
            this.load$.next();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get paidShare(): number {
        const entrusted = this.credit?.entrustedPortfolioAmount || 0;
        if (entrusted <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(100, ((this.credit?.totalCreditDepositedAmount || 0) / entrusted) * 100));
    }

    /** Écart tontine : collecté − versé (négatif quand le versé dépasse le collecté). */
    get tontineGap(): number {
        return (this.tontine?.totalTontineCollectionsAmount || 0) - (this.tontine?.totalTontineDepositedAmount || 0);
    }

    get tontineGapAbs(): number {
        return Math.abs(this.tontineGap);
    }

    openRemainingAtClients(): void {
        if (!this.credit) {
            return;
        }
        this.dialog.open(RemainingAtClientsDialogComponent, {
            width: '960px',
            maxWidth: '96vw',
            panelClass: 'remaining-at-clients-dialog-panel',
            data: {
                year: this.year,
                commercialUsername: this.commercial,
                remainingAtCommercialAmount: this.credit.remainingAtCommercialAmount,
                remainingAtClientAmount: this.credit.remainingAtClientAmount,
                entrustedPortfolioAmount: this.credit.entrustedPortfolioAmount
            }
        });
    }
}
