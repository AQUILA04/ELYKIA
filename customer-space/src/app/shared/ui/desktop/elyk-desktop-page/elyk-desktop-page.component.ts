import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

export interface ElykBreadcrumb {
  label: string;
  link?: string | any[];
}

@Component({
  selector: 'app-elyk-desktop-page',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './elyk-desktop-page.component.html',
  styleUrls: ['./elyk-desktop-page.component.scss'],
})
export class ElykDesktopPageComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
  readonly showBack = input(false);
  readonly breadcrumbs = input<ElykBreadcrumb[]>([]);
  readonly back = output<void>();

  onBack(): void {
    this.back.emit();
  }
}
