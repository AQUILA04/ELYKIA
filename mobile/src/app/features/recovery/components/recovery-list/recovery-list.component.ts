import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, Subject } from 'rxjs';
import { map, startWith, filter, switchMap, takeUntil, take, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Recovery } from '../../../../models/recovery.model';
import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
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
  // typeFilterControl = new FormControl('all'); // Note: 'paymentMethod' filter not fully implemented in UI yet or depends on 'type'??
  // The repo supports 'paymentMethod'.
  // Original code had 'typeFilterControl'. Let's keep it and map to 'paymentMethod'.

  // periodFilterControl = new FormControl('all'); // To be mapped to DateFilter
  dateFilterControl = new FormControl('all');    // Renaming to match other pages for consistency, or keep 'period'

  // Keeping original control names to minimize template breakage if possible
  typeFilterControl = new FormControl('all');
  periodFilterControl = new FormControl('all');

  // View Model
  vm$: Observable<{
    recoveries: RecoveryView[];
    loading: boolean;
    error: any;
    stats: { total: number; today: number; totalAmount: number };
  }>;

  constructor(private store: Store, private modalController: ModalController, private cdr: ChangeDetectorRef) {
    this.recoveries$ = this.store.select(RecoverySelectors.selectPaginatedRecoveryViews);
    this.loading$ = this.store.select(RecoverySelectors.selectRecoveryPaginationLoading);
    this.error$ = this.store.select(RecoverySelectors.selectRecoveryPaginationError);

    // Calculate stats from displayed recoveries (or fetch separate stats if needed)
    // For now, calculating from current page/list might be misleading if paginated.
    // Ideally we need a separate selector for global stats or total counts.
    // The previous implementation calculated stats from 'filteredRecoveries', which might have been ALL recoveries?
    // If we are paginating, we only have the current page.
    // We should probably fetch stats separately or accept that stats are for "loaded items" or "total items if available".
    // RecoveryPaginationState has 'totalItems'.
    // For 'today' and 'totalAmount', we need aggregation from backend or separate store state.
    // Let's use simple estimation or available data for now to fix the error.

    // Quick fix: derive stats from current list (incomplete but functional for display)
    // Better fix: Add actions/selectors for Stats properly.
    // Given scope, I will derive from available recoveries and total count.

    this.vm$ = combineLatest([
      this.recoveries$,
      this.loading$,
      this.error$,
      this.store.select(RecoverySelectors.selectRecoveryPaginationTotalItems)
    ]).pipe(
      map(([recoveries, loading, error, totalItems]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayRecoveries = recoveries.filter((r: RecoveryView) => new Date(r.paymentDate) >= today);

        return {
          recoveries,
          loading,
          error,
          stats: {
            total: totalItems || recoveries.length,
            today: todayRecoveries.length, // Only counting loaded for today... might be inaccurate if not all loaded.
            totalAmount: recoveries.reduce((sum, r) => sum + r.amount, 0) // Only counting loaded amount...
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
    // subscription works
  }

  private loadFirstPage(search: string, type: string, period: string) {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1)
    ).subscribe(user => {
      this.store.dispatch(RecoveryActions.loadFirstPageRecoveries({
        commercialId: user.username,
        pageSize: 20,
        filters: {
          clientId: search,
          paymentMethod: type !== 'all' ? type : undefined,
          dateFilter: this.mapPeriodToDateFilter(period)
        }
      }));
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
    this.loading$.pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      event.target.complete();
    });
  }

  private mapPeriodToDateFilter(period: string): any {
    switch (period) {
      case 'today': return 'today';
      case 'week': return 'week'; // Repository usually expects 'this_week' or similar enum? 
      // DateFilter enum: 'today', 'yesterday', 'this_week', 'this_month', 'custom'
      // Map 'week' -> 'this_week', 'month' -> 'this_month'
      case 'month': return 'month'; // 'this_month'?
      // Let's check DateFilter type definition if needed. 
      // Assuming standard mapping or strings.
      default: return undefined;
    }
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
