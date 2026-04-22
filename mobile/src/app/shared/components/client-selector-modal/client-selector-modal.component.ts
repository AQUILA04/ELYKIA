import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, ViewChild } from '@angular/core';
import { ModalController, IonInfiniteScroll } from '@ionic/angular';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith, distinctUntilChanged, debounceTime, filter, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { loadFirstPageClients, loadNextPageClients } from 'src/app/store/client/client.actions';
import { LoggerService } from '../../../core/services/logger.service';
import { Client } from '../../../models/client.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import {
  selectPaginatedClients,
  selectClientPaginationLoading,
  selectClientPaginationError,
  selectClientPaginationHasMore
} from 'src/app/store/client/client.selectors';
import { User } from '../../../models/auth.model';
import { ClientRepositoryFilters } from '../../../core/repositories/client.repository.extensions';

interface ClientSelectorViewModel {
  clients: Client[];
  loading: boolean;
  error: any;
  searchTerm: string;
  hasMore: boolean;
}

@Component({
  selector: 'app-client-selector-modal',
  templateUrl: './client-selector-modal.component.html',
  styleUrls: ['./client-selector-modal.component.scss'],
  standalone: false
})
export class ClientSelectorModalComponent implements OnInit, OnDestroy {
  @Input() filterByTontineCollector: string | null = null;
  @ViewChild(IonInfiniteScroll) infiniteScroll?: IonInfiniteScroll;

  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');

  vm$!: Observable<ClientSelectorViewModel>;
  vm: ClientSelectorViewModel = {
    clients: [],
    loading: false,
    error: null,
    searchTerm: '',
    hasMore: false
  };

  private commercialUsername: string | null = null;

  constructor(
    private modalController: ModalController,
    private log: LoggerService,
    private store: Store,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.commercialUsername = user.username;
      this.loadData();
    });

    // Handle search changes
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.vm.searchTerm = searchTerm;
      if (this.commercialUsername) {
        this.loadData(searchTerm);
      }
    });

    // View Model
    this.vm$ = combineLatest({
      clients: this.store.select(selectPaginatedClients),
      loading: this.store.select(selectClientPaginationLoading),
      error: this.store.select(selectClientPaginationError),
      hasMore: this.store.select(selectClientPaginationHasMore),
      searchTerm: this.searchSubject.asObservable() // Use behavior subject value
    }).pipe(
      map(state => ({
        ...state,
        // Error might be null or string or object
        error: state.error ? (typeof state.error === 'string' ? state.error : 'Erreur inconnue') : null
      })),
      takeUntil(this.destroy$)
    );

    this.vm$.subscribe(vm => {
      this.vm = vm;
      if (this.infiniteScroll && !vm.loading) {
        this.infiniteScroll.complete();
      }
      this.cdr.detectChanges();
    });
  }

  loadData(searchTerm: string = '') {
    if (!this.commercialUsername) return;

    const filters: ClientRepositoryFilters = {
      searchQuery: searchTerm,
      tontineCollector: this.filterByTontineCollector || undefined
    };

    this.store.dispatch(loadFirstPageClients({
      commercialUsername: this.commercialUsername,
      pageSize: 50,
      filters
    }));
  }

  loadMore(event: any) {
    if (this.commercialUsername && this.vm.hasMore && !this.vm.loading) {
      const filters: ClientRepositoryFilters = {
        searchQuery: this.vm.searchTerm,
        tontineCollector: this.filterByTontineCollector || undefined
      };
      this.store.dispatch(loadNextPageClients({
        commercialUsername: this.commercialUsername,
        filters
      }));
    } else {
      event.target.complete();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(event: any) {
    this.searchSubject.next(event.target.value || '');
  }

  selectClient(client: Client) {
    this.modalController.dismiss({ client });
  }

  dismiss() {
    this.modalController.dismiss();
  }

  retry() {
    if (this.commercialUsername) {
      this.loadData(this.vm.searchTerm);
    }
  }

  // Helper methods for template
  getClientInitials(client: Client): string {
    const firstName = client.firstname || '';
    const lastName = client.lastname || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getClientDisplayName(client: Client): string {
    return client.fullName || `${client.firstname || ''} ${client.lastname || ''}`.trim();
  }

  getClientAddress(client: Client): string {
    return client.address || 'Adresse non renseignée';
  }

  getClientPhone(client: Client): string {
    return client.phone || 'Téléphone non renseigné';
  }

  getAvatarColor(client: Client): string {
    const colors = ['#FF6B35', '#2E8B57', '#4682B4', '#8B4513', '#9932CC', '#DC143C', '#008B8B', '#B8860B', '#8B008B', '#556B2F'];
    const idStr = String(client.id);
    const index = idStr ? parseInt(idStr.slice(-1), 16) % colors.length : 0;
    return colors[index];
  }

  formatClientInfo(client: Client): string {
    const parts = [client.occupation, client.quarter].filter(Boolean);
    return parts.join(' • ') || 'Client';
  }

  getEmptyStateMessage(searchTerm: string): string {
    return searchTerm.trim() ? `Aucun client trouvé pour "${searchTerm}"` : 'Aucun client disponible';
  }

  getEmptyStateSubtitle(searchTerm: string): string {
    return searchTerm.trim() ? 'Essayez avec un autre terme de recherche' : 'Les clients seront synchronisés lors de la prochaine connexion';
  }

  trackByClientId(index: number, client: Client): string {
    return client.id;
  }
}
