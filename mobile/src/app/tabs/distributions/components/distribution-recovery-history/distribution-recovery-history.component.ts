import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, take, filter } from 'rxjs/operators';
import { InfiniteScrollCustomEvent } from '@ionic/angular';

import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import {
  selectDistributionRecoveryItems,
  selectDistributionRecoveryHasMore,
  selectDistributionRecoveryLoading,
  selectDistributionRecoveryTotalItems,
  selectDistributionRecoveryError
} from '../../../../store/recovery/recovery.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { RecoveryView } from '../../../../models/recovery-view.model';

export interface DistributionRecoveryHistoryVM {
  recoveries: RecoveryView[];
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  error: string | null;
}

@Component({
  selector: 'app-distribution-recovery-history',
  templateUrl: './distribution-recovery-history.component.html',
  styleUrls: ['./distribution-recovery-history.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DistributionRecoveryHistoryComponent implements OnInit, OnDestroy {

  @Input() distributionId!: string;
  @Input() distributionReference!: string;

  vm$!: Observable<DistributionRecoveryHistoryVM>;

  private destroy$ = new Subject<void>();
  private commercialId: string | null = null;

  constructor(
    private store: Store,
    private modalController: ModalController
  ) {}

  ngOnInit(): void {
    // Build the view model observable
    this.vm$ = combineLatest([
      this.store.select(selectDistributionRecoveryItems),
      this.store.select(selectDistributionRecoveryLoading),
      this.store.select(selectDistributionRecoveryHasMore),
      this.store.select(selectDistributionRecoveryTotalItems),
      this.store.select(selectDistributionRecoveryError)
    ]).pipe(
      map(([recoveries, loading, hasMore, totalCount, error]) => ({
        recoveries,
        loading,
        hasMore,
        totalCount,
        error
      }))
    );

    // Get commercialId then dispatch first page load
    this.store.select(selectAuthUser).pipe(
      filter(user => !!user),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (!user || !this.distributionId) return;
      this.commercialId = user.username;
      this.store.dispatch(RecoveryActions.loadFirstPageDistributionRecoveries({
        distributionId: this.distributionId,
        commercialId: user.username,
        pageSize: 20
      }));
    });
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    if (!this.commercialId || !this.distributionId) {
      event.target.complete();
      return;
    }

    this.store.dispatch(RecoveryActions.loadNextPageDistributionRecoveries({
      distributionId: this.distributionId,
      commercialId: this.commercialId
    }));

    // Complete the infinite scroll event after a short delay
    // The disabled binding on ion-infinite-scroll handles stopping when hasMore = false
    this.store.select(selectDistributionRecoveryLoading).pipe(
      filter(loading => !loading),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      event.target.complete();
    });
  }

  async openRecoveryDetail(recovery: RecoveryView): Promise<void> {
    // RecoveryDetailComponent is non-standalone (NgModule-based), use dynamic import
    const { RecoveryDetailComponent } = await import(
      '../../../../features/recovery/components/recovery-detail/recovery-detail.component'
    );
    const modal = await this.modalController.create({
      component: RecoveryDetailComponent,
      componentProps: { recoveryId: recovery.id }
    });
    await modal.present();
  }

  trackByRecoveryId(index: number, recovery: RecoveryView): string {
    return recovery.id;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.dispatch(RecoveryActions.resetDistributionRecoveryPagination());
  }
}
