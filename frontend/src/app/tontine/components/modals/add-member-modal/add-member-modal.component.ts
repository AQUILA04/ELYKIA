import { Component, OnDestroy, OnInit, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { TontineService } from '../../../services/tontine.service';
import { TontineClient, TontineMember } from '../../../types/tontine.types';
import { AuthService } from 'src/app/auth/service/auth.service';

@Component({
  selector: 'app-add-member-modal',
  templateUrl: './add-member-modal.component.html',
  styleUrls: ['./add-member-modal.component.scss']
})
export class AddMemberModalComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading: boolean = false;
  error: string | null = null;
  isEditMode: boolean = false;
  initialAmount: number | null = null;
  showUpdateScope: boolean = false;
  currentUser: any;
  private amountChangesSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddMemberModalComponent>,
    private tontineService: TontineService,
    private authService: AuthService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { member?: TontineMember }
  ) {
    this.isEditMode = !!data?.member;
    this.initialAmount = data?.member?.amount || null;

    this.form = this.fb.group({
      clientId: [{ value: data?.member?.client?.id, disabled: this.isEditMode }, Validators.required],
      frequency: [data?.member?.frequency || ''],
      amount: [data?.member?.amount || null],
      notes: [data?.member?.notes || ''],
      updateScope: ['FUTURE_ONLY']
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.setupAmountChangeDetection();
  }

  ngOnDestroy(): void {
    this.amountChangesSub?.unsubscribe();
  }

  private setupAmountChangeDetection(): void {
    this.amountChangesSub = this.form.get('amount')?.valueChanges.subscribe(newAmount => {
      if (this.isEditMode && this.initialAmount !== null && newAmount !== this.initialAmount) {
        this.showUpdateScope = true;
        this.form.get('updateScope')?.setValidators(Validators.required);
      } else {
        this.showUpdateScope = false;
        this.form.get('updateScope')?.clearValidators();
        this.form.get('updateScope')?.setValue('FUTURE_ONLY');
      }
      this.form.get('updateScope')?.updateValueAndValidity();
    });
  }

  getClientDisplay(client: TontineClient): string {
    return `${client.firstname} ${client.lastname}${client.code ? ' (' + client.code + ')' : ''}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const { clientId, frequency, amount, notes, updateScope } = this.form.value;
    const finalClientId = this.isEditMode ? this.data.member!.client.id : clientId;

    const memberData = {
      clientId: finalClientId,
      frequency: frequency || undefined,
      amount: amount || undefined,
      notes: notes || undefined,
      updateScope: this.showUpdateScope ? updateScope : undefined
    };

    const request = this.isEditMode
      ? this.tontineService.updateMember(this.data.member!.id, memberData)
      : this.tontineService.createMember(memberData);

    request.subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || (this.isEditMode ? 'Erreur lors de la modification' : 'Erreur lors de l\'ajout');
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
