import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Liens publics confidentialité et suppression de compte (Play Console). */
@Component({
  selector: 'app-legal-links',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-links.component.html',
  styleUrls: ['./legal-links.component.scss'],
})
export class LegalLinksComponent {}
