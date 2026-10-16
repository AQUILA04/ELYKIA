import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CustomerApiService } from '../../services/customer-api.service';
import {
  AutomaticPaymentRequest,
  AutomaticPaymentResult,
  PaymentCollectionOptions,
  PaymentNetworkQuote,
} from '../../models/customer.model';
import { ElykOutlinedFieldComponent } from '../../ui';
import { mobileMoneySubmitErrorMessage } from '../../utils/mobile-money-form';

@Component({
  selector: 'app-payment-collection',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ElykOutlinedFieldComponent],
  templateUrl: './payment-collection.component.html',
  styleUrls: ['./payment-collection.component.scss'],
})
export class PaymentCollectionComponent implements OnChanges, OnDestroy {
  @Input() amount = 0;
  @Input() purpose: 'CREDIT' | 'TONTINE' = 'CREDIT';
  @Input() distributionId = '';
  @Input() memberId: number | null = null;
  @Input() installmentNumber = 0;
  /** Devis seulement : l'écran parent envoie le paiement (adhésion tontine). */
  @Input() quoteOnly = false;

  @Output() manualActive = new EventEmitter<boolean>();
  @Output() selectionChange = new EventEmitter<{ network: string; phone: string } | null>();

  private readonly api = inject(CustomerApiService);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  options: PaymentCollectionOptions | null = null;
  choice: 'manual' | 'automatic' | null = null;
  network = '';
  phone = '';
  loading = false;
  paying = false;
  error = '';
  result: AutomaticPaymentResult | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['amount'] && this.amount > 0) {
      void this.load();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  get mode(): string {
    return this.options?.mode ?? 'MANUAL';
  }

  get showChooser(): boolean {
    return this.mode === 'BOTH' && !this.result;
  }

  get showAutomatic(): boolean {
    return !this.result && (this.mode === 'AUTOMATIC' || (this.mode === 'BOTH' && this.choice === 'automatic'));
  }

  get selectedQuote(): PaymentNetworkQuote | undefined {
    return this.options?.networks?.find((item) => item.network === this.network);
  }

  get canPay(): boolean {
    const quote = this.selectedQuote;
    return !!quote && !quote.unavailableReason && !!this.phone.trim() && !this.paying;
  }

  automaticSelection(): { network: string; phone: string } | null {
    if (!this.canPay) {
      return null;
    }
    return { network: this.network, phone: this.phone.trim() };
  }

  choose(choice: 'manual' | 'automatic'): void {
    this.choice = choice;
    this.error = '';
    this.emitManual();
    this.publishSelection();
  }

  selectNetwork(network: string): void {
    this.network = network;
    this.publishSelection();
  }

  onPhone(value: string): void {
    this.phone = value;
    this.publishSelection();
  }

  async pay(): Promise<void> {
    if (!this.canPay || this.quoteOnly) {
      return;
    }
    this.paying = true;
    this.error = '';
    const payload: AutomaticPaymentRequest = {
      purpose: this.purpose,
      amount: this.amount,
      network: this.network,
      phone: this.phone.trim(),
    };
    if (this.purpose === 'CREDIT') {
      payload.distributionId = this.distributionId;
      payload.installmentNumber = this.installmentNumber;
    } else {
      payload.memberId = this.memberId ?? undefined;
    }
    try {
      this.result = await firstValueFrom(this.api.startAutomaticPayment(payload));
      if (this.result.status === 'EN_COURS') {
        this.startPolling();
      }
    } catch (e: unknown) {
      this.error = mobileMoneySubmitErrorMessage(e, 'Le paiement n’a pas pu être lancé.');
    } finally {
      this.paying = false;
    }
  }

  feePercent(rate?: number): string {
    if (rate == null) {
      return '';
    }
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(rate * 100)} %`;
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.options = await firstValueFrom(this.api.getPaymentCollectionOptions(this.amount));
      const available = (this.options.networks ?? []).filter((item) => !item.unavailableReason);
      this.network = available[0]?.network ?? this.options.networks?.[0]?.network ?? '';
      if (this.mode === 'MANUAL') {
        this.choice = 'manual';
      } else if (this.mode === 'AUTOMATIC') {
        this.choice = 'automatic';
      } else if (!this.choice) {
        this.choice = null;
      }
      this.emitManual();
      this.publishSelection();
    } catch {
      this.options = { mode: 'MANUAL', networks: [] };
      this.choice = 'manual';
      this.emitManual();
    } finally {
      this.loading = false;
    }
  }

  private emitManual(): void {
    const manual = this.mode === 'MANUAL' || (this.mode === 'BOTH' && this.choice === 'manual');
    this.manualActive.emit(manual);
  }

  private publishSelection(): void {
    this.selectionChange.emit(this.showAutomatic ? this.automaticSelection() : null);
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => void this.poll(), 3000);
  }

  private async poll(): Promise<void> {
    if (!this.result?.submissionId) {
      return;
    }
    try {
      this.result = await firstValueFrom(this.api.getAutomaticPayment(this.result.purpose, this.result.submissionId));
      if (this.result.status !== 'EN_COURS') {
        this.stopPolling();
      }
    } catch {
      this.stopPolling();
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
