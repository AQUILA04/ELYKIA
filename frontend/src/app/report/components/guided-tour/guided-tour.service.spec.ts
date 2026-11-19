import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { GuidedTourService, TourDefinition } from './guided-tour.service';
import { COCKPIT_TOUR, SHEET_TOUR } from './report-tours';

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
        expect(service.start(tour)).toBeTrue();
        expect(service.step()?.title).toBe('A');
        expect(service.isFirst()).toBeTrue();
        service.next();
        expect(service.step()?.title).toBe('B');
        expect(service.isLast()).toBeTrue();
        service.previous();
        expect(service.index()).toBe(0);
        service.next();
        service.next();
        expect(service.active()).toBeFalse();
        expect(service.hasSeen(tour)).toBeTrue();
    });

    it('skipping also marks the tour as seen', () => {
        service.start(tour);
        service.finish();
        expect(service.active()).toBeFalse();
        expect(service.hasSeen(tour)).toBeTrue();
    });

    it('does not start automatically once seen, but can always be replayed', () => {
        service.markSeen(tour);
        expect(service.startIfFirstVisit(tour)).toBeFalse();
        expect(service.start(tour)).toBeTrue();
    });

    it('ships non-empty report tours with unique targets', () => {
        for (const definition of [COCKPIT_TOUR, SHEET_TOUR]) {
            expect(definition.steps.length).toBeGreaterThan(3);
            const targets = definition.steps.map(step => step.target).filter(Boolean);
            expect(new Set(targets).size).toBe(targets.length);
        }
    });
});
