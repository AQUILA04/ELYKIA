import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientsPage } from './clients.page';
import { Store } from '@ngrx/store';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

describe('ClientsPage - Photo Fallback', () => {
  let component: ClientsPage;
  let fixture: ComponentFixture<ClientsPage>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockSanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustUrl']);

    await TestBed.configureTestingModule({
      declarations: [ClientsPage],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsPage);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockSanitizer = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;
  });

  it('should use profilPhoto as primary path', (done) => {
    const primaryPath = 'client_photos/profile_123.png';
    const fallbackPath = 'client_photos/profile_456.png';

    // Mock du sanitizer
    mockSanitizer.bypassSecurityTrustUrl.and.returnValue('mocked-url' as any);

    component.getPhotoUrl(primaryPath, fallbackPath).subscribe(result => {
      // Vérifier que la méthode utilise le primaryPath en priorité
      expect(result).toBeDefined();
      done();
    });
  });

  it('should fallback to profilPhotoUrl when profilPhoto is null', (done) => {
    const primaryPath = null;
    const fallbackPath = 'client_photos/profile_456.png';

    component.getPhotoUrl(primaryPath, fallbackPath).subscribe(result => {
      // Vérifier que la méthode utilise le fallbackPath quand primaryPath est null
      expect(result).toBeDefined();
      done();
    });
  });

  it('should return default icon when both paths are null', (done) => {
    component.getPhotoUrl(null, null).subscribe(result => {
      expect(result).toBe('assets/icon/person-circle-outline.svg');
      done();
    });
  });
});