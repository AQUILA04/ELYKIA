import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, Subject } from 'rxjs';
import { map, startWith, filter, switchMap, takeUntil, take } from 'rxjs/operators';
import { Recovery } from '../../../../models/recovery.model';
import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { ModalController } from '@ionic/angular';
import { RecoveryDetailComponent } from '../recovery-detail/recovery-detail.component';
import { FormControl } from '@angular/forms';
import { RecoveryView } from '../../../../models/recovery-view.model';
import { selectRecoveryViews } from '../../../../store/recovery/recovery.selectors';
import { User } from '../../../../models/auth.model';
import { Commercial } from '../../../../models/commercial.model';

@Component({
  selector: 'app-recovery-list',
  templateUrl: './recovery-list.component.html',
  styleUrls: ['./recovery-list.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecoveryListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  recoveries$: Observable<RecoveryView[]>;
  recoveries: RecoveryView[] = [];
  searchControl = new FormControl();
  typeFilterControl = new FormControl('all');
  periodFilterControl = new FormControl('all');

  // Observables pour les statistiques
  stats$: Observable<{ total: number; today: number; totalAmount: number }>;
  stats = { total: 0, today: 0, totalAmount: 0 };

  constructor(private store: Store, private modalController: ModalController, private cdr: ChangeDetectorRef) {
    const baseRecoveries$ = this.store.select(selectAuthUser).pipe(
      filter((user: User | null): user is User => !!user),
      switchMap((user: User) => this.store.select(RecoverySelectors.selectRecoveryViewsByCommercialUsername(user.username)))
    );

    const filteredRecoveries$ = combineLatest([
      baseRecoveries$,
      this.searchControl.valueChanges.pipe(startWith('')),
      this.typeFilterControl.valueChanges.pipe(startWith('all')),
      this.periodFilterControl.valueChanges.pipe(startWith('all'))
    ]).pipe(
      map(([recoveries, searchTerm, type, period]) => {
        const lowerCaseSearchTerm = (searchTerm as string).toLowerCase();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return (recoveries as RecoveryView[]).filter((r: RecoveryView) => {
          const recoveryDate = new Date(r.paymentDate);
          let periodMatch = false;
          if (period === 'all') {
            periodMatch = true;
          } else if (period === 'today') {
            periodMatch = recoveryDate >= today;
          } else if (period === 'week') {
            const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
            periodMatch = recoveryDate >= weekStart;
          } else if (period === 'month') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            periodMatch = recoveryDate >= monthStart;
          }

          const typeMatch = type === 'all' || r.paymentMethod === type;
          const searchMatch = !searchTerm || (r.client && r.client.fullName && r.client.fullName.toLowerCase().includes(lowerCaseSearchTerm));

          return periodMatch && typeMatch && searchMatch;
        });
      })
    );

    this.recoveries$ = filteredRecoveries$.pipe(
      takeUntil(this.destroy$)
    );

    // Subscribe to update the synchronous property for virtual scrolling
    this.recoveries$.subscribe(recoveries => {
      this.recoveries = recoveries;
      this.cdr.markForCheck();
    });

    this.stats$ = filteredRecoveries$.pipe(
      map((recoveries: RecoveryView[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayRecoveries = recoveries.filter((r: RecoveryView) => new Date(r.paymentDate) >= today);

        return {
          total: recoveries.length,
          today: todayRecoveries.length,
          totalAmount: recoveries.reduce((sum: number, r: RecoveryView) => sum + r.amount, 0)
        };
      }),
      takeUntil(this.destroy$)
    );

    // Subscribe to update the synchronous stats property
    this.stats$.subscribe(stats => {
      this.stats = stats;
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    // Ne pas charger ici pour éviter le double chargement
  }

  ionViewWillEnter() {
    // Recharger les données à chaque fois qu'on entre dans la vue
    this.loadRecoveries();
  }

  private loadRecoveries() {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1) // Prendre seulement la première valeur pour éviter les multiples dispatches
    ).subscribe(user => {
      this.store.dispatch(RecoveryActions.loadRecoveries({ commercialUsername: user.username }));
    });
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
