import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ClientService } from 'src/app/client/service/client.service';
import { TontineService } from '../../../services/tontine.service';
import { CreateTontineMemberDto } from '../../../types/tontine.types';

@Component({
  selector: 'app-add-multiple-members-modal',
  templateUrl: './add-multiple-members-modal.component.html',
  styleUrls: ['./add-multiple-members-modal.component.scss']
})
export class AddMultipleMembersModalComponent implements OnInit {
  agents: any[] = [];
  selectedAgent: any = null;
  clients: any[] = [];
  selectedClients: number[] = [];
  isLoadingClients = false;
  page = 0;
  size = 20;
  totalClients = 0;

  globalAmount: number = 200;
  globalFrequency: 'DAILY'|'WEEKLY'|'MONTHLY'|'' = 'DAILY';

  clientOverrides: {
    [clientId: number]: { amount?: number|null; frequency?: 'DAILY'|'WEEKLY'|'MONTHLY'|'' }
  } = {};

  submitting = false;
  apiError: string|null = null;

  constructor(
    private dialogRef: MatDialogRef<AddMultipleMembersModalComponent>,
    private clientService: ClientService,
    private tontineService: TontineService
  ) {}

  ngOnInit(): void {
    this.globalAmount = 200;
    this.globalFrequency = 'DAILY';
    this.loadAgents();
  }

  loadAgents() {
    this.clientService.getAgents().subscribe(data => {
      this.agents = data;
    });
  }

  onAgentChange(agent: any) {
    this.selectedAgent = agent;
    this.page = 0;
    this.globalAmount = 200;
    this.globalFrequency = 'DAILY';
    this.fetchClients();
  }

  fetchClients() {
    if (!this.selectedAgent) return;
    this.isLoadingClients = true;
    this.clientService.getClientByCommercial(this.selectedAgent.username, this.page, this.size, 'id,desc').subscribe(res => {
      this.clients = res.data.content || [];
      this.totalClients = res.data.page.totalElements;
      this.isLoadingClients = false;
      this.selectedClients = this.clients.map((c:any) => c.id);
      for (const c of this.clients) {
        if (!this.clientOverrides[c.id]) this.clientOverrides[c.id] = {};
      }
    }, () => this.isLoadingClients = false);
  }

  onPageChange(event: any) {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.fetchClients();
  }

  get allSelected(): boolean {
    return this.selectedClients.length === this.clients.length && this.clients.length > 0;
  }
  set allSelected(val: boolean) {
    if (val) {
      this.selectedClients = this.clients.map(c => c.id);
    } else {
      this.selectedClients = [];
    }
  }
  toggleAll() {
    this.allSelected = !this.allSelected;
  }
  toggleSelected(clientId: number, checked: boolean) {
    if (checked) {
      if (!this.selectedClients.includes(clientId)) this.selectedClients.push(clientId);
    } else {
      this.selectedClients = this.selectedClients.filter(id => id !== clientId);
    }
  }

  updateClientOverride(clientId: number, field: 'amount'|'frequency', value: any) {
    if(field === 'amount') {
      value = Number(value);
      if(value < 200 || isNaN(value)) value = 200;
    }
    this.clientOverrides[clientId][field] = value;
  }

  // Désactive Valider si un montant (override ou global) < 200 pour un client sélectionné
  hasInvalidAmount(): boolean {
    return this.selectedClients.some(cid => {
      const override = this.clientOverrides[cid]?.amount;
      return (override != null ? override : this.globalAmount) < 200;
    }) || this.globalAmount < 200;
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    if (this.selectedClients.length === 0) {
      this.apiError = "Veuillez sélectionner au moins un client.";
      return;
    }
    if(this.hasInvalidAmount()){
      this.apiError = "Aucun montant ne doit être inférieur à 200.";
      return;
    }
    this.apiError = null;
    this.submitting = true;
    const dtos: CreateTontineMemberDto[] = this.selectedClients.map(cid => {
      const base = this.clients.find((c: any) => c.id === cid);
      const override = this.clientOverrides[cid] || {};
      let amount = override.amount ?? this.globalAmount;
      if(amount < 200) amount = 200;
      return {
        clientId: cid,
        amount,
        frequency: override.frequency || this.globalFrequency || undefined,
      };
    });
    this.tontineService.addMembersList(dtos).subscribe({
      next: res => {
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: err => {
        this.apiError = err.error?.message || 'Erreur lors de l’ajout multiple.';
        this.submitting = false;
      }
    });
  }
}
