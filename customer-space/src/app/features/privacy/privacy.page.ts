import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ElykPageHeaderComponent } from '../../shared/ui';

/** Règles de confidentialité — page publique (Play Console et navigateur). */
@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [IonicModule, ElykPageHeaderComponent],
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
})
export class PrivacyPage {
  readonly supportEmail = 'support@optimizesolux.com';

  constructor(private router: Router) {}

  goBack(): void {
    void this.router.navigate(['/auth']);
  }
}
