import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreditTimelineDto } from '../../types/credit.types';

@Component({
  selector: 'app-daily-stake-modal',
  templateUrl: './daily-stake-modal.component.html',
  styleUrls: ['./daily-stake-modal.component.scss']
})
export class DailyStakeModalComponent implements OnInit, OnChanges {
  @Input() credit: any;
  @Input() isSubmitting = false;
  /** Reliquat client disponible (FCFA), chargé par le parent. */
  @Input() clientReliquatAmount = 0;
  @Output() onSubmit = new EventEmitter<CreditTimelineDto>();
  @Output() onClose = new EventEmitter<void>();

  stakeForm!: FormGroup;
  minAmount = 0;
  useReliquat = true;
  private requestReference = '';

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.requestReference = this.generateRequestReference();
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientReliquatAmount'] && this.stakeForm) {
      this.useReliquat = this.clientReliquatAmount > 0;
      this.applyReliquatDefaults();
    }
  }

  get remaining(): number {
    return this.credit?.totalAmountRemaining ?? 0;
  }

  get usableReliquat(): number {
    if (!this.useReliquat || this.clientReliquatAmount <= 0) {
      return 0;
    }
    return Math.min(this.clientReliquatAmount, this.remaining);
  }

  /** Clôture possible uniquement avec le reliquat (restant ≤ reliquat). */
  get canCloseWithReliquatOnly(): boolean {
    return this.remaining > 0 && this.clientReliquatAmount >= this.remaining;
  }

  get reliquatUsedPreview(): number {
    const cash = Number(this.stakeForm?.get('amount')?.value) || 0;
    if (!this.useReliquat) {
      return 0;
    }
    // Si on vise la clôture (cash + reliquat >= restant), consommer le complément.
    if (cash < this.remaining && cash + this.usableReliquat >= this.remaining) {
      return this.remaining - cash;
    }
    return Math.min(this.usableReliquat, Math.max(0, this.remaining - cash));
  }

  get appliedAmountPreview(): number {
    const cash = Number(this.stakeForm?.get('amount')?.value) || 0;
    if (cash < this.remaining && cash + this.usableReliquat >= this.remaining) {
      return this.remaining;
    }
    return Math.min(this.remaining, cash + (this.useReliquat ? Math.min(this.usableReliquat, this.remaining - cash) : 0));
  }

  initForm(): void {
    const maxAmount = this.remaining;
    this.useReliquat = this.clientReliquatAmount > 0;
    this.minAmount = this.canCloseWithReliquatOnly ? 0 : Math.min(200, maxAmount);

    const defaultCash = this.canCloseWithReliquatOnly && this.useReliquat
      ? 0
      : Math.min(
          this.credit?.dailyStake ? this.credit.dailyStake : this.minAmount,
          Math.max(0, maxAmount - (this.useReliquat ? this.usableReliquat : 0))
        );

    this.stakeForm = this.fb.group({
      amount: [defaultCash, [
        Validators.required,
        Validators.min(this.minAmount),
        Validators.max(maxAmount)
      ]]
    });
  }

  onUseReliquatToggle(checked: boolean): void {
    this.useReliquat = checked;
    this.applyReliquatDefaults();
  }

  private applyReliquatDefaults(): void {
    if (!this.stakeForm) {
      return;
    }
    this.minAmount = this.canCloseWithReliquatOnly && this.useReliquat ? 0 : Math.min(200, this.remaining || 200);
    const amountCtrl = this.stakeForm.get('amount');
    amountCtrl?.setValidators([
      Validators.required,
      Validators.min(this.minAmount),
      Validators.max(this.remaining)
    ]);
    if (this.canCloseWithReliquatOnly && this.useReliquat) {
      amountCtrl?.setValue(0);
    }
    amountCtrl?.updateValueAndValidity();
  }

  closeWithReliquatOnly(): void {
    if (this.isSubmitting || !this.canCloseWithReliquatOnly) {
      return;
    }
    const dto: CreditTimelineDto = {
      creditId: this.credit.id,
      amount: this.remaining,
      reference: this.requestReference,
      reliquatUsedAmount: this.remaining,
      reliquatGeneratedAmount: 0
    };
    this.onSubmit.emit(dto);
  }

  submit(): void {
    if (this.isSubmitting) {
      return;
    }
    if (this.stakeForm.valid) {
      const cash = Number(this.stakeForm.get('amount')?.value) || 0;
      let applied = cash;
      let reliquatUsed = 0;

      if (this.useReliquat && this.usableReliquat > 0) {
        if (cash < this.remaining && cash + this.usableReliquat >= this.remaining) {
          applied = this.remaining;
          reliquatUsed = this.remaining - cash;
        } else if (cash === 0 && this.usableReliquat >= this.remaining) {
          applied = this.remaining;
          reliquatUsed = this.remaining;
        }
      }

      const dto: CreditTimelineDto = {
        creditId: this.credit.id,
        amount: applied,
        reference: this.requestReference,
        reliquatUsedAmount: reliquatUsed,
        reliquatGeneratedAmount: 0
      };
      this.onSubmit.emit(dto);
    }
  }

  close(): void {
    this.onClose.emit();
  }

  get amountControl() {
    return this.stakeForm.get('amount');
  }

  private generateRequestReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `REC-WEB-${crypto.randomUUID()}`;
    }
    return `REC-WEB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
