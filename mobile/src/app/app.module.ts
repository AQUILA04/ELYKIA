import { NgModule, isDevMode, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { authReducer } from './store/auth/auth.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { localityReducer } from './store/locality/locality.reducer';
import { LocalityEffects } from './store/locality/locality.effects';
import { clientReducer } from './store/client/client.reducer';
import { ClientEffects } from './store/client/client.effects';
import { articleReducer } from './store/article/article.reducer';
import { ArticleEffects } from './store/article/article.effects';
import { commercialReducer } from './store/commercial/commercial.reducer';
import { CommercialEffects } from './store/commercial/commercial.effects';
import { stockOutputReducer } from './store/stock-output/stock-output.reducer';
import { StockOutputEffects } from './store/stock-output/stock-output.effects';
import { distributionReducer } from './store/distribution/distribution.reducer';
import { DistributionEffects } from './store/distribution/distribution.effects';
import { accountReducer } from './store/account/account.reducer';
import { AccountEffects } from './store/account/account.effects';
import { recoveryReducer } from './store/recovery/recovery.reducer';
import { RecoveryEffects } from './store/recovery/recovery.effects';
import { transactionReducer } from './store/transaction/transaction.reducer';
import { TransactionEffects } from './store/transaction/transaction.effects';
import { healthCheckReducer } from './store/health-check/health-check.reducer';
import { HealthCheckEffects } from './store/health-check/health-check.effects';
import { syncReducer } from './store/sync/sync.reducer';
import { SyncEffects } from './store/sync/sync.effects';
import { reducer as tontineReducer } from './store/tontine/tontine.reducer';
import { TontineEffects } from './store/tontine/tontine.effects';
import { commercialStockReducer } from './store/commercial-stock/commercial-stock.reducer';
import { CommercialStockEffects } from './store/commercial-stock/commercial-stock.effects';
import { kpiReducer } from './store/kpi/kpi.reducer';
import { KpiEffects } from './store/kpi/kpi.effects';
import { preferencesReducer } from './store/preferences/preferences.reducer';
import { PreferencesEffects } from './store/preferences/preferences.effects';
import { reducer as orderReducer } from './store/order/order.reducer';
import { OrderEffects } from './store/order/order.effects';
import { ClientRepositoryExtensions } from './core/repositories/client.repository.extensions';
import { RecoveryRepositoryExtensions } from './core/repositories/recovery.repository.extensions';
import { DistributionRepositoryExtensions } from './core/repositories/distribution.repository.extensions';
import { OrderRepositoryExtensions } from './core/repositories/order.repository.extensions';
import { TontineMemberRepositoryExtensions } from './core/repositories/tontine-member.repository.extensions';
import { DataInitializationService } from './core/services/data-initialization.service';
import { DatabaseService } from './core/services/database.service';
import { Drivers, Storage } from '@ionic/storage';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import { TimeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { NetworkErrorHandlerInterceptor } from './core/interceptors/network-error.interceptor';
import { SecurityContextInterceptor } from './core/interceptors/security-context.interceptor';
import { metaReducers } from './store/meta-reducers';

function initializeDatabase(databaseService: DatabaseService) {
  return () => databaseService.initializeDatabase();
}
// Register French locale data
registerLocaleData(localeFr, 'fr-FR', localeFrExtra);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot({
      driverOrder: [
        Drivers.LocalStorage,  // Utilise localStorage dans le navigateur
        Drivers.IndexedDB,
      ]
    }),
    AppRoutingModule,
    StoreModule.forRoot({ auth: authReducer, client: clientReducer, article: articleReducer, commercial: commercialReducer, stockOutput: stockOutputReducer, distribution: distributionReducer, account: accountReducer, healthCheck: healthCheckReducer, recovery: recoveryReducer, transaction: transactionReducer, sync: syncReducer, tontine: tontineReducer, commercialStock: commercialStockReducer, kpi: kpiReducer, order: orderReducer, preferences: preferencesReducer }, { metaReducers }),
    EffectsModule.forRoot([AuthEffects, ClientEffects, ArticleEffects, CommercialEffects, StockOutputEffects, DistributionEffects, AccountEffects, HealthCheckEffects, RecoveryEffects, TransactionEffects, SyncEffects, TontineEffects, CommercialStockEffects, KpiEffects, OrderEffects, PreferencesEffects]),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DataInitializationService,
    DatabaseService,
    ClientRepositoryExtensions,
    RecoveryRepositoryExtensions,
    DistributionRepositoryExtensions,
    OrderRepositoryExtensions,
    TontineMemberRepositoryExtensions,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeDatabase,
      deps: [DatabaseService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (storage: Storage) => () => storage.create(),
      deps: [Storage],
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TimeoutInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: NetworkErrorHandlerInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SecurityContextInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {

}
