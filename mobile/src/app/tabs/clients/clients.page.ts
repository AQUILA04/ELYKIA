import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, BehaviorSubject, of } from 'rxjs';
import { ClientView } from 'src/app/models/client-view.model';
import { ClientRepositoryFilters } from 'src/app/core/repositories/client.repository.extensions';
import { selectPaginatedClientViews, selectClientPaginationHasMore, selectClientPaginationLoading } from 'src/app/store/client/client.selectors';
import * as ClientActions from 'src/app/store/client/client.actions';
import { FormControl } from '@angular/forms';
import { startWith, map, tap, catchError, filter, shareReplay, take, takeUntil, debounceTime, distinctUntilChanged, withLatestFrom } from 'rxjs/operators';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LoggerService } from '../../core/services/logger.service';
import { ActionSheetController, IonContent, IonInfiniteScroll } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { preferLocalPhotoPath, resolveClientPhotoSrc } from '../../core/utils/client-photo-display.util';

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
  private basePath: string = '';
  /** Re-export for template. */
  preferLocalPhotoPath = preferLocalPhotoPath;

  paginatedClients$: Observable<ClientView[]>;
  isLoading$: Observable<boolean>;
  hasMore$: Observable<boolean>;

  searchControl = new FormControl('');
  activeFilter = 'all';

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

  async ngOnInit() {
    try {
      const { uri } = await Filesystem.getUri({
        path: '',
        directory: Directory.ExternalStorage
      });
      this.basePath = uri;
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('Error getting base path:', e);
    }

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
          filters: this.buildListFilters(searchQuery)
        }));
      }
    });
  }

  loadMore(event: any) {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      if (user && user.username) {
        this.store.dispatch(ClientActions.loadNextPageClients({
          commercialUsername: user.username,
          filters: this.buildListFilters(this.searchControl.value || '')
        }));
      }
    });

    this.isLoading$.pipe(
      filter(loading => !loading),
      withLatestFrom(this.hasMore$),
      take(1)
    ).subscribe(([_, hasMore]) => {
      event.target.complete();
      if (!hasMore) {
        event.target.disabled = true;
      }
    });
  }

  setFilter(filterName: string) {
    this.activeFilter = filterName;
    this.content?.scrollToTop(500);
    this.refreshList(this.searchControl.value || '');
  }

  private buildListFilters(searchQuery: string): ClientRepositoryFilters {
    const filters: ClientRepositoryFilters = {};

    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    switch (this.activeFilter) {
      case 'credit':
        filters.hasActiveDistribution = true;
        break;
      case 'new':
        filters.isLocal = true;
        break;
      case 'quartier':
        filters.orderBy = 'quarter';
        break;
    }

    return filters;
  }

  openClientDetail(clientId: string) {
    this.router.navigate(['/client-detail', clientId]);
  }

  /**
   * Local FS first. HTTPS presigned URLs as plain strings; Capacitor paths trusted via util.
   */
  getPhotoUrl(localPath: string | undefined | null): string | SafeUrl {
    return resolveClientPhotoSrc(localPath, this.basePath, this.sanitizer);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Options',
      cssClass: 'elyk-action-sheet',
      buttons: [
        { text: 'Clients à Recouvrer', handler: () => this.router.navigate(['/recovery-client-list']) },
        { text: 'Annuler', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  handleImageError(event: any) {
    if (event.target) {
      event.target.src = 'assets/icon/person-circle-outline.svg';
      event.target.onerror = null;
    }
  }

  trackByClientId(index: number, client: ClientView): string {
    return client.id;
  }
}
