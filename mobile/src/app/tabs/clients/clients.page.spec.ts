import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientsPage } from './clients.page';
import { Store } from '@ngrx/store';
import { DomSanitizer } from '@angular/platform-browser';

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

  it('should use localPath when provided', () => {
    const localPath = 'client_photos/profile_123.png';
    mockSanitizer.bypassSecurityTrustUrl.and.returnValue('mocked-url' as any);

    const result = component.getPhotoUrl(localPath);
    expect(result).toBeDefined();
  });

  it('should fallback to default icon when localPath is null', () => {
    mockSanitizer.bypassSecurityTrustUrl.and.returnValue('default-icon-url' as any);

    const result = component.getPhotoUrl(null);
    expect(mockSanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('assets/icon/person-circle-outline.svg');
    expect(result).toBeDefined();
  });

  it('should fallback to default icon when localPath is undefined', () => {
    mockSanitizer.bypassSecurityTrustUrl.and.returnValue('default-icon-url' as any);

    const result = component.getPhotoUrl(undefined);
    expect(mockSanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('assets/icon/person-circle-outline.svg');
    expect(result).toBeDefined();
  });
});