import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

/** Barre de navigation basse — onglets principaux. */
@Component({
  selector: 'app-customer-tab-bar',
  standalone: true,
  imports: [IonicModule, RouterModule],
  templateUrl: './customer-tab-bar.component.html',
  styleUrls: ['./customer-tab-bar.component.scss'],
})
export class CustomerTabBarComponent {}
