import { Component, forwardRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Client, ClientService } from 'src/app/client/service/client.service';

@Component({
  selector: 'app-client-select',
  templateUrl: './client-select.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ClientSelectComponent),
      multi: true
    }
  ]
})
export class ClientSelectComponent implements OnInit, OnChanges, OnDestroy, ControlValueAccessor {
  @Input() commercial: string | null = null;
  @Input() username: string | null = null;
  @Input() tontine = false;
  @Input() clientTypeFilter?: string;
  @Input() disabled = false;
  @Input() testId?: string;
  @Input() placeholder = 'Rechercher et sélectionner un client';
  @Input() inputId = 'clientId';

  clients: Client[] = [];
  clientsLoading = false;
  clientControl = new FormControl<number | null>(null);

  private readonly pageSize = 20;
  private clientsPage = 0;
  private clientsTotalPages = 0;
  private clientsSearchTerm = '';
  private clientsSearch$ = new Subject<string>();
  private clientIndex = new Map<number, Client>();
  private searchSub?: Subscription;
  private loadClientsSub?: Subscription;
  private ensureClientSub?: Subscription;
  private clientControlSub?: Subscription;

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.clientControlSub = this.clientControl.valueChanges.subscribe(clientId => {
      this.onChange(clientId);
      this.onTouched();
    });

    this.searchSub = this.clientsSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.loadClientsSub?.unsubscribe();
      this.clientsLoading = false;
      this.clientsSearchTerm = term;
      this.resetClients();
      this.loadClientsPage();
    });

    if (this.canLoadClients()) {
      this.loadClientsPage();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['commercial'] || changes['username'] || changes['tontine']) {
      this.resetClients();
      if (this.canLoadClients()) {
        this.loadClientsPage();
      }
    }
  }

  ngOnDestroy(): void {
    this.clientControlSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    this.loadClientsSub?.unsubscribe();
    this.ensureClientSub?.unsubscribe();
  }

  getClient(id: number): Client | undefined {
    return this.clientIndex.get(id) ?? this.clients.find(client => client.id === id);
  }

  onClientsScrollToEnd(): void {
    if (this.clientsLoading || !this.canLoadClients()) {
      return;
    }
    if (this.clientsPage < this.clientsTotalPages - 1) {
      this.clientsPage++;
      this.loadClientsPage();
    }
  }

  onClientsSearch(event: { term: string }): void {
    this.clientsSearch$.next(event.term ?? '');
  }

  writeValue(value: number | null): void {
    this.clientControl.setValue(value, { emitEvent: false });
    if (value != null && !this.getClient(value)) {
      this.ensureClientLoaded(value);
    }
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.clientControl.disable({ emitEvent: false });
    } else {
      this.clientControl.enable({ emitEvent: false });
    }
  }

  alwaysPassSearch = () => true;

  private canLoadClients(): boolean {
    return !!this.commercial || !!this.username;
  }

  private resetClients(): void {
    this.loadClientsSub?.unsubscribe();
    this.clientsLoading = false;
    this.clientsPage = 0;
    this.clients = [];
  }

  private loadClientsPage(): void {
    if (!this.canLoadClients() || this.clientsLoading) {
      return;
    }

    this.clientsLoading = true;
    const request$ = this.commercial
      ? this.clientService.getClientByCommercial(
        this.commercial,
        this.clientsPage,
        this.pageSize,
        'firstname,asc',
        this.clientsSearchTerm
      )
      : this.clientService.getClients(
        this.clientsPage,
        this.pageSize,
        'firstname,asc',
        this.username,
        this.clientsSearchTerm,
        this.tontine
      );

    this.loadClientsSub?.unsubscribe();
    this.loadClientsSub = request$.subscribe({
      next: (response: any) => {
        let newItems: Client[] = response.data?.content || [];
        if (this.clientTypeFilter) {
          newItems = newItems.filter(client => client.clientType === this.clientTypeFilter);
        }
        this.indexClients(newItems);
        const existingIds = new Set(this.clients.map(client => client.id));
        this.clients = [
          ...this.clients,
          ...newItems.filter(client => !existingIds.has(client.id))
        ];
        this.clientsTotalPages = response.data?.totalPages ?? 0;
        this.clientsLoading = false;
      },
      error: () => {
        this.clientsLoading = false;
      }
    });
  }

  private ensureClientLoaded(clientId: number): void {
    this.ensureClientSub?.unsubscribe();
    this.ensureClientSub = this.clientService.getClientById(clientId).subscribe({
      next: (response: any) => {
        const client = response.data ?? response;
        if (client?.id != null) {
          this.indexClients([client]);
          if (!this.clients.some(existing => existing.id === client.id)) {
            this.clients = [client, ...this.clients];
          }
        }
      }
    });
  }

  private indexClients(items: Client[]): void {
    items.forEach(item => this.clientIndex.set(item.id, item));
  }
}
