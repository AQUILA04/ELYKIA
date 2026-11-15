import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommercialAccount, CommercialDirectoryService, apiErrorMessage } from '../service/commercial-directory.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-commercial-accounts',
  templateUrl: './commercial-accounts.component.html',
  styleUrls: ['../commercial-page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CommercialAccountsComponent implements OnInit, OnDestroy {
  accounts: CommercialAccount[] = [];
  search = '';
  loading = true;
  currentDate = new Date();
  lastUpdate = new Date();
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly directory: CommercialDirectoryService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.timer = setInterval(() => this.currentDate = new Date(), 1000);
    this.load();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  get filtered(): CommercialAccount[] {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.accounts;
    }
    return this.accounts.filter(account =>
      `${account.username} ${account.holderName ?? ''} ${account.firstname ?? ''} ${account.lastname ?? ''}`
        .toLowerCase()
        .includes(term));
  }

  get assignedCount(): number {
    return this.accounts.filter(account => !!account.holderName).length;
  }

  load(): void {
    this.loading = true;
    this.directory.listAccounts().subscribe({
      next: accounts => {
        this.accounts = accounts;
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: error => {
        this.loading = false;
        this.alertService.showError(apiErrorMessage(error, 'Les comptes commerciaux n\'ont pas pu être chargés.'));
      }
    });
  }
}
