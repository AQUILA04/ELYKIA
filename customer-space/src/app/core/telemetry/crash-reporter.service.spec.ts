import { TestBed } from '@angular/core/testing';
import { CrashReporterService } from './crash-reporter.service';

describe('CrashReporterService', () => {
  it('is a no-op on web (no throw)', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(CrashReporterService);
    await expectAsync(service.init()).toBeResolved();
    await expectAsync(service.setUserId('1')).toBeResolved();
    await expectAsync(service.log('hello')).toBeResolved();
    await expectAsync(service.recordException('boom')).toBeResolved();
  });
});
