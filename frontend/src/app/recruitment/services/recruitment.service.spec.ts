import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RecruitmentService } from './recruitment.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecruitmentService],
    });
    service = TestBed.inject(RecruitmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
