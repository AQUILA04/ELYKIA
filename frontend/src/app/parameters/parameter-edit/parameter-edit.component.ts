import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  ParameterService,
  TONTINE_SOCIETY_SHARE_VERSION_KEY,
  TONTINE_SOCIETY_SHARE_VERSION_OPTIONS
} from '../parameter.service';
import { Parameter } from '../parameter.model';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-parameter-edit',
  templateUrl: './parameter-edit.component.html',
  styleUrls: ['./parameter-edit.component.scss']
})
export class ParameterEditComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'edit' = 'create';
  parameter?: Parameter;
  isBooleanValue = false;
  isSocietyShareVersion = false;
  readonly societyShareVersionOptions = TONTINE_SOCIETY_SHARE_VERSION_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ParameterEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private parameterService: ParameterService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) {
    this.mode = data.mode;
    this.parameter = data.parameter;

    this.form = this.fb.group({
      key: [{ value: '', disabled: this.mode === 'edit' }, Validators.required],
      value: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    if (this.mode === 'edit' && this.parameter) {
      this.form.patchValue({
        key: this.parameter.key,
        value: this.parameter.value,
        description: this.parameter.description
      });
      this.refreshValueEditor(this.parameter.key, this.parameter.value);
    }

    this.form.get('key')?.valueChanges.subscribe((key: string) => {
      this.refreshValueEditor(key, this.form.get('value')?.value);
    });
  }

  private refreshValueEditor(key: string | null | undefined, value: string | null | undefined): void {
    this.isSocietyShareVersion = key === TONTINE_SOCIETY_SHARE_VERSION_KEY;
    if (this.isSocietyShareVersion) {
      this.isBooleanValue = false;
      const normalized = (value || '').toString().trim().toUpperCase();
      const nextValue = this.societyShareVersionOptions.includes(normalized as 'V1' | 'V2')
        ? normalized
        : 'V1';
      if (this.form.get('value')?.value !== nextValue) {
        this.form.patchValue({ value: nextValue }, { emitEvent: false });
      }
      return;
    }
    this.checkIfBoolean(value || '');
  }

  checkIfBoolean(value: string): void {
    this.isBooleanValue = value === 'true' || value === 'false';
  }

  onValueTypeChange(event: any): void {
    this.isBooleanValue = event.target.checked;
    if (this.isBooleanValue) {
      this.form.patchValue({ value: 'true' });
    } else {
      this.form.patchValue({ value: '' });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.spinner.show();
    const formValue = this.form.getRawValue();
    if (formValue.key === TONTINE_SOCIETY_SHARE_VERSION_KEY) {
      formValue.value = String(formValue.value || '').trim().toUpperCase();
      if (!this.societyShareVersionOptions.includes(formValue.value)) {
        this.spinner.hide();
        this.toastr.error('La version part société doit être V1 ou V2', 'Erreur');
        return;
      }
    }

    if (this.mode === 'create') {
      this.parameterService.create(formValue).subscribe({
        next: () => {
          this.spinner.hide();
          this.toastr.success('Paramètre créé avec succès', 'Succès');
          this.dialogRef.close(true);
        },
        error: () => {
          this.spinner.hide();
          this.toastr.error('Erreur lors de la création du paramètre', 'Erreur');
        }
      });
    } else {
      if (this.parameter) {
        this.parameterService.update(this.parameter.id, formValue).subscribe({
          next: () => {
            this.spinner.hide();
            this.toastr.success('Paramètre mis à jour avec succès', 'Succès');
            this.dialogRef.close(true);
          },
          error: () => {
            this.spinner.hide();
            this.toastr.error('Erreur lors de la mise à jour du paramètre', 'Erreur');
          }
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
