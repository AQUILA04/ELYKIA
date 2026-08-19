import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RmCollectorAssignApiService } from './rm-collector-assign-api.service';
import { environment } from '../../../../environments/environment';

describe('RmCollectorAssignApiService', () => {
  let api: RmCollectorAssignApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RmCollectorAssignApiService]
    });
    api = TestBed.inject(RmCollectorAssignApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('POSTs bulk-assign-collectors with optional fields only when set', async () => {
    const pending = api.bulkAssign({
      clientIds: [1, 2],
      collector: 'COM021',
      transferInProgressCredits: true
    });

    const req = http.expectOne(`${environment.apiUrl}/api/v1/clients/bulk-assign-collectors`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      clientIds: [1, 2],
      transferInProgressCredits: true,
      collector: 'COM021'
    });
    req.flush({ data: true });

    await expectAsync(pending).toBeResolvedTo(true);
  });

  it('maps promoters/all into collector options', async () => {
    const pending = api.listPromoters();
    const req = http.expectOne(`${environment.apiUrl}/api/v1/promoters/all`);
    req.flush({
      data: [
        { username: 'COM021', firstname: 'Ada', lastname: 'Koffi' },
        { username: 'COM022', fullName: 'Jean Doe' }
      ]
    });

    const list = await pending;
    expect(list[0]).toEqual(jasmine.objectContaining({
      username: 'COM021',
      displayName: 'Ada Koffi'
    }));
    expect(list[1].displayName).toBe('Jean Doe');
  });
});
