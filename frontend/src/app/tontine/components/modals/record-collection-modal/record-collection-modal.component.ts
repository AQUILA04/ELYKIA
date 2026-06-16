import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineMember, TONTINE_CONSTANTS } from '../../../types/tontine.types';

// Exposer la constante pour le template
const CONSTANTS = TONTINE_CONSTANTS;

@Component({
  selector: 'app-record-collection-modal',
  templateUrl: './record-collection-modal.component.html',
  styleUrls: ['./record-collection-modal.component.scss']
})
export class RecordCollectionModalComponent implements OnInit {
  form: FormGroup;
  loading: boolean = false;
  error: string | null = null;
  TONTINE_CONSTANTS = TONTINE_CONSTANTS;
  private requestReference = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RecordCollectionModalComponent>,
    private tontineService: TontineService,
    @Inject(MAT_DIALOG_DATA) public data: { member: TontineMember }
  ) {
    this.form = this.fb.group({
      amount: [
        null,
        [
          Validators.required,
          Validators.min(TONTINE_CONSTANTS.MIN_COLLECTION_AMOUNT),
          Validators.max(TONTINE_CONSTANTS.MAX_COLLECTION_AMOUNT)
        ]
      ]
    });
  }

  ngOnInit(): void {
    this.requestReference = this.generateRequestReference();
  }

  getClientName(): string {
    return `${this.data.member.client.firstname} ${this.data.member.client.lastname}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const collectionData = {
      memberId: this.data.member.id,
      amount: this.form.value.amount,
      reference: this.requestReference
    };

    this.tontineService.createCollection(collectionData).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || 'Erreur lors de l\'enregistrement de la collecte';
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private generateRequestReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `TONT-COL-${crypto.randomUUID()}`;
    }
    return `TONT-COL-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

