import { TestBed } from '@angular/core/testing';

import { ArticleTypeService } from './article-type.service';

describe('ArticleTypeService', () => {
  let service: ArticleTypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArticleTypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
