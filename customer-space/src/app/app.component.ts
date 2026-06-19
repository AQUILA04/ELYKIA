import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerSessionService } from './shared/services/customer-session.service';
import { isE2eMode } from './shared/utils/e2e';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  showSplash = true;

  constructor(
    private router: Router,
    private session: CustomerSessionService,
  ) {}

  ngOnInit(): void {
    const duration = isE2eMode() ? 0 : 1800;
    setTimeout(() => {
      this.showSplash = false;
      if (this.session.isAuthenticated) {
        void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      }
    }, duration);
  }
}
