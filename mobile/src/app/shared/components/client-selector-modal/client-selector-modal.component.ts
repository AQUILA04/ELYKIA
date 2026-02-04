import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { loadClients } from 'src/app/store/client/client.actions';
import { LoggerService } from '../../../core/services/logger.service';
import { Client } from '../../../models/client.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { selectClientsByCommercialUsername, selectClientsLoading, selectClientsError } from 'src/app/store/client/client.selectors';
import { User } from '../../../models/auth.model';

interface ClientSelectorViewModel {
  clients: Client[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
}

@Component({
  selector: 'app-client-selector-modal',
  templateUrl: './client-selector-modal.component.html',
  styleUrls: ['./client-selector-modal.component.scss'],
  standalone: false
})
export class ClientSelectorModalComponent implements OnInit, OnDestroy {
  @Input() filterByTontineCollector: string | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');

  vm$!: Observable<ClientSelectorViewModel>;
  vm: ClientSelectorViewModel = {
    clients: [],
    loading: false,
    error: null,
    searchTerm: ''
  };

  constructor(
    private modalController: ModalController,
    private log: LoggerService,
    private store: Store,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.store.dispatch(loadClients({ commercialUsername: 'unused' }));

    const clients$ = this.store.select(selectAuthUser).pipe(
      filter((user: User | null): user is User => !!user),
      switchMap(user => this.store.select(selectClientsByCommercialUsername(user.username))),
      map(clients => {
        if (this.filterByTontineCollector) {
          return clients.filter(client => client.tontineCollector === this.filterByTontineCollector);
        }
        return clients;
      })
    );

    const search$ = this.searchSubject.asObservable().pipe(
      startWith(''),
      distinctUntilChanged()
    );

    const filteredClients$ = combineLatest([clients$, search$]).pipe(
      map(([clients, searchTerm]) => {
        if (!searchTerm.trim()) {
          return clients;
        }
        const term = searchTerm.toLowerCase().trim();
        return clients.filter(client =>
          client.firstname?.toLowerCase().includes(term) ||
          client.lastname?.toLowerCase().includes(term) ||
          client.fullName?.toLowerCase().includes(term) ||
          client.phone?.includes(term)
        );
      })
    );

    this.vm$ = combineLatest({
      clients: filteredClients$,
      loading: this.store.select(selectClientsLoading),
      error: this.store.select(selectClientsError),
      searchTerm: search$
    }).pipe(
      takeUntil(this.destroy$)
    );

    // Subscribe to update the synchronous property for virtual scrolling
    this.vm$.subscribe(vm => {
      this.vm = vm;
      this.cdr.detectChanges();
    });
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
    this.store.dispatch(loadClients({ commercialUsername: 'unused' }));
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
