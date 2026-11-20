import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { GuidedTourComponent, placePopover } from './guided-tour.component';
import { GuidedTourService, TourDefinition } from './guided-tour.service';

/** Page de test : comme les pages du rapport, le conteneur porte un transform (animation d'entrée). */
@Component({
    template: `
        <div style="transform: translateY(0); margin: 200px 0 0 300px; width: 600px">
            <div data-tour="target" style="height: 80px; width: 400px; background: #eee">Cible</div>
            <div style="height: 2000px"></div>
            <app-guided-tour></app-guided-tour>
        </div>`,
    standalone: false
})
class HostPageComponent { }

describe('GuidedTourComponent (positionnement)', () => {
    const tour: TourDefinition = { id: 'spec-position', version: 1, steps: [{ target: 'target', title: 'T', body: 'B' }] };
    let fixture: ComponentFixture<HostPageComponent>;
    let service: GuidedTourService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [HostPageComponent, GuidedTourComponent],
            providers: [{ provide: TokenStorageService, useValue: { getUser: () => ({ username: 'spec' }) } }]
        });
        fixture = TestBed.createComponent(HostPageComponent);
        service = TestBed.inject(GuidedTourService);
        fixture.detectChanges();
    });

    afterEach(() => {
        service.finish();
        fixture.destroy();
    });

    it('moves its overlay under <body>, out of the transformed page', () => {
        const host = document.querySelector('app-guided-tour');
        expect(host?.parentElement).toBe(document.body);
    });

    it('puts the spotlight on the target and keeps the popover on screen', fakeAsync(() => {
        service.start(tour);
        fixture.detectChanges();
        tick(100);
        fixture.detectChanges();
        flush();

        const target = document.querySelector('[data-tour="target"]')!.getBoundingClientRect();
        const spot = document.querySelector('.tour-spot')!.getBoundingClientRect();
        expect(Math.abs(spot.left - (target.left - 8))).toBeLessThan(2);
        expect(Math.abs(spot.top - (target.top - 8))).toBeLessThan(2);

        const popover = document.querySelector('.tour-popover')!.getBoundingClientRect();
        expect(popover.left).toBeGreaterThanOrEqual(0);
        expect(popover.top).toBeGreaterThanOrEqual(0);
        expect(popover.right).toBeLessThanOrEqual(window.innerWidth);
        expect(popover.bottom).toBeLessThanOrEqual(window.innerHeight);
    }));

    it('removes the overlay from <body> when the page is destroyed', () => {
        fixture.destroy();
        expect(document.querySelector('app-guided-tour')).toBeNull();
    });
});

describe('placePopover', () => {
    const viewport = { width: 1280, height: 800 };
    const size = { width: 360, height: 300 };

    it('goes below the target when there is room', () => {
        expect(placePopover({ top: 100, left: 200, bottom: 180 }, size, viewport)).toEqual({ top: 202, left: 200 });
    });

    it('goes above when there is no room below', () => {
        expect(placePopover({ top: 600, left: 200, bottom: 700 }, size, viewport).top).toBe(278);
    });

    it('stays inside the screen for a target taller than the screen or near the right edge', () => {
        const tall = placePopover({ top: -200, left: 1100, bottom: 1500 }, size, viewport);
        expect(tall.top).toBe(484);
        expect(tall.left).toBe(904);
    });
});
