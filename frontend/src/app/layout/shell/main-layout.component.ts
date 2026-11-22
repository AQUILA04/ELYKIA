import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@layout/header/header.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';
import { BreadcrumbComponent } from '@layout/breadcrumb/breadcrumb.component';
import { LayoutService } from '@shared/service/layout.service';

@Component({
  selector: 'app-main-layout',
  imports: [
    AsyncPipe,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly layoutService = inject(LayoutService);
}
