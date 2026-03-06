import { Component, OnInit, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TontineService } from '../../../services/tontine.service';
import { TontineClient, TontineMember } from '../../../types/tontine.types';

@Component({
  selector: 'app-add-member-modal',
  templateUrl: './add-member-modal.component.html',
  styleUrls: ['./add-member-modal.component.scss']
})
export class AddMemberModalComponent implements OnInit {
  form: FormGroup;
  clients: TontineClient[] = [];
  filteredClients: TontineClient[] = [];
  loading: boolean = false;
  error: string | null = null;
  isEditMode: boolean = false;
  initialAmount: number | null = null;
  showUpdateScope: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddMemberModalComponent>,
    private tontineService: TontineService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { member?: TontineMember }
  ) {
    this.isEditMode = !!data?.member;
    this.initialAmount = data?.member?.amount || null;

    this.form = this.fb.group({
      clientId: [{ value: data?.member?.client?.id, disabled: this.isEditMode }, Validators.required],
      clientSearch: [''],
      frequency: [data?.member?.frequency || ''],
      amount: [data?.member?.amount || null],
      notes: [data?.member?.notes || ''],
      updateScope: ['FUTURE_ONLY']
    });
  }

  ngOnInit(): void {
    this.loadClients();
    this.setupClientSearch();
    this.setupAmountChangeDetection();
  }

  private loadClients(): void {
    this.loading = true;
    this.tontineService.searchClients().subscribe({
      next: (response) => {
        if (response.data) {
          this.clients = response.data;
          this.filteredClients = response.data;

          // If editing, ensure the current client is in the list and selected
          if (this.isEditMode && this.data.member?.client) {
            const currentClient = this.data.member.client;
            const exists = this.clients.some(c => c.id === currentClient.id);
            if (!exists) {
              this.clients.unshift(currentClient);
              this.filteredClients = [...this.clients];
            }
            this.form.patchValue({ clientId: currentClient.id });
          }
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des clients';
        this.loading = false;
      }
    });
  }

  private setupClientSearch(): void {
    this.form.get('clientSearch')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.filterClients(searchTerm);
    });
  }

  private setupAmountChangeDetection(): void {
      this.form.get('amount')?.valueChanges.subscribe(newAmount => {
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

  private filterClients(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredClients = this.clients;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredClients = this.clients.filter(client => {
      const fullName = `${client.firstname} ${client.lastname}`.toLowerCase();
      const code = client.code?.toLowerCase() || '';
      return fullName.includes(term) || code.includes(term);
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
    // If disabled, clientId is not in .value, get it from raw value or data
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
