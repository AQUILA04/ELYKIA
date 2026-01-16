import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreditTimelineDto } from '../../types/credit.types';

@Component({
  selector: 'app-daily-stake-modal',
  templateUrl: './daily-stake-modal.component.html',
  styleUrls: ['./daily-stake-modal.component.scss']
})
export class DailyStakeModalComponent implements OnInit {
  @Input() credit: any;
  @Output() onSubmit = new EventEmitter<CreditTimelineDto>();
  @Output() onClose = new EventEmitter<void>();

  stakeForm!: FormGroup;
  minAmount = 200;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    // Calculer le montant restant (totalAmount - totalPaidAmount si disponible, sinon on suppose totalAmount pour l'instant ou on attend que le backend le fournisse)
    // Pour cet exemple, je vais supposer que 'credit' contient un champ 'remainingAmount' ou similaire.
    // Si ce n'est pas le cas, il faudra peut-être le calculer ou le passer en input.
    // D'après le CreditController, on n'a pas forcément le remainingAmount directement dans le DTO de liste.
    // Mais la demande dit "montant total restant". Je vais utiliser 'remainingAmount' s'il existe, sinon 'totalAmount'.

    const maxAmount = this.credit.remainingAmount ?? this.credit.totalAmount;

    // Utiliser dailyStake comme valeur par défaut si disponible, sinon minAmount
    const defaultAmount = this.credit.dailyStake ? this.credit.dailyStake : this.minAmount;

    this.stakeForm = this.fb.group({
      amount: [defaultAmount, [
        Validators.required,
        Validators.min(this.minAmount),
        Validators.max(maxAmount)
      ]]
    });
  }

  submit(): void {
    if (this.stakeForm.valid) {
      const dto: CreditTimelineDto = {
        creditId: this.credit.id,
        amount: this.stakeForm.get('amount')?.value
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
}
