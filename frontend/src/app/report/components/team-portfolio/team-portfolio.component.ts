import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { TeamYearlySummary } from '../../models/commercial-cockpit.model';
import { CommercialCockpitService } from '../../service/commercial-cockpit.service';

/**
 * Portefeuille crédit annuel de l'équipe. Créé par un bloc @defer (on viewport) :
 * l'appel, plus coûteux, n'est fait que si l'utilisateur fait défiler jusqu'ici.
 */
@Component({
    selector: 'app-team-portfolio',
    templateUrl: './team-portfolio.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class TeamPortfolioComponent implements OnInit {
    @Input({ required: true }) year!: number;

    summary: TeamYearlySummary | null = null;
    loading = true;
    failed = false;

    constructor(private cockpitService: CommercialCockpitService, private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.cockpitService.getTeamYearlySummary(this.year).subscribe({
            next: (summary) => {
                this.summary = summary;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.failed = true;
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    /** Part déjà versée du portefeuille confié, en %. */
    get depositedShare(): number {
        const entrusted = this.summary?.entrustedPortfolioAmount || 0;
        if (entrusted <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(100, ((this.summary?.creditDepositedAmount || 0) / entrusted) * 100));
    }
}
