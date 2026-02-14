import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, take } from 'rxjs/operators';

import * as SyncActions from '../../../store/sync/sync.actions';
import {
  selectManualSyncClients,
  selectManualSyncDistributions,
  selectManualSyncRecoveries,
  selectManualSyncSelectedClients,
  selectManualSyncSelectedDistributions,
  selectManualSyncSelectedRecoveries,
  selectManualSyncTontineMembers,
  selectManualSyncTontineCollections,
  selectManualSyncTontineDeliveries,
  selectManualSyncSelectedTontineMembers,
  selectManualSyncSelectedTontineCollections,
  selectManualSyncSelectedTontineDeliveries,
  selectManualSyncSyncingEntities,
  selectManualSyncLoading,
  selectManualSyncActiveTab
} from '../../../store/sync/sync.selectors';

import { Client } from '../../../models/client.model';
import { Distribution } from '../../../models/distribution.model';
import { Recovery } from '../../../models/recovery.model';
import { TontineMember, TontineCollection, TontineDelivery } from '../../../models/tontine.model';
import { HealthCheckService } from '../../../core/services/health-check.service';
import { DatabaseService } from '../../../core/services/database.service';

@Component({
  selector: 'app-sync-manual',
  templateUrl: './sync-manual.page.html',
  styleUrls: ['./sync-manual.page.scss'],
  standalone: false
})
export class SyncManualPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables pour les données
  clients$: Observable<Client[]>;
  distributions$: Observable<Distribution[]>;
  recoveries$: Observable<Recovery[]>;
  tontineMembers$: Observable<TontineMember[]>;
  tontineCollections$: Observable<TontineCollection[]>;
  tontineDeliveries$: Observable<TontineDelivery[]>;

  // Observables pour les sélections
  selectedClientIds$: Observable<string[]>;
  selectedDistributionIds$: Observable<string[]>;
  selectedRecoveryIds$: Observable<string[]>;
  selectedTontineMemberIds$: Observable<string[]>;
  selectedTontineCollectionIds$: Observable<string[]>;
  selectedTontineDeliveryIds$: Observable<string[]>;

  // Observables pour l'état
  syncingEntities$: Observable<string[]>;
  loading$: Observable<boolean>;
  activeTab$: Observable<'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries' | 'all'>;

  // Observable pour le nombre d'éléments sélectionnés
  selectedCount$: Observable<number>;

  activeTab: 'clients' | 'distributions' | 'recoveries' | 'tontine-members' | 'tontine-collections' | 'tontine-deliveries' = 'clients';

  constructor(
    private store: Store,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private healthCheckService: HealthCheckService,
    private modalController: ModalController,
    private databaseService: DatabaseService
  ) {
    // Initialiser les observables pour les données
    this.clients$ = this.store.select(selectManualSyncClients);
    this.distributions$ = this.store.select(selectManualSyncDistributions);
    this.recoveries$ = this.store.select(selectManualSyncRecoveries);
    this.tontineMembers$ = this.store.select(selectManualSyncTontineMembers);
    this.tontineCollections$ = this.store.select(selectManualSyncTontineCollections);
    this.tontineDeliveries$ = this.store.select(selectManualSyncTontineDeliveries);

    // Initialiser les observables pour les sélections
    this.selectedClientIds$ = this.store.select(selectManualSyncSelectedClients);
    this.selectedDistributionIds$ = this.store.select(selectManualSyncSelectedDistributions);
    this.selectedRecoveryIds$ = this.store.select(selectManualSyncSelectedRecoveries);
    this.selectedTontineMemberIds$ = this.store.select(selectManualSyncSelectedTontineMembers);
    this.selectedTontineCollectionIds$ = this.store.select(selectManualSyncSelectedTontineCollections);
    this.selectedTontineDeliveryIds$ = this.store.select(selectManualSyncSelectedTontineDeliveries);

    // Initialiser les observables pour l'état
    this.syncingEntities$ = this.store.select(selectManualSyncSyncingEntities);
    this.loading$ = this.store.select(selectManualSyncLoading);
    this.activeTab$ = this.store.select(selectManualSyncActiveTab);

    // Calculer le nombre d'éléments sélectionnés selon l'onglet actif
    this.selectedCount$ = combineLatest([
      this.activeTab$,
      this.selectedClientIds$,
      this.selectedDistributionIds$,
      this.selectedRecoveryIds$,
      this.selectedTontineMemberIds$,
      this.selectedTontineCollectionIds$,
      this.selectedTontineDeliveryIds$
    ]).pipe(
      map(([tab, clientIds, distIds, recIds, memberIds, collectionIds, deliveryIds]) => {
        switch (tab) {
          case 'clients':
            return clientIds.length;
          case 'distributions':
            return distIds.length;
          case 'recoveries':
            return recIds.length;
          case 'tontine-members':
            return memberIds.length;
          case 'tontine-collections':
            return collectionIds.length;
          case 'tontine-deliveries':
            return deliveryIds.length;
          default:
            return 0;
        }
      })
    );
  }

  ngOnInit() {
    // Souscrire aux changements d'onglet actif
    this.activeTab$.pipe(takeUntil(this.destroy$)).subscribe(tab => {
      if (tab !== 'all') {
        this.activeTab = tab;
      }
    });

    // Écouter les succès de synchronisation pour afficher un toast
    this.store.select(state => state).pipe(
      takeUntil(this.destroy$)
    ).subscribe(async (state: any) => {
      // Cette logique sera gérée par les effects via les actions success/failure
    });
  }

  ionViewWillEnter() {
    // Charger les données à chaque fois que la page est affichée
    this.store.dispatch(SyncActions.loadManualSyncData());
  }

  /**
   * Gérer le changement d'onglet
   */
  onSegmentChange(event: any) {
    const newTab = event.detail.value;
    this.activeTab = newTab;
    this.store.dispatch(SyncActions.setActiveTab({ tab: newTab }));
  }

  /**
   * Gérer le toggle de sélection d'une entité
   */
  onToggleSelection(entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery', entityId: string) {
    this.store.dispatch(SyncActions.toggleEntitySelection({ entityType, entityId }));
  }

  /**
   * Gérer la sélection de tous les éléments
   */
  onSelectAll(entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery') {
    this.store.dispatch(SyncActions.selectAllEntities({ entityType }));
  }

  /**
   * Gérer la désélection de tous les éléments
   */
  onClearSelection(entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery') {
    this.store.dispatch(SyncActions.clearEntitySelection({ entityType }));
  }

  /**
   * Synchroniser les éléments sélectionnés
   */
  async onSyncSelected() {
    // Vérifier la connectivité au backend
    const isBackendAccessible = await this.checkBackendConnectivity();
    if (!isBackendAccessible) {
      return;
    }

    const selectedIds = await this.getSelectedIdsForActiveTab();
    if (selectedIds.length === 0) {
      const toast = await this.toastController.create({
        message: 'Aucun élément sélectionné',
        duration: 2000,
        color: 'warning',
        position: 'bottom'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmer la synchronisation',
      message: `Voulez-vous synchroniser ${selectedIds.length} élément(s) ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Synchroniser',
          handler: async () => {
            this.store.dispatch(SyncActions.startManualSync({
              entityType: this.activeTab,
              selectedIds
            }));
            
            // Afficher un toast de démarrage
            const toast = await this.toastController.create({
              message: `Synchronisation de ${selectedIds.length} élément(s) en cours...`,
              duration: 2000,
              color: 'primary',
              position: 'bottom'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Synchroniser un seul élément
   */
  async onSyncSingle(entityType: 'client' | 'distribution' | 'recovery' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery', entityId: string) {
    // Vérifier la connectivité au backend
    const isBackendAccessible = await this.checkBackendConnectivity();
    if (!isBackendAccessible) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmer la synchronisation',
      message: 'Voulez-vous synchroniser cet élément ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Synchroniser',
          handler: () => {
            this.store.dispatch(SyncActions.syncSingleEntity({
              entityType,
              entityId
            }));
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Actualiser les données
   */
  onRefresh(event?: any) {
    this.store.dispatch(SyncActions.loadManualSyncData());
    
    if (event) {
      setTimeout(() => {
        event.target.complete();
      }, 1000);
    }
  }

  /**
   * Naviguer vers la page des erreurs de synchronisation
   */
  navigateToErrors() {
    this.router.navigate(['/sync-errors']);
  }

  /**
   * Retourner à la page précédente
   */
  navigateBack() {
    this.router.navigate(['/tabs/dashboard']);
  }

  /**
   * Vérifier la connectivité au backend
   */
  private async checkBackendConnectivity(): Promise<boolean> {
    const isAccessible = await this.healthCheckService.pingBackend().pipe(take(1)).toPromise();

    if (!isAccessible) {
      const alert = await this.alertController.create({
        header: 'Backend inaccessible',
        message: 'Le serveur backend n\'est pas accessible. Veuillez vous assurer d\'être connecté au réseau de l\'entreprise.',
        buttons: ['OK']
      });
      await alert.present();
      return false;
    }

    return true;
  }

  /**
   * Récupérer les IDs sélectionnés pour l'onglet actif
   */
  private async getSelectedIdsForActiveTab(): Promise<string[]> {
    let selectedIds: string[] = [];

    switch (this.activeTab) {
      case 'clients':
        selectedIds = await this.selectedClientIds$.pipe(take(1)).toPromise() || [];
        break;
      case 'distributions':
        selectedIds = await this.selectedDistributionIds$.pipe(take(1)).toPromise() || [];
        break;
      case 'recoveries':
        selectedIds = await this.selectedRecoveryIds$.pipe(take(1)).toPromise() || [];
        break;
      case 'tontine-members':
        selectedIds = await this.selectedTontineMemberIds$.pipe(take(1)).toPromise() || [];
        break;
      case 'tontine-collections':
        selectedIds = await this.selectedTontineCollectionIds$.pipe(take(1)).toPromise() || [];
        break;
      case 'tontine-deliveries':
        selectedIds = await this.selectedTontineDeliveryIds$.pipe(take(1)).toPromise() || [];
        break;
    }

    return selectedIds;
  }

  /**
   * Gérer la modification du parent d'une entité
   */
  async onEditParent(entityId: string) {
    // Import dynamique de la modale pour éviter les dépendances circulaires
    const { ParentSelectionModalComponent } = await import('../modals/parent-selection-modal/parent-selection-modal.component');

    // Déterminer le type d'entité et le type de parent
    let entityType: string;
    let parentType: 'client' | 'distribution' | 'tontine-member';
    let entityName: string = '';

    switch (this.activeTab) {
      case 'distributions':
        entityType = 'distribution';
        parentType = 'client';
        const dist = await this.distributions$.pipe(take(1)).toPromise();
        const distribution = dist?.find(d => d.id === entityId);
        entityName = distribution ? `Distribution ${distribution.reference || distribution.id}` : '';
        break;
      case 'recoveries':
        entityType = 'recovery';
        parentType = 'distribution';
        const recs = await this.recoveries$.pipe(take(1)).toPromise();
        const recovery = recs?.find(r => r.id === entityId);
        entityName = recovery ? `Recouvrement ${recovery.id}` : '';
        break;
      case 'tontine-members':
        entityType = 'tontine-member';
        parentType = 'client';
        const members = await this.tontineMembers$.pipe(take(1)).toPromise();
        const member = members?.find(m => m.id === entityId);
        entityName = member ? `Membre ${(member as any).clientName || member.clientId}` : '';
        break;
      case 'tontine-collections':
        entityType = 'tontine-collection';
        parentType = 'tontine-member';
        const collections = await this.tontineCollections$.pipe(take(1)).toPromise();
        const collection = collections?.find(c => c.id === entityId);
        entityName = collection ? `Collecte ${collection.id}` : '';
        break;
      case 'tontine-deliveries':
        entityType = 'tontine-delivery';
        parentType = 'tontine-member';
        const deliveries = await this.tontineDeliveries$.pipe(take(1)).toPromise();
        const delivery = deliveries?.find(d => d.id === entityId);
        entityName = delivery ? `Livraison ${delivery.id}` : '';
        break;
      default:
        return;
    }

    // Ouvrir la modale de sélection de parent
    const modal = await this.modalController.create({
      component: ParentSelectionModalComponent,
      componentProps: {
        entityId,
        entityType,
        entityName,
        parentType
      },
      cssClass: 'parent-selection-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data && data.newParentId) {
      // Mettre à jour le parent dans la base de données
      await this.updateParentId(entityId, entityType, data.newParentId);
    }
  }

  /**
   * Mettre à jour l'ID du parent dans la base de données
   */
  private async updateParentId(entityId: string, entityType: string, newParentId: string) {
    const loading = await this.toastController.create({
      message: 'Mise à jour en cours...',
      duration: 0
    });
    await loading.present();

    try {
      switch (entityType) {
        case 'distribution':
          await this.databaseService.updateDistributionClientId(entityId, newParentId);
          break;
        case 'recovery':
          await this.databaseService.updateRecoveryDistributionId(entityId, newParentId);
          break;
        case 'tontine-member':
          await this.databaseService.updateTontineMemberClientId(entityId, newParentId);
          break;
        case 'tontine-collection':
          await this.databaseService.updateTontineCollectionMemberId(entityId, newParentId);
          break;
        case 'tontine-delivery':
          await this.databaseService.updateTontineDeliveryMemberId(entityId, newParentId);
          break;
      }

      await loading.dismiss();

      // Afficher un message de succès
      const toast = await this.toastController.create({
        message: 'Parent mis à jour avec succès',
        duration: 2000,
        color: 'success',
        icon: 'checkmark-circle'
      });
      await toast.present();

      // Recharger les données
      this.store.dispatch(SyncActions.loadManualSyncData());
    } catch (error) {
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Erreur lors de la mise à jour',
        duration: 3000,
        color: 'danger',
        icon: 'alert-circle'
      });
      await toast.present();
      console.error('Error updating parent ID:', error);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
