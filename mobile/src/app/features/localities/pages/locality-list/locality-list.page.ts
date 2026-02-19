import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Locality } from 'src/app/models/locality.model';
import { LocalityActions, LocalitySelectors } from 'src/app/store/locality';
import { selectLocalityHasMore } from 'src/app/store/locality/locality.selectors';
import { Observable } from 'rxjs';
import { NavController, IonInfiniteScroll } from '@ionic/angular';
import { tap, filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-locality-list',
  templateUrl: './locality-list.page.html',
  styleUrls: ['./locality-list.page.scss'],
  standalone: false
})
export class LocalityListPage {
  localities$: Observable<Locality[]>;
  loading$: Observable<boolean>;
  hasMore$: Observable<boolean>;

  constructor(private store: Store, private navCtrl: NavController) {
    this.localities$ = this.store.select(LocalitySelectors.selectAllLocalities).pipe(
      tap(localities => console.log('[LocalityListPage] Localities from store:', localities))
    );
    this.loading$ = this.store.select(LocalitySelectors.selectLocalitiesLoading);
    this.hasMore$ = this.store.select(LocalitySelectors.selectLocalityHasMore);
  }

  ionViewWillEnter() {
    this.store.dispatch(LocalityActions.loadFirstPage({ pageSize: 20 }));
  }

  loadData(event: any) {
    this.store.dispatch(LocalityActions.loadNextPage({}));

    // Wait for loading to finish before completing the infinite scroll
    this.loading$.pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      if (event && event.target) {
        (event.target as IonInfiniteScroll).complete();
      }
    });
  }

  navigateToAddLocality() {
    this.navCtrl.navigateForward(['/tabs/localities/new']);
  }
}
