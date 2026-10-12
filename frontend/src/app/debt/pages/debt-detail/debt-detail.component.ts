import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DebtService } from '../../services/debt.service';
import { DebtDocument } from '../../models/debt.model';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-debt-detail',
  templateUrl: './debt-detail.component.html',
  styleUrls: ['./debt-detail.component.scss']
})
export class DebtDetailComponent implements OnInit {
  debt: DebtDocument | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debtService: DebtService,
    private alertService: AlertService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/debts']);
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.spinner.show();
    this.debtService.getById(id).subscribe({
      next: (debt) => {
        this.debt = debt;
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
        this.alertService.showError('Dette introuvable.');
        this.router.navigate(['/debts']);
      }
    });
  }

  recalculate(): void {
    if (!this.debt) return;
    this.spinner.show();
    this.debtService.recalculate(this.debt.id).subscribe({
      next: (debt) => {
        this.debt = debt;
        this.spinner.hide();
        this.alertService.showSuccess('Dette recalculée.');
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError(err?.error?.message || 'Recalcul impossible.');
      }
    });
  }

  cancelDebt(): void {
    if (!this.debt) return;
    const reason = prompt('Motif d\'annulation (optionnel) :') || undefined;
    this.spinner.show();
    this.debtService.cancel(this.debt.id, reason).subscribe({
      next: (debt) => {
        this.debt = debt;
        this.spinner.hide();
        this.alertService.showSuccess('Dette annulée.');
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError(err?.error?.message || 'Annulation impossible.');
      }
    });
  }

  back(): void {
    this.router.navigate(['/debts']);
  }
}
