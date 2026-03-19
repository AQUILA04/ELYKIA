import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { filter, map, switchMap, tap, take, takeUntil, debounceTime, distinctUntilChanged, shareReplay, withLatestFrom } from 'rxjs/operators';
import { ClientView } from 'src/app/models/client-view.model';
import { User } from 'src/app/models/auth.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { selectPaginatedClientViews, selectClientPaginationHasMore, selectClientPaginationLoading } from 'src/app/store/client/client.selectors';
import * as ClientActions from 'src/app/store/client/client.actions';
import { LoggerService } from 'src/app/core/services/logger.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FormControl } from '@angular/forms';
import { IonInfiniteScroll } from '@ionic/angular';

interface GroupedClients {
  quarter: string;
  clients: ClientView[];
}

@Component({
  selector: 'app-recovery-client-list',
  templateUrl: './recovery-client-list.page.html',
  styleUrls: ['./recovery-client-list.page.scss'],
  standalone: false
})
export class RecoveryClientListPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  searchControl = new FormControl('');
  groupedClients$: Observable<GroupedClients[]>;
  isLoading$: Observable<boolean>;
  hasMore$: Observable<boolean>;

  private photoUrlCache = new Map<string, Observable<SafeUrl>>();
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private log: LoggerService,
    private sanitizer: DomSanitizer
  ) {
    this.isLoading$ = this.store.select(selectClientPaginationLoading);
    this.hasMore$ = this.store.select(selectClientPaginationHasMore);

    this.groupedClients$ = this.store.select(selectPaginatedClientViews).pipe(
      map(clients => this.groupClientsByQuarter(clients)),
      shareReplay(1)
    );
  }

  ngOnInit() {
    this.log.log('[RecoveryClientListPage] ngOnInit started');

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

  refreshList(query: string) {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      if (user && user.username) {
        this.store.dispatch(ClientActions.loadFirstPageClients({
          commercialUsername: user.username,
          pageSize: 20,
          filters: {
            searchQuery: query,
            hasCredit: true,
            orderBy: 'quarter'
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
            hasCredit: true,
            orderBy: 'quarter'
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

  private groupClientsByQuarter(clients: ClientView[]): GroupedClients[] {
    if (!clients || clients.length === 0) {
      return [];
    }

    // Since clients come sorted by Quarter from backend (hopefully), 
    // grouping them preserves that order effectively.
    // If we receive "Quarter A", "Quarter B" mixed because of pagination...
    // Actually, SQL sorts globally, so page 1 has first quarters, page 2 has next quarters.
    // The accumulated list in store will remain sorted.

    // However, the reduce function might shuffle keys if not careful, 
    // but usually insertion order is preserved in recent JS engines, or we explicitly sort keys.

    const grouped = clients.reduce((acc, client) => {
      const quarter = client.quarter || 'Non spécifié';
      if (!acc[quarter]) {
        acc[quarter] = [];
      }
      acc[quarter].push(client);
      return acc;
    }, {} as { [key: string]: ClientView[] });

    // We sort the quarters alphabetically to be sure, or rely on SQL sort?
    // User might prefer standard alphabetical Quarter sort.
    return Object.keys(grouped).sort().map(quarter => ({
      quarter,
      // Sort clients within quarter alphabetically
      clients: grouped[quarter].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
    }));
  }

  getPhotoUrl(path: string | undefined): Observable<SafeUrl> {
    if (!path || path.includes('person-circle-outline')) {
      return new BehaviorSubject('assets/icon/person-circle-outline.svg');
    }

    if (this.photoUrlCache.has(path)) {
      return this.photoUrlCache.get(path)!;
    }

    if (path.startsWith('http')) {
      const url = this.sanitizer.bypassSecurityTrustUrl(path);
      return new BehaviorSubject(url);
    }

    const photoSubject = new Subject<SafeUrl>();
    const photo$ = photoSubject.asObservable().pipe(shareReplay(1));

    Filesystem.readFile({
      path,
      directory: Directory.Data
    }).then(file => {
      const base64Data = `data:image/png;base64,${file.data}`;
      photoSubject.next(this.sanitizer.bypassSecurityTrustUrl(base64Data));
    }).catch(() => {
      photoSubject.next('assets/icon/person-circle-outline.svg'); // Fallback
    });

    this.photoUrlCache.set(path, photo$);
    return photo$;
  }

  openRecoveryPage(clientId: string) {
    this.router.navigate(['/recovery'], { queryParams: { clientId: clientId } });
  }
}
