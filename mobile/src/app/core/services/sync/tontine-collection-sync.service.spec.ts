import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TontineCollectionSyncService } from './tontine-collection-sync.service';
import { TontineCollectionRepository } from '../../repositories/tontine-collection.repository';
import { TontineCollectionRepositoryExtensions } from '../../repositories/tontine-collection.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { TontineCollection } from '../../../models/tontine.model';

describe('TontineCollectionSyncService', () => {
  let service: TontineCollectionSyncService;
  let httpMock: HttpTestingController;
  let repository: jasmine.SpyObj<TontineCollectionRepository>;

  beforeEach(() => {
    repository = jasmine.createSpyObj('TontineCollectionRepository', [
      'getServerId', 'saveIdMapping', 'saveAll', 'markAsSynced'
    ]);
    repository.getServerId.and.resolveTo('42');
    repository.saveIdMapping.and.resolveTo();
    repository.saveAll.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TontineCollectionSyncService,
        { provide: TontineCollectionRepository, useValue: repository },
        { provide: TontineCollectionRepositoryExtensions, useValue: {} },
        { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
        { provide: SyncErrorService, useValue: { logSyncError: jasmine.createSpy('logSyncError') } }
      ]
    });

    service = TestBed.inject(TontineCollectionSyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends collectionDate and advanceToNextMonth then persists server allocation fields', fakeAsync(() => {
    const collection: TontineCollection = {
      id: 'uuid-1',
      tontineMemberId: '42',
      amount: 5000,
      collectionDate: '2026-03-15T08:00:00.000Z',
      isLocal: true,
      isSync: false,
      advanceToNextMonth: false
    };

    let persisted: any;
    service.syncSingle(collection).then(result => persisted = result);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/collections`);
    expect(req.request.body.collectionDate).toBe('2026-03-15');
    expect(req.request.body.advanceToNextMonth).toBeFalse();
    expect(req.request.body.reference).toBe('uuid-1');

    req.flush({
      data: {
        id: 99,
        amount: 5000,
        collectionDate: '2026-03-15T00:00:00',
        societyShareAmount: 1000,
        contributionMonth: '2026-03-01',
        advanceToNextMonth: false
      }
    });
    flushMicrotasks();

    expect(repository.saveAll).toHaveBeenCalled();
    const saved = repository.saveAll.calls.mostRecent().args[0][0];
    expect(saved.id).toBe('99');
    expect(saved.societyShareAmount).toBe(1000);
    expect(saved.contributionMonth).toBe('2026-03-01');
    expect(saved.isSync).toBeTrue();
    expect(persisted.id).toBe(99);
  }));

  it('keeps the local collection when the backend returns a business error', fakeAsync(() => {
    const collection: TontineCollection = {
      id: 'uuid-err',
      tontineMemberId: '42',
      amount: 5000,
      collectionDate: '2026-03-15',
      isLocal: true,
      isSync: false
    };

    let caught: any;
    service.syncSingle(collection).catch(error => caught = error);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/collections`);
    req.flush({ message: 'Session en migration' }, { status: 400, statusText: 'Bad Request' });
    flushMicrotasks();

    expect(caught).toBeTruthy();
    expect(repository.saveAll).not.toHaveBeenCalled();
  }));
});
