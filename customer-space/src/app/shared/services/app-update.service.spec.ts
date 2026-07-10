import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppUpdateService } from './app-update.service';
import { CustomerSessionService } from './customer-session.service';
import { environment } from '../../../environments/environment';

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AppUpdateService,
        {
          provide: CustomerSessionService,
          useValue: { currentSession: { token: 'jwt-token' } },
        },
      ],
    });
    service = TestBed.inject(AppUpdateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('parses semver into versionCode', () => {
    expect(service.parseVersionCode('0.2.0')).toBe(200);
    expect(service.parseVersionCode('1.10.4')).toBe(11004);
  });

  it('converts capacitor file uri to native absolute path', () => {
    expect(service.filesystemUriToNativePath(
      'file:///data/user/0/com.optimize.elykia.customer/cache/elykia-customer-update-v0.2.1.apk',
    )).toBe('/data/user/0/com.optimize.elykia.customer/cache/elykia-customer-update-v0.2.1.apk');
    expect(service.filesystemUriToNativePath('/already/absolute/path.apk')).toBe('/already/absolute/path.apk');
  });

  it('checks for update via API', fakeAsync(() => {
    spyOn(service, 'getLocalVersionCode').and.returnValue(Promise.resolve(200));
    let result: { version: string; updateAvailable: boolean } | undefined;
    void service.checkForUpdate().then((r) => { result = r; });
    tick();
    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/v1/customer/app/release/latest?versionCode=200`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: {
        version: '0.3.0',
        versionCode: 300,
        minSupportedVersionCode: 200,
        mandatory: false,
        releaseNotes: 'Notes',
        sha256: 'abc',
        sizeBytes: 1024,
        publishedAt: '2026-07-10T00:00:00Z',
        updateAvailable: true,
        updateRequired: false,
        clientVersionCode: 200,
      },
    });
    tick();
    expect(result?.version).toBe('0.3.0');
    expect(result?.updateAvailable).toBeTrue();
  }));
});
