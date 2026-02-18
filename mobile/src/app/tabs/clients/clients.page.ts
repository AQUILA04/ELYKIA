import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { ClientView } from 'src/app/models/client-view.model';
import { selectPaginatedClientViews, selectClientPaginationHasMore, selectClientPaginationLoading } from 'src/app/store/client/client.selectors';
import * as ClientActions from 'src/app/store/client/client.actions';
import { loadAccounts } from 'src/app/store/account/account.actions';
import { FormControl } from '@angular/forms';
import { startWith, map, tap, catchError, filter, shareReplay, take, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LoggerService } from '../../core/services/logger.service';
import { ActionSheetController, IonContent, IonInfiniteScroll } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.page.html',
  styleUrls: ['./clients.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsPage implements OnInit, OnDestroy {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild(IonContent) content!: IonContent;

  private destroy$ = new Subject<void>();

  paginatedClients$: Observable<ClientView[]>;
  isLoading$: Observable<boolean>;
  hasMore$: Observable<boolean>;

  searchControl = new FormControl('');
  activeFilter = 'all';

  private photoUrlCache = new Map<string, Observable<SafeUrl>>();

  constructor(
    private store: Store,
    private router: Router,
    private sanitizer: DomSanitizer,
    private log: LoggerService,
    private actionSheetCtrl: ActionSheetController,
    private cdr: ChangeDetectorRef
  ) {
    this.paginatedClients$ = this.store.select(selectPaginatedClientViews);
    this.isLoading$ = this.store.select(selectClientPaginationLoading);
    this.hasMore$ = this.store.select(selectClientPaginationHasMore);
  }

  ngOnInit() {
    // Handle Search
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.refreshList(query || '');
    });
  }

  ionViewWillEnter() {
    this.refreshList(this.searchControl.value || '');
  }

  refreshList(searchQuery: string) {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      if (user && user.username) {
        this.store.dispatch(ClientActions.loadFirstPageClients({
          commercialUsername: user.username,
          pageSize: 20,
          filters: {
            searchQuery: searchQuery,
            clientType: this.activeFilter === 'all' ? undefined : this.activeFilter,
            // Map UI filters to backend filters if needed (e.g. 'credit', 'new', 'quartier' logic might need adjustment in Repository)
            // For now, assuming Repository handles these or we might need to adjust 'clientType' usage.
            // 'credit' -> handled by repository logic if passed? repository handles 'quartier' sort?
            // Checking client.repository.extensions: it handles 'quarter', 'isLocal', 'isSync'.
            // 'credit' logic (clients with credit) might need a specific filter flag.
          }
        }));

        // Also ensure accounts are loaded for the balance display
        this.store.dispatch(loadAccounts());
      }
    });
  }

  loadMore(event: any) {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      if (user && user.username) {
        this.store.dispatch(ClientActions.loadNextPageClients({
          commercialUsername: user.username,
          filters: {
            searchQuery: this.searchControl.value || '',
            clientType: this.activeFilter === 'all' ? undefined : this.activeFilter
          }
        }));
      }
    });

    // Determine when to complete the infinite scroll
    // We can use a slight delay or listen to loading state changes
    // But typically we just complete it immediately or after a short delay, 
    // or let the effect handle it?
    // Effects usually don't complete the UI event. 
    // We should wait for loading to be false.
    this.isLoading$.pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      event.target.complete();
    });
  }

  setFilter(filterName: string) {
    this.activeFilter = filterName;
    this.content?.scrollToTop(500);
    this.refreshList(this.searchControl.value || '');
  }

  openClientDetail(clientId: string) {
    this.router.navigate(['/client-detail', clientId]);
  }

  getPhotoUrl(localPath: string | undefined | null): Observable<SafeUrl> {
    if (!localPath) {
      return new BehaviorSubject('assets/icon/person-circle-outline.svg');
    }

    if (this.photoUrlCache.has(localPath)) {
      return this.photoUrlCache.get(localPath)!;
    }

    const photoSubject = new Subject<SafeUrl>();
    const photo$ = photoSubject.asObservable().pipe(shareReplay(1));

    Filesystem.readFile({
      path: localPath,
      directory: Directory.ExternalStorage
    }).then(file => {
      photoSubject.next(this.sanitizer.bypassSecurityTrustUrl(`data:image/jpeg;base64,${file.data}`));
    }).catch(() => {
      // Fallback
      Filesystem.readFile({
        path: localPath,
        directory: Directory.Data
      }).then(file => {
        photoSubject.next(this.sanitizer.bypassSecurityTrustUrl(`data:image/jpeg;base64,${file.data}`));
      }).catch(() => {
        photoSubject.next('assets/icon/person-circle-outline.svg');
      });
    });

    this.photoUrlCache.set(localPath, photo$);
    return photo$;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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