import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import type { Mock } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ArticleListPage } from './article-list.page';
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import * as ArticleActions from '../../../../store/article/article.actions';

describe('ArticleListPage', () => {
    let component: ArticleListPage;
    let fixture: ComponentFixture<ArticleListPage>;
    let store: MockStore;
    let dispatchSpy: Mock;

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
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [ArticleListPage],
            imports: [],
            providers: [provideMockStore({ initialState })]
        }).compileComponents();

        store = TestBed.inject(MockStore);
        dispatchSpy = vi.spyOn(store, 'dispatch');

        fixture = TestBed.createComponent(ArticleListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create with Mon Stock as default segment', () => {
        expect(component).toBeTruthy();
        expect(component.activeSegment).toBe('stock');
    });

    it('should load mon stock first page on init', async () => {
        await new Promise((r) => setTimeout(r, 0));
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: DistributionActions.loadFirstPageAvailableArticles.type,
            commercialUsername: 'com1'
        }));
    });

    it('should dispatch catalogue first page when switching to Catalogue', async () => {
        dispatchSpy.mockClear();
        component.onSegmentChange({ detail: { value: 'catalogue' } } as CustomEvent);
        await new Promise((r) => setTimeout(r, 0));

        expect(component.activeSegment).toBe('catalogue');
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: ArticleActions.loadFirstPageCatalogueArticles.type,
            pageSize: 20
        }));
    });

    it('should filter only the active catalogue segment on search', async () => {
        component.onSegmentChange({ detail: { value: 'catalogue' } } as CustomEvent);
        await new Promise((r) => setTimeout(r, 0));
        dispatchSpy.mockClear();

        component.loadFirstPage('moto');
        await new Promise((r) => setTimeout(r, 0));

        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: ArticleActions.loadFirstPageCatalogueArticles.type,
            filters: { searchQuery: 'moto' }
        }));
    });
});
