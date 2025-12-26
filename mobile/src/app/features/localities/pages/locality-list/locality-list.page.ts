import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Locality } from 'src/app/models/locality.model';
import { LocalityActions, LocalitySelectors } from 'src/app/store/locality';
import { Observable } from 'rxjs';
import { NavController } from '@ionic/angular';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-locality-list',
  templateUrl: './locality-list.page.html',
  styleUrls: ['./locality-list.page.scss'],
  standalone: false
})
export class LocalityListPage {
  localities$: Observable<Locality[]>;
  loading$: Observable<boolean>;

  constructor(private store: Store, private navCtrl: NavController) {
    this.localities$ = this.store.select(LocalitySelectors.selectAllLocalities).pipe(
      tap(localities => console.log('[LocalityListPage] Localities from store:', localities))
    );
    this.loading$ = this.store.select(LocalitySelectors.selectLocalitiesLoading);
  }

  ionViewWillEnter() {
    this.store.dispatch(LocalityActions.loadLocalities());
  }

  navigateToAddLocality() {
    this.navCtrl.navigateForward(['/tabs/localities/new']);
  }
}
