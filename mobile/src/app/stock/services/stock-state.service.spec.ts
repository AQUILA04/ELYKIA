import { TestBed } from '@angular/core/testing';
import { StockStateService, OperationalContext } from './stock-state.service';
import { take } from 'rxjs/operators';

describe('StockStateService', () => {
  let service: StockStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StockStateService]
    });
    service = TestBed.inject(StockStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have STANDARD as the default operational context', (done) => {
    service.context$.pipe(take(1)).subscribe(context => {
      expect(context).toBe('STANDARD');
      done();
    });
  });

  it('should update context$ to TONTINE when setContext is called with TONTINE', (done) => {
    service.setContext('TONTINE');
    service.context$.pipe(take(1)).subscribe(context => {
      expect(context).toBe('TONTINE');
      done();
    });
  });

  it('should update context$ back to STANDARD when setContext is called with STANDARD', (done) => {
    service.setContext('TONTINE');
    service.setContext('STANDARD');
    service.context$.pipe(take(1)).subscribe(context => {
      expect(context).toBe('STANDARD');
      done();
    });
  });

  it('should expose context$ as an Observable (not BehaviorSubject directly)', () => {
    // context$ should be an Observable, not exposing the BehaviorSubject methods
    expect(typeof (service.context$ as any).next).toBe('undefined');
  });
});
