import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, map, startWith, tap, take, filter, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TontineService } from 'src/app/core/services/tontine.service';
import { selectTontineSession, selectPaginatedTontineMembers, selectTontineMemberPaginationLoading } from 'src/app/store/tontine/tontine.selectors';
import { loadTontineSession, loadFirstPageTontineMembers, loadNextPageTontineMembers } from 'src/app/store/tontine/tontine.actions';
import { ActionSheetController, NavController } from '@ionic/angular';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import * as KpiActions from 'src/app/store/kpi/kpi.actions';
import * as KpiSelectors from 'src/app/store/kpi/kpi.selectors';
import { TontineMemberView } from 'src/app/models/tontine.model';

@Component({
    selector: 'app-tontine-dashboard',
    templateUrl: './tontine-dashboard.page.html',
    styleUrls: ['./tontine-dashboard.page.scss'],
    standalone: false
})
export class TontineDashboardPage implements OnInit, OnDestroy {
    session$: Observable<any>;
    members$: Observable<TontineMemberView[]>;
    loading$: Observable<boolean>;

    // Derived streams for UI
    groupedMembers$: Observable<{ quarter: string, members: TontineMemberView[] }[]>;
    isGroupedView$: Observable<boolean>;

    // Stats
    totalMembers$: Observable<number>;
    totalCollected$: Observable<number>;
    pendingDeliveries$: Observable<number>;
    currentYear$: Observable<number>;

    // Filters (Local State for API calls)
    searchTerm$ = new BehaviorSubject<string>('');
    statusFilter$ = new BehaviorSubject<string>('todo'); // Default to 'todo' as it is the most useful view

    private destroy$ = new Subject<void>();
    private sessionId: string | null = null;

    constructor(
        private store: Store,
        private navCtrl: NavController,
        private actionSheetCtrl: ActionSheetController,
    ) {
        this.session$ = this.store.select(selectTontineSession);
        this.members$ = this.store.select(selectPaginatedTontineMembers);
        this.loading$ = this.store.select(selectTontineMemberPaginationLoading);

        this.isGroupedView$ = this.statusFilter$.pipe(
            map(status => status === 'todo')
        );

        this.currentYear$ = this.session$.pipe(
            map(session => session ? session.year : new Date().getFullYear())
        );

        // KPI Selectors from KpiStore
        this.totalMembers$ = this.store.select(KpiSelectors.selectTontineKpiTotalMembersBySession);
        this.totalCollected$ = this.store.select(KpiSelectors.selectTontineKpiTotalCollected);
        this.pendingDeliveries$ = this.store.select(KpiSelectors.selectTontineKpiPendingDeliveries);

        // Grouping logic (Local, based on current page of members)
        // When status is 'todo', the backend sorts by Quarter, so grouping should be consistent.
        this.groupedMembers$ = combineLatest([
            this.members$,
            this.statusFilter$
        ]).pipe(
            map(([members, status]) => {
                if (status !== 'todo') return [];

                const groups: { [key: string]: TontineMemberView[] } = {};
                members.forEach(m => {
                    const quarter = m.clientQuarter || 'Autre';
                    if (!groups[quarter]) {
                        groups[quarter] = [];
                    }
                    groups[quarter].push(m);
                });

                return Object.keys(groups).sort().map(quarter => ({
                    quarter,
                    members: groups[quarter]
                }));
            })
        );
    }

    ngOnInit() {
        // Load Tontine Session
        this.store.dispatch(loadTontineSession());

        // Handle Session & User Loading -> Trigger Initial Load
        combineLatest([
            this.session$.pipe(filter(s => !!s && !!s.id)),
            this.store.select(selectAuthUser).pipe(filter(u => !!u))
        ]).pipe(
            takeUntil(this.destroy$),
            tap(([session, user]) => {
                this.sessionId = session.id;
                const commercialUsername = user.username;

                if (this.sessionId) {
                    // Load KPIs
                    this.store.dispatch(KpiActions.loadTontineKpi({
                        sessionId: this.sessionId,
                        commercialUsername,
                        dateFilter: { startDate: new Date().toISOString(), endDate: new Date().toISOString() }
                    }));
                }
            })
        ).subscribe();

        // Handle Filter Changes -> Trigger Pagination Load
        combineLatest([
            this.session$.pipe(filter(s => !!s && !!s.id)),
            this.searchTerm$.pipe(debounceTime(300), distinctUntilChanged()),
            this.statusFilter$.pipe(distinctUntilChanged())
        ]).pipe(
            takeUntil(this.destroy$),
            tap(([session, search, status]) => {
                this.loadFirstPage(session.id, search, status);
            })
        ).subscribe();
    }

    ionViewWillEnter() {
        // Refresh logic if needed, but Reactive streams likely handle it if state is preserved.
        // If we want to force refresh on enter:
        if (this.sessionId) {
            const search = this.searchTerm$.value;
            const status = this.statusFilter$.value;
            this.loadFirstPage(this.sessionId, search, status);
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadFirstPage(sessionId: string, search: string, status: string) {
        console.log('Dashboard: Loading First Page', { sessionId, search, status });

        // Map UI status to API filters
        // UI: 'all', 'active' (status), 'pending' (delivery), 'todo' (!hasPaidToday)
        const filters: any = {};

        if (search) filters.searchQuery = search;

        if (status === 'todo') {
            filters.status = 'todo'; // Handled by Repository Extension
        } else if (status === 'active') {
            // In UI 'active' usually means member status ACTIVE.
            // But existing code checked `member.status === 'ACTIVE'`.
            filters.status = 'ACTIVE';
        } else if (status === 'pending') {
            filters.deliveryStatus = 'PENDING';
        }

        this.store.dispatch(loadFirstPageTontineMembers({
            sessionId,
            filters
        }));
    }

    loadMoreMembers(event: any) {
        if (this.sessionId) {
            const search = this.searchTerm$.value;
            const status = this.statusFilter$.value;
            const filters: any = {}; // Reconstruct filters logic similar to above
            if (search) filters.searchQuery = search;
            if (status === 'todo') filters.status = 'todo';
            else if (status === 'active') filters.status = 'ACTIVE';
            else if (status === 'pending') filters.deliveryStatus = 'PENDING';

            this.store.dispatch(loadNextPageTontineMembers({ sessionId: this.sessionId, filters }));
        }

        // Timeout to complete infinite scroll is handled by Effect? 
        // Or we should listen to loading state?
        // Simple approach: complete after short delay or listen to success action in component.
        // For now, let's complete it after 500ms or listen to loading$
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    filterByStatus(status: string) {
        this.statusFilter$.next(status);
    }

    onSearch(event: any) {
        this.searchTerm$.next(event.target.value);
    }

    viewMemberDetails(memberId: string) {
        this.navCtrl.navigateForward(['/tontine/member-detail', memberId]);
    }

    registerNewMember() {
        this.navCtrl.navigateForward(['/tontine/member-registration']);
    }

    goBack() {
        this.navCtrl.navigateBack('/tabs/dashboard');
    }

    async showMenu() {
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Options',
            buttons: [
                {
                    text: 'Démarrer une nouvelle session',
                    icon: 'play-circle-outline',
                    handler: () => {
                        this.startNewSession();
                    }
                },
                {
                    text: 'Voir les rapports',
                    icon: 'document-text-outline',
                    handler: () => {
                        this.viewReports();
                    }
                },
                {
                    text: 'Synchroniser',
                    icon: 'sync-outline',
                    handler: () => {
                        this.synchronize();
                    }
                },
                {
                    text: 'Annuler',
                    icon: 'close',
                    role: 'cancel',
                    cssClass: 'action-sheet-cancel' // Added class for better styling control
                },
            ],
            cssClass: 'custom-action-sheet' // Added class for better styling control
        });
        await actionSheet.present();
    }

    startNewSession() {
        console.log('Start new session');
    }

    viewReports() {
        console.log('View reports');
    }

    synchronize() {
        console.log('Synchronize');
    }

    getStatusLabel(status: string): string {
        const labels: { [key: string]: string } = {
            'ACTIVE': 'ACTIF',
            'PENDING': 'EN ATTENTE',
            'VALIDATED': 'VALIDÉ',
            'DELIVERED': 'LIVRÉ'
        };
        return labels[status] || status;
    }

    getStatusClass(status: string): string {
        const classes: { [key: string]: string } = {
            'ACTIVE': 'status-active',
            'PENDING': 'status-pending',
            'DELIVERED': 'status-delivered'
        };
        return classes[status] || '';
    }
}
