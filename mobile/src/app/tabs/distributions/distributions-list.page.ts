import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, filter, switchMap, take, map, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
// CORRECTION 1: Le nom du type pour l'événement est corrigé ici
import { IonicModule, ModalController, InfiniteScrollCustomEvent } from '@ionic/angular';

// ScrollingModule n'est plus nécessaire
// import { ScrollingModule } from '@angular/cdk/scrolling';

import { Distribution } from '../../models/distribution.model';
import { DistributionItemComponent } from './components/distribution-item/distribution-item.component';

import * as DistributionActions from '../../store/distribution/distribution.actions';
import * as DistributionSelectors from '../../store/distribution/distribution.selectors';
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
  imports: [CommonModule, IonicModule, DistributionItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DistributionsListPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchTerm$ = new BehaviorSubject<string>('');

  // CORRECTION 2: La propriété est maintenant 'public' pour être accessible depuis le HTML
  public allDistributions: Distribution[] = [];
  private page = 0;
  private readonly pageSize = 20;
  public isInfiniteScrollDisabled = false;

  vm: DistributionsViewModel = {
    displayedDistributions: [],
    loading: true,
    error: null,
    stats: { total: 0, active: 0, totalAmount: 0 }
  };

  constructor(
    private store: Store,
    private router: Router,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDataStreams();
  }

  ionViewWillEnter() {
    this.loadInitialData();
  }

  private setupDataStreams() {
    const allDistributions$ = this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      switchMap(user => this.store.select(DistributionSelectors.selectDistributionsByCommercialUsername(user.username)))
    );

    const clients$ = this.store.select(selectAllClients);

    const distributionsWithClients$ = combineLatest([allDistributions$, clients$]).pipe(
      map(([distributions, clients]) =>
        distributions.map(dist => {
          const client = clients.find(c => c.id === dist.clientId);
          const clientName = client ? `${client.firstname || ''} ${client.lastname || ''}`.trim() : '';
          return { ...dist, clientName };
        })
      )
    );

    combineLatest([
      distributionsWithClients$,
      this.searchTerm$.pipe(debounceTime(300), distinctUntilChanged())
    ]).pipe(
      takeUntil(this.destroy$),
      map(([distributions, searchTerm]) => {
        if (!searchTerm.trim()) {
          return distributions;
        }
        const term = searchTerm.toLowerCase().trim();
        return distributions.filter(dist =>
          dist.reference?.toLowerCase().includes(term) ||
          dist.clientName?.toLowerCase().includes(term) ||
          dist.id?.toLowerCase().includes(term)
        );
      })
    ).subscribe(filteredDists => {
      this.allDistributions = filteredDists;
      this.updateStats(this.allDistributions);
      this.resetAndLoadFirstPage();
    });

    this.store.select(DistributionSelectors.selectDistributionsLoading).pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.vm.loading = loading;
      this.cdr.markForCheck();
    });

    this.store.select(DistributionSelectors.selectDistributionsError).pipe(takeUntil(this.destroy$)).subscribe(error => {
      this.vm.error = error;
      this.cdr.markForCheck();
    });
  }

  private loadInitialData() {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1)
    ).subscribe(user => {
      this.store.dispatch(DistributionActions.loadDistributions({ commercialUsername: user.username }));
    });
  }

  private resetAndLoadFirstPage() {
    this.page = 0;
    this.vm.displayedDistributions = [];
    this.isInfiniteScrollDisabled = false;
    this.loadMoreData();
  }

  // CORRECTION 1 (suite): Le type de l'événement est corrigé ici aussi
  loadMoreData(event?: InfiniteScrollCustomEvent) {
    const startIndex = this.page * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    const nextChunk = this.allDistributions.slice(startIndex, endIndex);

    this.vm.displayedDistributions.push(...nextChunk);

    this.page++;

    if (this.vm.displayedDistributions.length >= this.allDistributions.length) {
      this.isInfiniteScrollDisabled = true;
    }

    if (event) {
      event.target.complete();
    }

    this.cdr.markForCheck();
  }

  private updateStats(distributions: Distribution[]) {
     this.vm.stats = {
        total: distributions.length,
        active: distributions.filter(d => d.status === 'INPROGRESS' || d.status === 'ACTIVE').length,
        totalAmount: distributions.reduce((sum, d) => sum + d.totalAmount, 0)
     };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(event: any) {
    this.searchTerm$.next(event.detail.value || '');
  }

  clearSearch() {
    this.searchTerm$.next('');
  }

  refreshDistributions(event?: any) {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      take(1)
    ).subscribe((user: User) => {
      this.store.dispatch(DistributionActions.refreshDistributions({ commercialUsername: user.username }));
      if(event) setTimeout(() => event.target.complete(), 500);
    });
  }

  goToNewDistribution() { this.router.navigate(['/distributions/new']); }
  goToNewOrder() { console.log('Go To New Order'); }
  retryLoadDistributions() { this.loadInitialData(); }
  trackByDistributionId(index: number, distribution: Distribution): string { return distribution.id; }

  async openDistributionDetail(distribution: Distribution) {
    const clients = await firstValueFrom(this.store.select(selectAllClients));
    const articles = await firstValueFrom(this.store.select(selectAllArticles));
    const allItems = await firstValueFrom(this.store.select(DistributionSelectors.selectAllDistributionItems));
    const client = clients.find(c => c.id === distribution.clientId);
    if (!client) return;
    const distributionWithItems = { ...distribution, items: allItems.filter(item => item.distributionId === distribution.id) };
    const distributionView: DistributionView = {
      ...(distributionWithItems as any),
      client: client,
      items: (distributionWithItems.items || []).map(item => {
        const article = articles.find(a => a.id === item.articleId);
        return { ...item, article: article };
      }).filter(item => !!item.article)
    };
    const modal = await this.modalController.create({
      component: DistributionDetailComponent,
      componentProps: { distribution: distributionView },
      cssClass: 'distribution-detail-modal'
    });
    modal.onDidDismiss().then(result => {
      if (result.data?.deleted) { this.refreshDistributions(); }
    });
    return await modal.present();
  }
}

