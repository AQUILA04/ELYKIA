import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonFooter
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { DatabaseService } from '../../../../core/services/database.service';
import { Client } from '../../../../models/client.model';
import { Distribution } from '../../../../models/distribution.model';
import { TontineMember } from '../../../../models/tontine.model';

export type ParentEntityType = 'client' | 'distribution' | 'tontine-member';

@Component({
  selector: 'app-parent-selection-modal',
  templateUrl: './parent-selection-modal.component.html',
  styleUrls: ['./parent-selection-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonFooter
  ]
})
export class ParentSelectionModalComponent implements OnInit {
  @Input() entityType!: ParentEntityType;
  @Input() currentParentId?: string;
  @Input() entityName!: string; // Nom de l'entité à modifier (pour affichage)
  @Input() parentType!: ParentEntityType; // Type du parent à sélectionner

  parents: any[] = [];
  filteredParents: any[] = [];
  selectedParentId: string | null = null;
  searchTerm: string = '';
  loading: boolean = true;

  constructor(
    private modalController: ModalController,
    private databaseService: DatabaseService
  ) { }

  async ngOnInit() {
    console.log('[ParentSelectionModal] ngOnInit. entityType:', this.entityType, 'parentType:', this.parentType, 'currentParentId:', this.currentParentId);
    await this.loadParents();
    this.selectedParentId = this.currentParentId || null;
  }

  async loadParents() {
    this.loading = true;
    console.log('[ParentSelectionModal] loadParents started for parentType:', this.parentType);

    try {
      switch (this.parentType) {
        case 'client':
          this.parents = await this.databaseService.getSyncedClients();
          break;
        case 'distribution':
          this.parents = await this.databaseService.getSyncedDistributions();
          break;
        case 'tontine-member':
          this.parents = await this.databaseService.getSyncedTontineMembers();
          console.log('[ParentSelectionModal] Tontine Members loaded:', this.parents.length, JSON.stringify(this.parents));
          break;
      }

      this.filteredParents = [...this.parents];
      console.log('[ParentSelectionModal] loadParents finished. Count:', this.filteredParents.length);
    } catch (error) {
      console.error('Erreur lors du chargement des parents:', error);
    } finally {
      this.loading = false;
    }
  }

  onSearchChange(event: any) {
    const searchTerm = event.detail.value?.toLowerCase() || '';
    this.searchTerm = searchTerm;

    if (!searchTerm) {
      this.filteredParents = [...this.parents];
      return;
    }

    this.filteredParents = this.parents.filter(parent => {
      const name = this.getParentName(parent).toLowerCase();
      const id = parent.id?.toLowerCase() || '';
      return name.includes(searchTerm) || id.includes(searchTerm);
    });
  }

  selectParent(parent: any) {
    this.selectedParentId = parent.id;
  }

  getParentName(parent: any): string {
    if (this.parentType === 'client' || this.parentType === 'tontine-member') {
      return parent.name || 'Sans nom';
    } else if (this.parentType === 'distribution') {
      const ref = parent.reference || parent.id;
      const client = parent.clientName ? ` - ${parent.clientName}` : '';
      return `Distribution ${ref}${client} (${parent.amount || 0} FCFA)`;
    }
    return 'Inconnu';
  }

  getParentDetails(parent: any): string {
    if (this.parentType === 'client') {
      return parent.phone || 'Pas de téléphone';
    } else if (this.parentType === 'distribution') {
      const date = parent.createdAt ? new Date(parent.createdAt).toLocaleDateString('fr-FR') : '';
      return date || 'Pas de date';
    } else if (this.parentType === 'tontine-member') {
      return `Contribution: ${parent.totalContribution || 0} FCFA`;
    }
    return '';
  }

  getEntityTypeLabel(): string {
    switch (this.parentType) {
      case 'client':
        return 'Client';
      case 'distribution':
        return 'Distribution';
      case 'tontine-member':
        return 'Membre Tontine';
      default:
        return 'Parent';
    }
  }

  dismiss() {
    this.modalController.dismiss(null);
  }

  validate() {
    if (!this.selectedParentId) {
      return;
    }

    const selectedParent = this.parents.find(p => p.id === this.selectedParentId);
    this.modalController.dismiss({
      parentId: this.selectedParentId,
      parentName: this.getParentName(selectedParent)
    });
  }
}
