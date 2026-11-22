import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecruitmentService } from './recruitment.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecruitmentService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecruitmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
