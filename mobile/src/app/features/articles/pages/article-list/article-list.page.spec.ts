import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { IonicModule } from '@ionic/angular';
import { ArticleListPage } from './article-list.page';
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import * as ArticleActions from '../../../../store/article/article.actions';

describe('ArticleListPage', () => {
  let component: ArticleListPage;
  let fixture: ComponentFixture<ArticleListPage>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const initialState = {
    auth: { user: { username: 'com1' } },
    distribution: {
      articlesPagination: {
        items: [],
        loading: false,
        hasMore: false,
        error: null,
        currentPage: 0,
        pageSize: 20,
        totalItems: 0
      }
    },
    article: {
      articles: [],
      loading: false,
      error: null,
      catalogue: [],
      catalogueLoading: false,
      catalogueError: null,
      cataloguePage: 0,
      catalogueSize: 20,
      catalogueTotalElements: 0,
      catalogueTotalPages: 0,
      catalogueHasMore: false
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArticleListPage],
      imports: [IonicModule.forRoot()],
      providers: [provideMockStore({ initialState })]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    fixture = TestBed.createComponent(ArticleListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with Mon Stock as default segment', () => {
    expect(component).toBeTruthy();
    expect(component.activeSegment).toBe('stock');
  });

  it('should load mon stock first page on init', fakeAsync(() => {
    tick(0);
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: DistributionActions.loadFirstPageAvailableArticles.type,
        commercialUsername: 'com1'
      })
    );
  }));

  it('should dispatch catalogue first page when switching to Catalogue', fakeAsync(() => {
    dispatchSpy.calls.reset();
    component.onSegmentChange({ detail: { value: 'catalogue' } } as CustomEvent);
    tick(0);

    expect(component.activeSegment).toBe('catalogue');
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: ArticleActions.loadFirstPageCatalogueArticles.type,
        pageSize: 20
      })
    );
  }));

  it('should filter only the active catalogue segment on search', fakeAsync(() => {
    component.onSegmentChange({ detail: { value: 'catalogue' } } as CustomEvent);
    tick();
    dispatchSpy.calls.reset();

    component.loadFirstPage('moto');
    tick();

    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: ArticleActions.loadFirstPageCatalogueArticles.type,
        filters: { searchQuery: 'moto' }
      })
    );
  }));
});
