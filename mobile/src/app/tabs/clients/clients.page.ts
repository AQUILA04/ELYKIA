import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, from, of, switchMap, Subject } from 'rxjs';
import { ClientView } from 'src/app/models/client-view.model';
import { selectClientViewsByCommercialUsername, selectAllClients } from 'src/app/store/client/client.selectors';
import * as ClientActions from 'src/app/store/client/client.actions';
import { loadAccounts } from 'src/app/store/account/account.actions';
import { FormControl } from '@angular/forms';
import { startWith, map, tap, catchError, filter, shareReplay, take, takeUntil } from 'rxjs/operators';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { User } from 'src/app/models/auth.model';
import { LoggerService } from '../../core/services/logger.service';
import { ActionSheetController } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.page.html',
  styleUrls: ['./clients.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  filteredClients$!: Observable<ClientView[]>;
  filteredClients: ClientView[] = [];
  searchControl = new FormControl();
  activeFilter = 'all';

  constructor(
    private store: Store,
    private router: Router,
    private sanitizer: DomSanitizer,
    private log: LoggerService,
    private actionSheetCtrl: ActionSheetController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user$ = this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      shareReplay(1)
    );

    const clients$ = user$.pipe(
      switchMap(user => this.store.select(selectClientViewsByCommercialUsername(user.username))),
      map(clients => [...clients].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }))
    );

    this.filteredClients$ = combineLatest([
      clients$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([clients, searchTerm]) => this.filterAndSortClients(clients, searchTerm, this.activeFilter)),
      takeUntil(this.destroy$)
    );

    // Subscribe to update the synchronous property for virtual scrolling
    this.filteredClients$.subscribe(clients => {
      this.filteredClients = clients;
      this.cdr.detectChanges();
    });
  }

  ionViewWillEnter() {
    this.loadClientData();
  }

  private loadClientData() {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
        if (user && user.username) {
            this.store.dispatch(ClientActions.loadClients({ commercialUsername: user.username }));
            this.store.dispatch(loadAccounts());
        }
    });
  }

  private filterAndSortClients(clients: ClientView[], searchTerm: string, activeFilter: string): ClientView[] {
    const lowerCaseSearchTerm = (searchTerm || '').toLowerCase();
    let filtered = clients;

    if (lowerCaseSearchTerm) {
        filtered = clients.filter(client => 
            (client.fullName || `${client.firstname} ${client.lastname}`).toLowerCase().includes(lowerCaseSearchTerm)
        );
    }

    switch (activeFilter) {
        case 'credit':
            return filtered.filter(client => client.creditInProgress);
        case 'new':
            return filtered.filter(client => client.isLocal);
        case 'quartier':
            return [...filtered].sort((a, b) => (a.quarter || '').localeCompare(b.quarter || ''));
        default:
            return filtered;
    }
  }

  private photoUrlCache = new Map<string, Observable<SafeUrl>>();

  getPhotoUrl(localPath: string | undefined | null): Observable<SafeUrl> {
    if (!localPath) {
      return of('assets/icon/person-circle-outline.svg');
    }

    if (this.photoUrlCache.has(localPath)) {
      return this.photoUrlCache.get(localPath)!;
    }

    this.log.log(`[PhotoDebug-List] Attempting to load local photo from path: ${localPath}`);

    const photo$ = from(Filesystem.readFile({
      path: localPath,
      directory: Directory.Data
    })).pipe(
      map(file => {
        this.log.log(`[PhotoDebug-List] Successfully read localFile: ${localPath}`);
        return this.sanitizer.bypassSecurityTrustUrl(`data:image/jpeg;base64,${file.data}`);
      }),
      catchError((error) => {
        this.log.log(`[PhotoDebug-List] Failed to read localFile ${localPath}. Error: ${error}`);
        return of('assets/icon/person-circle-outline.svg');
      }),
      shareReplay(1)
    );

    this.photoUrlCache.set(localPath, photo$);
    return photo$;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.searchControl.setValue(this.searchControl.value); // Trigger re-evaluation
  }

  openClientDetail(clientId: string) {
    this.router.navigate(['/client-detail', clientId]);
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Options',
      buttons: [
        { text: 'Clients à Recouvrer', handler: () => this.router.navigate(['/recovery-client-list']) },
        { text: 'Annuler', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  trackByClientId(index: number, client: ClientView): string {
    return client.id;
  }
}