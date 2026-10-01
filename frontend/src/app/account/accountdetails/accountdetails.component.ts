import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

/**
 * Ancienne page détail compte — redirige vers la liste avec panneau latéral.
 */
@Component({
  selector: 'app-accountdetails',
  template: '<div class="loading">Redirection…</div>',
  styles: ['.loading { padding: 48px; text-align: center; color: #6b7a99; }']
})
export class AccountdetailsComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenStorage: TokenStorageService,
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/account/list'], {
      queryParams: id ? { open: id } : {},
      replaceUrl: true,
    });
  }
}
