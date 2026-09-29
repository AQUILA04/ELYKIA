import { TestBed } from '@angular/core/testing';
import { TelemetryContextService } from './telemetry-context.service';

describe('TelemetryContextService', () => {
  let service: TelemetryContextService;
  let originalRandomUUID: Crypto['randomUUID'] | undefined;

  beforeEach(() => {
    originalRandomUUID = crypto.randomUUID?.bind(crypto);
    TestBed.configureTestingModule({});
    service = TestBed.inject(TelemetryContextService);
  });

  afterEach(() => {
    if (originalRandomUUID) {
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        writable: true,
        value: originalRandomUUID,
      });
    }
  });

  it('createUuid returns a UUID v4-shaped string', () => {
    const uuid = service.createUuid();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('createUuid fallback uses getRandomValues when randomUUID is missing', () => {
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const uuid = service.createUuid();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
