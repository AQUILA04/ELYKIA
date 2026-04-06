import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Client } from '../../../../models/client.model';
import { Distribution } from '../../../../models/distribution.model';
import { Recovery } from '../../../../models/recovery.model';
import { TontineMember, TontineCollection, TontineDelivery } from '../../../../models/tontine.model';

type SyncableEntity = Client | Distribution | Recovery | TontineMember | TontineCollection | TontineDelivery;

@Component({
  selector: 'app-entity-sync-list',
  templateUrl: './entity-sync-list.component.html',
  styleUrls: ['./entity-sync-list.component.scss'],
  standalone: false
})
export class EntitySyncListComponent implements OnChanges {
  @Input() entities: SyncableEntity[] = [];
  @Input() selectedIds: string[] = [];
  @Input() syncingIds: string[] = [];
  @Input() entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' = 'client';

  @Output() toggleSelection = new EventEmitter<string>();
  @Output() selectAll = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() syncSingle = new EventEmitter<string>();
  @Output() editParent = new EventEmitter<string>();

  isAllSelected = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedIds'] || changes['entities']) {
      this.updateAllSelectedState();
    }
  }

  /**
   * Mettre à jour l'état du checkbox "Tout sélectionner"
   */
  private updateAllSelectedState() {
    if (this.entities && this.entities.length > 0) {
      this.isAllSelected = this.entities.every(entity =>
        this.selectedIds.includes(entity.id)
      );
    } else {
      this.isAllSelected = false;
    }
  }

  /**
   * Vérifier si une entité est sélectionnée
   */
  isSelected(entityId: string): boolean {
    return this.selectedIds.includes(entityId);
  }

  /**
   * Vérifier si une entité est en cours de synchronisation
   */
  isSyncing(entityId: string): boolean {
    return this.syncingIds.includes(entityId);
  }

  /**
   * Gérer le toggle de sélection d'une entité
   */
  onToggle(entityId: string) {
    this.toggleSelection.emit(entityId);
  }

  /**
   * Gérer le toggle "Tout sélectionner"
   */
  onToggleAll() {
    if (this.isAllSelected) {
      this.clearSelection.emit();
    } else {
      this.selectAll.emit();
    }
  }

  /**
   * Gérer la synchronisation d'une seule entité
   */
  onSync(entityId: string, event: Event) {
    event.stopPropagation();
    this.syncSingle.emit(entityId);
  }

  /**
   * Gérer la modification du parent
   */
  onEditParent(entityId: string, event: Event) {
    event.stopPropagation();
    this.editParent.emit(entityId);
  }

  /**
   * Vérifier si l'entité peut avoir son parent modifié
   */
  canEditParent(): boolean {
    // Seules les entités avec dépendances peuvent être modifiées
    return ['distribution', 'recovery', 'tontine-member', 'tontine-collection', 'tontine-delivery'].includes(this.entityType);
  }

  /**
   * Obtenir le nom d'affichage d'une entité
   */
  getDisplayName(entity: SyncableEntity): string {
    switch (this.entityType) {
      case 'client':
        const client = entity as Client;
        return `${client.firstname} ${client.lastname}`;
      case 'distribution':
        const distribution = entity as Distribution;
        return `Distribution ${distribution.reference || distribution.id}`;
      case 'recovery':
        const recovery = entity as Recovery;
        return `Recouvrement ${recovery.id}`;
      case 'tontine-member':
        const member = entity as TontineMember;
        return member.clientName ? `Membre - ${member.clientName}` : `Membre ${member.clientId}`;
      case 'tontine-collection':
        const collection = entity as TontineCollection;
        return collection.clientName ? `Collecte - ${collection.clientName}` : `Collecte ${collection.id}`;
      case 'tontine-delivery':
        const delivery = entity as TontineDelivery;
        return delivery.clientName ? `Livraison - ${delivery.clientName}` : `Livraison ${delivery.id}`;
      default:
        return 'Entité inconnue';
    }
  }

  /**
   * Obtenir les détails d'affichage d'une entité
   */
  getDisplayDetails(entity: SyncableEntity): string {
    switch (this.entityType) {
      case 'client':
        const client = entity as Client;
        return `${client.phone} • ${client.quarter}`;
      case 'distribution':
        const distribution = entity as Distribution;
        return `Montant: ${distribution.totalAmount} FCFA • Mise: ${distribution.dailyPayment} FCFA`;
      case 'recovery':
        const recovery = entity as Recovery;
        return `Montant: ${recovery.amount} FCFA • ${recovery.isDefaultStake ? 'Mise normale' : 'Mise spéciale'}`;
      case 'tontine-member':
        const member = entity as TontineMember;
        return `Contribution: ${member.totalContribution} FCFA • ${member.deliveryStatus}`;
      case 'tontine-collection':
        const collection = entity as TontineCollection;
        // Format date including time: DD/MM/YYYY HH:mm
        const date = new Date(collection.collectionDate);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Montant: ${collection.amount} FCFA • ${dateStr} ${timeStr}`;
      case 'tontine-delivery':
        const delivery = entity as TontineDelivery;
        return `Montant: ${delivery.totalAmount} FCFA • ${delivery.status}`;
      default:
        return '';
    }
  }

  /**
   * Obtenir la couleur du badge de statut
   */
  getStatusColor(entityId: string): string {
    if (this.isSyncing(entityId)) {
      return 'warning';
    }
    return 'medium';
  }

  /**
   * Obtenir le label du badge de statut
   */
  getStatusLabel(entityId: string): string {
    if (this.isSyncing(entityId)) {
      return 'En cours...';
    }
    return 'En attente';
  }

  /**
   * Obtenir l'icône pour le type d'entité
   */
  getEntityIcon(): string {
    switch (this.entityType) {
      case 'client':
        return 'person-circle-outline';
      case 'distribution':
        return 'cube-outline';
      case 'recovery':
        return 'cash-outline';
      case 'tontine-member':
        return 'people-circle-outline';
      case 'tontine-collection':
        return 'wallet-outline';
      case 'tontine-delivery':
        return 'gift-outline';
      default:
        return 'document-outline';
    }
  }
}
