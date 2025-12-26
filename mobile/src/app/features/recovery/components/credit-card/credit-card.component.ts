import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Distribution } from '../../../../models/distribution.model';

@Component({
  selector: 'app-credit-card',
  templateUrl: './credit-card.component.html',
  styleUrls: ['./credit-card.component.scss'],
  standalone: false
})
export class CreditCardComponent {
  @Input() credit!: Distribution;
  @Input() isSelected: boolean = false;
  @Output() creditSelected = new EventEmitter<Distribution>();

  onSelectCredit() {
    this.creditSelected.emit(this.credit);
  }

  getProgressPercentage(): number {
    if (!this.credit.totalAmount || this.credit.totalAmount === 0) {
      return 0;
    }
    const paidAmount = this.credit.totalAmount - (this.credit.remainingAmount || 0);
    return Math.round((paidAmount / this.credit.totalAmount) * 100);
  }

  getPaidAmount(): number {
    return this.credit.totalAmount - (this.credit.remainingAmount || 0);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getDailyPayment(): number {
    return this.credit.dailyPayment || 0;
  }
}

