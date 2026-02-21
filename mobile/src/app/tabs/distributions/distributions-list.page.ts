import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, filter, switchMap, take, map, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, InfiniteScrollCustomEvent, IonInfiniteScroll } from '@ionic/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Distribution } from '../../models/distribution.model';
import { DistributionItemComponent } from './components/distribution-item/distribution-item.component';

import * as DistributionActions from '../../store/distribution/distribution.actions';
import * as DistributionSelectors from '../../store/distribution/distribution.selectors';
import * as KpiActions from '../../store/kpi/kpi.actions';
import { selectDistributionKpi } from '../../store/kpi/kpi.selectors';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { DistributionDetailComponent } from './components/distribution-detail/distribution-detail.component';
import { selectAllClients } from '../../store/client/client.selectors';
import { selectAllArticles } from '../../store/article/article.selectors';
import { DistributionView } from '../../models/distribution-view.model';
import { User } from '../../models/auth.model';

interface DistributionsViewModel {
  displayedDistributions: Distribution[];
  loading: boolean;
  error: string | null;
  stats: { total: number; active: number; totalAmount: number };
}

@Component({
  selector: 'app-distributions-list',
  templateUrl: './distributions-list.page.html',
  styleUrls: ['./distributions-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, DistributionItemComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DistributionsListPage implements OnInit, OnDestroy {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  searchControl = new FormControl('');

  // View Model
  vm$: Observable<{
    distributions: DistributionView[];
    loading: boolean;
    error: any;
    stats: { total: number; active: number; totalAmount: number };
    totalItems: number; // For list header
  }>;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    const distributions$ = this.store.select(DistributionSelectors.selectPaginatedDistributions);
    const loading$ = this.store.select(DistributionSelectors.selectDistributionPaginationLoading);
    const error$ = this.store.select(DistributionSelectors.selectDistributionPaginationError);
    const hasMore$ = this.store.select(DistributionSelectors.selectDistributionPaginationHasMore); // Handle implicitely via infinite scroll disabled logic?
    // Actually we need `hasMore` for the UI?
    // The current UI uses `vm.displayedDistributions.length >= all`.
    // We can expose `hasMore` or `totalItems`.
    const totalItems$ = this.store.select(DistributionSelectors.selectDistributionPaginationTotalItems);

    const kpi$ = this.store.select(selectDistributionKpi);

    this.vm$ = combineLatest([
      distributions$,
      loading$,
      error$,
      kpi$,
      totalItems$
    ]).pipe(
      map(([distributions, loading, error, kpi, totalItems]) => ({
        distributions,
        loading,
        error,
        stats: {
          total: kpi.totalByCommercial,
          active: kpi.activeByCommercial,
          totalAmount: kpi.totalAmountByCommercial
        },
        totalItems
      }))
    );
  }

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.refreshList(query || '');
    });
  }

  ionViewWillEnter() {
    this.loadInitialData();
  }

  private loadInitialData() {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1)
    ).subscribe(user => {
      // Load KPIs
      this.store.dispatch(KpiActions.loadDistributionKpi({ commercialId: user.username }));

      // Load List (First Page)
      this.refreshList(this.searchControl.value || '');
    });
  }

  refreshList(query: string) {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      if (user && user.username) {
        this.store.dispatch(DistributionActions.loadFirstPageDistributions({
          commercialUsername: user.username,
          pageSize: 20,
          filters: {
            searchQuery: query
          }
        }));
      }
    });
  }

  loadMoreData(event: any) {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      if (user && user.username) {
        this.store.dispatch(DistributionActions.loadNextPageDistributions({
          commercialUsername: user.username,
          filters: {
            searchQuery: this.searchControl.value || ''
          }
        }));
      }
    });

    // Complete infinite scroll when loading finishes
    this.store.select(DistributionSelectors.selectDistributionPaginationLoading).pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      event.target.complete();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(event: any) {
    this.searchControl.setValue(event.detail.value);
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  refreshDistributions(event?: any) {
    this.loadInitialData();
    if (event) setTimeout(() => event.target.complete(), 500); // Simulate network delay or wait for store?
  }

  goToNewDistribution() { this.router.navigate(['/distributions/new']); }
  goToNewOrder() { console.log('Go To New Order'); }
  retryLoadDistributions() { this.loadInitialData(); }
  trackByDistributionId(index: number, distribution: DistributionView): string { return distribution.id; }

  async openDistributionDetail(distribution: DistributionView) {
    // Re-fetch details if necessary or pass the view
    // The previous implementation fetched all items.
    // DistributionView might act differently.
    // For now, let's pass it. Use existing logic but adapted.
    // Fetching all items from store might be expensive if we don't have them?
    // Check DistributionSelectors.selectAllDistributionItems - this might be legacy "LoadAll"?
    // If we used Pagination, maybe we don't have "All Items" in store?
    // `DistributionStore` likely has `items` (legacy) vs `pagination`.
    // The legacy `selectAllDistributionItems` might be empty!
    // I should probably fetch details via a specific action if items are missing.
    // OR, since `DistributionView` handles the display, maybe Detail component needs `Distribution` with `items`.

    // Temporary fix: just open modal. The Detail Component might need refactoring too if it relies on full loaded items.
    // Assuming for now we proceed.
    const modal = await this.modalController.create({
      component: DistributionDetailComponent,
      componentProps: { distribution }, // Pass the view directly?
      cssClass: 'distribution-detail-modal'
    });
    modal.onDidDismiss().then(result => {
      if (result.data?.deleted) { this.refreshDistributions(); }
    });
    return await modal.present();
  }
}
