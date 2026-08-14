import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ParameterService } from './parameter.service';
import { ParameterRepository } from '../repositories/parameter.repository';
import { environment } from 'src/environments/environment';

describe('ParameterService', () => {
  let service: ParameterService;
  let httpMock: HttpTestingController;
  let repository: jasmine.SpyObj<ParameterRepository>;

  beforeEach(() => {
    repository = jasmine.createSpyObj('ParameterRepository', ['saveAll', 'getByKey']);
    repository.saveAll.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ParameterService,
        { provide: ParameterRepository, useValue: repository }
      ]
    });

    service = TestBed.inject(ParameterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('defaults an absent or invalid society share version to V1', async () => {
    repository.getByKey.and.resolveTo(null);
    await expectAsync(service.getSocietyShareVersion()).toBeResolvedTo('V1');

    repository.getByKey.and.resolveTo('nope');
    await expectAsync(service.getSocietyShareVersion()).toBeResolvedTo('V1');
  });

  it('reads V2 from the last locally stored parameter', async () => {
    repository.getByKey.and.resolveTo('v2');
    await expectAsync(service.getSocietyShareVersion()).toBeResolvedTo('V2');
  });

  it('awaits SQLite persistence before completing initializeParameters', (done) => {
    let saved = false;
    repository.saveAll.and.callFake(async () => {
      saved = true;
    });

    service.initializeParameters().subscribe({
      next: (ok) => {
        expect(ok).toBeTrue();
        expect(saved).toBeTrue();
        expect(repository.saveAll).toHaveBeenCalled();
        done();
      },
      error: done.fail
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/parameters/all`);
    req.flush([
      { key: 'TONTINE_SOCIETY_SHARE_VERSION', value: 'V2' }
    ]);
  });
});
