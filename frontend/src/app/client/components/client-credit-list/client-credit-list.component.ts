import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { CreditService } from 'src/app/credit/service/credit.service';

@Component({
  selector: 'app-client-credit-list',
  templateUrl: './client-credit-list.component.html',
  styleUrls: ['./client-credit-list.component.scss']
})
export class ClientCreditListComponent {
  @Input() credits: any[] = [];
  @Input() totalCreditElements: number = 0;
  @Input() creditPageSize: number = 5;

  @Output() pageChange = new EventEmitter<PageEvent>();

  // Map to store timelines for each credit
  creditTimelines: { [key: number]: any[] } = {};
  loadingTimelines: { [key: number]: boolean } = {};

  // Map to store articles for each credit
  creditArticles: { [key: number]: any[] } = {};
  loadingArticles: { [key: number]: boolean } = {};

  constructor(private creditService: CreditService) {}

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  getStatusLabel(status: string): string {
    const translations: {[key: string]: string} = {
      'CREATED': 'Créé',
      'VALIDATED': 'Validé',
      'INPROGRESS': 'En cours',
      'DELIVERED': 'Livré',
      'ENDED': 'Terminé',
      'SETTLED': 'Clôturé',
      'ACTIF': 'Actif',
      'STARTED': 'Démarré'
    };
    return translations[status] || status;
  }

  getStatusClass(status: string): string {
    const badgeClasses: {[key: string]: string} = {
      'ACTIF': 'badge-success',
      'CREATED': 'badge-primary',
      'VALIDATED': 'badge-success',
      'INPROGRESS': 'badge-warning',
      'DELIVERED': 'badge-success',
      'ENDED': 'badge-dark',
      'SETTLED': 'badge-secondary',
      'STARTED': 'badge-success'
    };
    return badgeClasses[status] || 'badge-secondary';
  }

  onExpand(creditId: number): void {
    if (!this.creditTimelines[creditId] && !this.loadingTimelines[creditId]) {
      this.loadTimelines(creditId);
    }
    if (!this.creditArticles[creditId] && !this.loadingArticles[creditId]) {
      this.loadArticles(creditId);
    }
  }

  loadTimelines(creditId: number): void {
    this.loadingTimelines[creditId] = true;
    this.creditService.getEcheancesByCredit(creditId, 0, 100, 'id,desc').subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
          this.creditTimelines[creditId] = response.data.content;
        }
        this.loadingTimelines[creditId] = false;
      },
      (error) => {
        console.error('Error loading timelines for credit', creditId, error);
        this.loadingTimelines[creditId] = false;
      }
    );
  }

  loadArticles(creditId: number): void {
    this.loadingArticles[creditId] = true;
    this.creditService.getCreditArticles(creditId).subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
          this.creditArticles[creditId] = response.data;
        }
        this.loadingArticles[creditId] = false;
      },
      (error) => {
        console.error('Error loading articles for credit', creditId, error);
        this.loadingArticles[creditId] = false;
      }
    );
  }
}
