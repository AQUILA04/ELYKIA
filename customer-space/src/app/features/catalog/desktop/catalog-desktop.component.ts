
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerArticle, CustomerArticleType } from '../../../shared/models/customer.model';
import { CartLine } from '../../../shared/services/cart.service';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-catalog-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  templateUrl: './catalog-desktop.component.html',
  styleUrls: ['./catalog-desktop.component.scss'],
})
export class CatalogDesktopComponent {
  readonly articles = input<CustomerArticle[]>([]);
  readonly topTypes = input<CustomerArticleType[]>([]);
  readonly selectedCategory = input('');
  readonly searchTerm = input('');
  readonly isLoading = input(false);
  readonly cartCount = input(0);
  readonly cartLines = input<CartLine[]>([]);
  readonly cartTotal = input(0);
  readonly search = output<Event>();
  readonly selectCategory = output<string>();
  readonly add = output<CustomerArticle>();
  readonly qty = input<(id: string) => number>(() => 0);
  readonly label = input<(a: CustomerArticle) => string>((a) => a.name || '');
}
