import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ClientReliquat, RecoveryPlan } from '../../../../models/reliquat.model';

@Component({
  selector: 'app-reliquat-display',
  templateUrl: './reliquat-display.component.html',
  styleUrls: ['./reliquat-display.component.scss'],
  standalone: false
})
export class ReliquatDisplayComponent {
  @Input() clientReliquat: ClientReliquat | null = null;
  @Input() recoveryPlan: RecoveryPlan | null = null;
  @Input() invoiceAmount: number = 0; // The amount selected from chips
  @Input() receivedAmount: number = 0;

  @Output() useReliquatChanged = new EventEmitter<boolean>();
  @Output() keepReliquatChanged = new EventEmitter<boolean>();
  @Output() receivedAmountChanged = new EventEmitter<number>();

  useReliquat: boolean = true;
  keepReliquat: boolean = true;

  onUseReliquatToggle(event: any) {
    this.useReliquat = event.detail.checked;
    this.useReliquatChanged.emit(this.useReliquat);
  }

  onKeepReliquatToggle(event: any) {
    this.keepReliquat = event.detail.checked;
    this.keepReliquatChanged.emit(this.keepReliquat);
  }

  onReceivedAmountChange(event: any) {
    const value = parseFloat(event.detail.value);
    const amount = isNaN(value) ? 0 : value;
    this.receivedAmountChanged.emit(amount);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount));
  }
}
