import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, BehaviorSubject, of } from 'rxjs';
import { ClientView } from 'src/app/models/client-view.model';
import { selectPaginatedClientViews, selectClientPaginationHasMore, selectClientPaginationLoading } from 'src/app/store/client/client.selectors';
import * as ClientActions from 'src/app/store/client/client.actions';
import { FormControl } from '@angular/forms';
import { startWith, map, tap, catchError, filter, shareReplay, take, takeUntil, debounceTime, distinctUntilChanged, withLatestFrom } from 'rxjs/operators';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LoggerService } from '../../core/services/logger.service';
import { ActionSheetController, IonContent, IonInfiniteScroll } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

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
          filters: {
            searchQuery: searchQuery,
            clientType: this.activeFilter === 'all' ? undefined : this.activeFilter,
          }
        }));
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

  openClientDetail(clientId: string) {
    this.router.navigate(['/client-detail', clientId]);
  }

  /**
   * Optimized photo URL retrieval using Capacitor.convertFileSrc.
   * This avoids reading the file into memory (base64) and uses the native WebView rendering.
   */
  getPhotoUrl(localPath: string | undefined | null): SafeUrl {
    if (!localPath) {
      return this.sanitizer.bypassSecurityTrustUrl('assets/icon/person-circle-outline.svg');
    }

    // Sur le Web, les chemins de fichiers natifs ne fonctionneront pas directement.
    // On retourne l'image par défaut pour éviter les erreurs 404 dans la console,
    // sauf si c'est une URL http ou un asset.
    if (Capacitor.getPlatform() === 'web' && !localPath.startsWith('http') && !localPath.startsWith('assets')) {
      return this.sanitizer.bypassSecurityTrustUrl('assets/icon/person-circle-outline.svg');
    }

    // Si le chemin est déjà une URL complète ou un asset
    if (localPath.startsWith('http') || localPath.startsWith('assets') || localPath.startsWith('file://') || localPath.startsWith('content://')) {
      return this.sanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(localPath));
    }

    // Si c'est un chemin relatif, on a besoin du basePath
    if (!this.basePath) {
      // En attendant que le basePath soit chargé, on affiche l'image par défaut pour éviter les 404
      return this.sanitizer.bypassSecurityTrustUrl('assets/icon/person-circle-outline.svg');
    }

    const finalPath = this.basePath + (localPath.startsWith('/') ? '' : '/') + localPath;
    return this.sanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(finalPath));
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
