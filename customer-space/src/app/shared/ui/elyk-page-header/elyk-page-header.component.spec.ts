import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ElykPageHeaderComponent } from './elyk-page-header.component';

describe('ElykPageHeaderComponent', () => {
  let fixture: ComponentFixture<ElykPageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElykPageHeaderComponent, IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ElykPageHeaderComponent);
    fixture.componentInstance.eyebrow = 'ESPACE TONTINE';
    fixture.componentInstance.title = 'Mes tontines';
    fixture.componentInstance.subtitle = 'Épargnez un peu chaque jour';
    fixture.detectChanges();
  });

  it('renders eyebrow, title and subtitle', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.elyk-page-header__eyebrow')?.textContent).toContain('ESPACE TONTINE');
    expect(el.querySelector('.elyk-page-header__title')?.textContent).toContain('Mes tontines');
    expect(el.querySelector('.elyk-page-header__subtitle')?.textContent).toContain('Épargnez');
  });

  it('emits back when back button clicked', () => {
    fixture.componentInstance.showBack = true;
    fixture.detectChanges();
    const spy = jasmine.createSpy('back');
    fixture.componentInstance.back.subscribe(spy);
    fixture.nativeElement.querySelector('.elyk-page-header__back').click();
    expect(spy).toHaveBeenCalled();
  });
});
