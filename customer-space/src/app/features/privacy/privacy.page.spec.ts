import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { PrivacyPage } from './privacy.page';

describe('PrivacyPage', () => {
  let fixture: ComponentFixture<PrivacyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), PrivacyPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPage);
    fixture.detectChanges();
  });

  it('shows the privacy text and the support address', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Règles de confidentialité');
    expect(text).toContain('support@optimizesolux.com');
    expect(text).toContain('AMENOUVEVE-YAVEH');
  });
});
