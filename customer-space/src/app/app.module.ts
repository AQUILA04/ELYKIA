import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CustomerAuthInterceptor } from './core/interceptors/customer-auth.interceptor';
import { FeatureFlagService } from './shared/services/feature-flag.service';

function initFeatureFlags(featureFlags: FeatureFlagService): () => Promise<void> {
  return () => featureFlags.init();
}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, CommonModule, HttpClientModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: CustomerAuthInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: initFeatureFlags,
      deps: [FeatureFlagService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
