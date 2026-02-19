import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
  IonFooter,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, tap } from 'rxjs/operators';

import * as SyncActions from '../../../../store/sync/sync.actions';
import {
  selectParentSelectionClients,
  selectParentSelectionDistributions,
  selectParentSelectionTontineMembers,
  selectParentSelectionSearchQuery
} from '../../../../store/sync/sync.selectors';
import { PaginationState } from '../../../../models/sync.model';

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
    IonFooter,
    IonInfiniteScroll,
    IonInfiniteScrollContent
  ]
})
export class ParentSelectionModalComponent implements OnInit, OnDestroy {
  @Input() entityType!: ParentEntityType;
  @Input() currentParentId?: string;
  @Input() entityName!: string;
  @Input() parentType!: ParentEntityType;

  parents$: Observable<any[]>;
  loading$: Observable<boolean>;
  pagination$: Observable<PaginationState>;
  searchTerm$: Observable<string>;

  selectedParentId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private modalController: ModalController,
    private store: Store
  ) {
    // Initialisation temporaire pour éviter les erreurs TS avant ngOnInit
    this.parents$ = new Observable();
    this.loading$ = new Observable();
    this.pagination$ = new Observable();
    this.searchTerm$ = new Observable();
  }

  ngOnInit() {
    this.selectedParentId = this.currentParentId || null;

    // Sélectionner les données appropriées selon le type de parent
    switch (this.parentType) {
      case 'client':
        this.parents$ = this.store.select(selectParentSelectionClients).pipe(map(state => state.data));
        this.loading$ = this.store.select(selectParentSelectionClients).pipe(map(state => state.loading));
        this.pagination$ = this.store.select(selectParentSelectionClients).pipe(map(state => state.pagination));
        break;
      case 'distribution':
        this.parents$ = this.store.select(selectParentSelectionDistributions).pipe(map(state => state.data));
        this.loading$ = this.store.select(selectParentSelectionDistributions).pipe(map(state => state.loading));
        this.pagination$ = this.store.select(selectParentSelectionDistributions).pipe(map(state => state.pagination));
        break;
      case 'tontine-member':
        this.parents$ = this.store.select(selectParentSelectionTontineMembers).pipe(map(state => state.data));
        this.loading$ = this.store.select(selectParentSelectionTontineMembers).pipe(map(state => state.loading));
        this.pagination$ = this.store.select(selectParentSelectionTontineMembers).pipe(map(state => state.pagination));
        break;
    }

    this.searchTerm$ = this.store.select(selectParentSelectionSearchQuery);

    // Charger la première page
    this.loadFirstPage();
  }

  loadFirstPage() {
    this.store.dispatch(SyncActions.loadSyncedParentsPaginated({
      entityType: this.parentType,
      page: 0,
      size: 20
    }));
  }

  onSearchChange(event: any) {
    const query = event.detail.value || '';
    this.store.dispatch(SyncActions.searchSyncedParents({
      entityType: this.parentType,
      query
    }));
  }

  loadMore(event: any) {
    this.store.dispatch(SyncActions.loadMoreSyncedParents({
      entityType: this.parentType
    }));

    // Compléter l'événement quand le chargement est fini
    this.loading$.pipe(
      // Attendre que loading passe à false
      // Note: C'est une simplification, idéalement on devrait comparer l'état avant/après
      // ou utiliser un sélecteur spécifique.
      // Ici on utilise un timeout pour l'UX comme dans la page principale
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      if (!loading) {
        setTimeout(() => {
          if (event && event.target) {
            event.target.complete();
          }
        }, 500);
      }
    });
  }

  selectParent(parent: any) {
    this.selectedParentId = parent.id;
  }

  getParentName(parent: any): string {
    if (this.parentType === 'client') {
      return `${parent.firstname} ${parent.lastname}`;
    } else if (this.parentType === 'tontine-member') {
      // TontineMemberView has clientName
      return parent.clientName || `Membre ${parent.clientId}`;
    } else if (this.parentType === 'distribution') {
      // DistributionView has clientName
      const ref = parent.reference || parent.id;
      const client = parent.clientName ? ` - ${parent.clientName}` : '';
      return `Distribution ${ref}${client} (${parent.totalAmount || 0} FCFA)`;
    }
    return 'Inconnu';
  }

  getParentDetails(parent: any): string {
    if (this.parentType === 'client') {
      return `${parent.phone || 'Pas de téléphone'} • ${parent.quarter || 'Pas de quartier'}`;
    } else if (this.parentType === 'distribution') {
      const date = parent.createdAt ? new Date(parent.createdAt).toLocaleDateString('fr-FR') : '';
      return `${date} • ${parent.status}`;
    } else if (this.parentType === 'tontine-member') {
      return `Contribution: ${parent.totalContribution || 0} FCFA • ${parent.deliveryStatus}`;
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
    this.store.dispatch(SyncActions.clearParentSelectionState());
    this.modalController.dismiss(null);
  }

  validate() {
    if (!this.selectedParentId) {
      return;
    }

    // Récupérer l'objet parent complet depuis le store pour obtenir le nom
    this.parents$.pipe(takeUntil(this.destroy$)).subscribe(parents => {
      const selectedParent = parents.find(p => p.id === this.selectedParentId);
      if (selectedParent) {
        this.store.dispatch(SyncActions.clearParentSelectionState());
        this.modalController.dismiss({
          newParentId: this.selectedParentId,
          parentName: this.getParentName(selectedParent)
        });
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
