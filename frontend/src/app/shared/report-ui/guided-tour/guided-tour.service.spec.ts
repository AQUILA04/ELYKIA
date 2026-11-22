import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { GuidedTourService, TourDefinition } from './guided-tour.service';

describe('GuidedTourService', () => {
    const tour: TourDefinition = {
        id: 'spec-tour',
        version: 3,
        steps: [{ title: 'A', body: 'a' }, { target: 'x', title: 'B', body: 'b' }]
    };
    let service: GuidedTourService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: TokenStorageService, useValue: { getUser: () => ({ username: 'gestionnaire.a' }) } }]
        });
        service = TestBed.inject(GuidedTourService);
        localStorage.removeItem(service.storageKey(tour));
    });

    afterEach(() => localStorage.removeItem(service.storageKey(tour)));

    it('stores the seen flag per tour, version and user', () => {
        expect(service.storageKey(tour)).toBe('elykia.tour.spec-tour.v3.gestionnaire.a');
    });

    it('walks through the steps then remembers the tour as seen', () => {
        expect(service.start(tour)).toBe(true);
        expect(service.step()?.title).toBe('A');
        expect(service.isFirst()).toBe(true);
        service.next();
        expect(service.step()?.title).toBe('B');
        expect(service.isLast()).toBe(true);
        service.previous();
        expect(service.index()).toBe(0);
        service.next();
        service.next();
        expect(service.active()).toBe(false);
        expect(service.hasSeen(tour)).toBe(true);
    });

    it('skipping also marks the tour as seen', () => {
        service.start(tour);
        service.finish();
        expect(service.active()).toBe(false);
        expect(service.hasSeen(tour)).toBe(true);
    });

    it('does not start automatically once seen, but can always be replayed', () => {
        service.markSeen(tour);
        expect(service.startIfFirstVisit(tour)).toBe(false);
        expect(service.start(tour)).toBe(true);
    });
});
