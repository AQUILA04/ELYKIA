
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CartLine } from '../../../shared/services/cart.service';
import { CustomerArticle } from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-cart-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  templateUrl: './cart-desktop.component.html',
  styleUrls: ['./cart-desktop.component.scss'],
})
export class CartDesktopComponent {
  readonly lines = input<CartLine[]>([]);
  readonly totalAmount = input(0);
  readonly isSubmitting = input(false);
  readonly error = input('');
  readonly back = output<void>();
  readonly clear = output<void>();
  readonly increment = output<CartLine>();
  readonly decrement = output<CartLine>();
  readonly remove = output<CartLine>();
  readonly submit = output<void>();
  readonly label = input<(a: CustomerArticle) => string>((a) => a.name || '');
  readonly lineTotal = input<(l: CartLine) => number>((l) => l.article.creditSalePrice * l.quantity);
}
