import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ElykDecorHeaderComponent } from './elyk-decor-header.component';

describe('ElykDecorHeaderComponent', () => {
  let fixture: ComponentFixture<ElykDecorHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElykDecorHeaderComponent, IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ElykDecorHeaderComponent);
    fixture.detectChanges();
  });

  it('uses ribbons asset by default', () => {
    const img = fixture.nativeElement.querySelector('.elyk-decor-header__pattern') as HTMLImageElement;
    expect(img.src).toContain('header-ribbons.svg');
  });

  it('emits back when back button clicked', () => {
    fixture.componentInstance.showBack = true;
    fixture.detectChanges();
    const spy = jasmine.createSpy('back');
    fixture.componentInstance.back.subscribe(spy);
    fixture.nativeElement.querySelector('.elyk-decor-header__back').click();
    expect(spy).toHaveBeenCalled();
  });
});
