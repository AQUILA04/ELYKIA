import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';
import { LayoutService } from '@shared/service/layout.service';
import { HeaderComponent } from '@layout/header/header.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';
import { BreadcrumbComponent } from '@layout/breadcrumb/breadcrumb.component';
import { Component } from '@angular/core';

@Component({ selector: 'app-header', template: '' })
class StubHeaderComponent {}

@Component({ selector: 'app-sidebar', template: '' })
class StubSidebarComponent {}

@Component({ selector: 'app-breadcrumb', template: '' })
class StubBreadcrumbComponent {}

describe('MainLayoutComponent', () => {
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: LayoutService,
          useValue: {
            isSidebarOpen$: of(false),
            closeSidebar: vi.fn(),
          },
        },
      ],
    })
      .overrideComponent(MainLayoutComponent, {
        remove: { imports: [HeaderComponent, SidebarComponent, BreadcrumbComponent] },
        add: { imports: [StubHeaderComponent, StubSidebarComponent, StubBreadcrumbComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
  });

  it('renders authenticated application shell with e2e-app-shell marker', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="e2e-app-shell"]')).not.toBeNull();
    expect(el.querySelector('app-sidebar')).not.toBeNull();
    expect(el.querySelector('app-header')).not.toBeNull();
    expect(el.querySelector('app-breadcrumb')).not.toBeNull();
  });
});
