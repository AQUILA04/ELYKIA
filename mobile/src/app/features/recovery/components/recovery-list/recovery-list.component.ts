import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, Subject } from 'rxjs';
import { map, startWith, filter, switchMap, takeUntil, take, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Recovery } from '../../../../models/recovery.model';
import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';
import * as KpiSelectors from '../../../../store/kpi/kpi.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { Actions, ofType } from '@ngrx/effects';
import { ModalController, IonInfiniteScroll } from '@ionic/angular';
import { RecoveryDetailComponent } from '../recovery-detail/recovery-detail.component';
import { FormControl } from '@angular/forms';
import { RecoveryView } from '../../../../models/recovery-view.model';
import { User } from '../../../../models/auth.model';

@Component({
  selector: 'app-recovery-list',
  templateUrl: './recovery-list.component.html',
  styleUrls: ['./recovery-list.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecoveryListComponent implements OnInit, OnDestroy {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  private destroy$ = new Subject<void>();

  // Use Paginated Selectors
  recoveries$: Observable<RecoveryView[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;

  // For filters
  searchControl = new FormControl('');
  typeFilterControl = new FormControl({ value: 'all', disabled: true }); // Disabled as requested
  periodFilterControl = new FormControl('all');

  // View Model
  vm$: Observable<{
    recoveries: RecoveryView[];
    loading: boolean;
    error: any;
    hasMore: boolean;
    stats: { total: number; today: number; totalAmount: number };
  }>;

  constructor(private store: Store, private modalController: ModalController, private cdr: ChangeDetectorRef, private actions$: Actions) {
    this.recoveries$ = this.store.select(RecoverySelectors.selectPaginatedRecoveryViews);
    this.loading$ = this.store.select(RecoverySelectors.selectRecoveryPaginationLoading);
    this.error$ = this.store.select(RecoverySelectors.selectRecoveryPaginationError);

    // Use KPI Store for stats
    const kpiStats$ = this.store.select(KpiSelectors.selectRecoveryListStats);
    const hasMore$ = this.store.select(RecoverySelectors.selectRecoveryPaginationHasMore);

    this.vm$ = combineLatest([
      this.recoveries$,
      this.loading$,
      this.error$,
      kpiStats$,
      hasMore$
    ]).pipe(
      map(([recoveries, loading, error, stats, hasMore]) => {
        return {
          recoveries,
          loading,
          error,
          hasMore,
          stats: {
            total: stats.total,
            today: stats.today,
            totalAmount: stats.totalAmount
          }
        };
      })
    );

    // Setup filter listeners to reload first page
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(400), distinctUntilChanged()),
      this.typeFilterControl.valueChanges.pipe(startWith('all')),
      this.periodFilterControl.valueChanges.pipe(startWith('all'))
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([search, type, period]) => {
      this.loadFirstPage(search || '', type || 'all', period || 'all');
    });
  }

  ngOnInit() {
    // Initial load handled by valueChanges subscription startWith
  }

  ionViewWillEnter() {
    // Force reload on enter to ensure data is fresh
    this.loadFirstPage(
      this.searchControl.value || '',
      this.typeFilterControl.value || 'all',
      this.periodFilterControl.value || 'all'
    );
  }

  private loadFirstPage(search: string, type: string, period: string) {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1)
    ).subscribe(user => {
      // Load List
      this.store.dispatch(RecoveryActions.loadFirstPageRecoveries({
        commercialId: user.username,
        pageSize: 20,
        filters: {
          clientId: search,
          paymentMethod: type !== 'all' ? type : undefined,
          dateFilter: this.mapPeriodToDateFilter(period)
        }
      }));

      // Load KPIs with same filters (except search which doesn't apply to global KPIs usually, but period does)
      // Note: KPI actions might need to be updated to accept filters if we want dynamic KPIs on this page.
      // Currently KpiActions.loadRecoveryKpi accepts dateFilter.
      // We should dispatch it here to update the stats cards based on the period filter.

      // Import KpiActions dynamically or add import
      import('../../../../store/kpi/kpi.actions').then(KpiActions => {
        this.store.dispatch(KpiActions.loadRecoveryKpi({
          commercialId: user.username,
          dateFilter: this.mapPeriodToDateFilter(period)
        }));
      });
    });
  }

  loadMore(event: any) {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1)
    ).subscribe(user => {
      this.store.dispatch(RecoveryActions.loadNextPageRecoveries({
        commercialId: user.username,
        filters: {
          clientId: this.searchControl.value || undefined,
          paymentMethod: this.typeFilterControl.value !== 'all' ? (this.typeFilterControl.value || undefined) : undefined,
          dateFilter: this.mapPeriodToDateFilter(this.periodFilterControl.value || 'all')
        }
      }));
    });

    // Complete infinite scroll when loading finishes
    this.actions$.pipe(
      ofType(
        RecoveryActions.loadNextPageRecoveriesSuccess,
        RecoveryActions.loadNextPageRecoveriesFailure
      ),
      take(1)
    ).subscribe(() => {
      event.target.complete();
    });
  }

  private mapPeriodToDateFilter(period: string): any {
    switch (period) {
      case 'today': return { startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] };
      case 'week': return { startDate: this.getWeekStartDate() };
      case 'month': return { startDate: this.getMonthStartDate() };
      default: return undefined;
    }
  }

  private getWeekStartDate(): string {
    const now = new Date();
    const weekStartDate = new Date(now.setDate(now.getDate() - now.getDay()));
    return weekStartDate.toISOString().split('T')[0];
  }

  private getMonthStartDate(): string {
    const now = new Date();
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return monthStartDate.toISOString().split('T')[0];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByRecoveryId(index: number, recovery: RecoveryView): string {
    return recovery.id;
  }

  async openDetailModal(recovery: RecoveryView) {
    const modal = await this.modalController.create({
      component: RecoveryDetailComponent,
      componentProps: { recoveryId: recovery.id }
    });
    return await modal.present();
  }

}
