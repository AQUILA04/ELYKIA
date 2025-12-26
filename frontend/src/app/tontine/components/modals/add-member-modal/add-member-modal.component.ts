import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TontineService } from '../../../services/tontine.service';
import { TontineClient } from '../../../types/tontine.types';

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

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddMemberModalComponent>,
    private tontineService: TontineService
  ) {
    this.form = this.fb.group({
      clientId: [null, Validators.required],
      clientSearch: [''],
      frequency: [''],
      amount: [null],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadClients();
    this.setupClientSearch();
  }

  private loadClients(): void {
    this.loading = true;
    this.tontineService.searchClients().subscribe({
      next: (response) => {
        if (response.data) {
          this.clients = response.data;
          this.filteredClients = response.data;
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

    const { clientId, frequency, amount, notes } = this.form.value;

    this.tontineService.createMember({
      clientId,
      frequency: frequency || undefined,
      amount: amount || undefined,
      notes: notes || undefined
    }).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || 'Erreur lors de l\'ajout du membre';
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
