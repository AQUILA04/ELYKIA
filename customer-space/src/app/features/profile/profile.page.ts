import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';

/** Page Profil Client. */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  session = this.sessionService.currentSession;

  constructor(
    private sessionService: CustomerSessionService,
    private router: Router,
  ) {}

  logout(): void {
    this.sessionService.clearSession();
    void this.router.navigate(['/auth'], { replaceUrl: true });
  }
}
