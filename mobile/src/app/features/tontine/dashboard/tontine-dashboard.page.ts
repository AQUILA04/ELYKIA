import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, map, startWith, tap, take, filter, switchMap } from 'rxjs/operators';
import { TontineService } from 'src/app/core/services/tontine.service';
import { selectTontineSession, selectTontineMembers } from 'src/app/store/tontine/tontine.selectors';
import { loadTontineSession, loadTontineMembers } from 'src/app/store/tontine/tontine.actions';
import { ActionSheetController, NavController } from '@ionic/angular';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import * as KpiActions from 'src/app/store/kpi/kpi.actions';
import * as KpiSelectors from 'src/app/store/kpi/kpi.selectors';

@Component({
    selector: 'app-tontine-dashboard',
    templateUrl: './tontine-dashboard.page.html',
    styleUrls: ['./tontine-dashboard.page.scss'],
    standalone: false
})
export class TontineDashboardPage implements OnInit, OnDestroy {
    session$: Observable<any>;
    members$: Observable<any[]>;
    filteredMembers$: Observable<any[]>;

    // Stats
    totalMembers$: Observable<number>;
    totalCollected$: Observable<number>;
    pendingDeliveries$: Observable<number>;
    currentYear$: Observable<number>;

    // Filters
    searchTerm$ = new BehaviorSubject<string>('');
    statusFilter$ = new BehaviorSubject<string>('all');
    groupedMembers$ = new BehaviorSubject<{ quarter: string, members: any[] }[]>([]);
    isGroupedView$: Observable<boolean>;

    private destroy$ = new Subject<void>();

    // Pagination
    displayedMembers$ = new BehaviorSubject<any[]>([]);
    private allFilteredMembers: any[] = [];
    private pageSize = 20;
    private currentPage = 1;

    constructor(
        private store: Store,
        private tontineService: TontineService,
        private navCtrl: NavController,
        private actionSheetCtrl: ActionSheetController,
    ) {
        this.session$ = this.store.select(selectTontineSession);
        this.members$ = this.store.select(selectTontineMembers);

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

        this.filteredMembers$ = combineLatest([
            this.members$,
            this.searchTerm$,
            this.statusFilter$
        ]).pipe(
            tap(([members, term, status]) => console.log('Dashboard: Filtering members...', { total: members?.length, term, status })),
            map(([members, searchTerm, statusFilter]) => {
                const filtered = members.filter(member => {
                    // Filter by status
                    const matchesStatus = statusFilter === 'all' ||
                        (statusFilter === 'active' && member.status === 'ACTIVE') ||
                        (statusFilter === 'pending' && member.deliveryStatus === 'PENDING') ||
                        (statusFilter === 'todo' && !member.hasPaidToday);

                    const term = searchTerm.toLowerCase();
                    const matchesSearch = !term ||
                        (member.clientName && member.clientName.toLowerCase().includes(term)) ||
                        (member.clientPhone && member.clientPhone.includes(term)) ||
                        (member.clientQuarter && member.clientQuarter.toLowerCase().includes(term));

                    return matchesStatus && matchesSearch;
                });

                console.log('Dashboard: Filtered members count:', filtered.length);

                // Grouping Logic for 'todo' view
                if (statusFilter === 'todo') {
                    const groups: { [key: string]: any[] } = {};
                    filtered.forEach(m => {
                        const quarter = m.clientQuarter || 'Autre';
                        if (!groups[quarter]) {
                            groups[quarter] = [];
                        }
                        groups[quarter].push(m);
                    });

                    const groupedArray = Object.keys(groups).sort().map(quarter => ({
                        quarter,
                        members: groups[quarter]
                    }));
                    this.groupedMembers$.next(groupedArray);
                }

                // Reset pagination when filter changes
                this.allFilteredMembers = filtered;
                this.currentPage = 1;
                this.loadInitialMembers();

                return filtered;
            })
        );
    }

    ngOnInit() {
        // Subscribe to filteredMembers to trigger the pipe and initial load
        this.filteredMembers$.pipe(takeUntil(this.destroy$)).subscribe();

        // Load Tontine Session
        this.store.dispatch(loadTontineSession());

        // Load Members and KPIs when Session is available
        combineLatest([
            this.session$.pipe(filter(s => !!s && !!s.id)),
            this.store.select(selectAuthUser).pipe(filter(u => !!u))
        ]).pipe(
            takeUntil(this.destroy$),
            tap(([session, user]) => {
                const sessionId = session.id;
                const commercialUsername = user.username;

                console.log('Dashboard: Session loaded, dispatching loads for session', sessionId);

                // Load detailed members list (for list view)
                this.store.dispatch(loadTontineMembers({ sessionId }));

                // Load KPIs (statistics)
                this.store.dispatch(KpiActions.loadTontineKpi({
                    sessionId,
                    commercialUsername,
                    dateFilter: { startDate: new Date().toISOString(), endDate: new Date().toISOString() } // Optional: Pass date filter if needed for 'daily' stats in the same call
                }));
            })
        ).subscribe();
    }

    ionViewWillEnter() {
        // Reload data when returning to this page
        combineLatest([
            this.session$.pipe(take(1), filter(s => !!s && !!s.id)),
            this.store.select(selectAuthUser).pipe(take(1), filter(u => !!u))
        ]).subscribe(([session, user]) => {
            const sessionId = session.id;
            const commercialUsername = user.username;

            console.log('Dashboard: Reloading data on view enter');
            this.store.dispatch(loadTontineMembers({ sessionId }));
            this.store.dispatch(KpiActions.loadTontineKpi({ sessionId, commercialUsername }));
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadInitialMembers() {
        const initialMembers = this.allFilteredMembers.slice(0, this.pageSize);
        this.displayedMembers$.next(initialMembers);
    }

    loadMoreMembers(event: any) {
        const currentLength = this.displayedMembers$.value.length;
        const totalLength = this.allFilteredMembers.length;

        if (currentLength < totalLength) {
            this.currentPage++;
            const nextMembers = this.allFilteredMembers.slice(0, this.currentPage * this.pageSize);
            this.displayedMembers$.next(nextMembers);
        }

        event.target.complete();

        if (this.displayedMembers$.value.length >= totalLength) {
            event.target.disabled = true;
        }
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
                },
            ],
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
