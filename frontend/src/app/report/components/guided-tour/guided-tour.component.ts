import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    ViewChild,
    computed,
    effect
} from '@angular/core';
import { GuidedTourService } from './guided-tour.service';

interface Box {
    top: number;
    left: number;
    width: number;
    height: number;
}

const SPOT_PADDING = 8;
const POPOVER_WIDTH = 360;
const POPOVER_GAP = 14;

/**
 * Bulle et projecteur de la visite guidée. À placer une fois par page :
 * `<app-guided-tour></app-guided-tour>`. Échap ferme, flèches gauche/droite naviguent.
 */
@Component({
    selector: 'app-guided-tour',
    templateUrl: './guided-tour.component.html',
    styleUrls: ['./guided-tour.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class GuidedTourComponent implements OnDestroy {
    @ViewChild('primaryButton') primaryButton?: ElementRef<HTMLButtonElement>;

    spot: Box | null = null;
    popoverTop = 0;
    popoverLeft = 0;
    centered = true;

    readonly dots = computed(() => Array.from({ length: this.tour.count() }, (_, i) => i));

    private measureTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(public tour: GuidedTourService, private cdr: ChangeDetectorRef) {
        effect(() => {
            const step = this.tour.step();
            this.tour.index();
            if (step) {
                this.locate(step.target, true);
            } else {
                this.spot = null;
            }
            this.cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        if (this.measureTimer) {
            clearTimeout(this.measureTimer);
        }
        if (this.tour.active()) {
            this.tour.finish();
        }
    }

    @HostListener('window:resize')
    @HostListener('window:scroll')
    onViewportChange(): void {
        const step = this.tour.step();
        if (step) {
            this.locate(step.target, false);
        }
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (!this.tour.active()) {
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.tour.finish();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.tour.next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.tour.previous();
        }
    }

    private locate(target: string | undefined, scroll: boolean): void {
        const element = target ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`) : null;
        if (!element) {
            this.spot = null;
            this.centered = true;
            this.focusLater();
            return;
        }
        if (scroll) {
            element.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        if (this.measureTimer) {
            clearTimeout(this.measureTimer);
        }
        // Une frame pour laisser le défilement se terminer avant de mesurer.
        this.measureTimer = setTimeout(() => {
            this.measure(element);
            this.cdr.markForCheck();
            if (scroll) {
                this.focusLater();
            }
        }, scroll ? 60 : 0);
    }

    private measure(element: HTMLElement): void {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        this.spot = {
            top: rect.top - SPOT_PADDING,
            left: rect.left - SPOT_PADDING,
            width: rect.width + SPOT_PADDING * 2,
            height: rect.height + SPOT_PADDING * 2
        };
        this.centered = false;
        const width = Math.min(POPOVER_WIDTH, viewportWidth - 32);
        const below = rect.bottom + SPOT_PADDING + POPOVER_GAP;
        const roomBelow = viewportHeight - below;
        this.popoverTop = roomBelow > 220 || rect.top < 240
            ? Math.min(below, viewportHeight - 230)
            : Math.max(16, rect.top - SPOT_PADDING - POPOVER_GAP - 210);
        this.popoverLeft = Math.min(Math.max(16, rect.left), viewportWidth - width - 16);
    }

    private focusLater(): void {
        setTimeout(() => this.primaryButton?.nativeElement.focus(), 0);
    }
}
